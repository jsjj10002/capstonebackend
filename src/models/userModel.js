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
    console.log('비밀번호가 수정되지 않음, 해싱 스킵');
    return next();
  }
  
  try {
    console.log('=== 비밀번호 해싱 시작 ===');
    console.log('원본 비밀번호 길이:', this.password ? this.password.length : 0);
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(this.password, salt);
    
    console.log('해싱 완료');
    console.log('해시된 비밀번호 길이:', hashedPassword ? hashedPassword.length : 0);
    console.log('해시된 비밀번호 시작:', hashedPassword ? hashedPassword.substring(0, 10) + '...' : 'null');
    
    this.password = hashedPassword;
    next();
  } catch (error) {
    console.error('비밀번호 해싱 오류:', error);
    next(error);
  }
});

// 비밀번호 검증 메소드
userSchema.methods.matchPassword = async function (enteredPassword) {
  console.log('=== 비밀번호 매칭 시작 ===');
  console.log('입력된 비밀번호 길이:', enteredPassword ? enteredPassword.length : 0);
  console.log('저장된 해시 길이:', this.password ? this.password.length : 0);
  console.log('저장된 해시 시작:', this.password ? this.password.substring(0, 10) + '...' : 'null');
  
  const result = await bcrypt.compare(enteredPassword, this.password);
  console.log('비밀번호 매칭 결과:', result);
  
  return result;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 