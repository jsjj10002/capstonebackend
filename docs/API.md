# 일기 앱 백엔드 API 명세서 v3.0

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
- **Version**: v3.0

### 기술 스택
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT
- **File Upload**: Multer
- **AI Services**: Google Gemini 2.5 Flash Preview, ComfyUI
- **WebSocket**: ws (실시간 통신)
- **Cloud Storage**: AWS S3 (선택사항)

### v3.0 주요 변경사항
- **JSON 기반 장면 묘사**: 구조화된 `{sceneDescription: string, identifiedPerson: string}` 응답
- **@태그 기반 장면 생성**: @태그를 장면 묘사 생성의 힌트로 활용
- **기존 인물 선택 방식**: 사용자가 인물 목록에서 직접 선택
- **워크플로우 단순화**: 7단계에서 6단계로 간소화
- **레거시 코드 완전 제거**: 단일 버전으로 통합
- **이미지 프롬프트 최적화**: 장면 묘사 100% 활용

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

### Person Model (v3.0 업데이트)
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: 'User', required),
  name: String (required),
  gender: String (enum: ['남성', '여성', '기타'], default: '기타'),
  photo: String (required, URL),
  tags: [String] (default: []), // v3.0 NEW: 스마트 태그 시스템
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

#### 화풍 목록 조회
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
  }
]
```

#### 장면 묘사 생성 (v3.0 업데이트)
```http
POST /api/diaries/generate-scene
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "content": "string (required) - 일기 내용 (@태그 지원)"
}

Response:
{
  "diaryContent": "string - 입력된 일기 내용",
  "sceneDescription": "string - 생성된 장면 묘사",
  "identifiedPerson": "string - 자동 식별된 주인공 이름"
}
```

#### 일기 작성 (v3.0 간소화된 6단계 프로세스)
```http
POST /api/diaries
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body:
- content: string (required) - 일기 내용 (@태그 지원)
- diaryDate: date (optional) - 일기 날짜  
- artStyleId: string (required) - 화풍 ID
- sceneDescription: string (required) - 장면 묘사 (generate-scene에서 받은 값)
- identifiedPerson: string (required) - 식별된 주인공 이름 ('나' 또는 인물명)
- userAppearanceKeywords: string (required) - 사용자 외모 키워드
- mainCharacterGender: string (optional) - 새 주인공의 성별 (연락처에 없는 경우)
- selectedPersonId: string (optional) - 기존 연락처에서 선택한 인물 ID
- photos: file[] (optional, max: 5) - 첨부 사진

Response (성공 시):
{
  "message": "일기가 성공적으로 작성되고 이미지가 생성되었습니다.",
  "diary": {
    "_id": "string",
    "content": "string",
    "diaryDate": "date",
    "sceneDescription": "string",
    "imagePrompt": "string",
    "artStyleId": "string",
    "mainCharacter": {
      "personId": "string",
      "name": "string",
      "isFromContacts": boolean
    },
    "generatedImage": "string", // 생성된 이미지 경로
    "imageGenerationStatus": "completed"
  }
}

