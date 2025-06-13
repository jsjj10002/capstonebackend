const User = require('../models/userModel');
const { generateToken } = require('../utils/jwt');
const { uploadToS3 } = require('../config/uploadConfig');
const { analyzeImageFeatures } = require('../config/openaiConfig');
const fs = require('fs');
const path = require('path');

// 회원가입
const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

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

    // 사용자 생성
    const user = await User.create({
      username,
      email,
      password,
      profilePhoto,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePhoto: user.profilePhoto,
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
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePhoto: user.profilePhoto,
        token: generateToken(user._id),
      });
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
      clothing: user.clothing,
      hairstyle: user.hairstyle,
      accessories: user.accessories,
      appearance: user.appearance,
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
      clothing: updatedUser.clothing,
      hairstyle: updatedUser.hairstyle,
      accessories: updatedUser.accessories,
      appearance: updatedUser.appearance,
    });
  } catch (error) {
    console.error('프로필 사진 업데이트 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 프로필 정보 업데이트
const updateProfileInfo = async (req, res) => {
  try {
    const { username, email, gender, clothing, hairstyle, accessories, appearance } = req.body;

    // 이메일 중복 확인 (기존 이메일과 다른 경우)
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: '이미 사용 중인 이메일입니다.' });
      }
    }

    // 업데이트할 데이터 구성
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (gender) updateData.gender = gender;
    if (clothing !== undefined) updateData.clothing = clothing;
    if (hairstyle !== undefined) updateData.hairstyle = hairstyle;
    if (accessories !== undefined) updateData.accessories = accessories;
    if (appearance !== undefined) updateData.appearance = appearance;

    // 사용자 프로필 정보 업데이트
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
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
      clothing: updatedUser.clothing,
      hairstyle: updatedUser.hairstyle,
      accessories: updatedUser.accessories,
      appearance: updatedUser.appearance,
    });
  } catch (error) {
    console.error('프로필 정보 업데이트 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateProfilePhoto,
  updateProfileInfo,
}; 