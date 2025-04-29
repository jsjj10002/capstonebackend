const mongoose = require('mongoose');

const diarySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, '제목은 필수입니다.'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, '내용은 필수입니다.'],
    },
    mood: {
      type: String,
      enum: ['행복', '슬픔', '분노', '불안', '평온', '기타'],
      default: '기타',
    },
    photos: [
      {
        type: String, // 이미지 URL을 저장
      },
    ],
    tags: [
      {
        type: String,
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// 검색을 위한 인덱스 생성
diarySchema.index({ title: 'text', content: 'text', tags: 'text' });

const Diary = mongoose.model('Diary', diarySchema);

module.exports = Diary; 