Response (이미지 생성 실패 시):
{
  "message": "일기가 작성되었지만 이미지 생성에 실패했습니다.",
  "diary": {
    "_id": "string",
    "content": "string",
    "diaryDate": "date",
    "sceneDescription": "string",
    "imagePrompt": "string",
    "artStyleId": "string",
    "mainCharacter": {
      "personId": "string",
      "name": "string",
      "isFromContacts": boolean
    },
    "generatedImage": null,
    "imageGenerationStatus": "failed",
    "imageGenerationError": "string"
  }
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

### Google Gemini AI (v3.0 업데이트)
- **모델**: gemini-2.5-flash-preview-05-20
- **용도**: 구조화된 장면 묘사 생성, 최적화된 이미지 프롬프트 생성
- **특징**: JSON 응답 스키마, Thinking Config (24,576 토큰), Temperature 0.85
- **함수**: 
  - `generateSceneDescription(diaryContent)` - JSON 응답: `{sceneDescription: string, identifiedPerson: string}`
  - `generateImagePrompt(sceneDescription, gender, userAppearanceKeywords, mandatoryKeywords)` - 일기 원문 제거
  - `generateProtagonistName(diaryContent)` - 레거시 함수 (v3.0에서 통합됨)

### ComfyUI API
- **URL**: `http://127.0.0.1:8188` (기본값)
- **용도**: AI 이미지 생성
- **워크플로우**: 8가지 화풍 지원
- **특징**: 범용 워크플로우 시스템, Anything Everywhere 자동 복구
- **함수**: `processUniversalWorkflow(workflowFile, positivePrompt, negativePrompt, imageFile)`

### AWS S3 (선택사항)
- **용도**: 클라우드 파일 저장소
- **함수**: `uploadToS3(file, bucketName, key)`

## 함수 명세

### AI 이미지 생성 함수 (v3.0 업데이트)

| 함수명 | 입력 | 출력 | 설명 |
|--------|------|------|------|
| `generateImageForDiary` | `{ diary, user, artStyle, sceneDescription, userAppearanceKeywords }` | `{ success, photoUrl, prompt, promptLog }` | 일기용 이미지 생성 |
| `generateSceneDescription` | `diaryContent` | `{sceneDescription: string, identifiedPerson: string}` | JSON 구조화된 장면 묘사 생성 |
| `generateImagePrompt` | `{ sceneDescription, gender, userAppearanceKeywords, mandatoryKeywords }` | `string` | 장면 묘사 100% 활용 프롬프트 생성 |
| `processUniversalWorkflow` | `{ workflowFile, positivePrompt, negativePrompt, imageFile }` | `{ success, imageData, imageUrl }` | ComfyUI 워크플로우 실행 |

### 유틸리티 함수 (v3.0 업데이트)

| 함수명 | 입력 | 출력 | 설명 |
|--------|------|------|------|
| `generateToken` | `userId` | `string` | JWT 토큰 생성 |
| `getArtStyleById` | `artStyleId` | `artStyle` | 화풍 정보 조회 |
| `getDefaultArtStyle` | - | `artStyle` | 기본 화풍 조회 |
| `getAllArtStyles` | - | `[artStyle]` | 모든 화풍 목록 조회 |
| `removeKoreanParticles` | `string` | `string` | 한국어 조사 제거 |
| `findPersonByTag` | `{ userId, tagName }` | `person` | 태그로 인물 검색 (v3.0 NEW) |

## 시스템 아키텍처

### v3.0 워크플로우 (6단계)

1. **일기 작성**: @태그를 포함한 일기 내용 작성
2. **장면 묘사 생성**: @태그를 힌트로 JSON 구조화된 장면 묘사 생성
3. **주요 인물 선택**: 사용자가 기존 인물 목록에서 실제 주인공 직접 선택
4. **주요 인물 외형 작성**: 사용자 외모 키워드 입력 (선택된 인물의 성별 정보 자동 사용)
5. **프롬프트 생성**: 장면 묘사 100% 활용
6. **이미지 생성**: ComfyUI 워크플로우 실행

### 스마트 태그 시스템

- **@태그 자동 인식**: `@김철수`, `@엄마`, `@친구` 등 자동 감지
- **다중 태그 지원**: 한 인물이 여러 태그를 가질 수 있음
- **자동 태그 연결**: 장면 묘사에서 식별된 PERSON이 자동으로 태그에 추가
- **스마트 매칭**: 기존 인물과 새로운 태그 자동 연결

### 데이터 플로우 (v3.0)

1. **새로운 일기 작성 플로우**:
   - 사용자가 @태그 포함 일기 내용 입력
   - Gemini AI로 JSON 구조화된 장면 묘사 생성
   - 자동으로 PERSON 식별 및 태그 시스템 연동
   - 장면 묘사 + 외모 키워드 → 최적화된 프롬프트 생성
   - ComfyUI 이미지 생성 → 완성된 일기 저장

2. **인증 플로우**: (기존과 동일)

3. **파일 업로드 플로우**: (기존과 동일)

## 화풍 스타일 (v3.0 확장)

현재 지원되는 8가지 화풍 스타일:

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

### 6. animal_crossing
- **이름**: 동물의 숲
- **설명**: 동물의 숲 스타일의 귀여운 게임 화풍
- **워크플로우**: Animal Crossing workflow.json
- **필수 키워드**: ["animal crossing style", "nintendo", "cute"]

### 7. rhythm_heaven
- **이름**: 리듬 헤븐
- **설명**: 리듬 헤븐 스타일의 독특한 게임 화풍
- **워크플로우**: Rhythm Heaven workflow.json
- **필수 키워드**: ["rhythm heaven style", "nintendo", "unique"]

### 8. studio_ghibli
- **이름**: 스튜디오 지브리
- **설명**: 스튜디오 지브리 스타일의 클래식 애니메이션 화풍
- **워크플로우**: Studio Ghibli workflow.json
- **필수 키워드**: ["studio ghibli", "miyazaki", "anime"]

## 사용 예제

### v3.0 간소화된 일기 작성 예제

#### 1단계: JSON 구조화된 장면 묘사 생성
```javascript
const sceneResponse = await fetch('/api/diaries/generate-scene', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: '@박재석과 카페에서 커피를 마셨다. 정말 즐거운 시간이었다.'
  })
});

const sceneData = await sceneResponse.json();
// 응답: { diaryContent: "@박재석과 카페에서 커피를 마셨다. 정말 즐거운 시간이었다.", sceneDescription: "따뜻한 오후 햇살이...", identifiedPerson: "박재석" }
```

#### 2단계: 일기 작성 및 이미지 생성
```javascript
const formData = new FormData();
formData.append('content', '@박재석과 카페에서 커피를 마셨다. 정말 즐거운 시간이었다.');
formData.append('sceneDescription', sceneData.sceneDescription);
formData.append('artStyleId', 'makoto_shinkai');
formData.append('userAppearanceKeywords', '1man, short hair, casual clothing');

// v3.0: 사용자가 기존 인물 목록에서 실제 주인공 선택
formData.append('mainCharacterPersonId', selectedPersonId); // 기존 인물의 ID

const response = await fetch('/api/diaries', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
});
```

---

**최종 업데이트**: 2025년 6월 18일  
**API 버전**: v3.0
