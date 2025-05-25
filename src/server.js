const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Node.js v18 이상은 내장 fetch를 사용, 그 이하는 node-fetch 패키지 사용
let fetch;
if (!globalThis.fetch) {
  fetch = require('node-fetch');
} else {
  fetch = globalThis.fetch;
}

// 환경 변수 설정
dotenv.config();

// ComfyUI 서버 URL 설정 (환경 변수에 없을 경우 기본값 사용)
const COMFY_SERVER_URL = process.env.COMFY_SERVER_URL || 'http://127.0.0.1:8188';
console.log(`ComfyUI 서버 URL: ${COMFY_SERVER_URL}`);

// Express 앱 초기화
const app = express();

// 앱 변수에 COMFY_SERVER_URL 저장
app.locals.COMFY_SERVER_URL = COMFY_SERVER_URL;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공 (업로드된 이미지 등)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 라우트 import
const userRoutes = require('./routes/userRoutes');
const diaryRoutes = require('./routes/diaryRoutes');
const personRoutes = require('./routes/personRoutes');

// 라우트 설정
app.use('/api/users', userRoutes);
app.use('/api/diaries', diaryRoutes);
app.use('/api/people', personRoutes);

// MongoDB 연결
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB에 연결되었습니다.'))
  .catch((err) => console.error('MongoDB 연결 오류:', err));

// 기본 라우트
app.get('/', (req, res) => {
  res.send('일기 앱 API가 정상적으로 동작 중입니다.');
});

// 서버 상태 확인 엔드포인트
app.get('/api/ping', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: '서버가 정상적으로 동작 중입니다.',
    // ComfyUI 서버 설정 정보 (보안상 민감하지 않은 정보만)
    comfyui: { 
      server_url: process.env.COMFY_SERVER_URL || '설정되지 않음'
    }
  });
});

// ComfyUI 서버 연결 테스트
app.get('/api/test-comfyui', async (req, res) => {
  try {
    // ComfyUI 서버에 연결 시도
    const startTime = Date.now();
    const response = await fetch(`${COMFY_SERVER_URL}/history`).catch(err => {
      console.error('ComfyUI 서버 연결 오류:', err);
      throw new Error(`ComfyUI 서버에 연결할 수 없습니다: ${err.message}`);
    });
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`ComfyUI 서버가 오류 응답을 반환했습니다: ${response.status} ${response.statusText}`);
    }
    
    // 응답 확인
    const data = await response.json();
    
    res.status(200).json({
      status: 'ok',
      message: 'ComfyUI 서버가 정상적으로 응답했습니다.',
      response_time_ms: responseTime,
      comfyui: {
        url: COMFY_SERVER_URL,
        history_count: Object.keys(data).length,
        // 워크플로우 테스트 데이터
        workflow_test: fs.existsSync(path.join(__dirname, '../comfytest.json')) ? 'workflow file exists' : 'workflow file missing'
      }
    });
  } catch (error) {
    console.error('ComfyUI 테스트 오류:', error);
    res.status(500).json({
      status: 'error',
      message: `ComfyUI 서버 테스트 실패: ${error.message}`,
      error: error.stack
    });
  }
});

// 서버 실행
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 