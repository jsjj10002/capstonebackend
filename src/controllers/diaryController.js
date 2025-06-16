const Diary = require('../models/diaryModel');
const User = require('../models/userModel');
const Person = require('../models/personModel');
const { getArtStyleById, getDefaultArtStyle } = require('../utils/artStyleManager');
const { uploadToS3 } = require('../config/uploadConfig');
const { analyzeDiaryContent, generateImagePrompt } = require('../config/openaiConfig');
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

// 새 일기 작성 (자동 이미지 생성 포함)
const createDiary = async (req, res) => {
  try {
    const { content, diaryDate, artStyleId } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ message: '일기 내용을 입력해주세요.' });
    }
    
    if (!artStyleId) {
      return res.status(400).json({ message: '화풍을 선택해주세요.' });
    }
    
    // @태그 추출 (조사 전처리는 스키마 미들웨어에서 처리)
    const atMentions = content.match(/@[^\s]+/g);
    let mainCharacterData = {};
    
    if (atMentions && atMentions.length > 0) {
      const mainCharacterName = atMentions[0].substring(1);
      const cleanName = removeKoreanParticles(mainCharacterName); // 조사 제거
      
      const existingPerson = await Person.findOne({
        user: req.user._id,
        name: cleanName
      });
      
      if (existingPerson) {
        mainCharacterData = {
          personId: existingPerson._id,
          name: existingPerson.name,
          isFromContacts: true
        };
      } else {
        // 연락처에 없는 경우 - 주인공 정보가 필요
        const mainCharacterInfo = req.body.mainCharacter;
        if (!mainCharacterInfo || !mainCharacterInfo.gender || !mainCharacterInfo.hairStyle || !mainCharacterInfo.clothing) {
          return res.status(400).json({ 
            message: '새로운 주인공이 지정되었습니다. 성별, 헤어스타일, 의상 정보를 입력해주세요.',
            requiresCharacterInfo: true,
            mainCharacterName: mainCharacterName
          });
        }
        
        // 주인공 사진이 필요
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({ 
            message: '새로운 주인공의 사진을 업로드해주세요.',
            requiresPhoto: true,
            mainCharacterName: mainCharacterName
          });
        }
        
        // 새 사람을 연락처에 자동 추가
        try {
          const newPerson = await Person.create({
            name: mainCharacterName,
            gender: mainCharacterInfo.gender,
            hairStyle: mainCharacterInfo.hairStyle,
            clothing: mainCharacterInfo.clothing,
            accessories: mainCharacterInfo.accessories || '',
            photo: `/uploads/${req.files[0].filename}`,
            user: req.user._id,
          });
          
          mainCharacterData = {
            personId: newPerson._id,
            name: newPerson.name,
            isFromContacts: true
          };
        } catch (error) {
          console.error('주인공 자동 추가 오류:', error);
          return res.status(500).json({ message: '주인공 정보 저장에 실패했습니다.' });
        }
      }
    
    
    // 화풍 정보 가져오기
    }
    
    const artStyle = getArtStyleById(artStyleId);
    if (!artStyle) {
      return res.status(400).json({ message: '유효하지 않은 화풍입니다.' });
    }
    
    // 단순화된 일기 데이터
    const diaryData = {
      userId: req.user._id,
      content,
      diaryDate: diaryDate ? new Date(diaryDate) : new Date(),
      photos: [],
      artStyleId: artStyle.id,
      mainCharacter: mainCharacterData
    };
    
    // 사진 처리...
    
    // AI 분석 부분 완전 제거 (태그, 무드 분석 없음)
    
    const diary = await Diary.create(diaryData);
    
    // 이미지 생성
    try {
      const imageResult = await generateImageForDiary(diary, req.user, artStyle);
      
      if (imageResult.success) {
        diary.generatedImage = imageResult.photoUrl;
        diary.imagePrompt = imageResult.prompt;
        diary.promptLog = imageResult.promptLog;
        await diary.save();
      }
    } catch (error) {
      console.error('이미지 자동 생성 오류:', error);
    }
    
    const populatedDiary = await Diary.findById(diary._id)
      .populate('mainCharacter.personId', 'name photo gender hairStyle clothing accessories');
    
    res.status(201).json({
      message: '일기가 작성되었습니다.',
      diary: populatedDiary,
      imageGenerated: !!diary.generatedImage
    });
  } catch (error) {
    console.error('일기 작성 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 일기용 이미지 생성 함수 (내부 사용)
const generateImageForDiary = async (diary, user, artStyle) => {
  try {
    let characterPhoto = null;
    let characterDescription = '';
    
    // 주인공이 있는 경우
    if (diary.mainCharacter && diary.mainCharacter.name && diary.mainCharacter.personId) {
      const person = await Person.findById(diary.mainCharacter.personId);
      if (person && person.photo) {
        characterPhoto = path.join(__dirname, '..', '..', person.photo);
        
        // 단순한 특징 문자열 생성
        const characteristics = [];
        
        // 성별 (한국어 그대로 전달)
        if (person.gender) {
          characteristics.push(person.gender); // '남성', '여성', '기타' 그대로
        }
        
        // 헤어스타일
        if (person.hairStyle) {
          characteristics.push(person.hairStyle);
        }
        
        // 의상
        if (person.clothing) {
          characteristics.push(person.clothing);
        }
        
        // 액세서리
        if (person.accessories) {
          characteristics.push(person.accessories);
        }
        
        characterDescription = characteristics.join(', ');
      }
    } 
    // 주인공이 없으면 사용자 자신
    else {
      if (user.profilePhoto) {
        characterPhoto = path.join(__dirname, '..', '..', user.profilePhoto);
      }
      
      // 사용자 성별 기반 기본 설명
      const genderMap = { '남성': '1man', '여성': '1woman', '기타': '1person' };
      characterDescription = genderMap[user.gender] || '1person';
    }
    
    if (!characterPhoto || !fs.existsSync(characterPhoto)) {
      throw new Error('캐릭터 사진을 찾을 수 없습니다.');
    }
    
    // 화풍별 필수 키워드 추출
    const requiredKeywords = artStyle.requiredKeywords || [];
    
    // 프롬프트 생성 (필수 키워드 포함)
    const finalPrompt = await generateImagePrompt(diary.content, characterDescription, requiredKeywords);
    
    // 프롬프트 로그에 필수 키워드 정보 추가
    const promptLog = {
      finalPrompt,
      characterDescription,
      requiredKeywords: requiredKeywords,
      artStyleId: artStyle.id,
      createdAt: new Date()
    };
    
    
    console.log('=== 프롬프트 생성 로그 ===');
    console.log('화풍:', artStyle.name);
    console.log('필수 키워드:', requiredKeywords);
    console.log('캐릭터 설명:', characterDescription);
    console.log('최종 프롬프트:', finalPrompt);
    console.log('=======================');
    
    // 워크플로우 실행
    const workflowPath = path.join(__dirname, '..', '..', artStyle.workflowFile);
    const imageName = characterPhoto ? path.basename(characterPhoto) : null;
    
    const comfyResponse = await runOriginalWorkflow(workflowPath, finalPrompt, imageName);
    
    if (!comfyResponse.success) {
      throw new Error(comfyResponse.error || '이미지 생성 실패');
    }
    
    // 이미지 저장
    const uploadDir = path.join(__dirname, '..', '..', 'uploads');
    const filename = `diary_${diary._id}_${Date.now()}.png`;
    const imagePath = path.join(uploadDir, filename);
    
    fs.writeFileSync(imagePath, comfyResponse.imageData);
    
    return {
      success: true,
      photoUrl: `/uploads/${filename}`,
      prompt: finalPrompt,
      promptLog
    };
  } catch (error) {
    console.error('이미지 생성 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 일기 목록 조회
const getDiaries = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    // 사용자의 모든 일기 조회 (일기 날짜 기준 최신순)
    const diaries = await Diary.find({ userId: req.user._id })
      .populate('mainCharacter.personId', 'name photo')
      .sort({ diaryDate: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    // 전체 일기 수
    const total = await Diary.countDocuments({ userId: req.user._id });
    
    res.json({
      diaries,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total,
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
    
    // 해당 월의 시작일과 끝일 계산
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    
    // 해당 월의 일기들 조회
    const diaries = await Diary.find({
      userId: req.user._id,
      diaryDate: {
        $gte: startDate,
        $lte: endDate
      }
    })
    .sort({ diaryDate: -1 })
    .select('_id diaryDate photos generatedImage content');
    
    // 요청된 형식으로 데이터 변환
    const monthlyDiaries = diaries.map(diary => ({
      date: diary.diaryDate.toISOString().split('T')[0], // YYYY-MM-DD 형식
      id: diary._id,
      thumbnail: diary.generatedImage || (diary.photos && diary.photos.length > 0 ? diary.photos[0] : null),
      content: diary.content.substring(0, 100) + '...' // 내용 미리보기
    }));
    
    res.json(monthlyDiaries);
  } catch (error) {
    console.error('월별 일기 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 특정 일기 조회
const getDiaryById = async (req, res) => {
  try {
    const diary = await Diary.findById(req.params.id)
      .populate('mainCharacter.personId', 'name photo gender hairStyle clothing accessories');
    
    if (!diary) {
      return res.status(404).json({ message: '일기를 찾을 수 없습니다.' });
    }
    
    // 본인 일기만 조회 가능
    if (diary.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }
    
    // 화풍 정보 추가
    const artStyle = getArtStyleById(diary.artStyleId);
    
    res.json({
      ...diary.toObject(),
      artStyle
    });
  } catch (error) {
    console.error('일기 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 일기 수정
const updateDiary = async (req, res) => {
  try {
    const { content } = req.body;
    const diary = await Diary.findById(req.params.id);
    
    if (!diary) {
      return res.status(404).json({ message: '일기를 찾을 수 없습니다.' });
    }
    
    // 본인 일기만 수정 가능
    if (diary.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }
    
    // 업데이트할 데이터
    const updateData = {
      content: content || diary.content,
    };
    
    // 내용이 변경된 경우 주인공 재추출 및 AI 재분석
    if (content && content !== diary.content) {
      const atMentions = content.match(/@[^\s]+/g);
      if (atMentions && atMentions.length > 0) {
        const mainCharacterName = atMentions[0].substring(1);
        
        // 기존 주인공과 다른 경우에만 업데이트
        if (mainCharacterName !== diary.mainCharacter?.name) {
          const person = await Person.findOne({
            user: req.user._id,
            name: mainCharacterName
          });
          
          if (person) {
            updateData.mainCharacter = {
              personId: person._id,
              name: person.name,
              isFromContacts: true
            };
          } else {
            updateData.mainCharacter = {
              name: mainCharacterName,
              isFromContacts: false
            };
          }
        }
      } else {
        // @태그가 없으면 주인공 정보 초기화
        updateData.mainCharacter = {};
      }
      
      
    }
    
    // 새 사진이 업로드된 경우
    if (req.files && req.files.length > 0) {
      const photos = [...diary.photos];
      req.files.forEach(file => {
        photos.push(`/uploads/${file.filename}`);
      });
      updateData.photos = photos;
    }
    
    const updatedDiary = await Diary.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('mainCharacter.personId', 'name photo gender hairStyle clothing accessories');
    
    res.json(updatedDiary);
  } catch (error) {
    console.error('일기 수정 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 일기 삭제
const deleteDiary = async (req, res) => {
  try {
    const diary = await Diary.findById(req.params.id);
    
    if (!diary) {
      return res.status(404).json({ message: '일기를 찾을 수 없습니다.' });
    }
    
    // 본인 일기만 삭제 가능
    if (diary.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }
    
    await Diary.deleteOne({ _id: req.params.id });
    res.json({ message: '일기가 삭제되었습니다.' });
  } catch (error) {
    console.error('일기 삭제 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 일기 검색
const searchDiaries = async (req, res) => {
  try {
    const { keyword } = req.query;
    
    if (!keyword) {
      return res.status(400).json({ message: '검색어를 입력해주세요.' });
    }
    
    // 내용과 태그로 검색 (title 제거)
    const diaries = await Diary.find({
      userId: req.user._id,
      $or: [
        { content: { $regex: keyword, $options: 'i' } },
        { tags: { $in: [new RegExp(keyword, 'i')] } },
        { mood: { $regex: keyword, $options: 'i' } }
      ],
    })
    .populate('mainCharacter.personId', 'name photo')
    .sort({ diaryDate: -1 });
    
    res.json(diaries);
  } catch (error) {
    console.error('일기 검색 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 일기의 프롬프트 로그 조회
const getDiaryPromptLog = async (req, res) => {
  try {
    const diary = await Diary.findById(req.params.id)
      .select('promptLog artStyleId');
    
    if (!diary) {
      return res.status(404).json({ message: '일기를 찾을 수 없습니다.' });
    }
    
    // 본인 일기만 조회 가능
    if (diary.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }
    
    const artStyle = getArtStyleById(diary.artStyleId);
    
    res.json({
      promptLog: diary.promptLog,
      artStyle: {
        name: artStyle.name,
        displayName: artStyle.displayName,
        workflowFile: artStyle.workflowFile
      }
    });
  } catch (error) {
    console.error('프롬프트 로그 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

module.exports = {
  createDiary,
  getDiaries,
  getDiariesByMonth,
  getDiaryById,
  updateDiary,
  deleteDiary,
  searchDiaries,
  getDiaryPromptLog,
}; 