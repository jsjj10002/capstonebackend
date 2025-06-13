const Diary = require('../models/diaryModel');
const User = require('../models/userModel');
const { uploadToS3 } = require('../config/uploadConfig');
const { analyzeDiaryContent, generateImagePrompt } = require('../config/openaiConfig');
const { customizeWorkflow, runComfyWorkflow } = require('../config/comfyuiConfig');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// 새 일기 작성
const createDiary = async (req, res) => {
  try {
    const { content, date, artStyle } = req.body;
    
    // 기본 일기 데이터 구성 (title, mood, tags 제거)
    const diaryData = {
      user: req.user._id,
      content,
      date: date ? new Date(date) : new Date(),
      artStyle: artStyle || 'Makoto Shinkai',
      photos: [],
    };
    
    // 업로드된 사진이 있는 경우 처리
    if (req.files && req.files.length > 0) {
      // 사진 URL 추가
      diaryData.photos = req.files.map(file => `/uploads/${file.filename}`);
    }
    
    // 일기 생성
    const diary = await Diary.create(diaryData);
    
    res.status(201).json(diary);
  } catch (error) {
    console.error('일기 작성 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 일기 목록 조회
const getDiaries = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    // 사용자의 모든 일기 조회 (최신순)
    const diaries = await Diary.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    // 전체 일기 수
    const total = await Diary.countDocuments({ user: req.user._id });
    
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

// 특정 일기 조회
const getDiaryById = async (req, res) => {
  try {
    const diary = await Diary.findById(req.params.id);
    
    if (!diary) {
      return res.status(404).json({ message: '일기를 찾을 수 없습니다.' });
    }
    
    // 본인 일기만 조회 가능
    if (diary.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
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
    const { content, date, artStyle } = req.body;
    const diary = await Diary.findById(req.params.id);
    
    if (!diary) {
      return res.status(404).json({ message: '일기를 찾을 수 없습니다.' });
    }
    
    // 본인 일기만 수정 가능
    if (diary.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }
    
    // 업데이트할 데이터
    const updateData = {
      content: content || diary.content,
      date: date ? new Date(date) : diary.date,
      artStyle: artStyle || diary.artStyle,
    };
    
    // 새 사진이 업로드된 경우
    if (req.files && req.files.length > 0) {
      // 기존 사진 배열 복제
      const photos = [...diary.photos];
      
      // 새 사진 추가
      req.files.forEach(file => {
        photos.push(`/uploads/${file.filename}`);
      });
      
      updateData.photos = photos;
    }
    
    // 일기 업데이트
    const updatedDiary = await Diary.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
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
    if (diary.user.toString() !== req.user._id.toString()) {
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
    
    // 제목, 내용, 태그로 검색
    const diaries = await Diary.find({
      user: req.user._id,
      $or: [
        { title: { $regex: keyword, $options: 'i' } },
        { content: { $regex: keyword, $options: 'i' } },
        { tags: { $in: [new RegExp(keyword, 'i')] } },
        { mood: { $regex: keyword, $options: 'i' } }
      ],
    }).sort({ createdAt: -1 });
    
    res.json(diaries);
  } catch (error) {
    console.error('일기 검색 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 일기 내용 기반 이미지 생성 프롬프트 생성
const generateImagePromptFromDiary = async (req, res) => {
  try {
    const diaryId = req.params.id;
    const diary = await Diary.findById(diaryId);
    
    if (!diary) {
      return res.status(404).json({ message: '일기를 찾을 수 없습니다.' });
    }
    
    // 본인 일기만 접근 가능
    if (diary.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }
    
    // 사용자 정보 조회 (인물 정보 포함)
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: '사용자 정보를 찾을 수 없습니다.' });
    }
    
    // 사용자 인물 정보 구성
    const userInfo = {
      gender: user.gender || '기타',
      clothing: user.clothing || '',
      hairstyle: user.hairstyle || '',
      accessories: user.accessories || '',
      appearance: user.appearance || ''
    };
    
    // 이미지 생성 프롬프트 생성
    const prompt = await generateImagePrompt(
      diary.content,
      diary.artStyle || 'Makoto Shinkai',
      userInfo
    );
    
    // 세션에 프롬프트 저장 (Redis 등을 사용하는 것이 더 좋습니다만, 예시로 세션 사용)
    req.session = req.session || {};
    req.session[`prompt_${diaryId}`] = prompt;
    
    console.log(`프롬프트 생성 및 저장 완료. 일기 ID: ${diaryId}, 길이: ${prompt.length}자`);
    console.log(`프롬프트 내용 미리보기: ${prompt.substring(0, 100)}...`);
    
    res.json({ prompt });
  } catch (error) {
    console.error('이미지 프롬프트 생성 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// ComfyUI를 활용한 이미지 생성
const generateDiaryImageWithComfy = async (req, res) => {
  try {
    const diaryId = req.params.id;
    
    // 일기 데이터 조회
    const diary = await Diary.findById(diaryId);
    if (!diary) {
      return res.status(404).json({ message: '일기를 찾을 수 없습니다.' });
    }
    
    // 권한 확인 (일기 작성자만 접근 가능)
    if (diary.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }
    
    // 사용자 조회 및 프로필 이미지 경로 가져오기
    const user = await User.findById(req.user._id);
    if (!user || !user.profilePhoto) {
      return res.status(400).json({ message: '프로필 사진이 필요합니다.' });
    }
    
    const profilePhoto = user.profilePhoto;
    const profilePhotoPath = path.join(__dirname, '..', '..', profilePhoto);
    
    // 프로필 사진 파일 존재 확인
    if (!fs.existsSync(profilePhotoPath)) {
      return res.status(400).json({ message: '프로필 사진 파일을 찾을 수 없습니다.' });
    }
    
    // 이전에 생성된 프롬프트 가져오기
    let prompt;
    
    // 클라이언트에서 프롬프트를 바로 전달받은 경우
    if (req.body && req.body.prompt) {
      prompt = req.body.prompt;
      console.log('클라이언트에서 직접 전달받은 프롬프트 사용');
    } 
    // 세션에 저장된 프롬프트 확인
    else if (req.session && req.session[`prompt_${diaryId}`]) {
      prompt = req.session[`prompt_${diaryId}`];
      console.log('세션에 저장된 프롬프트 사용');
    } 
    // 프롬프트가 없는 경우 새로 생성
    else {
      console.log('저장된 프롬프트 없음, 새로 생성합니다');
      
      // 사용자 인물 정보 구성
      const userInfo = {
        gender: user.gender || '기타',
        clothing: user.clothing || '',
        hairstyle: user.hairstyle || '',
        accessories: user.accessories || '',
        appearance: user.appearance || ''
      };
      
      prompt = await generateImagePrompt(
        diary.content,
        diary.artStyle || 'Makoto Shinkai',
        userInfo
      );
    }
    
    // 프롬프트 유효성 확인
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      console.error('유효하지 않은 프롬프트:', prompt);
      return res.status(500).json({ message: '이미지 프롬프트 생성에 실패했습니다' });
    }
    
    console.log('최종 사용 프롬프트:', prompt.substring(0, 100) + '...');
    
    // ComfyUI 워크플로우 로드 - Makoto Shinkai workflow 사용
    const workflowPath = path.join(__dirname, '..', '..', 'Makoto Shinkai workflow.json');
    if (!fs.existsSync(workflowPath)) {
      console.error('ComfyUI 워크플로우 파일을 찾을 수 없음:', workflowPath);
      return res.status(500).json({ message: 'ComfyUI 워크플로우 파일을 찾을 수 없습니다.' });
    }
    
    console.log(`ComfyUI 워크플로우 파일 로드: ${workflowPath}`);
    const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    
    // 워크플로우 커스터마이징
    console.log(`워크플로우 커스터마이징: 
      - 프롬프트 길이: ${prompt.length} 자
      - 이미지 경로: ${profilePhotoPath}
      - 이미지 존재 여부: ${fs.existsSync(profilePhotoPath) ? '예' : '아니오'}`);
      
    const customizedWorkflow = customizeWorkflow(workflow, {
      prompt: prompt,
      imagePath: profilePhotoPath
    });
    
    // ComfyUI 서버 상태 확인
    const COMFY_SERVER = req.app.locals.COMFY_SERVER_URL || 'http://127.0.0.1:8188';
    try {
      console.log(`ComfyUI 서버 연결 확인 시도: ${COMFY_SERVER}/system_stats`);
      const serverCheckResponse = await fetch(`${COMFY_SERVER}/system_stats`);
      if (serverCheckResponse.ok) {
        const stats = await serverCheckResponse.json();
        console.log('ComfyUI 서버 연결 확인 완료:', JSON.stringify(stats).substring(0, 100) + '...');
      } else {
        console.warn(`ComfyUI 서버 응답은 받았으나 상태가 좋지 않음: ${serverCheckResponse.status}`);
      }
    } catch (err) {
      console.error('ComfyUI 서버 연결 확인 실패:', err);
      return res.status(500).json({ 
        message: 'ComfyUI 서버에 연결할 수 없습니다', 
        error: err.message || '알 수 없는 연결 오류'
      });
    }
    
    // ComfyUI API 호출
    console.log('ComfyUI API 호출 시작...');
    const startTime = Date.now();
    const comfyResponse = await runComfyWorkflow(customizedWorkflow);
    console.log(`ComfyUI API 호출 완료: ${(Date.now() - startTime) / 1000}초 소요`);
    console.log('ComfyUI 응답 상태:', comfyResponse.success ? '성공' : '실패');
    
    if (!comfyResponse.success) {
      return res.status(500).json({ 
        message: '이미지 생성에 실패했습니다.', 
        error: comfyResponse.error 
      });
    }
    
    // 생성된 이미지 저장
    const uploadDir = path.join(__dirname, '..', '..', 'uploads');
    const filename = `diary_${diaryId}_${Date.now()}.png`;
    const imagePath = path.join(uploadDir, filename);
    
    fs.writeFileSync(imagePath, comfyResponse.imageData);
    
    // 일기에 생성된 이미지 추가
    const photoUrl = `/uploads/${filename}`;
    diary.photos.push(photoUrl);
    await diary.save();
    
    // 응답
    res.status(201).json({
      message: '이미지가 성공적으로 생성되었습니다.',
      photo: photoUrl,
      diary
    });
    
  } catch (error) {
    console.error('이미지 생성 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 월별 일기 조회 API 추가
const getDiariesByMonth = async (req, res) => {
  try {
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ 
        message: '년도와 월을 지정해주세요. 예: ?year=2025&month=1' 
      });
    }
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const diaries = await Diary.find({
      user: req.user._id,
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    })
    .sort({ date: -1 })
    .select('date photos _id');
    
    // 요청한 형식에 맞게 데이터 변환
    const formattedDiaries = diaries.map(diary => ({
      date: diary.date.toISOString().split('T')[0], // YYYY-MM-DD 형식
      id: diary._id,
      thumbnail: diary.photos.length > 0 ? diary.photos[0] : null,
    }));
    
    res.json(formattedDiaries);
  } catch (error) {
    console.error('월별 일기 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

module.exports = {
  createDiary,
  getDiaries,
  getDiaryById,
  updateDiary,
  deleteDiary,
  searchDiaries,
  generateImagePromptFromDiary,
  generateDiaryImageWithComfy,
  getDiariesByMonth,
}; 