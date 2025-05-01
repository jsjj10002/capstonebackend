const express = require('express');
const router = express.Router();
const {
  createPerson,
  getPeople,
  getPersonById,
  updatePerson,
  deletePerson,
  searchPeople,
} = require('../controllers/personController');
const { protect } = require('../middleware/authMiddleware');
const { uploadLocal } = require('../config/uploadConfig');

// 모든 라우트에 인증 미들웨어 적용
router.use(protect);

// 새 사람 추가 라우트
router.post('/', uploadLocal.single('photo'), createPerson);

// 내가 추가한 모든 사람 조회 라우트
router.get('/', getPeople);

// 사람 검색 라우트
router.get('/search', searchPeople);

// 특정 사람 조회 라우트
router.get('/:id', getPersonById);

// 사람 정보 수정 라우트
router.put('/:id', uploadLocal.single('photo'), updatePerson);

// 사람 삭제 라우트
router.delete('/:id', deletePerson);

module.exports = router; 