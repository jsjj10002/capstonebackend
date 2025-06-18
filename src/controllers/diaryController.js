const Diary = require('../models/diaryModel');
const User = require('../models/userModel');
const Person = require('../models/personModel');
const { getArtStyleById, getDefaultArtStyle, getAllArtStyles } = require('../utils/artStyleManager');
const { uploadToS3 } = require('../config/uploadConfig');
const { generateSceneDescription, generateImagePrompt } = require('../config/geminiConfig');
const { customizeWorkflow, runComfyWorkflow, runOriginalWorkflow } = require('../config/comfyuiConfig');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// 한국어 조사 제거 함수 
const removeKoreanParticles = (name) => {
  if (!name || typeof name !== 'string') {
    return name;
  }
  
  // 한국어 조사 목록 (길이순으로 정렬)
  const particles = [
    '에게서', '으로부터', '로부터', '에서부터',  // 3-4글자 조사
    '에게', '한테', '으로', '에서', '부터', '까지', '마저', '조차', // 2글자 조사  
    '과', '와', '을', '를', '이', '가', '은', '는', '만', '도', '로'  // 1글자 조사
  ];
  
  let cleanName = name.trim();
  
  // 조사 제거 (가장 긴 조사부터 확인)
  for (const particle of particles) {
    if (cleanName.endsWith(particle)) {
      cleanName = cleanName.slice(0, -particle.length);
      break; // 하나의 조사만 제거
    }
  }
  
  return cleanName.trim();
};

