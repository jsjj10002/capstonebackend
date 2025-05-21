*최종 업데이트: 2025-05-21*

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
- 일기 내용 자동 분석으로 태그 및 무드 추출 기능 추가했다
- ComfyUI 연동하여 일기 내용 기반 실제 이미지 생성 기능 추가했다

### 2. AWS 설정

- IAM 사용자 생성 및 액세스 키 발급했다
- S3 버킷 생성 (보안 설정 적용)했다
- S3 서명된 URL 기능 추가 (비공개 이미지 접근용)했다
- `uploadToS3` 함수에서 `ACL: 'public-read'` 제거됐다

### 3. 환경 변수 설정

- MongoDB 연결 키 설정했다
- JWT 비밀키 설정했다
- AWS 액세스 키 및 설정했다
- 포트 설정했다
- OpenAI API 키 설정했다
- ComfyUI 서버 URL 설정했다

### 4. 일기 내용 분석 프롬프트

- GPT-o4-mini 모델을 활용한 일기 텍스트 분석을 수행한다
- 일기 제목과 내용에서 자동으로 태그 추출한다
  - 장소: 일기에 언급된 장소 (카페, 학교, 공원 등)
  - 시간대: 일기에 언급된 시간대 (아침, 오후, 저녁 등)
  - 활동: 주요 활동 (공부, 운동, 쇼핑, 여행 등)
  - 인물: 일기에 언급된 인물 관계 (친구, 가족, 연인, 동료 등)
  - 이벤트: 특별한 이벤트 (생일, 여행, 시험, 모임 등)
  - 날씨: 일기에 언급된 날씨 상태 (맑음, 비, 눈 등)
- 일기 내용에서 감정 상태(무드) 자동 분석한다
- 사용자 입력 태그와 자동 분석 태그 병합 기능을 제공한다

### 5. 이미지 프롬프트 생성 기능

- GPT-o4-mini 모델을 활용한 일기 내용 기반 이미지 생성 프롬프트 자동 생성
- 일기의 장면만 묘사하는 방식으로 프롬프트 생성
- 일기의 시간, 장소, 분위기, 활동 등을 반영한 생생한 장면 묘사
- 인물의 얼굴 특징은 포함하지 않고 장면 위주로 프롬프트 구성

### 6. ComfyUI 연동

- ComfyUI와의 API 통신 기능 구현
- 워크플로우 JSON 커스터마이징 로직 개발
- 사용자 프로필 사진 기반 이미지 생성 기능 추가
- AI 생성 프롬프트와 ComfyUI 통합으로 완전 자동화된 이미지 생성 구현
</details>

<details>
<summary>📋 구현 기능</summary>

### 1. 사용자 관리

- 회원가입 (프로필 사진 업로드 포함) 기능 제공한다
- 로그인/인증 기능 제공한다
- 프로필 조회 및 업데이트 기능 제공한다

### 2. 일기 관리

- 일기 작성 (텍스트 및 이미지 업로드) 기능 제공한다
- 일기 조회 (전체 또는 개별) 기능 제공한다
- 일기 수정 및 삭제 기능 제공한다
- 일기 검색 기능 제공한다
- 일기 내용 자동 분석 (태그, 무드 추출) 기능 제공한다
- 일기 내용을 기반으로 이미지 생성 프롬프트 자동 생성 기능 제공한다
- 일기 내용 기반으로 ComfyUI를 통한 실제 이미지 생성 기능 제공한다

### 3. 사람 관리

- 주변 사람들의 정보 및 사진 추가 기능 제공한다
- 사람 정보 조회 (목록/개별) 기능 제공한다
- 사람 정보 수정 및 삭제 기능 제공한다
- 사람 검색 기능 제공한다

### 4. AI 기반 분석

