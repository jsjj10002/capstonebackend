const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  loginUser, 
  getUserProfile,
  updateProfilePhoto,
  updateUserProfile,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { uploadLocal } = require('../config/uploadConfig');

// 회원가입 라우트
router.post('/register', uploadLocal.single('profilePhoto'), registerUser);

// 로그인 라우트
router.post('/login', loginUser);

// 프로필 조회 라우트 (인증 필요)
router.get('/profile', protect, getUserProfile);

// 프로필 사진 업데이트 라우트 (인증 필요)
router.put('/profile/photo', protect, uploadLocal.single('profilePhoto'), updateProfilePhoto);

// 프로필 정보 수정 라우트 (인증 필요)
router.put('/profile', protect, updateUserProfile);

// 비밀번호 변경 라우트 (인증 필요)
router.put('/profile/password', protect, changePassword);

module.exports = router; 