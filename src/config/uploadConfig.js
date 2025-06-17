const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AWS = require('aws-sdk');

// 업로드 디렉토리 생성
const createUploadDirectory = () => {
  const uploadDir = path.join(__dirname, '../../uploads');
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  return uploadDir;
};

// 로컬 스토리지 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = createUploadDirectory();
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`
    );
  },
});

// 파일 필터링 - 보안 강화
const fileFilter = (req, file, cb) => {
  // 허용된 MIME 타입 검증
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif'
  ];
  
  // 허용된 확장자 검증
  const allowedExtensions = /\.(jpeg|jpg|png|gif)$/i;
  
  // 파일명 검증 (경로 조작 공격 방지)
  const fileName = file.originalname.toLowerCase();
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return cb(new Error('유효하지 않은 파일명입니다.'));
  }
  
  // MIME 타입 검증
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error(`지원되지 않는 MIME 타입입니다. (${allowedMimeTypes.join(', ')}만 허용)`));
  }
  
  // 확장자 검증
  if (!allowedExtensions.test(fileName)) {
    return cb(new Error('지원되지 않는 파일 확장자입니다. (jpeg, jpg, png, gif만 허용)'));
  }
  
  // 파일 크기 추가 검증 (5MB)
  if (file.size && file.size > 5 * 1024 * 1024) {
    return cb(new Error('파일 크기는 5MB를 초과할 수 없습니다.'));
  }
  
  cb(null, true);
};

// S3 설정
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  correctClockSkew: true  // 시간 차이 자동 보정 기능correctClockSkew: true  // 시간 차이 자동 보정 기능
});

// S3에 파일 업로드 함수
const uploadToS3 = (file) => {
  const fileStream = fs.createReadStream(file.path);
  
  const uploadParams = {
    Bucket: process.env.AWS_S3_BUCKET,
    Body: fileStream,
    Key: `uploads/${Date.now()}_${file.filename}`,
    ContentType: file.mimetype,
  };
  
  return s3.upload(uploadParams).promise();
};

// 로컬 업로드 설정
const uploadLocal = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
  fileFilter,
});

const getSignedUrl = (key) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Expires: 60 * 60 // 1시간 유효
  };
  
  return s3.getSignedUrl('getObject', params);
};

module.exports = {
  uploadLocal,
  uploadToS3,
  getSignedUrl
}; 