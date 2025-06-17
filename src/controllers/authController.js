const User = require('../models/userModel');
const { generateToken } = require('../utils/jwt');
const { uploadToS3 } = require('../config/uploadConfig');
const { analyzeImageFeatures } = require('../config/openaiConfig');
const fs = require('fs');
const path = require('path');

// 회원가입
const registerUser = async (req, res) => {
  try {
    const { username, email, password, gender } = req.body;

    if (!gender || !['남성', '여성', '기타'].includes(gender)) {
      return res.status(400).json({ message: '성별을 올바르게 선택해주세요.' });
    }

    // 이메일 중복 확인
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: '이미 등록된 이메일입니다.' });
    }

    let profilePhoto = '';
    
    // 프로필 사진이 있는 경우 처리
    if (req.file) {
      profilePhoto = `/uploads/${req.file.filename}`;
    }

    // 비밀번호는 User 모델의 pre('save') 미들웨어에서 해싱되므로 여기서는 해싱하지 않음
    const userData = {
      username,
      email,
      password, // 원본 비밀번호 전달 (모델에서 해싱됨)
      gender,
      profilePhoto,
    };

    // 사용자 생성
    const user = await User.create(userData);

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePhoto: user.profilePhoto,
        gender: user.gender,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: '유효하지 않은 사용자 데이터입니다.' });
    }
  } catch (error) {
    console.error('사용자 등록 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 로그인
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 이메일로 사용자 찾기 (비밀번호 필드 포함)
    const user = await User.findOne({ email }).select('+password');

    // 사용자 존재 및 비밀번호 확인
    if (user) {
      const passwordMatch = await user.matchPassword(password);
      
      if (passwordMatch) {
        res.json({
          _id: user._id,
          username: user.username,
          email: user.email,
          profilePhoto: user.profilePhoto,
          gender: user.gender,
          token: generateToken(user._id),
        });
      } else {
        res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      }
    } else {
      res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 프로필 조회
const getUserProfile = async (req, res) => {
  try {
    // req.user는 auth 미들웨어에서 설정됨
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePhoto: user.profilePhoto,
      gender: user.gender,
    });
  } catch (error) {
    console.error('프로필 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 프로필 사진 업데이트
const updateProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '프로필 사진을 업로드해주세요.' });
    }

    const profilePhoto = `/uploads/${req.file.filename}`;

    // 사용자 프로필 사진 업데이트
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profilePhoto },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      profilePhoto: updatedUser.profilePhoto,
      gender: updatedUser.gender,
    });
  } catch (error) {
    console.error('프로필 사진 업데이트 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 프로필 정보 업데이트
const updateUserProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    const userId = req.user._id;
    
    // 이메일 중복 확인 (자신의 이메일이 아닌 경우)
    if (email) {
      const existingUser = await User.findOne({ 
        email: email, 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return res.status(400).json({ message: '이미 사용 중인 이메일입니다.' });
      }
    }
    
    // 업데이트할 데이터 구성
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    
    // 사용자 프로필 업데이트
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    
    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      profilePhoto: updatedUser.profilePhoto,
      gender: updatedUser.gender,
    });
  } catch (error) {
    console.error('프로필 정보 업데이트 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 비밀번호 변경
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: '새 비밀번호는 최소 6자 이상이어야 합니다.' });
    }
    
    // 현재 비밀번호와 함께 사용자 조회
    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    
    // 현재 비밀번호 확인
    const isCurrentPasswordValid = await user.matchPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: '현재 비밀번호가 올바르지 않습니다.' });
    }
    
    // 새 비밀번호 설정
    user.password = newPassword;
    await user.save();
    
    res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateProfilePhoto,
  updateUserProfile,
  changePassword,
}; 