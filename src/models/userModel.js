const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, '사용자명을 입력해주세요.'],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, '이메일을 입력해주세요.'],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, '비밀번호를 입력해주세요.'],
      minlength: 6,
    },
    profilePhoto: {
      type: String,
      default: null,
    },
    gender: {
      type: String,
      enum: ['남성', '여성', '기타'],
      required: [true, '성별을 선택해주세요.'],
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
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(this.password, salt);
    
    this.password = hashedPassword;
    next();
  } catch (error) {
    console.error('비밀번호 해싱 오류:', error);
    next(error);
  }
});

// 비밀번호 검증 메소드
userSchema.methods.matchPassword = async function (enteredPassword) {
  const result = await bcrypt.compare(enteredPassword, this.password);
  return result;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 