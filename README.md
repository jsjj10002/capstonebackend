
*최종 업데이트: 2025-04-30*

## 프로젝트 개요

Express.js 기반 일기 애플리케이션의 백엔드 서버입니다. 사용자 인증, 일기 관리, 이미지 업로드를 지원

## 진행 상황 정리

### 1. 백엔드 개발

- Express.js 기반 RESTful API 서버 구축
- MongoDB 데이터베이스 연결 설정
- 사용자 인증 및 권한 관리 구현
- 일기 CRUD 기능 구현
- 이미지 업로드 기능 구현
- OpenAI API를 활용한 이미지 특징 분석 기능 추가
- 주변 사람들의 정보 및 사진 관리 기능 추가

### 2. AWS 설정

- IAM 사용자 생성 및 액세스 키 발급
- S3 버킷 생성 (보안 설정 적용)
- S3 서명된 URL 기능 추가 (비공개 이미지 접근용)
- uploadToS3 함수에서 ACL: 'public-read' 제거됨

### 3. 환경 변수 설정

- MongoDB 연결 키
- JWT 비밀키
- AWS 액세스 키 및 설정
- 포트 설정
- OpenAI API 키

### 4. 이미지 특징 분석 프롬프트

- GPT-o4-mini 모델 활용한 이미지 특징 포착 방식
-resoning 모델 사용해 더 정교한 분석
- 얼굴 특징 분석: 눈, 코, 입의 형태/색상/위치
- 헤어스타일 분석: 길이, 색상, 스타일링
- 피부톤 및 얼굴형 분석: 피부 색조, 얼굴 윤곽
- 기본 인적 특성 추정: 성별, 인종, 나이
- 특징을 종합한 단일 문장으로 출력
- 검색 및 인물 특성 파악에 활용

## 구현 기능

### 1. 사용자 관리

- 회원가입 (얼굴 사진 업로드 포함)
- 로그인/인증
- 프로필 조회 및 업데이트

### 2. 일기 관리

- 일기 작성 (텍스트 및 이미지 업로드)
- 일기 조회 (전체 또는 개별)
- 일기 수정 및 삭제
- 일기 검색 기능

### 3. 사람 관리

- 주변 사람들의 정보 및 사진 추가
- 사람 정보 조회 (목록/개별)
- 사람 정보 수정 및 삭제
- 사람 검색 기능

### 4. 이미지 분석

- OpenAI API를 활용한 이미지 특징 분석
- 이미지 특징을 기반으로 한 검색 기능

### 5. 파일 업로드

- 로컬 스토리지 및 AWS S3 클라우드 스토리지 지원
- 이미지 파일 필터링 및 크기 제한

### 6. 보안

- JWT 기반 인증
- 비밀번호 해싱
- 권한 검증

## API 명세

| 메소드 | 엔드포인트                     | 설명                 | 인증 필요 | 요청 본문                                      | 응답                                       |
|--------|--------------------------------|----------------------|-----------|-----------------------------------------------|-------------------------------------------|
| POST   | /api/users/register            | 회원가입             | 아니오    | username, email, password, profilePhoto(파일) | 사용자 정보, JWT 토큰                     |
| POST   | /api/users/login               | 로그인               | 아니오    | email, password                               | 사용자 정보, JWT 토큰                     |
| GET    | /api/users/profile             | 프로필 조회          | 예        | -                                             | 사용자 정보                               |
| PUT    | /api/users/profile/photo       | 프로필 사진 업데이트 | 예        | profilePhoto(파일)                           | 업데이트된 사용자 정보                    |
| POST   | /api/diaries                   | 일기 작성            | 예        | title, content, mood, tags, photos(파일)     | 생성된 일기 정보                          |
| GET    | /api/diaries                   | 내 일기 전체 조회    | 예        | -                                             | 일기 목록                                 |
| GET    | /api/diaries/search?keyword=값 | 일기 검색            | 예        | query: keyword                               | 검색 결과 일기 목록                       |
| GET    | /api/diaries/:id               | 특정 일기 조회       | 예        | -                                             | 일기 상세 정보                            |
| PUT    | /api/diaries/:id               | 일기 수정            | 예        | title, content, mood, tags, photos(파일)     | 업데이트된 일기 정보                      |
| DELETE | /api/diaries/:id               | 일기 삭제            | 예        | -                                             | 성공 메시지                               |
| POST   | /api/people                    | 사람 추가            | 예        | name, relation, notes, photo(파일)           | 생성된 사람 정보                          |
| GET    | /api/people                    | 내가 추가한 사람 목록 | 예        | -                                             | 사람 목록                                 |
| GET    | /api/people/search?keyword=값  | 사람 검색            | 예        | query: keyword                               | 검색 결과 사람 목록                       |
| GET    | /api/people/:id                | 특정 사람 조회       | 예        | -                                             | 사람 상세 정보                            |
| PUT    | /api/people/:id                | 사람 정보 수정       | 예        | name, relation, notes, photo(파일)           | 업데이트된 사람 정보                      |
| DELETE | /api/people/:id                | 사람 삭제            | 예        | -                                             | 성공 메시지                               |

## 실행 방법

### 필수 환경 변수

프로젝트 루트에 `.env` 파일을 생성하고 다음 환경 변수를 설정:

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

서버는 기본적으로 http://localhost:5000 에서 실행됨
