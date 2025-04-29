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

// 파일 필터링
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const isValidFileType = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  
  if (isValidFileType) {
    return cb(null, true);
  } else {
    cb(new Error('지원되지 않는 파일 형식입니다. (jpeg, jpg, png, gif만 허용)'));
  }
};

// S3 설정
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
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