// 주요 인물 선택 및 태그 업데이트 API
const selectMainCharacterAPI = async (req, res) => {
  try {
    const { personId, identifiedPerson } = req.body;
    
    if (!personId || !identifiedPerson) {
      return res.status(400).json({ message: '인물 ID와 식별된 인물 정보가 필요합니다.' });
    }
    
    // PERSON이 '나'인 경우는 인물을 고르지 않는다
    if (identifiedPerson === '나') {
      return res.json({
        message: '주인공이 본인인 경우 별도 인물 선택이 불필요합니다.',
        skipCharacterSelection: true
      });
    }
    
    // 선택된 인물 정보 조회
    const selectedPerson = await Person.findOne({
      _id: personId,
      user: req.user._id
    });
    
    if (!selectedPerson) {
      return res.status(404).json({ message: '선택한 인물을 찾을 수 없습니다.' });
    }
    
    // 태그 속성에 identifiedPerson이 없으면 추가
    if (!selectedPerson.tags.includes(identifiedPerson)) {
      selectedPerson.tags.push(identifiedPerson);
      await selectedPerson.save();
      console.log(`인물 ${selectedPerson.name}의 태그에 "${identifiedPerson}" 추가됨`);
    }
    
    res.json({
      selectedPerson: {
        id: selectedPerson._id,
        name: selectedPerson.name,
        gender: selectedPerson.gender,
        tags: selectedPerson.tags
      },
      message: '주요 인물이 선택되었습니다.'
    });
    
  } catch (error) {
    console.error('주요 인물 선택 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 일기 작성
const createDiary = async (req, res) => {
  try {
    const { 
      content, 
      diaryDate, 
      artStyleId,
      sceneDescription,
      identifiedPerson,
      selectedPersonId,
      userAppearanceKeywords,
      mainCharacterGender
    } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ message: '일기 내용을 입력해주세요.' });
    }
    
    if (!artStyleId) {
      return res.status(400).json({ message: '화풍을 선택해주세요.' });
    }
    
    if (!sceneDescription || sceneDescription.trim() === '') {
      return res.status(400).json({ message: '장면 묘사가 필요합니다.' });
    }
    
    if (!identifiedPerson) {
      return res.status(400).json({ message: '식별된 인물 정보가 필요합니다.' });
    }
    
    console.log('=== 일기 생성 시작 ===');
    console.log('받은 데이터:', {
      content: content ? '있음' : '없음',
      artStyleId,
      sceneDescription: sceneDescription ? '있음' : '없음',
      identifiedPerson,
      selectedPersonId,
      userAppearanceKeywords,
      mainCharacterGender
    });
    console.log('identifiedPerson:', identifiedPerson);
    console.log('selectedPersonId:', selectedPersonId);
    console.log('mainCharacterGender:', mainCharacterGender);
    
    let mainCharacterData = {};
    let selectedPersonGender = '기타';
    
    // identifiedPerson이 '나'인 경우 처리
    if (identifiedPerson === '나') {
      mainCharacterData = {
        name: '나',
        isFromContacts: false
      };
      selectedPersonGender = req.user.gender || '기타'; // 사용자 계정의 성별 사용
    } else {
      // 다른 인물인 경우 - selectedPersonId가 있으면 기존 인물, 없으면 새 인물
      if (selectedPersonId) {
        // 기존 인물 선택
        const selectedPerson = await Person.findOne({
          _id: selectedPersonId,
          user: req.user._id
        });
        
        if (!selectedPerson) {
          return res.status(404).json({ message: '선택한 인물을 찾을 수 없습니다.' });
        }
        
        mainCharacterData = {
          personId: selectedPerson._id,
          name: selectedPerson.name,
          isFromContacts: true
        };
        selectedPersonGender = selectedPerson.gender;
        
        // 태그 업데이트
        if (!selectedPerson.tags.includes(identifiedPerson)) {
          selectedPerson.tags.push(identifiedPerson);
          await selectedPerson.save();
        }
      } else {
        // 새로운 인물 (연락처에 없는 경우)
        mainCharacterData = {
          name: identifiedPerson,
          isFromContacts: false
        };
        selectedPersonGender = mainCharacterGender || '기타';
        console.log('새로운 인물로 처리:', identifiedPerson, '성별:', selectedPersonGender);
      }
    }
    
    // 화풍 정보 조회
    const artStyle = getArtStyleById(artStyleId) || getDefaultArtStyle();
    
    // 프롬프트 생성
    const imagePrompt = await generateImagePrompt(
      sceneDescription,
      selectedPersonGender,
      userAppearanceKeywords || '',
      artStyle.requiredKeywords.join(', ')
    );
    
    console.log('생성된 프롬프트:', imagePrompt);
    
    // 일기 저장
    const newDiary = await Diary.create({
      content,
      diaryDate: diaryDate ? new Date(diaryDate) : new Date(),
      sceneDescription,
      identifiedPerson,
      imagePrompt,
      artStyleId,
      mainCharacter: mainCharacterData,
      promptLog: {
        sceneDescription,
        finalPrompt: imagePrompt,
        userAppearanceKeywords: userAppearanceKeywords || '',
        requiredKeywords: artStyle.requiredKeywords,
        artStyleId,
        createdAt: new Date()
      },
      userId: req.user._id,
    });
    
    console.log('일기 저장 완료:', newDiary._id);
    
    // 이미지 생성 대기 (동기적 처리)
    console.log('이미지 생성 시작 - 완료까지 대기...');
    const imageResult = await generateImageForDiary(newDiary, req.user, artStyle, sceneDescription, userAppearanceKeywords || '');
    
    // 최신 일기 정보 조회 (이미지 URL 포함)
    const updatedDiary = await Diary.findById(newDiary._id).populate('mainCharacter.personId', 'name gender photo');
    
    if (imageResult.success) {
      res.status(201).json({
        message: '일기가 성공적으로 작성되고 이미지가 생성되었습니다.',
        diary: {
          _id: updatedDiary._id,
          content: updatedDiary.content,
          diaryDate: updatedDiary.diaryDate,
          sceneDescription: updatedDiary.sceneDescription,
          imagePrompt: updatedDiary.imagePrompt,
          artStyleId: updatedDiary.artStyleId,
          mainCharacter: updatedDiary.mainCharacter,
          generatedImage: updatedDiary.generatedImage,
          imageGenerationStatus: updatedDiary.imageGenerationStatus
        }
      });
    } else {
      res.status(201).json({
        message: '일기가 작성되었지만 이미지 생성에 실패했습니다.',
        diary: {
          _id: updatedDiary._id,
          content: updatedDiary.content,
          diaryDate: updatedDiary.diaryDate,
          sceneDescription: updatedDiary.sceneDescription,
          imagePrompt: updatedDiary.imagePrompt,
          artStyleId: updatedDiary.artStyleId,
          mainCharacter: updatedDiary.mainCharacter,
          generatedImage: null,
          imageGenerationStatus: updatedDiary.imageGenerationStatus,
          imageGenerationError: updatedDiary.imageGenerationError
        }
      });
    }
    
  } catch (error) {
    console.error('일기 작성 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 이미지 생성 함수 (동기적 처리)
const generateImageForDiary = async (diary, user, artStyle, sceneDescription, userAppearanceKeywords) => {
  try {
    console.log('=== 이미지 생성 시작 ===');
    console.log('일기 ID:', diary._id);
    console.log('화풍:', artStyle.name);
    console.log('주인공 정보:', diary.mainCharacter);
    console.log('식별된 인물:', diary.identifiedPerson);
    
    // 인물 사진 파일 결정
    let imageFileName = null;
    
    if (diary.identifiedPerson === '나') {
      // '나'인 경우 사용자 프로필 사진 사용
      if (user.profilePhoto) {
        imageFileName = user.profilePhoto.replace('/uploads/', '');
        console.log('사용자 프로필 사진 사용:', imageFileName);
      } else {
        console.log('사용자 프로필 사진이 없음 - 기본 처리');
      }
    } else if (diary.mainCharacter && diary.mainCharacter.personId) {
      // 선택된 인물의 사진 사용
      const selectedPerson = await Person.findById(diary.mainCharacter.personId);
      if (selectedPerson && selectedPerson.photo) {
        imageFileName = selectedPerson.photo.replace('/uploads/', '');
        console.log('선택된 인물 사진 사용:', imageFileName, '(인물:', selectedPerson.name, ')');
      } else {
        console.log('선택된 인물의 사진이 없음');
      }
    }
    
    console.log('최종 사용할 이미지 파일:', imageFileName || '없음');
    
    // 워크플로우 파일 경로 생성
    const workflowPath = path.join(__dirname, '..', '..', 'workflows', artStyle.workflowFile);
    console.log('워크플로우 파일 경로:', workflowPath);
    
    // ComfyUI 워크플로우 실행
    const result = await runOriginalWorkflow(
      workflowPath,
      diary.imagePrompt,
      imageFileName, // 인물 사진 파일
      artStyle // artStyleConfig
    );
    
    if (result.success && result.imageUrl) {
      // 일기에 이미지 URL 업데이트
      await Diary.findByIdAndUpdate(diary._id, {
        generatedImage: result.imageUrl,
        imageGenerationStatus: 'completed'
      });
      
      console.log('이미지 생성 완료:', result.imageUrl);
      console.log('실행 시간:', result.executionTime || '알 수 없음');
      console.log('워크플로우:', result.workflowFile || '알 수 없음');
      
      return {
        success: true,
        imageUrl: result.imageUrl,
        executionTime: result.executionTime,
        workflowFile: result.workflowFile
      };
    } else {
      // 실패 상태 업데이트
      await Diary.findByIdAndUpdate(diary._id, {
        imageGenerationStatus: 'failed',
        imageGenerationError: result.error || '이미지 생성 실패'
      });
      
      console.error('이미지 생성 실패:', result.error);
      console.error('워크플로우:', result.workflowFile || '알 수 없음');
      
      return {
        success: false,
        error: result.error || '이미지 생성 실패',
        workflowFile: result.workflowFile
      };
    }
    
  } catch (error) {
    console.error('이미지 생성 오류:', error);
    
    // 오류 상태 업데이트
    await Diary.findByIdAndUpdate(diary._id, {
      imageGenerationStatus: 'failed',
      imageGenerationError: error.message
    });
    
    return {
      success: false,
      error: error.message
    };
  }
};

// 일기 목록 조회
const getDiaries = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const diaries = await Diary.find({ userId: req.user._id })
      .sort({ diaryDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate('mainCharacter.personId', 'name gender photo');

    const total = await Diary.countDocuments({ userId: req.user._id });

    res.json({
      diaries,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('일기 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 월별 일기 조회
const getDiariesByMonth = async (req, res) => {
  try {
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ message: '년도와 월을 입력해주세요.' });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const diaries = await Diary.find({
      userId: req.user._id,
      diaryDate: {
        $gte: startDate,
        $lte: endDate
      }
    })
    .sort({ diaryDate: -1 })
    .populate('mainCharacter.personId', 'name gender photo');

    res.json({
      diaries,
      period: {
        year: parseInt(year),
        month: parseInt(month),
        totalCount: diaries.length
      }
    });
  } catch (error) {
    console.error('월별 일기 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 특정 일기 조회
const getDiaryById = async (req, res) => {
  try {
    const diary = await Diary.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('mainCharacter.personId', 'name gender photo');

    if (!diary) {
      return res.status(404).json({ message: '일기를 찾을 수 없습니다.' });
    }

    res.json(diary);
  } catch (error) {
    console.error('일기 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 일기 수정
const updateDiary = async (req, res) => {
  try {
    const { content, diaryDate } = req.body;
    const photos = req.files;

    const diary = await Diary.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!diary) {
      return res.status(404).json({ message: '일기를 찾을 수 없습니다.' });
    }

    // 업데이트할 필드들
    const updateFields = {};
    if (content) updateFields.content = content;
    if (diaryDate) updateFields.diaryDate = new Date(diaryDate);

    // 사진 업로드 처리
    if (photos && photos.length > 0) {
      const photoUrls = [];
      for (const photo of photos) {
        const photoUrl = await uploadToS3(photo);
        photoUrls.push(photoUrl);
      }
      updateFields.photos = [...(diary.photos || []), ...photoUrls];
    }

    const updatedDiary = await Diary.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    ).populate('mainCharacter.personId', 'name gender photo');

    res.json({
      message: '일기가 수정되었습니다.',
      diary: updatedDiary
    });
  } catch (error) {
    console.error('일기 수정 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 일기 삭제
const deleteDiary = async (req, res) => {
  try {
    const diary = await Diary.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!diary) {
      return res.status(404).json({ message: '일기를 찾을 수 없습니다.' });
    }

    res.json({ message: '일기가 삭제되었습니다.' });
  } catch (error) {
    console.error('일기 삭제 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 일기 검색 - 정규식 인젝션 방지
const searchDiaries = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({ message: '검색어를 입력해주세요.' });
    }

    // 입력값 검증 및 정규식 특수문자 이스케이프
    const sanitizedQuery = q.trim();
    
    // 빈 문자열 검증
    if (!sanitizedQuery) {
      return res.status(400).json({ message: '유효한 검색어를 입력해주세요.' });
    }
    
    // 검색어 길이 제한 (보안상 200자로 제한)
    if (sanitizedQuery.length > 200) {
      return res.status(400).json({ message: '검색어는 200자를 초과할 수 없습니다.' });
    }
    
    // 정규식 특수문자 이스케이프 처리
    const escapedQuery = sanitizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const searchQuery = {
      userId: req.user._id,
      $or: [
        { content: { $regex: escapedQuery, $options: 'i' } },
        { sceneDescription: { $regex: escapedQuery, $options: 'i' } }
      ]
    };

    const diaries = await Diary.find(searchQuery)
      .sort({ diaryDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('mainCharacter.personId', 'name gender photo');

    const total = await Diary.countDocuments(searchQuery);

    res.json({
      diaries,
      searchQuery: sanitizedQuery,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total
      }
    });
  } catch (error) {
    console.error('일기 검색 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 프롬프트 로그 조회
const getDiaryPromptLog = async (req, res) => {
  try {
    const diary = await Diary.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).select('promptLog');

    if (!diary) {
      return res.status(404).json({ message: '일기를 찾을 수 없습니다.' });
    }

    res.json({
      promptLog: diary.promptLog || null
    });
  } catch (error) {
    console.error('프롬프트 로그 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 모든 화풍 목록 조회 API
const getAllArtStylesAPI = async (req, res) => {
  try {
    const artStyles = getAllArtStyles();
    res.json({
      artStyles: artStyles.map(style => ({
        id: style.id,
        name: style.name,
        description: style.description,
        preview: style.preview
      }))
    });
  } catch (error) {
    console.error('화풍 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 장면 묘사 생성 API
const generateSceneDescriptionAPI = async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ message: '일기 내용을 입력해주세요.' });
    }
    
    console.log('=== 장면 묘사 생성 시작 ===');
    console.log('일기 내용:', content);
    
    // 장면 묘사 생성 함수 호출
    const sceneResult = await generateSceneDescription(content);
    
    console.log('장면 묘사 결과:', sceneResult);
    
    res.json({
      diaryContent: content,
      sceneDescription: sceneResult.TEXT,
      identifiedPerson: sceneResult.PERSON
    });
    
  } catch (error) {
    console.error('장면 묘사 생성 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

module.exports = {
  generateSceneDescriptionAPI,
  selectMainCharacterAPI,
  createDiary,
  getAllArtStylesAPI,
  getDiaries,
  getDiariesByMonth,
  getDiaryById,
  updateDiary,
  deleteDiary,
  searchDiaries,
  getDiaryPromptLog
}; 