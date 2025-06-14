const mongoose = require('mongoose');
const ArtStyle = require('./src/models/artStyleModel');
require('dotenv').config();

// MongoDB 연결
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB에 연결되었습니다.'))
  .catch((err) => console.error('MongoDB 연결 오류:', err));

// 기본 화풍 데이터
const defaultArtStyles = [
  {
    name: 'realistic',
    displayName: '사실적',
    description: '사실적이고 자연스러운 사진 스타일',
    workflowFile: 'comfytest.json',
    checkpointName: 'v1-5-pruned-emaonly-fp16.safetensors',
    requiredKeywords: ['realistic', 'photorealistic', 'natural lighting'],
    negativePrompt: '(hands), text, error, cropped, (worst quality:1.2), (low quality:1.2), normal quality, (jpeg artifacts:1.3), signature, watermark, username, blurry, artist name, cartoon, anime',
    steps: 20,
    cfg: 7,
    sampler: 'dpmpp_2m',
    scheduler: 'karras'
  },
  {
    name: 'makoto_shinkai',
    displayName: '신카이 마코토 스타일',
    description: '신카이 마코토 감독의 애니메이션 스타일',
    workflowFile: 'Makoto Shinkai workflow.json',
    checkpointName: 'makoto-shinkai-style.safetensors',
    requiredKeywords: ['makoto shinkai style', 'anime', 'cinematic lighting', 'detailed sky', 'beautiful scenery'],
    negativePrompt: '(hands), text, error, cropped, (worst quality:1.2), (low quality:1.2), normal quality, (jpeg artifacts:1.3), signature, watermark, username, blurry, artist name, realistic, photorealistic',
    steps: 25,
    cfg: 8,
    sampler: 'dpmpp_2m',
    scheduler: 'karras'
  },
  {
    name: 'watercolor',
    displayName: '수채화',
    description: '부드럽고 따뜻한 수채화 스타일',
    workflowFile: 'comfytest.json',
    checkpointName: 'watercolor-style.safetensors',
    requiredKeywords: ['watercolor painting', 'soft colors', 'artistic', 'traditional art'],
    negativePrompt: '(hands), text, error, cropped, (worst quality:1.2), (low quality:1.2), normal quality, (jpeg artifacts:1.3), signature, watermark, username, blurry, artist name, photorealistic, digital art',
    steps: 20,
    cfg: 6,
    sampler: 'euler',
    scheduler: 'normal'
  },
  {
    name: 'oil_painting',
    displayName: '유화',
    description: '클래식한 유화 스타일',
    workflowFile: 'comfytest.json',
    checkpointName: 'oil-painting-style.safetensors',
    requiredKeywords: ['oil painting', 'classical art', 'brush strokes', 'artistic'],
    negativePrompt: '(hands), text, error, cropped, (worst quality:1.2), (low quality:1.2), normal quality, (jpeg artifacts:1.3), signature, watermark, username, blurry, artist name, photorealistic, anime',
    steps: 22,
    cfg: 7.5,
    sampler: 'dpmpp_sde',
    scheduler: 'karras'
  }
];

// 화풍 데이터 초기화 함수
async function initializeArtStyles() {
  try {
    // 기존 화풍 데이터 삭제
    await ArtStyle.deleteMany({});
    console.log('기존 화풍 데이터를 삭제했습니다.');

    // 새 화풍 데이터 삽입
    const createdStyles = await ArtStyle.insertMany(defaultArtStyles);
    console.log(`${createdStyles.length}개의 화풍이 생성되었습니다:`);
    
    createdStyles.forEach(style => {
      console.log(`- ${style.displayName} (${style.name})`);
    });

  } catch (error) {
    console.error('화풍 데이터 초기화 오류:', error);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB 연결을 종료했습니다.');
  }
}

// 스크립트 실행
initializeArtStyles();