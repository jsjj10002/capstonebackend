# 일기 앱 백엔드 서버 v2.0

*최종 업데이트: 2025-06-15*

## 📌 목차

- [프로젝트 개요](#프로젝트-개요)
- [주요 기능](#주요-기능) 
- [시스템 아키텍처](#시스템-아키텍처)
- [API 명세서](#api-명세서)
- [설치 및 실행](#설치-및-실행)
- [v2.0 주요 변경사항](#v20-주요-변경사항)
- [개발 진행 상황](#개발-진행-상황)

## 프로젝트 개요

Express.js 기반의 일기 애플리케이션 백엔드 서버이다. 사용자 인증, 일기 관리, 인물 관리, AI 기반 이미지 생성 기능을 제공한다.

- **문서**: [docs/API.md](docs/API.md) - 전체 API 명세서
- **변경사항**: [docs/API_CHANGES_V2.0.md](docs/API_CHANGES_V2.0.md) - v1.0에서 v2.0 변경 내역

### 핵심 특징

- **JWT 기반 사용자 인증** - 안전한 사용자 관리
- **AI 이미지 생성** - 일기 내용 기반 자동 이미지 생성 
- **주인공 연동** - @태그를 통한 인물 자동 인식 및 관리
- **다양한 화풍 지원** - 사실적, 신카이 마코토, 수채화, 유화 스타일
- **ComfyUI 연동** - 고품질 AI 이미지 생성 워크플로우

## 주요 기능

### 🔐 사용자 관리
- 회원가입/로그인 (이메일 기반)
- 프로필 사진 업로드 및 관리
- JWT 토큰 기반 인증
- 비밀번호 변경

### 📝 일기 관리
- 일기 작성 (텍스트 + 이미지)
- 일기 목록 조회 (페이지네이션)
- 월별 일기 조회
- 일기 검색 (내용 기반)
- 일기 수정/삭제

### 👥 인물 관리
- 주변 인물 정보 등록 (이름, 성별, 외모 특징, 사진)
- 인물 목록 조회 및 검색
- 인물 정보 수정/삭제
- @태그를 통한 일기 내 주인공 자동 인식

### 🎨 AI 이미지 생성
- 일기 내용 기반 자동 이미지 프롬프트 생성
- ComfyUI를 통한 고품질 이미지 생성
- 다양한 화풍 스타일 지원
- 프로필 사진 기반 인물 포즈 반영

## 시스템 아키텍처

![시스템 아키텍처](pictures/시스템아키텍쳐.png)

### 구성 요소

- **Express 서버**: RESTful API 제공
- **MongoDB**: 사용자, 일기, 인물 데이터 저장
- **JWT 인증**: 보안 토큰 기반 사용자 인증
- **OpenAI API**: 이미지 생성 프롬프트 자동 생성
- **ComfyUI**: AI 이미지 생성 워크플로우
- **파일 스토리지**: 로컬 업로드 폴더 (/uploads)

### 데이터 흐름

1. **사용자 요청** → Express 서버
2. **인증 검증** → JWT 미들웨어 
3. **비즈니스 로직** → 컨트롤러
4. **데이터 처리** → MongoDB
5. **AI 처리** → OpenAI + ComfyUI
6. **응답 반환** → 클라이언트

## API 명세서

### 📋 API 요약

| 기능 | 메소드 | 엔드포인트 | 인증 필요 |
|------|--------|------------|-----------|
| 회원가입 | POST | `/api/users/register` | ❌ |
| 로그인 | POST | `/api/users/login` | ❌ |
| 프로필 조회 | GET | `/api/users/profile` | ✅ |
| 프로필 수정 | PUT | `/api/users/profile` | ✅ |
| 비밀번호 변경 | PUT | `/api/users/profile/password` | ✅ |
| 일기 작성 | POST | `/api/diaries` | ✅ |
| 일기 목록 | GET | `/api/diaries` | ✅ |
| 일기 검색 | GET | `/api/diaries/search` | ✅ |
| 월별 일기 | GET | `/api/diaries/monthly` | ✅ |
| 일기 상세 | GET | `/api/diaries/:id` | ✅ |
| 인물 추가 | POST | `/api/people` | ✅ |
| 인물 목록 | GET | `/api/people` | ✅ |
| 인물 검색 | GET | `/api/people/search` | ✅ |

전체 API 명세는 [API.md](API.md)를 참조하세요.

### 🔗 주요 API 사용 예시

#### 일기 작성
```bash
POST /api/diaries
Content-Type: multipart/form-data
Authorization: Bearer {token}

# Body
content: "@김철수와 카페에서 만났다. 오늘 날씨가 정말 좋았다."
artStyleId: "makoto_shinkai"
photos: [이미지파일]
```

#### 인물 등록
```bash
POST /api/people
Content-Type: multipart/form-data
Authorization: Bearer {token}

# Body  
name: "김철수"
gender: "남성"
hairStyle: "짧은 머리"
clothing: "캐주얼"
photo: [프로필사진]
```

## 설치 및 실행

### 환경 요구사항

- **Node.js**: v16.0 이상
- **MongoDB**: v4.4 이상  
- **ComfyUI**: 설치 및 실행 중
- **OpenAI API 키**: 유효한 API 키

### 설치 과정

1. **저장소 클론**
```bash
git clone <repository-url>
cd backend
```

2. **의존성 설치**
```bash
npm install
```

3. **환경 변수 설정**
`.env` 파일 생성:
```env
# 서버 설정
PORT=5000

# 데이터베이스
MONGO_URI=mongodb://localhost:27017/diary-app

# JWT 인증
JWT_SECRET=your_strong_jwt_secret_key

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# ComfyUI 설정
COMFY_SERVER_URL=http://127.0.0.1:8188
```

4. **ComfyUI 설정**
- ComfyUI 설치 및 실행
- 필요한 모델 파일 설치:
  - SD XL Turbo 모델
  - ControlNet OpenPose 모델  
  - VAE 모델
- 워크플로우 파일 확인:
  - `comfytest.json`
  - `Makoto Shinkai workflow.json`

5. **서버 실행**
```bash
# 개발 모드
npm run dev

# 프로덕션 모드  
npm start
```

### 확인 방법

1. **서버 상태 확인**
```bash
curl http://localhost:5000/api/ping
```

2. **ComfyUI 연결 확인**
```bash
curl http://localhost:5000/api/test-comfyui
```

## v2.0 주요 변경사항

### 🔴 제거된 기능
- **AI 태그/무드 분석**: 일기 내용 자동 분석 기능 완전 제거
- **일기 제목**: title 필드 제거
- **태그 시스템**: tags 필드 및 관련 API 제거
- **무드 분석**: mood 필드 및 관련 API 제거

### ✅ 새로 추가된 기능
- **화풍 선택**: 4가지 화풍 스타일 지원
- **주인공 자동 인식**: @태그 기반 인물 연동
- **AI 이미지 생성**: ComfyUI 워크플로우 연동
- **프롬프트 로그**: 이미지 생성 과정 기록

### 🔄 변경된 기능
- **OpenAI 모델**: GPT-4-mini → o4-mini
- **일기 데이터**: 구조 단순화 및 AI 관련 필드 추가
- **검색 기능**: 내용 기반 검색만 지원

자세한 변경 사항은 [API_CHANGES_V2.0.md](API_CHANGES_V2.0.md)를 참조하세요.

## 개발 진행 상황

### ✅ 완료된 기능

#### 백엔드 개발 (100%)
- Express.js 기반 RESTful API 서버 구축
- MongoDB 데이터베이스 연결 및 스키마 설계
- JWT 기반 사용자 인증 시스템
- 일기 CRUD 기능 (생성, 조회, 수정, 삭제)
- 인물 관리 기능 (등록, 조회, 검색, 수정, 삭제)
- 파일 업로드 시스템 (multer)

#### AI 기능 (100%)
- OpenAI o4-mini 모델 연동
- 일기 내용 기반 이미지 프롬프트 자동 생성
- ComfyUI API 연동
- 다양한 화풍 워크플로우 지원
- 실시간 이미지 생성 및 저장

#### 데이터베이스 설계 (100%)
- 사용자(User) 모델
- 일기(Diary) 모델  
- 인물(Person) 모델
- 인덱스 최적화

#### 보안 및 인증 (100%)
- JWT 토큰 기반 인증
- bcrypt 비밀번호 해싱
- 권한 검증 미들웨어
- CORS 설정

### 🔧 기술 스택

#### 백엔드
- **Runtime**: Node.js v18+
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT + bcrypt
- **File Upload**: Multer
- **HTTP Client**: node-fetch

#### AI & 외부 서비스
- **언어 모델**: OpenAI o4-mini
- **이미지 생성**: ComfyUI
- **워크플로우**: Stable Diffusion XL + ControlNet

#### 개발 도구
- **환경 변수**: dotenv
- **WebSocket**: ws (ComfyUI 통신)
- **CORS**: cors

### 📁 프로젝트 구조

```
backend/
├── src/
│   ├── controllers/         # API 컨트롤러
│   │   ├── authController.js
│   │   ├── diaryController.js
│   │   └── personController.js
│   ├── models/             # 데이터베이스 모델
│   │   ├── userModel.js
│   │   ├── diaryModel.js
│   │   └── personModel.js
│   ├── routes/             # API 라우트
│   │   ├── userRoutes.js
│   │   ├── diaryRoutes.js
│   │   └── personRoutes.js
│   ├── middleware/         # 미들웨어
│   │   └── authMiddleware.js
│   ├── config/            # 설정 파일
│   │   ├── openaiConfig.js
│   │   ├── comfyuiConfig.js
│   │   └── uploadConfig.js
│   ├── utils/             # 유틸리티
│   │   ├── jwt.js
│   │   └── artStyleManager.js
│   ├── data/              # 데이터 파일
│   │   ├── artStyles.js
│   │   └── artStyles.json
│   └── server.js          # 메인 서버 파일
├── uploads/               # 업로드된 파일
├── pictures/              # 문서용 이미지
├── package.json
├── .env                   # 환경 변수
├── README.md
├── API.md                 # API 명세서
└── API_CHANGES_V2.0.md    # 변경 사항 문서
```


- **문서**: [docs/API.md](docs/API.md) - 전체 API 명세서
- **변경사항**: [docs/API_CHANGES_V2.0.md](docs/API_CHANGES_V2.0.md) - v1.0에서 v2.0 변경 내역

**마지막 업데이트**: 2025년 6월 15일
