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

// 장면 묘사 API 추가
const generateSceneDescriptionAPI = async (req, res) => {
  try {
    const { content, protagonistName, sceneDirectionHint } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ message: '일기 내용을 입력해주세요.' });
    }
    
    // @태그 추출
    const atMentions = content.match(/@[^\s]+/g);
    let extractedProtagonist = protagonistName;
    
    if (atMentions && atMentions.length > 0 && !protagonistName) {
      const mainCharacterName = atMentions[0].substring(1);
      extractedProtagonist = removeKoreanParticles(mainCharacterName);
    }
    
    // 주인공 정보 조회
    let protagonistInfo = null;
    if (extractedProtagonist) {
      const existingPerson = await Person.findOne({
        user: req.user._id,
        name: extractedProtagonist
      });
      
      if (existingPerson) {
        protagonistInfo = {
          personId: existingPerson._id,
          name: existingPerson.name,
          gender: existingPerson.gender,
          photo: existingPerson.photo,
          isFromContacts: true
        };
      } else {
        protagonistInfo = {
          name: extractedProtagonist,
          isFromContacts: false
        };
      }
    }
    
    // 장면 묘사 생성
    const sceneDescription = await generateSceneDescription(
      content, 
      extractedProtagonist, 
      sceneDirectionHint
    );
    
    res.json({
      diaryContent: content,
      sceneDescription: sceneDescription,
      protagonistInfo: protagonistInfo,
      extractedProtagonist: extractedProtagonist
    });
    
  } catch (error) {
    console.error('장면 묘사 생성 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 새 일기 작성 (자동 이미지 생성 포함) - 두 단계 프로세스 적용
const createDiary = async (req, res) => {
  try {
    const { 
      content, 
      diaryDate, 
      artStyleId, 
      sceneDescription, 
      userAppearanceKeywords 
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
    
    // @태그 추출 (조사 전처리는 스키마 미들웨어에서 처리)
    const atMentions = content.match(/@[^\s]+/g);
    let mainCharacterData = {};
    
    console.log('=== 주인공 처리 디버깅 시작 ===');
    console.log('일기 내용:', content);
    console.log('atMentions:', atMentions);
    console.log('req.body.mainCharacterPersonId:', req.body.mainCharacterPersonId);
    console.log('req.body.mainCharacterName:', req.body.mainCharacterName);
    console.log('req.body.mainCharacterGender:', req.body.mainCharacterGender);
    console.log('req.body.protagonistName:', req.body.protagonistName);
    
    if (atMentions && atMentions.length > 0) {
      console.log('=== @태그가 있는 경우 처리 ===');
      const mainCharacterName = atMentions[0].substring(1);
      const cleanName = removeKoreanParticles(mainCharacterName); // 조사 제거
      
      const existingPerson = await Person.findOne({
        user: req.user._id,
        name: cleanName
      });
      
      if (existingPerson) {
        // 기존 인물이 있는 경우
        mainCharacterData = {
          personId: existingPerson._id,
          name: existingPerson.name,
          isFromContacts: true
        };
      } else {
        // 연락처에 없는 새로운 인물인 경우
        const mainCharacterGender = req.body.mainCharacterGender;
        
        if (!mainCharacterGender) {
          return res.status(400).json({ 
            message: `새로운 인물 "${cleanName}"이 지정되었습니다. 성별을 선택해주세요.`,
            requiresCharacterInfo: true,
            mainCharacterName: cleanName,
            requiredFields: ['gender']
          });
        }
        
        // 주인공 사진이 필요한지 확인 (첫 번째 파일이 주인공 사진인지)
        let characterPhotoPath = null;
        if (req.files && req.files.length > 0) {
          // 첫 번째 파일을 주인공 사진으로 사용
          characterPhotoPath = `/uploads/${req.files[0].filename}`;
        } else {
          return res.status(400).json({ 
            message: `새로운 인물 "${cleanName}"의 사진을 업로드해주세요.`,
            requiresPhoto: true,
            mainCharacterName: cleanName
          });
        }
        
        // 새 사람을 연락처에 자동 추가
        try {
          const newPerson = await Person.create({
            name: cleanName,
            gender: mainCharacterGender,
            photo: characterPhotoPath,
            user: req.user._id,
          });
          
          console.log(`새로운 인물 자동 추가: ${cleanName} (${mainCharacterGender})`);
          
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
    } else {
      console.log('=== @태그가 없는 경우 처리 ===');
      // @태그가 없는 경우 처리
      const mainCharacterPersonId = req.body.mainCharacterPersonId; // 기존 인물 선택
      let mainCharacterName = req.body.mainCharacterName; // 사용자가 직접 입력한 이름
      const mainCharacterGender = req.body.mainCharacterGender; // 새 인물 성별
      
      // mainCharacterName이 없으면 protagonistName에서 가져오기 (장면 묘사에서 추출된 이름)
      if (!mainCharacterName && req.body.protagonistName) {
        mainCharacterName = req.body.protagonistName;
        console.log(`장면 묘사에서 추출된 주인공 이름 사용: ${mainCharacterName}`);
      }
      
      console.log('최종 mainCharacterName:', mainCharacterName);
      console.log('최종 mainCharacterPersonId:', mainCharacterPersonId);
      console.log('최종 mainCharacterGender:', mainCharacterGender);
      
      if (mainCharacterPersonId) {
        // 기존 인물 리스트에서 선택한 경우
        const existingPerson = await Person.findOne({
          _id: mainCharacterPersonId,
          user: req.user._id
        });
        
        if (existingPerson) {
          mainCharacterData = {
            personId: existingPerson._id,
            name: existingPerson.name,
            isFromContacts: true
          };
          console.log(`기존 인물 선택: ${existingPerson.name}`);
        } else {
          console.warn('선택된 인물을 찾을 수 없습니다.');
        }
      } else if (mainCharacterName && mainCharacterGender && req.files && req.files.length > 0) {
        // 사용자가 직접 입력한 이름으로 새 인물 생성
        const cleanName = removeKoreanParticles(mainCharacterName.trim());
        const characterPhotoPath = `/uploads/${req.files[0].filename}`;
        
        // 같은 이름의 인물이 이미 있는지 확인
        const existingPerson = await Person.findOne({
          user: req.user._id,
          name: cleanName
        });
        
        if (existingPerson) {
          // 이미 존재하는 경우 기존 인물 사용
          mainCharacterData = {
            personId: existingPerson._id,
            name: existingPerson.name,
            isFromContacts: true
          };
          console.log(`기존 인물 사용: ${existingPerson.name}`);
        } else {
          // 새로운 인물 생성
          try {
            const newPerson = await Person.create({
              name: cleanName,
              gender: mainCharacterGender,
              photo: characterPhotoPath,
              user: req.user._id,
            });
            
            console.log(`새로운 인물 자동 추가: ${cleanName} (${mainCharacterGender})`);
            
            mainCharacterData = {
              personId: newPerson._id,
              name: newPerson.name,
              isFromContacts: true
            };
          } catch (error) {
            console.error('새 인물 자동 추가 오류:', error);
            return res.status(500).json({ message: '주인공 정보 저장에 실패했습니다.' });
          }
        }
      } else if (mainCharacterGender && req.files && req.files.length > 0) {
        // 이름 없이 성별만 있는 경우 - 일기 내용에서 이름 추출 시도
        const { generateProtagonistName } = require('../config/geminiConfig');
        
        try {
          console.log('일기 내용에서 주인공 이름 추출 시도...');
          const extractedName = await generateProtagonistName(content);
          
          if (extractedName && extractedName.trim() !== '') {
            const cleanName = removeKoreanParticles(extractedName.trim());
            console.log(`일기 내용에서 주인공 이름 추출: ${cleanName}`);
            
            // 같은 이름의 인물이 이미 있는지 확인
            const existingPerson = await Person.findOne({
              user: req.user._id,
              name: cleanName
            });
            
            if (existingPerson) {
              // 이미 존재하는 경우 기존 인물 사용
              mainCharacterData = {
                personId: existingPerson._id,
                name: existingPerson.name,
                isFromContacts: true
              };
              console.log(`기존 인물 사용: ${existingPerson.name}`);
            } else {
              // 새로운 인물 생성
              const characterPhotoPath = `/uploads/${req.files[0].filename}`;
              const newPerson = await Person.create({
                name: cleanName,
                gender: mainCharacterGender,
                photo: characterPhotoPath,
                user: req.user._id,
              });
              
              console.log(`새로운 인물 자동 추가: ${cleanName} (${mainCharacterGender})`);
              
              mainCharacterData = {
                personId: newPerson._id,
                name: newPerson.name,
                isFromContacts: true
              };
            }
          } else {
            // 이름 추출 실패 시 익명 주인공 생성
            console.log('이름 추출 실패, 익명 주인공 생성');
            const anonymousName = `익명_${Date.now()}`;
            const characterPhotoPath = `/uploads/${req.files[0].filename}`;
            
            const newPerson = await Person.create({
              name: anonymousName,
              gender: mainCharacterGender,
              photo: characterPhotoPath,
              user: req.user._id,
            });
            
            console.log(`익명 주인공 자동 추가: ${anonymousName} (${mainCharacterGender})`);
            
            mainCharacterData = {
              personId: newPerson._id,
              name: newPerson.name,
              isFromContacts: true
            };
          }
        } catch (error) {
          console.error('주인공 처리 오류:', error);
          // 오류 발생 시 익명 주인공 생성
          const anonymousName = `익명_${Date.now()}`;
          const characterPhotoPath = `/uploads/${req.files[0].filename}`;
          
          try {
            const newPerson = await Person.create({
              name: anonymousName,
              gender: mainCharacterGender,
              photo: characterPhotoPath,
              user: req.user._id,
            });
            
            console.log(`오류 후 익명 주인공 자동 추가: ${anonymousName} (${mainCharacterGender})`);
            
            mainCharacterData = {
              personId: newPerson._id,
              name: newPerson.name,
              isFromContacts: true
            };
          } catch (fallbackError) {
            console.error('익명 주인공 생성도 실패:', fallbackError);
            // 최종 실패해도 일기는 계속 작성
          }
        }
      }
    }
    
    // 화풍 정보 가져오기
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
      mainCharacter: mainCharacterData,
      sceneDescription: sceneDescription // 장면 묘사 추가
    };
    
    // 사진 처리 (첫 번째 파일이 주인공 사진인 경우 제외)
    if (req.files && req.files.length > 0) {
      let startIndex = 0;
      
      // 새로운 주인공이 추가된 경우 첫 번째 파일은 주인공 사진이므로 제외
      if (atMentions && atMentions.length > 0) {
        const mainCharacterName = atMentions[0].substring(1);
        const cleanName = removeKoreanParticles(mainCharacterName);
        
        const existingPerson = await Person.findOne({
          user: req.user._id,
          name: cleanName
        });
        
        if (!existingPerson && req.body.mainCharacterGender) {
          // 새로운 주인공이 추가된 경우 첫 번째 파일 제외
          startIndex = 1;
        }
      } else {
        // @태그가 없지만 새로운 주인공이 생성된 경우도 첫 번째 파일 제외
        const mainCharacterName = req.body.mainCharacterName;
        const mainCharacterGender = req.body.mainCharacterGender;
        
        if ((mainCharacterName && mainCharacterGender) || (!req.body.mainCharacterPersonId && mainCharacterGender)) {
          // 사용자가 직접 이름을 입력했거나 익명 주인공인 경우
          startIndex = 1;
        }
      }
      
      // 일기 사진들만 추가
      for (let i = startIndex; i < req.files.length; i++) {
        diaryData.photos.push(`/uploads/${req.files[i].filename}`);
      }
    }
    
    const diary = await Diary.create(diaryData);
    console.log(`일기 생성 완료: ${diary._id}`);
    console.log(`일기 주인공 정보:`, diary.mainCharacter);
    
    // 이미지 생성 (실패해도 일기는 유지)
    try {
      const imageResult = await generateImageForDiary(
        diary, 
        req.user, 
        artStyle, 
        sceneDescription, 
        userAppearanceKeywords
      );
      
      if (imageResult.success) {
        diary.generatedImage = imageResult.photoUrl;
        diary.imagePrompt = imageResult.prompt;
        diary.promptLog = imageResult.promptLog;
        await diary.save();
        console.log(`이미지 생성 성공: ${diary.generatedImage}`);
      } else {
        console.warn(`이미지 생성 실패하지만 일기는 저장됨: ${imageResult.error}`);
      }
    } catch (error) {
      console.error('이미지 자동 생성 오류 (일기는 저장됨):', error);
    }
    
    const populatedDiary = await Diary.findById(diary._id)
      .populate('mainCharacter.personId', 'name photo gender');
    
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

// 일기용 이미지 생성 함수 (내부 사용) - 두 단계 프로세스 적용
const generateImageForDiary = async (diary, user, artStyle, sceneDescription, userAppearanceKeywords = '') => {
  try {
    let characterPhoto = null;
    let characterGender = '';
    
    console.log('=== 이미지 생성 함수 주인공 정보 확인 ===');
    console.log('diary.mainCharacter:', diary.mainCharacter);
    console.log('diary.mainCharacter.personId:', diary.mainCharacter?.personId);
    console.log('diary.mainCharacter.name:', diary.mainCharacter?.name);
    
    // 주인공이 있는 경우
    if (diary.mainCharacter && diary.mainCharacter.personId) {
      console.log('주인공 정보 조회 시작...');
      const person = await Person.findById(diary.mainCharacter.personId);
      console.log('조회된 Person 객체:', person);
      
      if (person && person.photo) {
        characterPhoto = path.join(__dirname, '..', '..', person.photo);
        characterGender = person.gender;
        console.log(`주인공 정보 확인: ${person.name}, 성별: ${person.gender}, 사진: ${person.photo}`);
      } else {
        console.log('주인공 Person 객체를 찾을 수 없거나 사진이 없음');
      }
    } 
    // 주인공이 없으면 사용자 자신
    else {
      console.log('주인공 정보가 없어 사용자 정보 사용');
      if (user.profilePhoto) {
        characterPhoto = path.join(__dirname, '..', '..', user.profilePhoto);
      }
      characterGender = user.gender;
      console.log(`사용자 정보 사용: 성별: ${user.gender}`);
    }
    
    if (!characterPhoto || !fs.existsSync(characterPhoto)) {
      throw new Error('캐릭터 사진을 찾을 수 없습니다.');
    }
    
    // 화풍별 필수 키워드 추출
    const requiredKeywords = artStyle.requiredKeywords || [];
    
    // 성별 정보 추출
    let characterGenderForPrompt = characterGender;
    
    // 사용자 외모 키워드에서 성별 제거 (1man, 1woman, 1person 제거)
    let finalUserAppearanceKeywords = userAppearanceKeywords;
    if (finalUserAppearanceKeywords) {
      finalUserAppearanceKeywords = finalUserAppearanceKeywords
        .replace(/\b1man\b/gi, '')
        .replace(/\b1woman\b/gi, '')
        .replace(/\b1person\b/gi, '')
        .replace(/,\s*,/g, ',') // 연속된 콤마 제거
        .replace(/^,|,$/g, '') // 시작/끝 콤마 제거
        .trim();
    }
    
    // 기본 외모 키워드가 없으면 기본값 설정
    if (!finalUserAppearanceKeywords || finalUserAppearanceKeywords.trim() === '') {
      finalUserAppearanceKeywords = 'detailed face, expressive eyes';
    }
    
    // 두 번째 단계: 프롬프트 생성 (성별 + 장면 묘사 + 추가 정보)
    const finalPrompt = await generateImagePrompt(
      sceneDescription,
      diary.content,
      characterGenderForPrompt,
      finalUserAppearanceKeywords,
      requiredKeywords
    );
    
    // 프롬프트 로그에 필수 키워드 정보 추가
    const promptLog = {
      sceneDescription: sceneDescription,
      finalPrompt: finalPrompt,
      userAppearanceKeywords: finalUserAppearanceKeywords,
      requiredKeywords: requiredKeywords,
      artStyleId: artStyle.id,
      createdAt: new Date()
    };
    
    console.log('=== 프롬프트 생성 로그 ===');
    console.log('화풍:', artStyle.name);
    console.log('장면 묘사:', sceneDescription);
    console.log('필수 키워드:', requiredKeywords);
    console.log('사용자 외모 키워드:', finalUserAppearanceKeywords);
    console.log('최종 프롬프트:', finalPrompt);
    console.log('=======================');
    
    // 워크플로우 실행 (동적 워크플로우 선택)
    const workflowPath = path.join(__dirname, '..', '..', 'workflows', artStyle.workflowFile);
    const imageName = characterPhoto ? path.basename(characterPhoto) : null;
    
    const comfyResponse = await runOriginalWorkflow(workflowPath, finalPrompt, imageName, artStyle);
    
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
      .populate('mainCharacter.personId', 'name photo gender');
    
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
    ).populate('mainCharacter.personId', 'name photo gender');
    
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

// 모든 화풍 목록 조회
const getAllArtStylesAPI = async (req, res) => {
  try {
    const artStyles = getAllArtStyles();
    res.json(artStyles);
  } catch (error) {
    console.error('화풍 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

module.exports = {
  generateSceneDescriptionAPI,
  getAllArtStylesAPI,
  createDiary,
  getDiaries,
  getDiariesByMonth,
  getDiaryById,
  updateDiary,
  deleteDiary,
  searchDiaries,
  getDiaryPromptLog,
}; 