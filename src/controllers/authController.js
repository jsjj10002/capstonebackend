const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const { uploadToS3 } = require('../config/uploadConfig');
const { analyzeImageFeatures } = require('../config/openaiConfig');
const fs = require('fs');
const path = require('path');

// JWT 토큰 생성 함수
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// 회원가입
const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 이메일 중복 확인
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: '이미 등록된 이메일입니다.' });
    }

    // 프로필 사진 정보
    let profilePhoto = '';
    let profilePhotoFeatures = '';

    // 프로필 사진이 업로드된 경우
    if (req.file) {
      try {
        // 로컬에 업로드된 파일을 S3에 업로드
        const result = await uploadToS3(req.file);
        profilePhoto = result.Location; // S3에 업로드된 파일의 URL
        
        // OpenAI API로 이미지 특징 분석
        profilePhotoFeatures = await analyzeImageFeatures(req.file.path);
        
        // 로컬 임시 파일 삭제
        fs.unlinkSync(req.file.path);
      } catch (error) {
        console.error('S3 업로드 또는 이미지 분석 오류:', error);
        // S3 업로드 실패 시 로컬 경로 사용
        profilePhoto = `/uploads/${path.basename(req.file.path)}`;
      }
    }

    // 새 사용자 생성
    const user = await User.create({
      username,
      email,
      password,
      profilePhoto,
      profilePhotoFeatures,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePhoto: user.profilePhoto,
        profilePhotoFeatures: user.profilePhotoFeatures,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: '유효하지 않은 사용자 데이터입니다.' });
    }
  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({ message: '서버 오류: ' + error.message });
  }
};

// 로그인
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 이메일로 사용자 찾기 (비밀번호 필드 포함)
    const user = await User.findOne({ email }).select('+password');

    // 사용자 존재 및 비밀번호 일치 확인
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePhoto: user.profilePhoto,
        profilePhotoFeatures: user.profilePhotoFeatures,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: '이메일 또는 비밀번호가 일치하지 않습니다.' });
    }
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ message: '서버 오류: ' + error.message });
  }
};

// 프로필 조회
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePhoto: user.profilePhoto,
        profilePhotoFeatures: user.profilePhotoFeatures,
      });
    } else {
      res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
  } catch (error) {
    console.error('프로필 조회 오류:', error);
    res.status(500).json({ message: '서버 오류: ' + error.message });
  }
};

// 프로필 사진 업데이트
const updateProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '업로드된 파일이 없습니다.' });
    }

    let profilePhoto = '';
    let profilePhotoFeatures = '';

    try {
      // 로컬에 업로드된 파일을 S3에 업로드
      const result = await uploadToS3(req.file);
      profilePhoto = result.Location; // S3에 업로드된 파일의 URL
      
      // OpenAI API로 이미지 특징 분석
      profilePhotoFeatures = await analyzeImageFeatures(req.file.path);
      
      // 로컬 임시 파일 삭제
      fs.unlinkSync(req.file.path);
    } catch (error) {
      console.error('S3 업로드 또는 이미지 분석 오류:', error);
      // S3 업로드 실패 시 로컬 경로 사용
      profilePhoto = `/uploads/${path.basename(req.file.path)}`;
    }

    // 사용자 프로필 사진 업데이트
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { 
        profilePhoto,
        profilePhotoFeatures,
      },
      { new: true }
    );

    if (updatedUser) {
      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        profilePhoto: updatedUser.profilePhoto,
        profilePhotoFeatures: updatedUser.profilePhotoFeatures,
      });
    } else {
      res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
  } catch (error) {
    console.error('프로필 사진 업데이트 오류:', error);
    res.status(500).json({ message: '서버 오류: ' + error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateProfilePhoto,
}; 