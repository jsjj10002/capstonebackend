const Diary = require('../models/diaryModel');
const { uploadToS3 } = require('../config/uploadConfig');
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
      mood: mood || '기타',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
    };
    
    // 이미지가 업로드된 경우
    if (req.files && req.files.length > 0) {
      const photoUrls = [];
      
      // 각 파일을 S3에 업로드
      for (const file of req.files) {
        try {
          // S3에 업로드
          const result = await uploadToS3(file);
          photoUrls.push(result.Location);
          
          // 로컬 임시 파일 삭제
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error('S3 업로드 오류:', error);
          // S3 업로드 실패 시 로컬 경로 사용
          photoUrls.push(`/uploads/${path.basename(file.path)}`);
        }
      }
      
      diaryData.photos = photoUrls;
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
      mood: mood || diary.mood,
    };
    
    // 태그 업데이트
    if (tags) {
      updateData.tags = tags.split(',').map(tag => tag.trim());
    }
    
    // 이미지가 업로드된 경우
    if (req.files && req.files.length > 0) {
      const photoUrls = [...diary.photos]; // 기존 사진 URL 복사
      
      // 각 파일을 S3에 업로드
      for (const file of req.files) {
        try {
          // S3에 업로드
          const result = await uploadToS3(file);
          photoUrls.push(result.Location);
          
          // 로컬 임시 파일 삭제
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error('S3 업로드 오류:', error);
          // S3 업로드 실패 시 로컬 경로 사용
          photoUrls.push(`/uploads/${path.basename(file.path)}`);
        }
      }
      
      updateData.photos = photoUrls;
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
    
    // 키워드로 일기 검색 (제목, 내용, 태그)
    const diaries = await Diary.find({
      $and: [
        { user: req.user._id }, // 본인의 일기만 검색
        {
          $or: [
            { title: { $regex: keyword, $options: 'i' } },
            { content: { $regex: keyword, $options: 'i' } },
            { tags: { $regex: keyword, $options: 'i' } },
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