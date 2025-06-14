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
    gender: {
      type: String,
      enum: ['남성', '여성', '기타'],
      default: '기타',
    },
    photo: {
      type: String, // 사진 URL
      required: [true, '사진은 필수입니다.'],
    },
    // 외모 특징
    hairStyle: {
      type: String,
      default: '', // 헤어스타일 자유 입력
    },
    clothing: {
      type: String,
      default: '', // 의상 자유 입력
    },
    accessories: {
      type: String,
      default: '', // 악세사리 자유 입력
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

// 사용자별 이름 인덱스
personSchema.index({ user: 1, name: 1 });

const Person = mongoose.model('Person', personSchema);

module.exports = Person; 