- 일기 내용 자동 분석을 통한 태그 및 감정 추출 기능 제공한다
- 일기 내용을 기반으로 장면 중심 이미지 생성 프롬프트 제공 기능
- 분석 결과를 기반으로 한 검색 기능 강화했다
- 사용자 프로필 이미지와 일기 내용을 결합한 맞춤형 AI 이미지 생성 기능 제공한다

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
| GET    | /api/users/profile             | 프로필 조회                      | 예        | -                                             | 사용자 정보                               |
| PUT    | /api/users/profile/photo       | 프로필 사진 업데이트             | 예        | profilePhoto(파일)                           | 업데이트된 사용자 정보                    |
| PUT    | /api/users/profile             | 프로필 정보 업데이트             | 예        | username(선택), email(선택)                  | 업데이트된 사용자 정보                    |
| POST   | /api/diaries                   | 일기 작성                        | 예        | title, content, mood(선택), tags(선택), photos(선택)     | 생성된 일기 정보 (AI 분석 태그/무드 포함)   |
| GET    | /api/diaries                   | 내 일기 전체 조회                | 예        | -                                             | 일기 목록                                 |
| GET    | /api/diaries/search?keyword=값 | 일기 검색                        | 예        | query: keyword                               | 검색 결과 일기 목록                       |
| GET    | /api/diaries/filter            | 일기 필터링(태그/무드/날짜)      | 예        | tags(선택), mood(선택), startDate(선택), endDate(선택) | 필터링된 일기 목록                       |
| GET    | /api/diaries/:id               | 특정 일기 조회                   | 예        | -                                             | 일기 상세 정보                            |
| GET    | /api/diaries/:id/prompt        | 일기 기반 이미지 생성 프롬프트  | 예        | -                                             | 생성된 프롬프트 텍스트                    |
| POST   | /api/diaries/:id/generate-image | 일기 내용과 프로필 사진 기반 이미지 생성 | 예 | - | 생성된 이미지 URL 및 일기 정보 |
| PUT    | /api/diaries/:id               | 일기 수정                        | 예        | title(선택), content(선택), mood(선택), tags(선택), photos(선택) | 업데이트된 일기 정보 (AI 분석 태그/무드 포함) |
| DELETE | /api/diaries/:id               | 일기 삭제                        | 예        | -                                             | 성공 메시지                               |
| DELETE | /api/diaries/:id/photos/:photoId | 일기에서 특정 사진 삭제        | 예        | -                                             | 업데이트된 일기 정보                      |
| POST   | /api/people                    | 사람 추가                        | 예        | name, relation, notes, photo(파일)           | 생성된 사람 정보                          |
| GET    | /api/people                    | 내가 추가한 사람 목록            | 예        | -                                             | 사람 목록                                 |
| GET    | /api/people/search?keyword=값  | 사람 검색                        | 예        | query: keyword                               | 검색 결과 사람 목록                       |
| GET    | /api/people/filter             | 사람 필터링(관계)                | 예        | relation                                      | 필터링된 사람 목록                        |
| GET    | /api/people/:id                | 특정 사람 조회                   | 예        | -                                             | 사람 상세 정보                            |
| PUT    | /api/people/:id                | 사람 정보 수정                   | 예        | name(선택), relation(선택), notes(선택), photo(선택) | 업데이트된 사람 정보                      |
| DELETE | /api/people/:id                | 사람 삭제                        | 예        | -                                             | 성공 메시지                               |
| GET    | /api/tags                      | 모든 태그 조회                   | 예        | -                                             | 사용자의 모든 태그 목록                   |
</details>

## API 데이터 요약

<details>
<summary>📋 사용자 인증 API 데이터</summary>

| API 엔드포인트 | 요청 데이터 | 응답 데이터 |
|---------------|------------|------------|
| POST /api/users/register | username, email, password, profilePhoto(선택) | _id, username, email, profilePhoto, token |
| POST /api/users/login | email, password | _id, username, email, profilePhoto, token |
| GET /api/users/profile | Authorization 헤더(Bearer 토큰) | _id, username, email, profilePhoto |
| PUT /api/users/profile | Authorization 헤더(Bearer 토큰), username(선택), email(선택) | _id, username, email, profilePhoto |
| PUT /api/users/profile/photo | Authorization 헤더(Bearer 토큰), profilePhoto(파일) | _id, username, email, profilePhoto |
</details>

<details>
<summary>📋 인물 관리 API 데이터</summary>

