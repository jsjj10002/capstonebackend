const Person = require('../models/personModel');
const fs = require('fs');
const path = require('path');

// 새로운 사람 추가 - 입력값 검증 강화
const addPerson = async (req, res) => {
  try {
    const { name, gender, hairStyle, clothing, accessories } = req.body;
    
    // 입력값 검증
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: '이름을 입력해주세요.' });
    }
    
    const trimmedName = name.trim();
    
    // 이름 길이 검증
    if (trimmedName.length > 50) {
      return res.status(400).json({ message: '이름은 50자를 초과할 수 없습니다.' });
    }
    
    // 이름 특수문자 검증 (기본 한글, 영문, 숫자, 공백만 허용)
    if (!/^[가-힣a-zA-Z0-9\s]+$/.test(trimmedName)) {
      return res.status(400).json({ message: '이름은 한글, 영문, 숫자, 공백만 사용할 수 있습니다.' });
    }
    
    // 성별 검증
    if (gender && !['남성', '여성', '기타'].includes(gender)) {
      return res.status(400).json({ message: '올바른 성별을 선택해주세요.' });
    }
    
    // 설명 필드 길이 검증
    if (hairStyle && hairStyle.length > 100) {
      return res.status(400).json({ message: '헤어스타일 설명은 100자를 초과할 수 없습니다.' });
    }
    if (clothing && clothing.length > 100) {
      return res.status(400).json({ message: '의상 설명은 100자를 초과할 수 없습니다.' });
    }
    if (accessories && accessories.length > 100) {
      return res.status(400).json({ message: '액세서리 설명은 100자를 초과할 수 없습니다.' });
    }
    
    // 이미 같은 이름의 사람이 있는지 확인
    const existingPerson = await Person.findOne({
      user: req.user._id,
      name: trimmedName
    });
    
    if (existingPerson) {
      return res.status(400).json({ message: '이미 동일한 이름의 사람이 존재합니다.' });
    }
    
    // 사진 업로드 필수
    if (!req.file) {
      return res.status(400).json({ message: '사진은 필수입니다.' });
    }
    
    const personData = {
      name: trimmedName,
      photo: `/uploads/${req.file.filename}`,
      gender: gender || '기타',
      hairStyle: hairStyle ? hairStyle.trim() : '',
      clothing: clothing ? clothing.trim() : '',
      accessories: accessories ? accessories.trim() : '',
      user: req.user._id,
    };
    
    const person = await Person.create(personData);
    res.status(201).json(person);
  } catch (error) {
    console.error('사람 추가 오류:', error);
    
    // Mongoose 검증 오류 처리
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 내가 추가한 사람 목록 조회
const getMyPeople = async (req, res) => {
  try {
    const people = await Person.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json({
      people: people,
      total: people.length
    });
  } catch (error) {
    console.error('사람 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 사람 검색 - 정규식 인젝션 방지
const searchPeople = async (req, res) => {
  try {
    const { keyword } = req.query;
    
    if (!keyword) {
      return res.status(400).json({ message: '검색어를 입력해주세요.' });
    }
    
    // 입력값 검증 및 정규식 특수문자 이스케이프
    const sanitizedKeyword = keyword.trim();
    
    // 빈 문자열 검증
    if (!sanitizedKeyword) {
      return res.status(400).json({ message: '유효한 검색어를 입력해주세요.' });
    }
    
    // 검색어 길이 제한 (보안상 100자로 제한)
    if (sanitizedKeyword.length > 100) {
      return res.status(400).json({ message: '검색어는 100자를 초과할 수 없습니다.' });
    }
    
    // 정규식 특수문자 이스케이프 처리
    const escapedKeyword = sanitizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const people = await Person.find({
      user: req.user._id,
      name: { $regex: escapedKeyword, $options: 'i' }
    }).sort({ createdAt: -1 });
    
    res.json(people);
  } catch (error) {
    console.error('사람 검색 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 특정 사람 조회
const getPersonById = async (req, res) => {
  try {
    const person = await Person.findById(req.params.id);
    
    if (!person) {
      return res.status(404).json({ message: '사람을 찾을 수 없습니다.' });
    }
    
    // 본인이 추가한 사람만 조회 가능
    if (person.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }
    
    res.json(person);
  } catch (error) {
    console.error('사람 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 사람 정보 수정 - 입력값 검증 강화
const updatePerson = async (req, res) => {
  try {
    const { name, gender, hairStyle, clothing, accessories } = req.body;
    const person = await Person.findById(req.params.id);
    
    if (!person) {
      return res.status(404).json({ message: '사람을 찾을 수 없습니다.' });
    }
    
    // 본인이 추가한 사람만 수정 가능
    if (person.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }
    
    // 입력값 검증
    let trimmedName = person.name;
    if (name !== undefined) {
      if (name.trim() === '') {
        return res.status(400).json({ message: '이름을 입력해주세요.' });
      }
      
      trimmedName = name.trim();
      
      // 이름 길이 검증
      if (trimmedName.length > 50) {
        return res.status(400).json({ message: '이름은 50자를 초과할 수 없습니다.' });
      }
      
      // 이름 특수문자 검증
      if (!/^[가-힣a-zA-Z0-9\s]+$/.test(trimmedName)) {
        return res.status(400).json({ message: '이름은 한글, 영문, 숫자, 공백만 사용할 수 있습니다.' });
      }
    }
    
    // 성별 검증
    if (gender && !['남성', '여성', '기타'].includes(gender)) {
      return res.status(400).json({ message: '올바른 성별을 선택해주세요.' });
    }
    
    // 설명 필드 길이 검증
    if (hairStyle && hairStyle.length > 100) {
      return res.status(400).json({ message: '헤어스타일 설명은 100자를 초과할 수 없습니다.' });
    }
    if (clothing && clothing.length > 100) {
      return res.status(400).json({ message: '의상 설명은 100자를 초과할 수 없습니다.' });
    }
    if (accessories && accessories.length > 100) {
      return res.status(400).json({ message: '액세서리 설명은 100자를 초과할 수 없습니다.' });
    }
    
    // 업데이트할 데이터
    const updateData = {
      name: trimmedName,
      gender: gender || person.gender,
      hairStyle: hairStyle !== undefined ? hairStyle.trim() : person.hairStyle,
      clothing: clothing !== undefined ? clothing.trim() : person.clothing,
      accessories: accessories !== undefined ? accessories.trim() : person.accessories,
    };
    
    // 새 사진이 업로드된 경우
    if (req.file) {
      updateData.photo = `/uploads/${req.file.filename}`;
    }
    
    const updatedPerson = await Person.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json(updatedPerson);
  } catch (error) {
    console.error('사람 정보 수정 오류:', error);
    
    // Mongoose 검증 오류 처리
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 사람 삭제
const deletePerson = async (req, res) => {
  try {
    const person = await Person.findById(req.params.id);
    
    if (!person) {
      return res.status(404).json({ message: '사람을 찾을 수 없습니다.' });
    }
    
    // 본인이 추가한 사람만 삭제 가능
    if (person.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }
    
    await Person.deleteOne({ _id: req.params.id });
    res.json({ message: '사람이 삭제되었습니다.' });
  } catch (error) {
    console.error('사람 삭제 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

module.exports = {
  addPerson,
  getMyPeople,
  searchPeople,
  getPersonById,
  updatePerson,
  deletePerson,
}; 