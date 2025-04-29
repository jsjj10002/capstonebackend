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
    photoFeatures: {
      type: String, // OpenAI API로 분석한 사진 특징
      default: '',
    },
    notes: {
      type: String, // 추가 메모
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