| API 엔드포인트 | 요청 데이터 | 응답 데이터 |
|---------------|------------|------------|
| POST /api/people | Authorization 헤더(Bearer 토큰), name, relation(선택), notes(선택), photo(필수) | _id, user, name, relation, photo, notes, createdAt, updatedAt |
| GET /api/people | Authorization 헤더(Bearer 토큰) | 인물 객체 배열 |
| GET /api/people/search | Authorization 헤더(Bearer 토큰), keyword(쿼리 파라미터) | 검색 결과 인물 객체 배열 |
| GET /api/people/filter | Authorization 헤더(Bearer 토큰), relation(쿼리 파라미터) | 필터링된 인물 객체 배열 |
| GET /api/people/:id | Authorization 헤더(Bearer 토큰), id(경로 파라미터) | 인물 객체 |
| PUT /api/people/:id | Authorization 헤더(Bearer 토큰), id(경로 파라미터), name(선택), relation(선택), notes(선택), photo(선택) | 수정된 인물 객체 |
| DELETE /api/people/:id | Authorization 헤더(Bearer 토큰), id(경로 파라미터) | 삭제 메시지 |
</details>

<details>
<summary>📋 일기 관리 API 데이터</summary>

| API 엔드포인트 | 요청 데이터 | 응답 데이터 |
|---------------|------------|------------|
| POST /api/diaries | Authorization 헤더(Bearer 토큰), title, content, mood(선택), tags(선택), photos(선택) | _id, user, title, content, mood, photos, tags, createdAt, updatedAt |
| GET /api/diaries | Authorization 헤더(Bearer 토큰) | 일기 객체 배열 |
| GET /api/diaries/search | Authorization 헤더(Bearer 토큰), keyword(쿼리 파라미터) | 검색 결과 일기 객체 배열 |
| GET /api/diaries/filter | Authorization 헤더(Bearer 토큰), tags(선택), mood(선택), startDate(선택), endDate(선택) | 필터링된 일기 객체 배열 |
| GET /api/diaries/:id | Authorization 헤더(Bearer 토큰), id(경로 파라미터) | 일기 객체 |
| PUT /api/diaries/:id | Authorization 헤더(Bearer 토큰), id(경로 파라미터), title(선택), content(선택), mood(선택), tags(선택), photos(선택) | 수정된 일기 객체 |
| DELETE /api/diaries/:id | Authorization 헤더(Bearer 토큰), id(경로 파라미터) | 삭제 메시지 |
| DELETE /api/diaries/:id/photos/:photoId | Authorization 헤더(Bearer 토큰), id(경로 파라미터), photoId(경로 파라미터) | 수정된 일기 객체 |
| GET /api/diaries/:id/prompt | Authorization 헤더(Bearer 토큰), id(경로 파라미터) | { prompt: "생성된 프롬프트 문자열" } |
| POST /api/diaries/:id/generate-image | Authorization 헤더(Bearer 토큰), id(경로 파라미터) | { message: "이미지가 성공적으로 생성되었습니다.", photo: 이미지URL, diary: 일기객체 } |
| GET /api/tags | Authorization 헤더(Bearer 토큰) | 문자열 태그 배열 |
</details>

<details>
<summary>📋 일기 자동 분석 기능</summary>

### 기능 개요

일기 작성 또는 수정 시 사용자가 입력한 제목과 내용을 분석하여 자동으로 태그와 무드(감정 상태)를 생성한다.

### 동작 방식

1. **태그 자동 생성**
   - 사용자가 태그를 입력하지 않으면 일기 내용에서 자동으로 태그를 추출한다.
   - 사용자가 일부 태그를 입력한 경우, 사용자 입력 태그와 자동 생성 태그를 병합한다.
   - 태그는 장소, 시간대, 활동, 인물 관계, 이벤트, 날씨 등의 정보를 포함한다.

2. **무드(감정) 자동 분석**
   - 사용자가 기분/감정을 입력하지 않으면 일기 내용에서 주요 감정을 분석하여 설정한다.
   - 사용자가 직접 기분을 입력한 경우, 해당 입력값을 우선 사용한다.

3. **분석 결과 활용**
   - 분석된 태그와 무드는 일기 데이터와 함께 저장된다.
   - 검색 기능을 통해 특정 태그나 감정으로 일기를 쉽게 찾을 수 있다.
   - 자동 생성된 태그는 사용자가 입력한 태그와 동등하게 검색에 활용된다.

### 사용 방법

- 일기 작성 시 제목과 내용만 입력하고 태그와 무드는 비워두면 자동으로 생성된다.
- 태그 필드에 일부 태그만 입력하면, 자동 생성 태그가 추가로 병합된다.
- 무드 필드를 비워두면 자동으로 감정 상태가 분석되어 설정된다.
</details>

