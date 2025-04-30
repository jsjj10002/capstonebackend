const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, '사용자 이름은 필수입니다.'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, '이메일은 필수입니다.'],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        '유효한 이메일 주소를 입력해주세요.',
      ],
    },
    password: {
      type: String,
      required: [true, '비밀번호는 필수입니다.'],
      minlength: 6,
      select: false, // 쿼리 결과에 비밀번호 필드가 포함되지 않도록 설정
    },
    profilePhoto: {
      type: String,
      default: '',
    },
    profilePhotoFeatures: {
      type: String, // OpenAI API로 분석한 프로필 사진 특징
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

// 비밀번호 해싱
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 비밀번호 검증 메소드
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User; 