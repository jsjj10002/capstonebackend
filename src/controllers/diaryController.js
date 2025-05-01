const Diary = require('../models/diaryModel');
const User = require('../models/userModel');
const { uploadToS3 } = require('../config/uploadConfig');
const { analyzeDiaryContent, generateImagePrompt } = require('../config/openaiConfig');
const fs = require('fs');
const path = require('path');

// 새 일기 작성
const createDiary = async (req, res) => {
  try {
    const { title, content, mood, tags } = req.body;
    
    // 기본 일기 데이터 구성
    const diaryData = {
      user: req.user._id,
      title,
      content,
      mood: mood || '기타',
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : [],
      photos: [],
    };
    
    // 업로드된 사진이 있는 경우 처리
    if (req.files && req.files.length > 0) {
      // 사진 URL 추가
      diaryData.photos = req.files.map(file => `/uploads/${file.filename}`);
    }
    
    // 태그와 무드 자동 분석 (입력값이 없는 경우)
    if (!tags || tags.length === 0 || !mood || mood === '기타') {
      try {
        const analysis = await analyzeDiaryContent(title, content);
        
        if (!tags || tags.length === 0) {
          diaryData.tags = analysis.tags;
        }
        
        if (!mood || mood === '기타') {
          diaryData.mood = analysis.mood;
        }
      } catch (error) {
        console.error('일기 내용 분석 오류:', error);
        // 분석 실패 시에도 일기는 저장 진행
      }
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
    const { title, content, mood, tags } = req.body;
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
      title: title || diary.title,
      content: content || diary.content,
      mood: mood || diary.mood,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : diary.tags,
    };
    
    // 태그와 무드 자동 분석 (입력값이 없는 경우)
    if ((!tags || tags.length === 0) || (!mood || mood === '기타')) {
      try {
        const analysis = await analyzeDiaryContent(
          updateData.title,
          updateData.content
        );
        
        if (!tags || tags.length === 0) {
          updateData.tags = analysis.tags;
        }
        
        if (!mood || mood === '기타') {
          updateData.mood = analysis.mood;
        }
      } catch (error) {
        console.error('일기 내용 분석 오류:', error);
        // 분석 실패 시에도 일기는 저장 진행
      }
    }
    
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
    
    // 이미지 생성 프롬프트 생성
    const prompt = await generateImagePrompt(
      diary.title,
      diary.content,
      diary.tags,
      diary.mood
    );
    
    res.json({ prompt });
  } catch (error) {
    console.error('이미지 프롬프트 생성 오류:', error);
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
}; 