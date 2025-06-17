# 일기 앱 백엔드 API 명세서 v2.1

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
- **Version**: v2.1

### 기술 스택
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT
- **File Upload**: Multer
- **AI Services**: Google Gemini 2.5 Flash Preview, ComfyUI
- **WebSocket**: ws (실시간 통신)
- **Cloud Storage**: AWS S3 (선택사항)

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
  artStyleId: String (default: 'makoto_shinkai'),
  mainCharacter: {
    personId: ObjectId (ref: 'Person'),
    name: String,
    isFromContacts: Boolean (default: false)
  },
  promptLog: {
    finalPrompt: String,
    characterDescription: String,
    sceneDescription: String,
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
  loraStrengthClip: Number (optional),
  steps: Number,
  cfg: Number,
  sampler: String,
  scheduler: String,
  denoise: Number,
  upscaleSteps: Number (optional),
  upscaleCfg: Number (optional),
  upscaleSampler: String (optional),
  vaeFile: String,
  clipFile: String (optional),
  clipLayer: Number (optional),
  hasLoRA: Boolean,
  hasCLIPLoader: Boolean,
  freeUSettings: Object (optional),
  ipAdapterSettings: Object (optional)
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

#### 화풍 목록 조회 (NEW)
```http
GET /api/diaries/art-styles
Authorization: Bearer {token}

Response:
[
  {
    "id": "makoto_shinkai",
    "name": "신카이 마코토",
    "displayName": "Makoto Shinkai",
    "description": "신카이 마코토 스타일의 아름답고 감성적인 화풍",
    "workflowFile": "Makoto Shinkai workflow.json",
    "requiredKeywords": ["shinkai makoto", "kimi no na wa.", "tenki no ko", "kotonoha no niwa"],
    "hasLoRA": true,
    "hasCLIPLoader": true
  },
  {
    "id": "esthetic_80s",
    "name": "에스테틱 80년대",
    "displayName": "Esthetic 80s",
    "description": "80년대 레트로 아메리칸 스타일의 감성적인 화풍",
    "workflowFile": "Esthetic 80s workflow.json",
    "requiredKeywords": ["1980s (style)"],
    "hasLoRA": true,
    "hasCLIPLoader": true
  },
  {
    "id": "3d_character",
    "name": "3D 캐릭터",
    "displayName": "3D Character",
    "description": "귀여운 3D 캐릭터 스타일의 치비 화풍",
    "workflowFile": "_3d character style.json",
    "requiredKeywords": ["chibi"],
    "hasLoRA": true,
    "hasCLIPLoader": true
  },
  {
    "id": "minimalist_line",
    "name": "미니멀 라인",
    "displayName": "Minimalist Line",
    "description": "깔끔하고 심플한 라인 아트 스타일",
    "workflowFile": "Minimalist Line workflow.json",
    "requiredKeywords": ["minimalist", "line art", "simple"],
    "hasLoRA": true,
    "hasCLIPLoader": true
  },
  {
    "id": "disney_pixar",
    "name": "디즈니 픽사",
    "displayName": "Disney Pixar",
    "description": "디즈니 픽사 스타일의 3D 애니메이션 화풍",
    "workflowFile": "Disney Pixar workflow.json",
    "requiredKeywords": ["disney pixar style", "3d animation", "cartoon"],
    "hasLoRA": false,
    "hasCLIPLoader": false,
    "freeUSettings": {
      "b1": 1.3,
      "b2": 1.4,
      "s1": 0.9,
      "s2": 0.2
    }
  }
]
```

#### 장면 묘사 생성 (NEW)
```http
POST /api/diaries/generate-scene
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "content": "string (required) - 일기 내용",
  "protagonistName": "string (optional) - 주인공 이름",
  "sceneDirectionHint": "string (optional) - 장면 연출 힌트"
}

Response:
{
  "diaryContent": "string - 원본 일기 내용",
  "sceneDescription": "string - 생성된 장면 묘사",
  "protagonistInfo": {
    "personId": "string (optional) - 연락처에 있는 경우",
    "name": "string - 주인공 이름",
    "gender": "string (optional) - 성별",
    "photo": "string (optional) - 프로필 사진",
    "isFromContacts": "boolean - 연락처 등록 여부"
  },
  "extractedProtagonist": "string - 추출된 주인공 이름"
}
```

#### 일기 작성 (두 단계 프로세스)
```http
POST /api/diaries
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body:
- content: string (required) - 일기 내용
- diaryDate: date (optional) - 일기 날짜
- artStyleId: string (required) - 화풍 ID
- sceneDescription: string (required) - 장면 묘사 (generate-scene에서 받은 값)
- userAppearanceKeywords: string (optional) - 사용자 외모 키워드
- mainCharacterGender: string (optional) - 새 주인공의 성별 (연락처에 없는 경우)
- photos: file[] (optional, max: 5) - 첨부 사진

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
      "sceneDescription": "string",
      "createdAt": "date"
    }
  },
  "imageGenerated": boolean
}

Error Response (새 주인공 정보 필요):
{
  "message": "새로운 인물 \"이름\"이 지정되었습니다. 성별을 선택해주세요.",
  "requiresCharacterInfo": true,
  "mainCharacterName": "string",
  "requiredFields": ["gender"]
}

Error Response (주인공 사진 필요):
{
  "message": "새로운 인물 \"이름\"의 사진을 업로드해주세요.",
  "requiresPhoto": true,
  "mainCharacterName": "string"
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
    "sceneDescription": "string",
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
    "sceneDescription": "string",
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

### Google Gemini AI
- **모델**: gemini-2.5-flash-preview-05-20
- **용도**: 장면 묘사 생성, 이미지 프롬프트 생성, 주인공 이름 추출
- **특징**: Thinking Config (24,576 토큰), Streaming 응답
- **함수**: 
  - `generateSceneDescription(diaryContent, protagonistName, sceneHint)`
  - `generateImagePrompt(sceneDescription, diaryContent, gender, userAppearanceKeywords, mandatoryKeywords)`
  - `generateProtagonistName(diaryContent)`

### ComfyUI API
- **URL**: `http://127.0.0.1:8188` (기본값)
- **용도**: AI 이미지 생성
- **워크플로우**: 5가지 화풍 지원 (Makoto Shinkai, Esthetic 80s, 3D Character, Minimalist Line, Disney Pixar)
- **특징**: 범용 워크플로우 시스템, Anything Everywhere 자동 복구
- **함수**: `processUniversalWorkflow(workflowFile, positivePrompt, negativePrompt, imageFile)`

### AWS S3 (선택사항)
- **용도**: 클라우드 파일 저장소
- **함수**: `uploadToS3(file, bucketName, key)`

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
| `getAllArtStylesAPI` | - | `[artStyle]` | 화풍 목록 조회 |
| `generateSceneDescriptionAPI` | `{ content, protagonistName, sceneDirectionHint }` | `{ sceneDescription, protagonistInfo }` | 장면 묘사 생성 |
| `createDiary` | `{ userId, content, sceneDescription, artStyleId, userAppearanceKeywords, photos }` | `{ diary, imageGenerated }` | 일기 작성 |
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
| `generateImageForDiary` | `{ diary, user, artStyle, sceneDescription, userAppearanceKeywords }` | `{ success, photoUrl, prompt, promptLog }` | 일기용 이미지 생성 |
| `generateSceneDescription` | `{ diaryContent, protagonistName, sceneHint }` | `string` | Gemini로 장면 묘사 생성 |
| `generateImagePrompt` | `{ sceneDescription, diaryContent, gender, userAppearanceKeywords, mandatoryKeywords }` | `string` | Gemini로 이미지 프롬프트 생성 |
| `generateProtagonistName` | `diaryContent` | `string` | Gemini로 주인공 이름 추출 |
| `processUniversalWorkflow` | `{ workflowFile, positivePrompt, negativePrompt, imageFile }` | `{ success, imageData, imageUrl }` | ComfyUI 워크플로우 실행 |

### 유틸리티 함수

| 함수명 | 입력 | 출력 | 설명 |
|--------|------|------|------|
| `generateToken` | `userId` | `string` | JWT 토큰 생성 |
| `getArtStyleById` | `artStyleId` | `artStyle` | 화풍 정보 조회 |
| `getDefaultArtStyle` | - | `artStyle` | 기본 화풍 조회 |
| `getAllArtStyles` | - | `[artStyle]` | 모든 화풍 목록 조회 |
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
- **WebSocket**: 실시간 통신 지원

#### 3. 비즈니스 로직 계층
- **사용자 관리**: 회원가입, 로그인, 프로필 관리
- **일기 관리**: CRUD 작업, 검색, 페이지네이션
- **인물 관리**: 인물 정보 저장 및 관리
- **AI 이미지 생성**: 두 단계 프로세스 (장면 묘사 → 이미지 생성)

#### 4. 데이터 저장 계층
- **MongoDB**: 사용자, 일기, 인물 데이터 저장
- **로컬 파일 시스템**: 업로드된 이미지 파일 저장 (/uploads)
- **AWS S3**: 클라우드 파일 저장소 (선택사항)

#### 5. 외부 서비스 계층
- **Google Gemini AI**: 장면 묘사 및 이미지 프롬프트 생성
- **ComfyUI**: AI 이미지 생성 워크플로우 실행

### 데이터 플로우

1. **두 단계 일기 작성 플로우**:
   - **1단계**: 사용자가 일기 내용 입력 → Gemini AI로 장면 묘사 생성
   - **2단계**: 장면 묘사 + 외모 키워드 → Gemini AI로 프롬프트 생성 → ComfyUI 이미지 생성
   - 생성된 이미지와 함께 일기 저장

2. **인증 플로우**:
   - 로그인 요청 → 사용자 검증 → JWT 토큰 생성 → 클라이언트 저장
   - API 요청 시 JWT 토큰 검증 → 권한 확인 → 요청 처리

3. **파일 업로드 플로우**:
   - 파일 선택 → Multer 처리 → 로컬/S3 저장 → URL 반환
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

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# ComfyUI
COMFY_SERVER_URL=http://127.0.0.1:8188

# AWS S3 (선택사항)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_BUCKET_NAME=your_bucket_name

# 서버
PORT=5000
```

## 화풍 스타일

현재 지원되는 5가지 화풍 스타일:

### 1. makoto_shinkai
- **이름**: 신카이 마코토
- **설명**: 신카이 마코토 스타일의 아름답고 감성적인 화풍
- **워크플로우**: Makoto Shinkai workflow.json
- **LoRA**: Makoto Shinkai.safetensors (강도: 1.2)
- **필수 키워드**: ["shinkai makoto", "kimi no na wa.", "tenki no ko", "kotonoha no niwa"]

### 2. esthetic_80s
- **이름**: 에스테틱 80년대
- **설명**: 80년대 레트로 아메리칸 스타일의 감성적인 화풍
- **워크플로우**: Esthetic 80s workflow.json
- **LoRA**: Esthetic 80s.safetensors (강도: 1.0)
- **필수 키워드**: ["1980s (style)"]

### 3. 3d_character
- **이름**: 3D 캐릭터
- **설명**: 귀여운 3D 캐릭터 스타일의 치비 화풍
- **워크플로우**: _3d character style.json
- **LoRA**: blindbox_v1_mix.safetensors (강도: 0.8)
- **필수 키워드**: ["chibi"]

### 4. minimalist_line
- **이름**: 미니멀 라인
- **설명**: 깔끔하고 심플한 라인 아트 스타일
- **워크플로우**: Minimalist Line workflow.json
- **LoRA**: Minimalist Line.safetensors (강도: 1.0)
- **필수 키워드**: ["minimalist", "line art", "simple"]

### 5. disney_pixar
- **이름**: 디즈니 픽사
- **설명**: 디즈니 픽사 스타일의 3D 애니메이션 화풍
- **워크플로우**: Disney Pixar workflow.json
- **LoRA**: 없음
- **필수 키워드**: ["disney pixar style", "3d animation", "cartoon"]
- **특수 설정**: FreeU, IPAdapter 사용

## 사용 예제

### 두 단계 일기 작성 예제

#### 1단계: 장면 묘사 생성
```javascript
const sceneResponse = await fetch('/api/diaries/generate-scene', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: '@박재석과 카페에서 커피를 마셨다. 정말 즐거운 시간이었다.',
    protagonistName: '박재석',
    sceneDirectionHint: '따뜻한 오후의 카페'
  })
});

const sceneData = await sceneResponse.json();
```

#### 2단계: 일기 작성 및 이미지 생성
```javascript
const formData = new FormData();
formData.append('content', '@박재석과 카페에서 커피를 마셨다. 정말 즐거운 시간이었다.');
formData.append('sceneDescription', sceneData.sceneDescription);
formData.append('artStyleId', 'makoto_shinkai');
formData.append('userAppearanceKeywords', '1man, short hair, casual clothing');

// 새로운 주인공인 경우 성별 정보 필요
if (!sceneData.protagonistInfo.isFromContacts) {
  formData.append('mainCharacterGender', '남성');
  formData.append('photos', profilePhotoFile); // 주인공 사진
}

const response = await fetch('/api/diaries', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
});
```

### 화풍 목록 조회 예제
```javascript
const response = await fetch('/api/diaries/art-styles', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
const artStyles = await response.json();
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

**최종 업데이트**: 2025년 6월 17일  
**API 버전**: v2.1  
