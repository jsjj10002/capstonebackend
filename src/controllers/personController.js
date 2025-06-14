const Person = require('../models/personModel');
const fs = require('fs');
const path = require('path');

// 새로운 사람 추가
const addPerson = async (req, res) => {
  try {
    const { name, gender, hairStyle, clothing, accessories } = req.body;
    
    // 이미 같은 이름의 사람이 있는지 확인
    const existingPerson = await Person.findOne({
      user: req.user._id,
      name: name
    });
    
    if (existingPerson) {
      return res.status(400).json({ message: '이미 동일한 이름의 사람이 존재합니다.' });
    }
    
    // 사진 업로드 필수
    if (!req.file) {
      return res.status(400).json({ message: '사진은 필수입니다.' });
    }
    
    const personData = {
      name,
      photo: `/uploads/${req.file.filename}`,
      gender: gender || '기타',
      hairStyle: hairStyle || '',
      clothing: clothing || '',
      accessories: accessories || '',
      user: req.user._id,
    };
    
    const person = await Person.create(personData);
    res.status(201).json(person);
  } catch (error) {
    console.error('사람 추가 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 내가 추가한 사람 목록 조회
const getMyPeople = async (req, res) => {
  try {
    const people = await Person.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json(people);
  } catch (error) {
    console.error('사람 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 사람 검색
const searchPeople = async (req, res) => {
  try {
    const { keyword } = req.query;
    
    if (!keyword) {
      return res.status(400).json({ message: '검색어를 입력해주세요.' });
    }
    
    const people = await Person.find({
      user: req.user._id,
      name: { $regex: keyword, $options: 'i' }
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

// 사람 정보 수정
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
    
    // 업데이트할 데이터
    const updateData = {
      name: name || person.name,
      gender: gender || person.gender,
      hairStyle: hairStyle !== undefined ? hairStyle : person.hairStyle,
      clothing: clothing !== undefined ? clothing : person.clothing,
      accessories: accessories !== undefined ? accessories : person.accessories,
    };
    
    // 새 사진이 업로드된 경우
    if (req.file) {
      updateData.photo = `/uploads/${req.file.filename}`;
    }
    
    const updatedPerson = await Person.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    res.json(updatedPerson);
  } catch (error) {
    console.error('사람 정보 수정 오류:', error);
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