## AI 분석 예시

<details>
<summary>📝 일기 내용 태깅 예시</summary>

일기 작성 시 AI가 자동으로 내용을 분석하여 관련 태그와 감정(무드)을 추출한다. 이를 통해 사용자는 과거의 기록을 더 쉽게 검색하고 분류할 수 있다.

**입력 일기 예시:**

![일기 작성 예시](pictures/일기%20작성%20예시.png)

**자동 태깅 결과:**

![일기 내용 태그 결과](pictures/일기%20내용%20태그%20결과.png)

</details>

<details>
<summary>✨ 이미지 프롬프트 생성 예시</summary>

특정 일기의 내용을 기반으로 AI가 이미지 생성을 위한 프롬프트를 자동으로 만들어준다. 이 프롬프트는 장면 묘사에 중점을 두어 일기의 내용과 분위기를 시각적으로 표현할 수 있도록 구성된다.

**프롬프트 생성 특징:**
- 일기의 장소, 시간, 분위기, 활동을 중심으로 표현
- 인물이 등장하는 경우 얼굴 특징 없이 상황 중심으로 묘사
- 사실적인 사진 스타일로 표현 가능한 영어 프롬프트 생성

**프롬프트 생성 결과:**

![이미지 프롬프트 생성 예시](pictures/이미지%20프롬프트%20생성.png)

</details>

## ComfyUI 연동 기능

<details>
<summary>📋 ComfyUI 이미지 생성 기능</summary>

### 기능 개요

일기 내용 기반으로 생성된 프롬프트와 사용자 프로필 사진을 활용하여 ComfyUI를 통해 맞춤형 이미지를 생성하는 기능을 제공한다.

### 동작 방식

1. **워크플로우 기반 이미지 생성**
   - 사전 정의된 워크플로우 템플릿(comfytest.json)을 사용한다.
   - 워크플로우에는 컨트롤넷(OpenPose)을 통한 인물 포즈 반영이 포함된다.
   - 프로필 사진의 포즈를 기반으로 일기 내용에 맞는 장면을 생성한다.
   
2. **자동 프롬프트 활용**
   - 일기 내용 분석을 통해 자동 생성된 프롬프트를 이미지 생성에 활용한다.
   - 장면, 분위기, 시간대 등 일기의 핵심 요소가 반영된 이미지를 생성한다.

3. **사용자 프로필 사진 활용**
   - 사용자의 프로필 사진에서 포즈 정보를 추출하여 이미지 생성에 반영한다.
   - 얼굴 특징은 제외하고 자세와 구도만 참조한다.

4. **생성된 이미지 저장 및 연결**
   - 생성된 이미지는 자동으로 일기에 첨부된다.
   - 동일한 일기에 여러 이미지를 생성하여 첨부할 수 있다.

### 사용 방법

1. 로그인하여 프로필 사진이 등록된 상태여야 한다.
2. 일기를 작성하거나 기존 일기를 선택한다.
3. 해당 일기 ID를 사용하여 이미지 생성 API를 호출한다.
4. 생성된 이미지는 자동으로 해당 일기에 추가된다.

### 예시 API 호출

```
POST /api/diaries/:id/generate-image
Authorization: Bearer [토큰]
```

### API 응답 예시

```json
{
  "message": "이미지가 성공적으로 생성되었습니다.",
  "photo": "/uploads/diary_60a1c2b3c4d5e6f7g8h9i0_1234567890.png",
  "diary": {
    "_id": "60a1c2b3c4d5e6f7g8h9i0",
    "title": "공원 산책",
    "content": "오늘 저녁에...",
    "photos": [
      "/uploads/diary_60a1c2b3c4d5e6f7g8h9i0_1234567890.png"
    ],
    "..."
  }
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
COMFY_SERVER_URL=http://127.0.0.1:8000
```

### ComfyUI 설정

1. ComfyUI가 설치되어 있어야 한다.
2. ComfyUI 서버가 실행 중이어야 한다 (기본 포트: 8000).
3. 필요한 모델이 ComfyUI에 설치되어 있어야 한다:
   - SD XL Turbo 모델
   - ControlNet OpenPose 모델
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
