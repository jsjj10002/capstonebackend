const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// 환경 변수 설정
dotenv.config();

// Express 앱 초기화
const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공 (업로드된 이미지 등)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 라우트 import
const userRoutes = require('./routes/userRoutes');
const diaryRoutes = require('./routes/diaryRoutes');

// 라우트 설정
app.use('/api/users', userRoutes);
app.use('/api/diaries', diaryRoutes);

// MongoDB 연결
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB에 연결되었습니다.'))
  .catch((err) => console.error('MongoDB 연결 오류:', err));

// 기본 라우트
app.get('/', (req, res) => {
  res.send('일기 앱 API가 정상적으로 동작 중입니다.');
});

// 서버 실행
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 