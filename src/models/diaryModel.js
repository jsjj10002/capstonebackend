const mongoose = require('mongoose');

const diarySchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, '일기 내용을 입력해주세요.'],
  },
  diaryDate: {
    type: Date,
    default: Date.now,
  },
  photos: [{
    type: String,
  }],
  imagePrompt: {
    type: String,
  },
  generatedImage: {
    type: String,
  },
  artStyleId: {
    type: String,
    default: 'realistic',
  },
  mainCharacter: {
    personId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Person',
      default: null,
    },
    name: {
      type: String,
      default: null,
    },
    isFromContacts: {
      type: Boolean,
      default: false,
    },
  },
  // 단순화된 프롬프트 로그
  promptLog: {
    finalPrompt: String,
    characterDescription: String,
    requiredKeywords: [String], // 화풍별 필수 키워드 배열 추가
    artStyleId: String, // 화풍 ID 추가
    createdAt: { type: Date, default: Date.now },
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// 인덱스 단순화
diarySchema.index({ content: 'text' });
diarySchema.index({ userId: 1, diaryDate: -1 });

// 한국어 조사 전처리 함수
const removeKoreanParticles = (name) => {
  // 한국어 조사 제거 (과/와, 을/를, 이/가, 은/는, 에게, 한테, 으로/로 등)
  const particles = ['과', '와', '을', '를', '이', '가', '은', '는', '에게', '한테', '으로', '로', '에서', '부터', '까지', '만', '도', '조차', '마저'];
  let cleanName = name;
  
  for (const particle of particles) {
    if (cleanName.endsWith(particle)) {
      cleanName = cleanName.slice(0, -particle.length);
      break;
    }
  }
  
  return cleanName.trim();
};

// @태그 추출 및 조사 제거 미들웨어
diarySchema.pre('save', function(next) {
  if (this.isModified('content')) {
    const atMentions = this.content.match(/@[^\s]+/g);
    if (atMentions && atMentions.length > 0) {
      // @ 제거 후 조사 전처리
      const rawName = atMentions[0].substring(1);
      const cleanName = removeKoreanParticles(rawName);
      
      if (!this.mainCharacter.name) {
        this.mainCharacter.name = cleanName;
      }
      
      console.log(`주인공 이름 추출: "${rawName}" -> "${cleanName}"`);
    }
  }
  next();
});

const Diary = mongoose.model('Diary', diarySchema);
module.exports = Diary; 