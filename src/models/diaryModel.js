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
      trim: true,
      default: '',
    },
    content: {
      type: String,
      required: [true, '내용은 필수입니다.'],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    mood: {
      type: String,
      enum: ['행복', '슬픔', '분노', '불안', '평온', '기타'],
      default: '기타',
    },
    photos: [
      {
        type: String,
      },
    ],
    tags: [
      {
        type: String,
      },
    ],
    artStyle: {
      type: String,
      enum: ['Makoto Shinkai', 'Anime', 'Realistic', 'Watercolor', 'Oil Painting'],
      default: 'Makoto Shinkai',
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

// 검색을 위한 인덱스 생성
diarySchema.index({ title: 'text', content: 'text', tags: 'text' });
// 날짜별 조회를 위한 인덱스 추가
diarySchema.index({ user: 1, date: -1 });

const Diary = mongoose.model('Diary', diarySchema);

module.exports = Diary; 