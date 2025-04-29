const Person = require('../models/personModel');
const { uploadToS3 } = require('../config/uploadConfig');
const { analyzeImageFeatures } = require('../config/openaiConfig');
const fs = require('fs');
const path = require('path');

// 새 사람 추가
const addPerson = async (req, res) => {
  try {
    const { name, relation, notes } = req.body;
    
    // 사진이 없으면 에러 반환
    if (!req.file) {
      return res.status(400).json({ message: '사진은 필수입니다.' });
    }
    
    let photo = '';
    let photoFeatures = '';
    
    try {
      // 1. 로컬에 업로드된 파일을 S3에 업로드
      const result = await uploadToS3(req.file);
      photo = result.Location;
      
      // 2. OpenAI API로 사진 특징 분석
      photoFeatures = await analyzeImageFeatures(req.file.path);
      
      // 3. 로컬 임시 파일 삭제
      fs.unlinkSync(req.file.path);
    } catch (error) {
      console.error('사진 처리 오류:', error);
      // S3 업로드 실패 시 로컬 경로 사용
      photo = `/uploads/${path.basename(req.file.path)}`;
      
      // 이미지 분석 실패 시 기본 메시지
      if (!photoFeatures) {
        photoFeatures = '이미지 분석에 실패했습니다.';
      }
    }
    
    // 새 사람 정보 생성
    const person = await Person.create({
      user: req.user._id,
      name,
      relation: relation || '기타',
      photo,
      photoFeatures,
      notes: notes || '',
    });
    
    res.status(201).json(person);
  } catch (error) {
    console.error('사람 추가 오류:', error);
    res.status(500).json({ message: '서버 오류: ' + error.message });
  }
};

// 내가 추가한 모든 사람 조회
const getMyPeople = async (req, res) => {
  try {
    const people = await Person.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .exec();
      
    res.json(people);
  } catch (error) {
    console.error('사람 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류: ' + error.message });
  }
};

// 특정 사람 조회
const getPersonById = async (req, res) => {
  try {
    const person = await Person.findById(req.params.id);
    
    // 사람 정보가 존재하는지 확인
    if (!person) {
      return res.status(404).json({ message: '해당 사람을 찾을 수 없습니다.' });
    }
    
    // 본인이 추가한 사람인지 확인
    if (person.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }
    
    res.json(person);
  } catch (error) {
    console.error('사람 조회 오류:', error);
    res.status(500).json({ message: '서버 오류: ' + error.message });
  }
};

// 사람 정보 수정
const updatePerson = async (req, res) => {
  try {
    const { name, relation, notes } = req.body;
    
    // 기존 사람 정보 조회
    let person = await Person.findById(req.params.id);
    
    // 사람 정보가 존재하는지 확인
    if (!person) {
      return res.status(404).json({ message: '해당 사람을 찾을 수 없습니다.' });
    }
    
    // 본인이 추가한 사람인지 확인
    if (person.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }
    
    // 업데이트할 데이터
    const updateData = {
      name: name || person.name,
      relation: relation || person.relation,
      notes: notes !== undefined ? notes : person.notes,
    };
    
    // 새 사진이 업로드된 경우
    if (req.file) {
      try {
        // 1. 로컬에 업로드된 파일을 S3에 업로드
        const result = await uploadToS3(req.file);
        updateData.photo = result.Location;
        
        // 2. OpenAI API로 사진 특징 분석
        updateData.photoFeatures = await analyzeImageFeatures(req.file.path);
        
        // 3. 로컬 임시 파일 삭제
        fs.unlinkSync(req.file.path);
      } catch (error) {
        console.error('사진 처리 오류:', error);
        // S3 업로드 실패 시 로컬 경로 사용
        updateData.photo = `/uploads/${path.basename(req.file.path)}`;
      }
    }
    
    // 사람 정보 업데이트
    person = await Person.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    
    res.json(person);
  } catch (error) {
    console.error('사람 정보 업데이트 오류:', error);
    res.status(500).json({ message: '서버 오류: ' + error.message });
  }
};

// 사람 삭제
const deletePerson = async (req, res) => {
  try {
    const person = await Person.findById(req.params.id);
    
    // 사람 정보가 존재하는지 확인
    if (!person) {
      return res.status(404).json({ message: '해당 사람을 찾을 수 없습니다.' });
    }
    
    // 본인이 추가한 사람인지 확인
    if (person.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }
    
    await person.deleteOne();
    
    res.json({ message: '해당 사람의 정보가 삭제되었습니다.' });
  } catch (error) {
    console.error('사람 삭제 오류:', error);
    res.status(500).json({ message: '서버 오류: ' + error.message });
  }
};

// 사람 검색
const searchPeople = async (req, res) => {
  try {
    const { keyword } = req.query;
    
    if (!keyword) {
      return res.status(400).json({ message: '검색어를 입력해주세요.' });
    }
    
    // 키워드로 사람 검색 (이름, 관계, 메모, 사진 특징)
    const people = await Person.find({
      $and: [
        { user: req.user._id }, // 본인이 추가한 사람만 검색
        {
          $or: [
            { name: { $regex: keyword, $options: 'i' } },
            { relation: { $regex: keyword, $options: 'i' } },
            { notes: { $regex: keyword, $options: 'i' } },
            { photoFeatures: { $regex: keyword, $options: 'i' } }
          ],
        },
      ],
    }).sort({ createdAt: -1 });
    
    res.json(people);
  } catch (error) {
    console.error('사람 검색 오류:', error);
    res.status(500).json({ message: '서버 오류: ' + error.message });
  }
};

module.exports = {
  addPerson,
  getMyPeople,
  getPersonById,
  updatePerson,
  deletePerson,
  searchPeople,
}; 