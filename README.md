*최종 업데이트: 2025-05-01*

<details>
<summary>📌 목차</summary>

- [프로젝트 개요](#프로젝트-개요)
- [진행 상황 정리](#진행-상황-정리)
- [구현 기능](#구현-기능)
- [API 명세](#api-명세)
- [API 데이터 요약](#api-데이터-요약)
- [실행 방법](#실행-방법)
</details>

## 프로젝트 개요

Express.js 기반 일기 애플리케이션의 백엔드 서버임. 사용자 인증, 일기 관리, 이미지 업로드 및 AI 기반 콘텐츠 분석을 지원함.

<details>
<summary>📋 진행 상황 정리</summary>

### 1. 백엔드 개발

- Express.js 기반 RESTful API 서버 구축함
- MongoDB 데이터베이스 연결 설정함
- 사용자 인증 및 권한 관리 구현함
- 일기 CRUD 기능 구현함
- 이미지 업로드 기능 구현함
- OpenAI API를 활용한 이미지 특징 분석 기능 추가함
- 주변 사람들의 정보 및 사진 관리 기능 추가함
- 일기 내용 자동 분석으로 태그 및 무드 추출 기능 추가함

### 2. AWS 설정

- IAM 사용자 생성 및 액세스 키 발급함
- S3 버킷 생성 (보안 설정 적용)함
- S3 서명된 URL 기능 추가 (비공개 이미지 접근용)함
- `uploadToS3` 함수에서 `ACL: 'public-read'` 제거됨

### 3. 환경 변수 설정

- MongoDB 연결 키 설정함
- JWT 비밀키 설정함
- AWS 액세스 키 및 설정함
- 포트 설정함
- OpenAI API 키 설정함

### 4. 이미지 특징 분석 프롬프트

- GPT-o4-mini 모델 활용한 이미지 특징 포착 방식을 사용함
- reasoning 모델 사용해 더 정교한 분석을 수행함
- 얼굴 특징 분석: 눈, 코, 입의 형태/색상/위치 분석함
- 헤어스타일 분석: 길이, 색상, 스타일링 분석함
- 피부톤 및 얼굴형 분석: 피부 색조, 얼굴 윤곽 분석함
- 기본 인적 특성 추정: 성별, 인종, 나이 추정함
- 특징을 종합한 단일 문장으로 출력함
- 검색 및 인물 특성 파악에 활용함

### 5. 일기 내용 분석 프롬프트

- GPT-o4-mini 모델을 활용한 일기 텍스트 분석을 수행함
- 일기 제목과 내용에서 자동으로 태그 추출함
  - 장소: 일기에 언급된 장소 (카페, 학교, 공원 등)
  - 시간대: 일기에 언급된 시간대 (아침, 오후, 저녁 등)
  - 활동: 주요 활동 (공부, 운동, 쇼핑, 여행 등)
  - 인물: 일기에 언급된 인물 관계 (친구, 가족, 연인, 동료 등)
  - 이벤트: 특별한 이벤트 (생일, 여행, 시험, 모임 등)
  - 날씨: 일기에 언급된 날씨 상태 (맑음, 비, 눈 등)
- 일기 내용에서 감정 상태(무드) 자동 분석함
- 사용자 입력 태그와 자동 분석 태그 병합 기능을 제공함
</details>

<details>
<summary>📋 구현 기능</summary>

### 1. 사용자 관리

- 회원가입 (얼굴 사진 업로드 포함) 기능 제공함
- 로그인/인증 기능 제공함
- 프로필 조회 및 업데이트 기능 제공함

### 2. 일기 관리

- 일기 작성 (텍스트 및 이미지 업로드) 기능 제공함
- 일기 조회 (전체 또는 개별) 기능 제공함
- 일기 수정 및 삭제 기능 제공함
- 일기 검색 기능 제공함
- 일기 내용 자동 분석 (태그, 무드 추출) 기능 제공함

### 3. 사람 관리

- 주변 사람들의 정보 및 사진 추가 기능 제공함
- 사람 정보 조회 (목록/개별) 기능 제공함
- 사람 정보 수정 및 삭제 기능 제공함
- 사람 검색 기능 제공함

### 4. AI 기반 분석

- OpenAI API를 활용한 이미지 특징 분석 기능 제공함
- 일기 내용 자동 분석을 통한 태그 및 감정 추출 기능 제공함
- 분석 결과를 기반으로 한 검색 기능 강화함

### 5. 파일 업로드

- 로컬 스토리지 및 AWS S3 클라우드 스토리지 지원함
- 이미지 파일 필터링 및 크기 제한 기능 제공함

### 6. 보안

- JWT 기반 인증 사용함
- 비밀번호 해싱 사용함
- 권한 검증 수행함
</details>

<details>
<summary>📋 API 명세</summary>

| 메소드 | 엔드포인트                     | 설명                 | 인증 필요 | 요청 본문                                      | 응답                                       |
|--------|--------------------------------|----------------------|-----------|-----------------------------------------------|-------------------------------------------|
| POST   | /api/users/register            | 회원가입             | 아니오    | username, email, password, profilePhoto(파일) | 사용자 정보, JWT 토큰                     |
| POST   | /api/users/login               | 로그인               | 아니오    | email, password                               | 사용자 정보, JWT 토큰                     |
| GET    | /api/users/profile             | 프로필 조회          | 예        | -                                             | 사용자 정보                               |
| PUT    | /api/users/profile/photo       | 프로필 사진 업데이트 | 예        | profilePhoto(파일)                           | 업데이트된 사용자 정보                    |
| POST   | /api/diaries                   | 일기 작성            | 예        | title, content, mood(선택), tags(선택), photos(선택)     | 생성된 일기 정보 (AI 분석 태그/무드 포함)   |
| GET    | /api/diaries                   | 내 일기 전체 조회    | 예        | -                                             | 일기 목록                                 |
| GET    | /api/diaries/search?keyword=값 | 일기 검색            | 예        | query: keyword                               | 검색 결과 일기 목록                       |
| GET    | /api/diaries/:id               | 특정 일기 조회       | 예        | -                                             | 일기 상세 정보                            |
| PUT    | /api/diaries/:id               | 일기 수정            | 예        | title(선택), content(선택), mood(선택), tags(선택), photos(선택) | 업데이트된 일기 정보 (AI 분석 태그/무드 포함) |
| DELETE | /api/diaries/:id               | 일기 삭제            | 예        | -                                             | 성공 메시지                               |
| POST   | /api/people                    | 사람 추가            | 예        | name, relation, notes, photo(파일)           | 생성된 사람 정보                          |
| GET    | /api/people                    | 내가 추가한 사람 목록 | 예        | -                                             | 사람 목록                                 |
| GET    | /api/people/search?keyword=값  | 사람 검색            | 예        | query: keyword                               | 검색 결과 사람 목록                       |
| GET    | /api/people/:id                | 특정 사람 조회       | 예        | -                                             | 사람 상세 정보                            |
| PUT    | /api/people/:id                | 사람 정보 수정       | 예        | name, relation, notes, photo(파일)           | 업데이트된 사람 정보                      |
| DELETE | /api/people/:id                | 사람 삭제            | 예        | -                                             | 성공 메시지                               |
</details>

## API 데이터 요약

<details>
<summary>📋 사용자 인증 API 데이터</summary>

| API 엔드포인트 | 요청 데이터 | 응답 데이터 |
|---------------|------------|------------|
| POST /api/users/register | username, email, password, profilePhoto(선택) | _id, username, email, profilePhoto, profilePhotoFeatures, token |
| POST /api/users/login | email, password | _id, username, email, profilePhoto, profilePhotoFeatures, token |
| GET /api/users/profile | Authorization 헤더(Bearer 토큰) | _id, username, email, profilePhoto, profilePhotoFeatures |
| PUT /api/users/profile/photo | Authorization 헤더(Bearer 토큰), profilePhoto(파일) | _id, username, email, profilePhoto, profilePhotoFeatures |
</details>

<details>
<summary>📋 인물 관리 API 데이터</summary>

| API 엔드포인트 | 요청 데이터 | 응답 데이터 |
|---------------|------------|------------|
| POST /api/people | Authorization 헤더(Bearer 토큰), name, relation(선택), notes(선택), photo(필수) | _id, user, name, relation, photo, photoFeatures, notes, createdAt, updatedAt |
| GET /api/people | Authorization 헤더(Bearer 토큰) | 인물 객체 배열 |
| GET /api/people/search | Authorization 헤더(Bearer 토큰), keyword(쿼리 파라미터) | 검색 결과 인물 객체 배열 |
| GET /api/people/:id | Authorization 헤더(Bearer 토큰), id(경로 파라미터) | 인물 객체 |
| PUT /api/people/:id | Authorization 헤더(Bearer 토큰), id(경로 파라미터), name(선택), relation(선택), notes(선택), photo(선택) | 수정된 인물 객체 |
| DELETE /api/people/:id | Authorization 헤더(Bearer 토큰), id(경로 파라미터) | 삭제 메시지 |
</details>

<details>
<summary>📋 일기 관리 API 데이터</summary>

| API 엔드포인트 | 요청 데이터 | 응답 데이터 |
|---------------|------------|------------|
| POST /api/diaries | Authorization 헤더(Bearer 토큰), title, content, mood(선택), tags(선택), photos(선택) | _id, user, title, content, mood, photos, photoFeatures, tags, createdAt, updatedAt |
| GET /api/diaries | Authorization 헤더(Bearer 토큰) | 일기 객체 배열 |
| GET /api/diaries/search | Authorization 헤더(Bearer 토큰), keyword(쿼리 파라미터) | 검색 결과 일기 객체 배열 |
| GET /api/diaries/:id | Authorization 헤더(Bearer 토큰), id(경로 파라미터) | 일기 객체 |
| PUT /api/diaries/:id | Authorization 헤더(Bearer 토큰), id(경로 파라미터), title(선택), content(선택), mood(선택), tags(선택), photos(선택) | 수정된 일기 객체 |
| DELETE /api/diaries/:id | Authorization 헤더(Bearer 토큰), id(경로 파라미터) | 삭제 메시지 |
</details>

<details>
<summary>📋 일기 자동 분석 기능</summary>

### 기능 개요

일기 작성 또는 수정 시 사용자가 입력한 제목과 내용을 분석하여 자동으로 태그와 무드(감정 상태)를 생성함.

### 동작 방식

1. **태그 자동 생성**
   - 사용자가 태그를 입력하지 않으면 일기 내용에서 자동으로 태그를 추출함.
   - 사용자가 일부 태그를 입력한 경우, 사용자 입력 태그와 자동 생성 태그를 병합함.
   - 태그는 장소, 시간대, 활동, 인물 관계, 이벤트, 날씨 등의 정보를 포함함.

2. **무드(감정) 자동 분석**
   - 사용자가 기분/감정을 입력하지 않으면 일기 내용에서 주요 감정을 분석하여 설정함.
   - 사용자가 직접 기분을 입력한 경우, 해당 입력값을 우선 사용함.

3. **분석 결과 활용**
   - 분석된 태그와 무드는 일기 데이터와 함께 저장됨.
   - 검색 기능을 통해 특정 태그나 감정으로 일기를 쉽게 찾을 수 있음.
   - 자동 생성된 태그는 사용자가 입력한 태그와 동등하게 검색에 활용됨.

### 사용 방법

- 일기 작성 시 제목과 내용만 입력하고 태그와 무드는 비워두면 자동으로 생성됨.
- 태그 필드에 일부 태그만 입력하면, 자동 생성 태그가 추가로 병합됨.
- 무드 필드를 비워두면 자동으로 감정 상태가 분석되어 설정됨.
</details>

<details>
<summary>📋 실행 방법</summary>

### 필수 환경 변수

프로젝트 루트에 `.env` 파일을 생성하고 다음 환경 변수를 설정해야 함:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_S3_BUCKET=your_s3_bucket_name
OPENAI_API_KEY=your_openai_api_key
```

### 개발 서버 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

서버는 기본적으로 http://localhost:5000 에서 실행됨.
</details>
