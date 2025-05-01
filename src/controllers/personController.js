const Person = require('../models/personModel');
const fs = require('fs');
const path = require('path');

// 인물 추가
const createPerson = async (req, res) => {
  try {
    const { name, relation, notes } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: '인물 사진을 업로드해주세요.' });
    }

    // 사진 정보
    const photo = `/uploads/${req.file.filename}`;

    // 인물 정보 생성
    const person = await Person.create({
      user: req.user._id, // 현재 로그인한 사용자 ID
      name,
      relation: relation || '기타',
      photo,
      notes: notes || '',
    });

    res.status(201).json(person);
  } catch (error) {
    console.error('인물 추가 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 사용자의 모든 인물 목록 조회
const getPeople = async (req, res) => {
  try {
    const people = await Person.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(people);
  } catch (error) {
    console.error('인물 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 특정 인물 정보 조회
const getPersonById = async (req, res) => {
  try {
    const person = await Person.findById(req.params.id);

    if (!person) {
      return res.status(404).json({ message: '인물을 찾을 수 없습니다.' });
    }

    // 권한 확인: 인물 정보의 소유자만 조회 가능
    if (person.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    res.json(person);
  } catch (error) {
    console.error('인물 정보 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 인물 정보 업데이트
const updatePerson = async (req, res) => {
  try {
    const { name, relation, notes } = req.body;
    const person = await Person.findById(req.params.id);

    if (!person) {
      return res.status(404).json({ message: '인물을 찾을 수 없습니다.' });
    }

    // 권한 확인: 인물 정보의 소유자만 수정 가능
    if (person.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const updateData = {
      name: name || person.name,
      relation: relation || person.relation,
      notes: notes !== undefined ? notes : person.notes,
    };

    // 사진이 업데이트된 경우
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
    console.error('인물 정보 업데이트 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 인물 삭제
const deletePerson = async (req, res) => {
  try {
    const person = await Person.findById(req.params.id);

    if (!person) {
      return res.status(404).json({ message: '인물을 찾을 수 없습니다.' });
    }

    // 권한 확인: 인물 정보의 소유자만 삭제 가능
    if (person.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    await Person.deleteOne({ _id: req.params.id });
    res.json({ message: '인물이 삭제되었습니다.' });
  } catch (error) {
    console.error('인물 삭제 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 인물 검색
const searchPeople = async (req, res) => {
  try {
    const { keyword } = req.query;

    if (!keyword) {
      return res.status(400).json({ message: '검색어를 입력해주세요.' });
    }

    // 검색어와 일치하는 인물 목록 조회
    const people = await Person.find({
      user: req.user._id,
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { relation: { $regex: keyword, $options: 'i' } },
        { notes: { $regex: keyword, $options: 'i' } }
      ],
    }).sort({ createdAt: -1 });

    res.json(people);
  } catch (error) {
    console.error('인물 검색 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

module.exports = {
  createPerson,
  getPeople,
  getPersonById,
  updatePerson,
  deletePerson,
  searchPeople,
}; 