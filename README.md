*최종 업데이트: 2025-06-14*

<details>
<summary>📌 목차</summary>

- [프로젝트 개요](#프로젝트-개요)
- [진행 상황 정리](#진행-상황-정리)
- [구현 기능](#구현-기능)
- [API 명세](#api-명세)
- [API 데이터 요약](#api-데이터-요약)
- [AI 분석 예시](#ai-분석-예시)
- [ComfyUI 연동 기능](#comfyui-연동-기능)
- [실행 방법](#실행-방법)
</details>

## 프로젝트 개요

Express.js 기반 일기 애플리케이션의 백엔드 서버이다. 사용자 인증, 일기 관리, 이미지 업로드 및 AI 기반 콘텐츠 분석을 지원한다.

<details>
<summary>📋 진행 상황 정리</summary>

### 1. 백엔드 개발

- Express.js 기반 RESTful API 서버 구축했다
- MongoDB 데이터베이스 연결 설정했다
- 사용자 인증 및 권한 관리 구현했다
- 일기 CRUD 기능 구현했다
- 이미지 업로드 기능 구현했다
- 주변 사람들의 정보 및 사진 관리 기능 추가했다
- ComfyUI 연동하여 일기 내용 기반 실제 이미지 생성 기능 추가했다

### 2. 최신 업데이트 (2025-06-14)

- **일기 모델 개선**: 날짜 설정 가능, title 필수 해제, 화풍 선택 기능 추가
- **사용자 프로필 확장**: 성별, 의상, 헤어스타일, 악세사리, 외모 정보 추가
- **인물 관리 강화**: 인물 정보에 성별, 스타일 관련 필드 추가
- **월별 일기 조회 API**: 특정 월의 일기 목록 조회 기능 추가
- **프롬프트 생성 개선**: 인물 정보 필수 포함, 콤마 구분 형식으로 변경
- **Makoto Shinkai 워크플로우**: 기본 이미지 생성 워크플로우로 변경
- **프로필 수정 기능**: 사용자 정보 업데이트 API 추가

### 3. AWS 설정

- IAM 사용자 생성 및 액세스 키 발급했다
- S3 버킷 생성 (보안 설정 적용)했다
- S3 서명된 URL 기능 추가 (비공개 이미지 접근용)했다
- `uploadToS3` 함수에서 `ACL: 'public-read'` 제거됐다

### 4. 환경 변수 설정

- MongoDB 연결 키 설정했다
- JWT 비밀키 설정했다
- AWS 액세스 키 및 설정했다
- 포트 설정했다
- OpenAI API 키 설정했다
- ComfyUI 서버 URL 설정했다

### 5. 이미지 프롬프트 생성 기능

- GPT-o4-mini 모델을 활용한 일기 내용 기반 이미지 생성 프롬프트 자동 생성
- 사용자 인물 정보(성별, 의상, 헤어스타일, 악세사리)를 프롬프트에 필수 포함
- 콤마로 구분된 키워드 형식으로 프롬프트 생성
- 화풍별 맞춤 스타일 키워드 자동 추가
- 일기의 시간, 장소, 분위기, 활동 등을 반영한 생생한 장면 묘사

### 6. ComfyUI 연동

- ComfyUI와의 API 통신 기능 구현
- Makoto Shinkai 스타일 워크플로우 적용
- 사용자 프로필 사진 기반 이미지 생성 기능 추가
- AI 생성 프롬프트와 ComfyUI 통합으로 완전 자동화된 이미지 생성 구현
- 화풍 선택에 따른 다양한 스타일 지원
</details>

<details>
<summary>📋 구현 기능</summary>

### 1. 사용자 관리

- 회원가입 (프로필 사진 업로드 포함) 기능 제공한다
- 로그인/인증 기능 제공한다
- 프로필 조회 및 업데이트 기능 제공한다
- 인물 정보 관리 (성별, 의상, 헤어스타일, 악세사리, 외모) 기능 제공한다

### 2. 일기 관리

- 일기 작성 (내용 및 이미지 업로드, 날짜 설정 가능) 기능 제공한다
- 일기 조회 (전체, 개별, 월별) 기능 제공한다
- 일기 수정 및 삭제 기능 제공한다
- 일기 검색 기능 제공한다
- 화풍 선택 기능 (Makoto Shinkai, Anime, Realistic, Watercolor, Oil Painting) 제공한다
- 일기 내용을 기반으로 이미지 생성 프롬프트 자동 생성 기능 제공한다
- 일기 내용 기반으로 ComfyUI를 통한 실제 이미지 생성 기능 제공한다

### 3. 사람 관리

- 주변 사람들의 정보 및 사진 추가 기능 제공한다
- 인물 스타일 정보 (성별, 의상, 헤어스타일, 악세사리, 외모) 관리 기능 제공한다
- 사람 정보 조회 (목록/개별) 기능 제공한다
- 사람 정보 수정 및 삭제 기능 제공한다
- 사람 검색 기능 제공한다

### 4. AI 기반 분석

- 일기 내용을 기반으로 장면 중심 이미지 생성 프롬프트 제공 기능
- 사용자 프로필 이미지와 일기 내용을 결합한 맞춤형 AI 이미지 생성 기능 제공한다
- 인물 정보가 포함된 고품질 프롬프트 자동 생성 기능 제공한다
- 화풍별 맞춤 스타일 키워드 자동 적용 기능 제공한다

### 5. 파일 업로드

- 로컬 스토리지 및 AWS S3 클라우드 스토리지 지원한다
- 이미지 파일 필터링 및 크기 제한 기능 제공한다

### 6. 보안

- JWT 기반 인증 사용한다
- 비밀번호 해싱 사용한다
- 권한 검증 수행한다
</details>

<details>
<summary>📋 API 명세</summary>

| 메소드 | 엔드포인트                     | 설명                             | 인증 필요 | 요청 본문                                      | 응답                                       |
|--------|--------------------------------|----------------------------------|-----------|-----------------------------------------------|-------------------------------------------|
| POST   | /api/users/register            | 회원가입                         | 아니오    | username, email, password, profilePhoto(파일) | 사용자 정보, JWT 토큰                     |
| POST   | /api/users/login               | 로그인                           | 아니오    | email, password                               | 사용자 정보, JWT 토큰                     |
| GET    | /api/users/profile             | 프로필 조회                      | 예        | -                                             | 사용자 정보 (인물 정보 포함)              |
| PUT    | /api/users/profile/photo       | 프로필 사진 업데이트             | 예        | profilePhoto(파일)                           | 업데이트된 사용자 정보                    |
| PUT    | /api/users/profile             | 프로필 정보 업데이트             | 예        | username, email, gender, clothing, hairstyle, accessories, appearance | 업데이트된 사용자 정보                    |
| POST   | /api/diaries                   | 일기 작성                        | 예        | content, date(선택), artStyle(선택), photos(선택) | 생성된 일기 정보                          |
| GET    | /api/diaries                   | 내 일기 전체 조회                | 예        | -                                             | 일기 목록                                 |
| GET    | /api/diaries/by-month          | 월별 일기 조회                   | 예        | year, month (쿼리 파라미터)                  | 해당 월 일기 목록 (날짜, id, 썸네일)      |
| GET    | /api/diaries/search?keyword=값 | 일기 검색                        | 예        | query: keyword                               | 검색 결과 일기 목록                       |
| GET    | /api/diaries/:id               | 특정 일기 조회                   | 예        | -                                             | 일기 상세 정보 (날짜, 사진, 내용 포함)   |
| GET    | /api/diaries/:id/prompt        | 일기 기반 이미지 생성 프롬프트  | 예        | -                                             | 생성된 프롬프트 텍스트 (인물 정보 포함)  |
| POST   | /api/diaries/:id/generate-image | 일기 내용과 프로필 사진 기반 이미지 생성 | 예 | - | 생성된 이미지 URL 및 일기 정보 |
| PUT    | /api/diaries/:id               | 일기 수정                        | 예        | content(선택), date(선택), artStyle(선택), photos(선택) | 업데이트된 일기 정보                      |
| DELETE | /api/diaries/:id               | 일기 삭제                        | 예        | -                                             | 성공 메시지                               |
| DELETE | /api/diaries/:id/photos/:photoId | 일기에서 특정 사진 삭제        | 예        | -                                             | 업데이트된 일기 정보                      |
| POST   | /api/people                    | 사람 추가                        | 예        | name, relation, notes, photo(파일), gender, clothing, hairstyle, accessories, appearance | 생성된 사람 정보                          |
| GET    | /api/people                    | 내가 추가한 사람 목록            | 예        | -                                             | 사람 목록                                 |
| GET    | /api/people/search?keyword=값  | 사람 검색                        | 예        | query: keyword                               | 검색 결과 사람 목록                       |
| GET    | /api/people/filter             | 사람 필터링(관계)                | 예        | relation                                      | 필터링된 사람 목록                        |
| GET    | /api/people/:id                | 특정 사람 조회                   | 예        | -                                             | 사람 상세 정보                            |
| PUT    | /api/people/:id                | 사람 정보 수정                   | 예        | name, relation, notes, photo, gender, clothing, hairstyle, accessories, appearance | 업데이트된 사람 정보                      |
| DELETE | /api/people/:id                | 사람 삭제                        | 예        | -                                             | 성공 메시지                               |
</details>

## 주요 변경사항 요약

<details>
<summary>📋 2025-01-27 업데이트 내용</summary>

### 변경된 기능들

1. **일기 작성 단순화**
   - 제목, 무드, 태그 입력 제거
   - 내용과 날짜만 입력하도록 변경
   - 화풍 선택 기능 추가

2. **월별 일기 조회**
   ```
   GET /api/diaries/by-month?year=2025&month=1
   응답 예시:
   [
     {
       "date": "2025-01-15",
       "id": "507f1f77bcf86cd799439011", 
       "thumbnail": "/uploads/diary_xxx.png"
     }
   ]
   ```

3. **인물 정보 확장**
   - 사용자 프로필: 성별, 의상, 헤어스타일, 악세사리, 외모 정보 추가
   - 인물 관리: 동일한 스타일 정보 필드 추가

4. **프롬프트 생성 개선**
   - 인물 정보 필수 포함
   - 콤마로 구분된 키워드 형식
   - 화풍별 맞춤 스타일 적용
   ```
   예시: "young woman, casual dress, long black hair, sitting in cafe, afternoon, warm lighting, makoto shinkai style, high quality"
   ```

5. **ComfyUI 워크플로우 변경**
   - Makoto Shinkai workflow.json 사용
   - 노드 매핑 변경: 42(LoadImage), 6(정방향 프롬프트), 7(부정방향 프롬프트), 9(SaveImage)

### 데이터베이스 스키마 변경

**User 모델 추가 필드:**
- gender: String (남성/여성/기타)
- clothing: String (의상 정보)
- hairstyle: String (헤어스타일)
- accessories: String (악세사리)
- appearance: String (외모 특징)

**Diary 모델 변경:**
- title: 필수 → 선택 사항
- date: Date 필드 추가 (날짜 설정 가능)
- artStyle: String 필드 추가 (화풍 선택)

**Person 모델 추가 필드:**
- gender, clothing, hairstyle, accessories, appearance (User 모델과 동일)

</details>

## ComfyUI 연동 기능

<details>
<summary>📋 ComfyUI 이미지 생성 기능</summary>

### 기능 개요

일기 내용 기반으로 생성된 프롬프트와 사용자 프로필 사진을 활용하여 ComfyUI를 통해 맞춤형 이미지를 생성하는 기능을 제공한다.

### 동작 방식

1. **Makoto Shinkai 워크플로우 기반 이미지 생성**
   - Makoto Shinkai workflow.json을 기본 워크플로우로 사용한다
   - 애니메이션 스타일의 고품질 이미지 생성에 최적화되어 있다
   - IPAdapter FaceID를 통한 인물 참조 기능 포함
   
2. **인물 정보 기반 프롬프트 생성**
   - 사용자의 성별, 의상, 헤어스타일, 악세사리 정보를 프롬프트에 필수 포함
   - 콤마로 구분된 키워드 형식으로 정확한 제어 가능
   - 화풍별 맞춤 스타일 키워드 자동 적용

3. **화풍 선택 기능**
   - Makoto Shinkai: 신카이 마코토 스타일 애니메이션
   - Anime: 일반 애니메이션/만화 스타일
   - Realistic: 사실적인 스타일
   - Watercolor: 수채화 스타일
   - Oil Painting: 유화 스타일

4. **생성된 이미지 자동 저장**
   - 생성된 이미지는 자동으로 일기에 첨부된다
   - 고유한 파일명으로 저장되어 충돌 방지
   - 동일한 일기에 여러 이미지 생성 가능

### 사용 방법

1. 사용자 프로필에 인물 정보 등록 (성별, 의상, 헤어스타일 등)
2. 프로필 사진 업로드 (IPAdapter 참조용)
3. 일기 작성 시 화풍 선택
4. 일기 내용 기반으로 이미지 생성 API 호출

### API 호출 예시

```bash
# 이미지 생성
POST /api/diaries/:id/generate-image
Authorization: Bearer [토큰]

# 응답
{
  "message": "이미지가 성공적으로 생성되었습니다.",
  "photo": "/uploads/diary_60a1c2b3c4d5e6f7g8h9i0_1234567890.png",
  "diary": { ... }
}
```

</details>

<details>
<summary>📋 실행 방법</summary>

### 필수 환경 변수

프로젝트 루트에 `.env` 파일을 생성하고 다음 환경 변수를 설정해야 한다:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_S3_BUCKET=your_s3_bucket_name
OPENAI_API_KEY=your_openai_api_key
COMFY_SERVER_URL=http://127.0.0.1:8188
```

### ComfyUI 설정

1. ComfyUI가 설치되어 있어야 한다.
2. ComfyUI 서버가 실행 중이어야 한다 (기본 포트: 8188).
3. 필요한 모델이 ComfyUI에 설치되어 있어야 한다:
   - Makoto Shinkai LoRA 모델
   - IPAdapter FaceID 모델  
   - 기본 체크포인트 모델
   - VAE 모델

### 개발 서버 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

서버는 기본적으로 http://localhost:5000 에서 실행된다.
</details>
