const mongoose = require('mongoose');

const personSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true, // 누가 이 사람의 정보를 업로드했는지
    },
    name: {
      type: String,
      required: [true, '이름은 필수입니다.'],
      trim: true,
    },
    relation: {
      type: String,
      enum: ['가족', '친구', '동료', '지인', '기타'],
      default: '기타',
    },
    photo: {
      type: String, // 사진 URL
      required: [true, '사진은 필수입니다.'],
    },
    notes: {
      type: String, // 추가 메모
      default: '',
    },
    // 인물 스타일 정보 추가
    gender: {
      type: String,
      enum: ['남성', '여성', '기타'],
      default: '기타',
    },
    clothing: {
      type: String,  // 의상 정보
      default: '',
    },
    hairstyle: {
      type: String,  // 헤어스타일 정보
      default: '',
    },
    accessories: {
      type: String,  // 악세사리 정보
      default: '',
    },
    appearance: {
      type: String,  // 기타 외모 특징
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Person = mongoose.model('Person', personSchema);

module.exports = Person; 