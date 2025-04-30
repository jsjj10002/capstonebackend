const Diary = require('../models/diaryModel');
const { uploadToS3 } = require('../config/uploadConfig');
const { analyzeImageFeatures, analyzeDiaryContent } = require('../config/openaiConfig');
const fs = require('fs');
const path = require('path');

// 새 일기 작성
const createDiary = async (req, res) => {
  try {
    const { title, content, mood, tags } = req.body;
    
    // 기본 일기 데이터
    const diaryData = {
      user: req.user._id,
      title,
      content,
    };
    
    // 항상 일기 내용 분석 수행 (사용자 입력 유무에 관계없이)
    try {
      const analysisResult = await analyzeDiaryContent(title, content);
      
      // 무드 처리: 사용자 입력이 있으면 그대로 사용, 없으면 분석 결과 사용
      if (mood) {
        diaryData.mood = mood;
      } else {
        diaryData.mood = analysisResult.mood || '기타';
      }
      
      // 태그 처리: 사용자 입력이 있으면 분석 결과와 병합, 없으면 분석 결과만 사용
      let userTags = [];
      if (tags) {
        userTags = tags.split(',').map(tag => tag.trim());
      }
      
      // 분석된 태그와 사용자 태그 병합 (중복 제거)
      const combinedTags = [...new Set([...userTags, ...(analysisResult.tags || [])])];
      diaryData.tags = combinedTags;
    } catch (error) {
      console.error('일기 내용 분석 오류:', error);
      // 분석 실패 시 기본값 설정
      diaryData.mood = mood || '기타';
      diaryData.tags = tags ? tags.split(',').map(tag => tag.trim()) : [];
    }
    
    // 이미지가 업로드된 경우
    if (req.files && req.files.length > 0) {
      const photoUrls = [];
      const photoFeatures = [];
      
      // 각 파일을 S3에 업로드
      for (const file of req.files) {
        try {
          // S3에 업로드
          const result = await uploadToS3(file);
          photoUrls.push(result.Location);
          
          // OpenAI API로 이미지 특징 분석
          const features = await analyzeImageFeatures(file.path);
          photoFeatures.push(features);
          
          // 로컬 임시 파일 삭제
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error('S3 업로드 또는 이미지 분석 오류:', error);
          // S3 업로드 실패 시 로컬 경로 사용
          photoUrls.push(`/uploads/${path.basename(file.path)}`);
          photoFeatures.push('이미지 분석에 실패했습니다.');
        }
      }
      
      diaryData.photos = photoUrls;
      diaryData.photoFeatures = photoFeatures;
    }
    
    // 일기 생성
    const diary = await Diary.create(diaryData);
    
    res.status(201).json(diary);
  } catch (error) {
    console.error('일기 작성 오류:', error);
    res.status(500).json({ message: '서버 오류: ' + error.message });
  }
};

// 내 모든 일기 조회
const getMyDiaries = async (req, res) => {
  try {
    const diaries = await Diary.find({ user: req.user._id })
      .sort({ createdAt: -1 }) // 최신순 정렬
      .exec();
      
    res.json(diaries);
  } catch (error) {
    console.error('일기 조회 오류:', error);
    res.status(500).json({ message: '서버 오류: ' + error.message });
  }
};

// 특정 일기 조회
const getDiaryById = async (req, res) => {
  try {
    const diary = await Diary.findById(req.params.id);
    
    // 일기가 존재하는지 확인
    if (!diary) {
      return res.status(404).json({ message: '일기를 찾을 수 없습니다.' });
    }
    
    // 자신의 일기인지 확인
    if (diary.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }
    
    res.json(diary);
  } catch (error) {
    console.error('일기 상세 조회 오류:', error);
    res.status(500).json({ message: '서버 오류: ' + error.message });
  }
};

