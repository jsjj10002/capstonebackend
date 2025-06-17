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
      maxlength: [50, '이름은 50자를 초과할 수 없습니다.'],
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
    tags: {
      type: [String], // 태그 배열 (다중값 지원)
      default: [],
      validate: {
        validator: function(tags) {
          // 태그 개수 제한 (최대 20개)
          if (tags.length > 20) return false;
          // 각 태그 길이 제한 (최대 30자)
          return tags.every(tag => tag.length <= 30);
        },
        message: '태그는 최대 20개까지, 각 태그는 30자를 초과할 수 없습니다.'
      }
    },
    // 컨트롤러에서 사용하는 필드들 추가
    hairStyle: {
      type: String,
      default: '',
      maxlength: [100, '헤어스타일 설명은 100자를 초과할 수 없습니다.'],
    },
    clothing: {
      type: String,
      default: '',
      maxlength: [100, '의상 설명은 100자를 초과할 수 없습니다.'],
    },
    accessories: {
      type: String,
      default: '',
      maxlength: [100, '액세서리 설명은 100자를 초과할 수 없습니다.'],
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