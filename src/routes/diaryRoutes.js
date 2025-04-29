const express = require('express');
const router = express.Router();
const {
  createDiary,
  getMyDiaries,
  getDiaryById,
  updateDiary,
  deleteDiary,
  searchDiaries,
} = require('../controllers/diaryController');
const { protect } = require('../middleware/authMiddleware');
const { uploadLocal } = require('../config/uploadConfig');

// 모든 라우트에 인증 미들웨어 적용
router.use(protect);

// 일기 작성 라우트
router.post('/', uploadLocal.array('photos', 5), createDiary);

// 내 모든 일기 조회 라우트
router.get('/', getMyDiaries);

// 일기 검색 라우트 - 이 라우트는 /:id 라우트보다 앞에 위치해야 함
router.get('/search', searchDiaries);

// 특정 일기 조회 라우트
router.get('/:id', getDiaryById);

// 일기 수정 라우트
router.put('/:id', uploadLocal.array('photos', 5), updateDiary);

// 일기 삭제 라우트
router.delete('/:id', deleteDiary);

module.exports = router; 