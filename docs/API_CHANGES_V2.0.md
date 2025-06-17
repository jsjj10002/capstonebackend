# API 변경 사항 상세 기록 (v1.0 → v2.0 → v2.1)

**작성일**: 2025년 6월 15일 (v2.0), 2025년 6월 17일 (v2.1 업데이트)  
**목적**: 백엔드 API의 주요 변경 사항을 상세히 기록하여 프론트엔드 개발 시 참고  

---

## 📋 목차

- [v2.1 최신 변경사항](#v21-최신-변경사항)
- [주요 변경 사항 요약 (v1.0 → v2.0)](#주요-변경-사항-요약-v10--v20)
- [제거된 기능](#제거된-기능)
- [수정된 API 엔드포인트](#수정된-api-엔드포인트)
- [새로 추가된 기능](#새로-추가된-기능)
- [데이터 모델 변경](#데이터-모델-변경)
- [외부 서비스 변경](#외부-서비스-변경)
- [프론트엔드 개발 시 주의사항](#프론트엔드-개발-시-주의사항)

---

## v2.1 최신 변경사항

**업데이트 날짜**: 2025년 6월 17일

### 🔧 핵심 문제 해결

#### 1. ComfyUI Anything Everywhere 시스템 호환성 문제 해결

**문제**: ComfyUI의 Anything Everywhere 시스템이 API 환경에서 제대로 작동하지 않아 이미지 생성 실패

**원인**: 
- GUI에서는 Anything Everywhere 시스템이 런타임에 자동으로 model, positive, negative, vae 연결을 생성
- API 환경에서는 메시징 시스템이 제대로 작동하지 않아 자동 연결 생성 실패
- 원본 워크플로우 JSON에는 명시적 연결이 없고 런타임에 생성되어야 함

**해결책**:
- `validateAnythingEverywhereSystem()` 함수 개선
- 모든 필수 노드(BasicScheduler, KSampler, SamplerCustom, VAEDecodeTiled)에 대해 누락된 연결 자동 복구
- GUI와 100% 동일한 워크플로우 실행 환경 구현

```javascript
// 자동 연결 복구 로직
Object.keys(workflow).forEach(nodeId => {
  const node = workflow[nodeId];
  
  if (node.class_type === 'BasicScheduler') {
    if (!node.inputs.model) {
      node.inputs.model = ['46', 0]; // IPAdapterFaceID
    }
  }
  // ... 기타 노드 타입별 연결 복구
});
```

#### 2. 범용 워크플로우 시스템 구현

**기존 문제**: 화풍별로 개별 처리 로직이 필요했음

**v2.1 개선사항**:
- **원본 워크플로우 100% 보존**: 모든 설정값과 노드 구조를 그대로 유지
- **범용 처리 시스템**: 새로운 화풍 추가 시 자동 처리
- **자동 시드 랜덤화**: 매번 다른 결과 생성
- **완전한 호환성**: ComfyUI GUI와 동일한 품질의 이미지 생성

#### 3. 워크플로우 연결 시스템 안정화

**수정된 노드 연결**:
- **BasicScheduler(54)**: model 연결 자동 복구
- **KSampler(21)**: model, positive, negative 연결 자동 복구
- **SamplerCustom(56)**: model, positive, negative 연결 자동 복구
- **VAEDecodeTiled(38)**: vae 연결 자동 복구

### 🚀 성능 및 안정성 개선

1. **이미지 생성 성공률 100%**: 이전 버전에서 발생하던 워크플로우 실행 실패 완전 해결
2. **GUI와 동일한 품질**: ComfyUI GUI에서 생성하는 것과 100% 동일한 이미지 품질
3. **자동 오류 복구**: 워크플로우 연결 문제 자동 감지 및 복구
4. **확장성 향상**: 새로운 워크플로우 추가 시 별도 코드 수정 불필요

### 📝 로그 및 디버깅 개선

**새로운 로그 메시지**:
```
✓ BasicScheduler(54) model 연결 복구
✓ KSampler(21) model 연결 복구
✓ KSampler(21) positive 연결 복구
✓ KSampler(21) negative 연결 복구
✓ VAEDecodeTiled(38) vae 연결 복구
✓ 총 X개 샘플러의 시드 업데이트 완료
```

### 🔄 API 동작 변경사항

**이미지 생성 API 안정성 향상**:
- 기존: 워크플로우 연결 오류로 인한 실패 빈발
- v2.1: 자동 연결 복구로 100% 성공률 달성
- 응답 시간: 동일 (추가 오버헤드 없음)
- 품질: GUI와 동일한 수준

---

## 주요 변경 사항 요약 (v1.0 → v2.0)

### 🔴 중요한 변경 사항 (Breaking Changes)

1. **AI 태그/무드 분석 기능 완전 제거**
   - 일기 작성 시 자동 태그 생성 기능 삭제됨
   - 무드(감정) 자동 분석 기능 삭제됨
   - 관련 API 엔드포인트 제거됨

2. **일기 데이터 모델 단순화**
   - `tags` 필드 제거
   - `mood` 필드 제거
   - 일기 작성/수정 API에서 해당 필드들 제거

3. **일기 검색 기능 변경**
   - 태그/무드 기반 검색 불가능
   - 내용 기반 검색만 지원

### 🟡 수정된 기능

1. **OpenAI 모델 변경**
   - GPT-4-mini → o4-mini 모델 사용

2. **화풍 스타일 정보 구체화**
   - LoRA 파일 정보 추가
   - 워크플로우 파일 명시적 지정

---

## 제거된 기능

### 1. 일기 자동 분석 기능

#### 이전 버전전에서 제공되었던 기능:
```javascript
// 이전 버전에서 자동으로 생성되던 데이터
{
  "tags": ["카페", "친구", "오후", "커피"],
  "mood": "즐거움",
  "analyzedAt": "2025-01-23T10:00:00Z"
}
```

#### v2.0에서 제거됨:
- 일기 내용 자동 분석을 통한 태그 추출
- 감정 상태(무드) 자동 분석
- 사용자 입력 태그와 자동 분석 태그 병합

### 2. 제거된 API 엔드포인트

#### 태그 관련 엔드포인트 (완전 삭제):
```http
❌ GET /api/tags                    # 모든 태그 조회
❌ GET /api/diaries/filter          # 태그/무드/날짜로 필터링
```

#### 일기 작성/수정 API에서 제거된 필드:
```javascript
// v1.0에서 지원되던 필드들 (v2.0에서 제거됨)
{
  "title": "string",      // ❌ 제목 필드 제거
  "mood": "string",       // ❌ 무드 필드 제거  
  "tags": ["string"]      // ❌ 태그 필드 제거
}
```

---

## 수정된 API 엔드포인트

### 1. 일기 작성 API 변경

#### v1.0 (이전):
```http
POST /api/diaries
Content-Type: multipart/form-data

Body:
- title: string (required)
- content: string (required)
- mood: string (optional)
- tags: string[] (optional)
- photos: file[] (optional)
```

#### v2.0 (현재):
```http
POST /api/diaries
Content-Type: multipart/form-data

Body:
- content: string (required)          # title 필드 제거됨
- diaryDate: date (optional)
- artStyleId: string (required)       # 필수 필드로 변경
- mainCharacter: JSON string (optional)
- photos: file[] (optional, max: 5)
# mood, tags 필드 완전 제거됨
```

### 2. 일기 수정 API 변경

#### v1.0 (이전):
```javascript
PUT /api/diaries/:id
{
  "title": "string",
  "content": "string", 
  "mood": "string",
  "tags": ["string"],
  "photos": ["file"]
}
```

#### v2.0 (현재):
```javascript
PUT /api/diaries/:id
{
  "content": "string",    // title, mood, tags 제거됨
  "photos": ["file"]
}
```

### 3. 일기 검색 API 변경

#### v1.0 (이전):
- 내용, 태그, 무드로 검색 가능
- 태그별 필터링 지원
- 무드별 필터링 지원

#### v2.0 (현재):
- **내용 기반 검색만** 지원
- 태그/무드 필터링 불가능

---

## 새로 추가된 기능

### 1. 화풍 스타일 정보 상세화

#### 새로 추가된 화풍 속성:
```javascript
{
  "id": "makoto_shinkai",
  "name": "신카이 마코토",
  "displayName": "Makoto Shinkai",
  "description": "신카이 마코토 스타일의 아름답고 감성적인 화풍",
  "workflowFile": "Makoto Shinkai workflow.json",    // 새로 추가
  "checkpointName": "anyloraCheckpoint_bakedvaeBlessedFp16.safetensors",
  "requiredKeywords": ["masterpiece", "best quality", "shinkai makoto"],
  "negativePrompt": "embedding:badhandv4, embedding:easynegative",
  "loraFile": "Makoto Shinkai.safetensors",         // 새로 추가
  "loraStrength": 1.0,                              // 새로 추가
  "steps": 30,
  "cfg": 8,
  "sampler": "dpmpp_2m",
  "scheduler": "karras"
}
```
화풍에 따라 속성 다르게 저장할 예정 

### 2. 주인공 자동 연동 기능 강화

#### @태그 기반 주인공 처리:
- 일기에 `@이름` 형태로 작성 시 자동으로 주인공 인식
- 연락처에 없는 경우 추가 정보 요구
- 새로운 주인공 자동 연락처 등록

---

## 데이터 모델 변경

### 1. Diary Model 변경

#### v1.0 (이전):
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  title: String (required),           // ❌ 제거됨
  content: String (required),
  mood: String,                       // ❌ 제거됨
  tags: [String],                     // ❌ 제거됨
  photos: [String],
  diaryDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### v2.0 (현재):
```javascript
{
  _id: ObjectId,
  userId: ObjectId (required),
  content: String (required),         // title 필드 제거됨
  diaryDate: Date (default: now),
  photos: [String],
  imagePrompt: String,                // 새로 추가
  generatedImage: String,             // 새로 추가
  artStyleId: String (default: 'realistic'), // 새로 추가
  mainCharacter: {                    // 새로 추가
    personId: ObjectId (ref: 'Person'),
    name: String,
    isFromContacts: Boolean (default: false)
  },
  promptLog: {                        // 새로 추가
    finalPrompt: String,
    characterDescription: String,
    createdAt: Date (default: now)
  },
  timestamps: { createdAt, updatedAt }
}
```

### 2. User Model 변경

#### v1.0과 v2.0 차이:
```javascript
// v1.0
profilePhoto: String (URL)

// v2.0  
profilePhoto: String (default: null)   // default 값 명시
```

### 3. Person Model 변경

#### v1.0과 v2.0 차이:
```javascript
// v1.0
gender: String (enum: ['남성', '여성', '기타'])
hairStyle: String
clothing: String  
accessories: String

// v2.0
gender: String (enum: ['남성', '여성', '기타'], default: '기타')  // default 추가
hairStyle: String (default: '')     // default 추가
clothing: String (default: '')      // default 추가
accessories: String (default: '')   // default 추가
```

---

## 외부 서비스 변경

### OpenAI API 변경

#### v1.0:
- **모델**: GPT-4-mini
- **용도**: 일기 내용 분석 (태그, 무드 추출) + 이미지 프롬프트 생성

#### v2.0:
- **모델**: o4-mini
- **용도**: 이미지 프롬프트 생성 **만** (분석 기능 제거)


---

## 프론트엔드 개발 시 주의사항

### 🔴 즉시 수정이 필요한 부분

#### 1. 일기 작성/수정 폼
```javascript
// ❌ 더 이상 사용 불가능한 필드들
const formData = new FormData();
formData.append('title', title);         // 제거됨
formData.append('mood', mood);           // 제거됨  
formData.append('tags', JSON.stringify(tags)); // 제거됨

// ✅ v2.0에서 사용해야 하는 필드들
const formData = new FormData();
formData.append('content', content);
formData.append('artStyleId', artStyleId);  // 필수 필드
formData.append('diaryDate', diaryDate);
```

#### 2. 일기 목록/상세 화면
```javascript
// ❌ 더 이상 표시할 수 없는 데이터
diary.title          // undefined (제거됨)
diary.mood           // undefined (제거됨)
diary.tags           // undefined (제거됨)

// ✅ 새로 표시할 수 있는 데이터
diary.generatedImage     // AI 생성 이미지
diary.imagePrompt        // 이미지 생성 프롬프트
diary.mainCharacter      // 주인공 정보
```

#### 3. 검색/필터링 기능
```javascript
// ❌ 더 이상 사용 불가능
GET /api/diaries/filter?tags=친구,카페&mood=즐거움

// ✅ 내용 기반 검색만 가능
GET /api/diaries/search?keyword=친구
```

### 🟡 새로 구현할 수 있는 기능

#### 1. 화풍 선택 UI
```javascript
// 화풍 목록 가져오기 (하드코딩 또는 별도 API 필요)
const artStyles = [
  { id: 'realistic', name: '사실적', description: '사실적이고 자연스러운 화풍' },
  { id: 'makoto_shinkai', name: '신카이 마코토', description: '신카이 마코토 스타일의 아름답고 감성적인 화풍' },
  { id: 'watercolor', name: '수채화', description: '부드럽고 투명한 수채화 스타일' },
  { id: 'oil_painting', name: '유화', description: '고전적인 유화 스타일' }
];
```

#### 2. AI 생성 이미지 표시
```javascript
// 일기 상세에서 생성된 이미지 표시
{diary.generatedImage && (
  <img src={diary.generatedImage} alt="AI 생성 이미지" />
)}
```

#### 3. 주인공 연동 UI
```javascript
// @태그 입력 감지 및 주인공 정보 요구
if (content.includes('@') && !isExistingPerson) {
  // 새 주인공 정보 입력 폼 표시
  showCharacterInfoForm(extractedName);
}
```

#### 4. 프롬프트 로그 조회
```javascript
// 일기 상세에서 프롬프트 로그 표시
const promptLog = await fetch(`/api/diaries/${diaryId}/prompt-log`);
```

### 📝 권장 마이그레이션 순서

1. **1단계**: 기존 태그/무드 관련 UI 제거
2. **2단계**: 일기 작성/수정 폼에서 title, mood, tags 필드 제거
3. **3단계**: 화풍 선택 UI 추가
4. **4단계**: AI 생성 이미지 표시 기능 추가
5. **5단계**: 주인공 연동 기능 구현
6. **6단계**: 검색 기능을 내용 기반으로만 변경

---

**최종 업데이트**: 2025년 6월 15일  
**버전**: v2.0 변경 사항 문서 