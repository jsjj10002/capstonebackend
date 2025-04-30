const mongoose = require('mongoose');
const dotenv = require('dotenv');

// 환경 변수 설정
dotenv.config();

async function dropUsernameIndex() {
  try {
    // MongoDB에 연결
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/test');
    console.log('MongoDB에 연결되었습니다.');

    // username 인덱스 삭제
    await mongoose.connection.db.collection('users').dropIndex('username_1');
    console.log('username 인덱스가 성공적으로 삭제되었습니다.');
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    // 연결 종료
    await mongoose.disconnect();
    console.log('MongoDB 연결이 종료되었습니다.');
  }
}

// 스크립트 실행
dropUsernameIndex(); 