// 일기 수정
const updateDiary = async (req, res) => {
  try {
    const { title, content, mood, tags } = req.body;
    
    // 기존 일기 조회
    let diary = await Diary.findById(req.params.id);
    
    // 일기가 존재하는지 확인
    if (!diary) {
      return res.status(404).json({ message: '일기를 찾을 수 없습니다.' });
    }
    
    // 자신의 일기인지 확인
    if (diary.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }
    
    // 업데이트할 데이터
    const updateData = {
      title: title || diary.title,
      content: content || diary.content,
    };
    
    // 항상 일기 내용 분석 수행 (사용자 입력 유무에 관계없이)
    try {
      const titleToAnalyze = title || diary.title;
      const contentToAnalyze = content || diary.content;
      const analysisResult = await analyzeDiaryContent(titleToAnalyze, contentToAnalyze);
      
      // 무드 처리: 사용자 입력이 있으면 그대로 사용, 없으면 분석 결과 또는 기존 값 사용
      if (mood) {
        updateData.mood = mood;
      } else {
        updateData.mood = analysisResult.mood || diary.mood || '기타';
      }
      
      // 태그 처리: 사용자 입력이 있으면 분석 결과와 병합, 없으면 분석 결과와 기존 태그 병합
      let userTags = [];
      if (tags) {
        userTags = tags.split(',').map(tag => tag.trim());
      }
      
      // 분석된 태그, 사용자 태그, 기존 태그 병합 (중복 제거)
      const existingTags = tags ? [] : (diary.tags || []);
      const combinedTags = [...new Set([...userTags, ...existingTags, ...(analysisResult.tags || [])])];
      updateData.tags = combinedTags;
    } catch (error) {
      console.error('일기 내용 분석 오류:', error);
      // 분석 실패 시 기존 값 또는 기본값 사용
      updateData.mood = mood || diary.mood || '기타';
      updateData.tags = tags ? tags.split(',').map(tag => tag.trim()) : diary.tags || [];
    }
    
    // 이미지가 업로드된 경우
    if (req.files && req.files.length > 0) {
      const photoUrls = [...diary.photos]; // 기존 사진 URL 복사
      const photoFeatures = [...diary.photoFeatures]; // 기존 사진 특징 복사
      
      // 각 파일을 S3에 업로드
      for (const file of req.files) {
        try {
          // S3에 업로드
          const result = await uploadToS3(file);
          photoUrls.push(result.Location);
          
          // OpenAI API로 이미지 특징 분석
          const features = await analyzeImageFeatures(file.path);
          photoFeatures.push(features);
          
          // 로컬 임시 파일 삭제
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error('S3 업로드 또는 이미지 분석 오류:', error);
          // S3 업로드 실패 시 로컬 경로 사용
          photoUrls.push(`/uploads/${path.basename(file.path)}`);
          photoFeatures.push('이미지 분석에 실패했습니다.');
        }
      }
      
      updateData.photos = photoUrls;
      updateData.photoFeatures = photoFeatures;
    }
    
    // 일기 업데이트
    diary = await Diary.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    
    res.json(diary);
  } catch (error) {
    console.error('일기 업데이트 오류:', error);
    res.status(500).json({ message: '서버 오류: ' + error.message });
  }
};

// 일기 삭제
const deleteDiary = async (req, res) => {
  try {
    const diary = await Diary.findById(req.params.id);
    
    // 일기가 존재하는지 확인
    if (!diary) {
      return res.status(404).json({ message: '일기를 찾을 수 없습니다.' });
    }
    
    // 자신의 일기인지 확인
    if (diary.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }
    
    await diary.deleteOne();
    
    res.json({ message: '일기가 삭제되었습니다.' });
  } catch (error) {
    console.error('일기 삭제 오류:', error);
    res.status(500).json({ message: '서버 오류: ' + error.message });
  }
};

// 일기 검색
const searchDiaries = async (req, res) => {
  try {
    const { keyword } = req.query;
    
    if (!keyword) {
      return res.status(400).json({ message: '검색어를 입력해주세요.' });
    }
    
    // 키워드로 일기 검색 (제목, 내용, 태그, 사진 특징)
    const diaries = await Diary.find({
      $and: [
        { user: req.user._id }, // 본인의 일기만 검색
        {
          $or: [
            { title: { $regex: keyword, $options: 'i' } },
            { content: { $regex: keyword, $options: 'i' } },
            { tags: { $regex: keyword, $options: 'i' } },
            { photoFeatures: { $regex: keyword, $options: 'i' } }, // 사진 특징으로도 검색
          ],
        },
      ],
    }).sort({ createdAt: -1 });
    
    res.json(diaries);
  } catch (error) {
    console.error('일기 검색 오류:', error);
    res.status(500).json({ message: '서버 오류: ' + error.message });
  }
};

module.exports = {
  createDiary,
  getMyDiaries,
  getDiaryById,
  updateDiary,
  deleteDiary,
  searchDiaries,
}; 