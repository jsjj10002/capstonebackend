# 일기 앱 백엔드 API 명세서

## 📋 목차

- [개요](#개요)
- [데이터 스키마](#데이터-스키마)
- [API 엔드포인트](#api-엔드포인트)
- [인증 시스템](#인증-시스템)
- [외부 서비스 연동](#외부-서비스-연동)
- [함수 명세](#함수-명세)
- [시스템 아키텍처](#시스템-아키텍처)

## 개요

### 기본 정보
- **Base URL**: `http://localhost:5000/api`
- **Protocol**: HTTP/HTTPS
- **Data Format**: JSON
- **Authentication**: JWT Bearer Token

### 기술 스택
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT
- **File Upload**: Multer
- **AI Services**: OpenAI o4-mini, ComfyUI

## 데이터 스키마

### User Model
```javascript
{
  _id: ObjectId,
  username: String (required, unique),
  email: String (required, unique),
  password: String (required, hashed),
  profilePhoto: String (default: null),
  gender: String (enum: ['남성', '여성', '기타'], required),
  createdAt: Date,
  timestamps: { createdAt, updatedAt }
}
```

### Person Model
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: 'User', required),
  name: String (required),
  gender: String (enum: ['남성', '여성', '기타'], default: '기타'),
  photo: String (required, URL),
  hairStyle: String (default: ''),
  clothing: String (default: ''),
  accessories: String (default: ''),
  createdAt: Date,
  timestamps: { createdAt, updatedAt }
}
```

### Diary Model
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', required),
  content: String (required),
  diaryDate: Date (default: now),
  photos: [String] (URLs),
  imagePrompt: String,
  generatedImage: String (URL),
  artStyleId: String (default: 'realistic'),
  mainCharacter: {
    personId: ObjectId (ref: 'Person'),
    name: String,
    isFromContacts: Boolean (default: false)
  },
  promptLog: {
    finalPrompt: String,
    characterDescription: String,
    createdAt: Date (default: now)
  },
  timestamps: { createdAt, updatedAt }
}
```

### Art Style Model
```javascript
{
  id: String,
  name: String,
  displayName: String,
  description: String,
  workflowFile: String,
  checkpointName: String,
  requiredKeywords: [String],
  negativePrompt: String,
  loraFile: String (optional),
  loraStrength: Number (optional),
  steps: Number,
  cfg: Number,
  sampler: String,
  scheduler: String
}
```

## API 엔드포인트

### 🔐 인증 관련 (Users)

#### 회원가입
```http
POST /api/users/register
Content-Type: multipart/form-data

Body:
- username: string (required)
- email: string (required)
- password: string (required, min: 6)
- gender: string (required, enum: ['남성', '여성', '기타'])
- profilePhoto: file (optional)

Response:
{
  "_id": "string",
  "username": "string",
  "email": "string",
  "profilePhoto": "string",
  "gender": "string",
  "token": "jwt_token"
}
```

#### 로그인
```http
POST /api/users/login
Content-Type: application/json

Body:
{
  "email": "string",
  "password": "string"
}

Response:
{
  "_id": "string",
  "username": "string",
  "email": "string",
  "profilePhoto": "string",
  "gender": "string",
  "token": "jwt_token"
}
```

#### 프로필 조회
```http
GET /api/users/profile
Authorization: Bearer {token}

Response:
{
  "_id": "string",
  "username": "string",
  "email": "string",
  "profilePhoto": "string",
  "gender": "string"
}
```

#### 프로필 사진 업데이트
```http
PUT /api/users/profile/photo
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body:
- profilePhoto: file (required)

Response:
{
  "_id": "string",
  "username": "string",
  "email": "string",
  "profilePhoto": "string",
  "gender": "string"
}
```

#### 프로필 정보 수정
```http
PUT /api/users/profile
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "username": "string",
  "email": "string"
}

Response:
{
  "_id": "string",
  "username": "string",
  "email": "string",
  "profilePhoto": "string",
  "gender": "string"
}
```

#### 비밀번호 변경
```http
PUT /api/users/profile/password
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "currentPassword": "string",
  "newPassword": "string"
}

Response:
{
  "message": "비밀번호가 성공적으로 변경되었습니다."
}
```

### 👥 인물 관리 (People)

#### 새 인물 추가
```http
POST /api/people
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body:
- name: string (required)
- gender: string (enum: ['남성', '여성', '기타'])
- hairStyle: string
- clothing: string
- accessories: string
- photo: file (required)

Response:
{
  "_id": "string",
  "name": "string",
  "gender": "string",
  "photo": "string",
  "hairStyle": "string",
  "clothing": "string",
  "accessories": "string",
  "user": "string",
  "createdAt": "date",
  "updatedAt": "date"
}
```

#### 인물 목록 조회
```http
GET /api/people
Authorization: Bearer {token}

Response:
[
  {
    "_id": "string",
    "name": "string",
    "gender": "string",
    "photo": "string",
    "hairStyle": "string",
    "clothing": "string",
    "accessories": "string",
    "createdAt": "date"
  }
]
```

#### 인물 검색
```http
GET /api/people/search?keyword={keyword}
Authorization: Bearer {token}

Response:
[
  {
    "_id": "string",
    "name": "string",
    "gender": "string",
    "photo": "string",
    "hairStyle": "string",
    "clothing": "string",
    "accessories": "string",
    "user": "string",
    "createdAt": "date",
    "updatedAt": "date"
  }
]
```

#### 특정 인물 조회
```http
GET /api/people/{id}
Authorization: Bearer {token}

Response:
{
  "_id": "string",
  "name": "string",
  "gender": "string",
  "photo": "string",
  "hairStyle": "string",
  "clothing": "string",
  "accessories": "string"
}
```

#### 인물 정보 수정
```http
PUT /api/people/{id}
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body:
- name: string
- gender: string
- hairStyle: string
- clothing: string
- accessories: string
- photo: file (optional)

Response:
{
  "_id": "string",
  "name": "string",
  "gender": "string",
  "photo": "string",
  "hairStyle": "string",
  "clothing": "string",
  "accessories": "string",
  "user": "string",
  "createdAt": "date",
  "updatedAt": "date"
}
```

#### 인물 삭제
```http
DELETE /api/people/{id}
Authorization: Bearer {token}

Response:
{
  "message": "사람이 삭제되었습니다."
}
```

### 📔 일기 관리 (Diaries)

#### 일기 작성
```http
POST /api/diaries
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body:
- content: string (required)
- diaryDate: date (optional)
- artStyleId: string (required)
- mainCharacter: JSON string (optional) - 새 주인공 정보 {gender, hairStyle, clothing, accessories}
- photos: file[] (optional, max: 5)

Response:
{
  "message": "일기가 작성되었습니다.",
  "diary": {
    "_id": "string",
    "content": "string",
    "diaryDate": "date",
    "photos": ["string"],
    "generatedImage": "string",
    "imagePrompt": "string",
    "artStyleId": "string",
    "mainCharacter": {
      "personId": "string",
      "name": "string",
      "isFromContacts": boolean
    },
    "promptLog": {
      "finalPrompt": "string",
      "characterDescription": "string",
      "createdAt": "date"
    }
  },
  "imageGenerated": boolean
}
```

#### 일기 목록 조회 (페이지네이션)
```http
GET /api/diaries?page={page}&limit={limit}
Authorization: Bearer {token}

Response:
{
  "diaries": [
    {
      "_id": "string",
      "content": "string",
      "diaryDate": "date",
      "photos": ["string"],
      "generatedImage": "string",
      "mainCharacter": {
        "personId": {
          "_id": "string",
          "name": "string",
          "photo": "string"
        }
      }
    }
  ],
  "totalPages": number,
  "currentPage": number,
  "total": number
}
```

#### 월별 일기 조회
```http
GET /api/diaries/monthly?year={year}&month={month}
Authorization: Bearer {token}

Response:
[
  {
    "date": "YYYY-MM-DD",
    "id": "string",
    "thumbnail": "string",
    "content": "string (preview)"
  }
]
```

#### 일기 검색
```http
GET /api/diaries/search?keyword={keyword}
Authorization: Bearer {token}

Response:
[
  {
    "_id": "string",
    "content": "string",
    "diaryDate": "date",
    "generatedImage": "string",
    "mainCharacter": {
      "personId": {
        "name": "string",
        "photo": "string"
      }
    }
  }
]
```

#### 특정 일기 조회
```http
GET /api/diaries/{id}
Authorization: Bearer {token}

Response:
{
  "_id": "string",
  "content": "string",
  "diaryDate": "date",
  "photos": ["string"],
  "generatedImage": "string",
  "imagePrompt": "string",
  "artStyleId": "string",
  "mainCharacter": {
    "personId": {
      "_id": "string",
      "name": "string",
      "photo": "string",
      "gender": "string",
      "hairStyle": "string",
      "clothing": "string",
      "accessories": "string"
    }
  },
  "promptLog": {
    "finalPrompt": "string",
    "characterDescription": "string",
    "createdAt": "date"
  },
  "artStyle": {
    "name": "string",
    "displayName": "string",
    "description": "string"
  }
}
```

#### 일기 수정
```http
PUT /api/diaries/{id}
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body:
- content: string
- photos: file[] (optional)

Response:
{
  "_id": "string",
  "content": "string",
  "diaryDate": "date",
  "photos": ["string"],
  "mainCharacter": {
    "personId": {
      "name": "string",
      "photo": "string"
    }
  }
}
```

#### 일기 삭제
```http
DELETE /api/diaries/{id}
Authorization: Bearer {token}

Response:
{
  "message": "일기가 삭제되었습니다."
}
```

#### 프롬프트 로그 조회
```http
GET /api/diaries/{id}/prompt-log
Authorization: Bearer {token}

Response:
{
  "promptLog": {
    "finalPrompt": "string",
    "characterDescription": "string",
    "createdAt": "date"
  },
  "artStyle": {
    "name": "string",
    "displayName": "string",
    "workflowFile": "string"
  }
}
```

### 🛠️ 시스템 상태

#### 서버 상태 확인
```http
GET /api/ping

Response:
{
  "status": "ok",
  "message": "서버가 정상적으로 동작 중입니다.",
  "comfyui": {
    "server_url": "string"
  }
}
```

#### ComfyUI 연결 테스트
```http
GET /api/test-comfyui

Response:
{
  "status": "ok",
  "message": "ComfyUI 서버가 정상적으로 응답했습니다.",
  "response_time_ms": number,
  "comfyui": {
    "url": "string",
    "history_count": number,
    "workflow_test": "string"
  }
}
```

## 인증 시스템

### JWT 토큰 구조
```javascript
{
  "id": "user_id",
  "iat": timestamp,
  "exp": timestamp
}
```

### 인증 미들웨어
- **경로**: `src/middleware/authMiddleware.js`
- **기능**: JWT 토큰 검증 및 사용자 정보 추출
- **헤더**: `Authorization: Bearer {token}`

## 외부 서비스 연동

### OpenAI API
- **모델**: o4-mini
- **용도**: 일기 내용 기반 이미지 프롬프트 생성
- **함수**: `generateImagePrompt(diaryContent, characterDescription)`

### ComfyUI API
- **URL**: `http://127.0.0.1:8188` (기본값)
- **용도**: AI 이미지 생성
- **워크플로우**: Makoto Shinkai style, Realistic style
- **함수**: `runOriginalWorkflow(workflowPath, prompt, imageName)`

## 함수 명세

### 인증 함수

| 함수명 | 입력 | 출력 | 설명 |
|--------|------|------|------|
| `registerUser` | `{ username, email, password, gender, profilePhoto }` | `{ user, token }` | 사용자 회원가입 |
| `loginUser` | `{ email, password }` | `{ user, token }` | 사용자 로그인 |
| `getUserProfile` | `userId` | `user` | 프로필 조회 |
| `updateProfilePhoto` | `{ userId, profilePhoto }` | `user` | 프로필 사진 업데이트 |
| `updateUserProfile` | `{ userId, username, email }` | `user` | 프로필 정보 수정 |
| `changePassword` | `{ userId, currentPassword, newPassword }` | `{ message }` | 비밀번호 변경 |

### 인물 관리 함수

| 함수명 | 입력 | 출력 | 설명 |
|--------|------|------|------|
| `addPerson` | `{ name, gender, hairStyle, clothing, accessories, photo }` | `person` | 새 인물 추가 |
| `getMyPeople` | `userId` | `[person]` | 사용자의 인물 목록 |
| `searchPeople` | `{ userId, keyword }` | `[person]` | 인물 검색 |
| `getPersonById` | `{ userId, personId }` | `person` | 특정 인물 조회 |
| `updatePerson` | `{ userId, personId, updateData }` | `person` | 인물 정보 수정 |
| `deletePerson` | `{ userId, personId }` | `{ message }` | 인물 삭제 |

### 일기 관리 함수

| 함수명 | 입력 | 출력 | 설명 |
|--------|------|------|------|
| `createDiary` | `{ userId, content, diaryDate, artStyleId, photos }` | `{ diary, imageGenerated }` | 일기 작성 |
| `getDiaries` | `{ userId, page, limit }` | `{ diaries, pagination }` | 일기 목록 조회 |
| `getDiariesByMonth` | `{ userId, year, month }` | `[monthlyDiary]` | 월별 일기 조회 |
| `getDiaryById` | `{ userId, diaryId }` | `diary` | 특정 일기 조회 |
| `updateDiary` | `{ userId, diaryId, content, photos }` | `diary` | 일기 수정 |
| `deleteDiary` | `{ userId, diaryId }` | `{ message }` | 일기 삭제 |
| `searchDiaries` | `{ userId, keyword }` | `[diary]` | 일기 검색 |
| `getDiaryPromptLog` | `{ userId, diaryId }` | `{ promptLog, artStyle }` | 프롬프트 로그 조회 |

### AI 이미지 생성 함수

| 함수명 | 입력 | 출력 | 설명 |
|--------|------|------|------|
| `generateImageForDiary` | `{ diary, user, artStyle }` | `{ success, photoUrl, prompt, promptLog }` | 일기용 이미지 생성 |
| `generateImagePrompt` | `{ diaryContent, characterDescription }` | `string` | OpenAI로 프롬프트 생성 |
| `runOriginalWorkflow` | `{ workflowPath, prompt, imageName }` | `{ success, imageData, imageUrl }` | ComfyUI 워크플로우 실행 |

### 유틸리티 함수

| 함수명 | 입력 | 출력 | 설명 |
|--------|------|------|------|
| `generateToken` | `userId` | `string` | JWT 토큰 생성 |
| `getArtStyleById` | `artStyleId` | `artStyle` | 화풍 정보 조회 |
| `getDefaultArtStyle` | - | `artStyle` | 기본 화풍 조회 |
| `removeKoreanParticles` | `string` | `string` | 한국어 조사 제거 |

## 시스템 아키텍처

### 전체 시스템 구조

![시스템 아키텍처](pictures/시스템아키텍쳐.png)

### 주요 구성 요소

#### 1. 클라이언트 계층
- **웹 브라우저**: 사용자 인터페이스 제공
- **모바일 앱**: 네이티브 모바일 애플리케이션

#### 2. API 서버 계층
- **Express.js 서버**: RESTful API 엔드포인트 제공
- **JWT 미들웨어**: 사용자 인증 및 권한 관리
- **Multer 미들웨어**: 파일 업로드 처리
- **CORS 미들웨어**: 크로스 오리진 요청 처리

#### 3. 비즈니스 로직 계층
- **사용자 관리**: 회원가입, 로그인, 프로필 관리
- **일기 관리**: CRUD 작업, 검색, 페이지네이션
- **인물 관리**: 인물 정보 저장 및 관리
- **AI 이미지 생성**: 프롬프트 생성 및 이미지 생성 로직

#### 4. 데이터 저장 계층
- **MongoDB**: 사용자, 일기, 인물 데이터 저장
- **로컬 파일 시스템**: 업로드된 이미지 파일 저장 (/uploads)

#### 5. 외부 서비스 계층
- **OpenAI API**: o4-mini 모델을 통한 이미지 프롬프트 생성
- **ComfyUI**: AI 이미지 생성 워크플로우 실행
- **AWS S3** (선택사항): 클라우드 파일 저장소

### 데이터 플로우

1. **일기 작성 플로우**:
   - 사용자가 일기 내용 입력 → Express 서버 → MongoDB 저장
   - @태그 감지 → 인물 정보 조회 → OpenAI 프롬프트 생성
   - ComfyUI 이미지 생성 → 로컬 저장 → 일기 업데이트

2. **인증 플로우**:
   - 로그인 요청 → 사용자 검증 → JWT 토큰 생성 → 클라이언트 저장
   - API 요청 시 JWT 토큰 검증 → 권한 확인 → 요청 처리

3. **파일 업로드 플로우**:
   - 파일 선택 → Multer 처리 → 로컬 저장 → URL 반환
   - 프로필 사진/인물 사진 → 데이터베이스 URL 저장

### 보안 고려사항

- **JWT 토큰**: 사용자 인증 및 세션 관리
- **비밀번호 해싱**: bcrypt를 통한 안전한 비밀번호 저장
- **파일 검증**: 업로드 파일 타입 및 크기 제한
- **CORS 설정**: 허용된 도메인에서만 API 접근 가능
- **환경 변수**: 민감한 정보는 .env 파일로 관리


## 에러 코드

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| 200 | OK | 성공 |
| 201 | Created | 리소스 생성 성공 |
| 400 | Bad Request | 잘못된 요청 |
| 401 | Unauthorized | 인증 실패 |
| 403 | Forbidden | 권한 없음 |
| 404 | Not Found | 리소스 없음 |
| 500 | Internal Server Error | 서버 오류 |

## 환경 변수

```env
# 데이터베이스
MONGO_URI=mongodb://localhost:27017/diary-app

# JWT
JWT_SECRET=your_jwt_secret

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# ComfyUI
COMFY_SERVER_URL=http://127.0.0.1:8188

# 서버
PORT=5000
```

## 화풍 스타일

현재 지원되는 화풍 스타일:


### makoto_shinkai
- **이름**: 신카이 마코토
- **설명**: 신카이 마코토 스타일의 아름답고 감성적인 화풍
- **워크플로우**: Makoto Shinkai workflow.json
- **LoRA**: Makoto Shinkai.safetensors (강도: 1.0)


## 사용 예제

### 일기 작성 예제
```javascript
// @태그가 포함된 일기 작성
const formData = new FormData();
formData.append('content', '@박재석과 카페에서 커피를 마셨다. 정말 즐거운 시간이었다.');
formData.append('artStyleId', 'makoto_shinkai');

// 새로운 주인공인 경우 추가 정보 필요
formData.append('mainCharacter', JSON.stringify({
  gender: '남성',
  hairStyle: 'short hair',
  clothing: 'casual clothes',
  accessories: 'glasses'
}));
formData.append('photos', profilePhotoFile);

const response = await fetch('/api/diaries', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
});
```

### 인물 검색 예제
```javascript
const response = await fetch('/api/people/search?keyword=박재석', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
const people = await response.json();
```

---

**최종 업데이트**: 2025년 6월 15일  
**API 버전**: v2.0  
