# IEUM 전체 기능 개발 기획서

- 문서 버전: v1.6
- 작성일: 2026-05-19
- 목적: 백엔드와 프론트엔드 개발자가 바로 구현할 수 있도록 전체 기능, 화면, API, DB 구조, 검증 기준을 정리한다.
- 개발은 백엔드만 진행한다
- 확정 기술
  - Backend: NestJS
  - Database: PostgreSQL
  - Pacakge Manager: pnpm
  - [Nest-respone](https://www.npmjs.com/package/@3xhaust/nest-response)
  - Auth Library: `mirim-oauth-react`
  - OCR Library: Tesseract.js
  - CDN/Object Storage: Cloudflare CDN + Cloudflare R2
  - API Documentation: Swagger UI
- 원칙
  - 기능을 축소하지 않고 필요한 전체 범위를 정리한다.
  - 기본 데이터 저장은 PostgreSQL을 기준으로 한다.
  - 성능 개선을 위해 Redis, Kafka, CDN, connection pool, background job 등을 사용할 수 있게 설계한다.
  - 개인정보가 포함되는 컨택 정보는 선생님/관리자만 접근할 수 있다.

## 1. 서비스 개요

IEUM은 프로젝트 전시/행사에서 각 팀의 서비스 정보를 보여주고, 방문자의 피드백과 컨택 요청을 프로젝트별로 수집·관리하는 서비스다.

방문자는 프로젝트를 둘러보고 피드백 또는 컨택을 남긴다. 학생은 본인이 소속된 프로젝트의 피드백을 확인한다. 선생님과 관리자는 모든 프로젝트, 피드백, 컨택, 금칙어, 통계, 운영 데이터를 관리한다.

## 2. 전체 기능 범위

### 2.1 프로젝트/서비스 관리

- 프로젝트 목록 조회
- 프로젝트 상세 조회
- 프로젝트 목록 조회
- 프로젝트 상세 조회
- 개발자/관리자의 DB seed 기반 프로젝트 사전 등록
- 서비스 내 프로젝트 생성 기능 없음
- 서비스 내 프로젝트 수정/삭제 기능 없음
- 프로젝트 썸네일 사전 등록
- 서비스 설명 사전 등록
- 팀명 사전 등록
- 팀원 사전 등록
- 팀원 표시 순서 사전 관리
- 개발 스택 사전 등록
- 디자인 스택 사전 등록
- 프로젝트 공개/비공개 상태는 DB seed 또는 관리자 DB 작업으로 관리
- 프로젝트별 피드백 수 조회
- 프로젝트별 컨택 수 조회
- 프로젝트별 통계 조회

### 2.2 인증/사용자 관리

- `mirim-oauth-react` 기반 로그인
- 라이브러리가 제공하는 현재 사용자 정보 사용
- 백엔드는 전달받은 OAuth access token으로 사용자 검증
- 내부 사용자 자동 생성/업데이트
- 학생/선생님/관리자 역할 구분
- 내 정보 조회
- 로그아웃 처리
- Mirim OAuth 역할값 기반 선생님 판정
- env에 등록된 Mirim OAuth ID 기반 관리자 판정
- 학생이 소속된 프로젝트 조회
- 선생님/관리자의 사용자 목록 조회

### 2.3 피드백 기능

- 방문자 피드백 작성
- 로그인 여부와 무관한 익명 피드백 작성
- 프로젝트별 피드백 저장
- 피드백 내용 길이 검증
- HTML/script 입력 방어
- Aho-Corasick trie 기반 금칙어/비속어 필터링
- 피드백 자동 상태 판정
- 피드백 상태 관리
  - 공개
  - 차단
  - 삭제
- 학생의 본인 프로젝트 피드백 조회
- 선생님/관리자의 전체 피드백 조회
- 프로젝트별 피드백 필터
- 상태별 피드백 필터
- 피드백 검색
- 피드백 상태 변경
- 피드백 상태 변경 사유 기록
- 피드백 작성 시각/수정 시각 기록
- 피드백 작성자 사용자 정보 저장 금지
- 피드백 접근 권한 검증

### 2.4 방문자 설정/컨택 기능

- 최초 방문 시 방문자 설정 모달 표시
- 방문자 연령대 선택
- 방문자 유형 선택
  - 일반
  - 회사 관계자
- 방문자 설정을 브라우저 `localStorage`에 저장
- 저장된 방문자 설정이 있으면 다음 접속부터 설정 모달 생략
- 방문자 설정 초기화/수정 기능
- 회사 관계자는 최초 방문자 설정 단계에서 명함 촬영/업로드 필수
- 명함 이미지는 서버에 저장하고, 프론트는 `visitorProfileId`만 `localStorage`에 저장
- 명함 OCR 정보 추출
- OCR 결과 수동 수정
- 회사 관계자만 프로젝트를 둘러본 뒤 마음에 드는 프로젝트에서 컨택 작성 가능
- 컨택 작성 시 프로젝트 팀원 중 컨택 대상 학생 1명 선택
- 프로젝트별 컨택 저장
- 선택한 팀원이 해당 프로젝트 소속인지 서버에서 검증
- 이름 입력
- 회사/기관 입력
- 직책 입력
- 이메일 입력 및 형식 검증
- 전화번호 입력 및 형식 검증
- 메모 입력
- 컨택 상태 관리
  - 신규
  - 확인 완료
  - 보관
  - 삭제
- 선생님/관리자의 전체 컨택 조회
- 프로젝트별 컨택 필터
- 대상 팀원별 컨택 필터
- 방문자 유형별 컨택 필터
- 상태별 컨택 필터
- 컨택 검색
- 컨택 상세 조회
- 컨택 상태 변경
- 컨택 접근 로그 기록
- 컨택 데이터 보존/삭제 관리

### 2.5 금칙어/검수 관리

- 금칙어 목록 조회
- 금칙어 추가
- 금칙어 수정
- 금칙어 비활성화
- 금칙어 삭제
- 피드백 작성 시 Aho-Corasick 기반 금칙어 자동 검사
- 금칙어 포함 피드백 자동 차단
- 차단 사유 기록

### 2.6 통계/대시보드

- 전체 프로젝트 수
- 전체 피드백 수
- 전체 컨택 수
- 프로젝트별 피드백 수
- 프로젝트별 컨택 수
- 날짜별 피드백 작성 수
- 날짜별 컨택 작성 수
- 방문자 유형별 컨택 수
- 피드백 상태별 개수
- 컨택 상태별 개수
- 프로젝트별 인기/관심도 지표
- 행사 종료 후 요약 리포트 조회

### 2.7 실시간/준실시간 반영

- 새 피드백 생성 시 학생 화면 갱신
- 새 컨택 생성 시 선생님/관리자 화면 갱신
- 관리자 피드백 상태 변경 시 학생 화면 반영
- 컨택 상태 변경 시 관리자 화면 반영
- 실시간 연결 실패 시 polling으로 대체
- 중복 이벤트 수신 방지
- 최신순 정렬 유지

### 2.8 파일 관리

- 명함 이미지 업로드
- 프로젝트 썸네일 업로드
- 파일 타입 검증
- 파일 크기 검증
- 파일 저장 경로 관리
- 파일 접근 권한 검증
- 컨택 명함 이미지는 선생님/관리자만 접근
- 사용하지 않는 파일 정리

### 2.9 운영/보안

- 역할 기반 접근 제어
- 서버 측 권한 검증
- 공개 작성 요청 rate limit
- 입력값 검증
- 개인정보 접근 로그 기록
- 관리자 작업 로그 기록
- 컨택 데이터 삭제/보관 정책
- 에러 응답 표준화
- 서버 요청/응답 로깅

## 3. 사용자 역할

| 역할 | 설명 | 로그인 필요 여부 |
| --- | --- | --- |
| 방문자 | 행사 방문자. 프로젝트를 조회하고 익명 피드백을 남긴다. | 불필요 |
| 회사 관계자 | 컨택 작성이 가능한 방문자 유형. 명함 제출이 필수다. | 불필요 |
| 학생 | `mirim-oauth-react`로 로그인한 학생. 본인 팀 프로젝트와 피드백을 확인한다. | 필요 |
| 선생님 | `mirim-oauth-react`로 로그인한 교사. 전체 프로젝트, 피드백, 컨택을 관리한다. | 필요 |
| 관리자 | 서비스 운영자. 선생님 권한에 더해 사용자 역할, 금칙어, 운영 데이터를 관리한다. | 필요 |

## 4. 권한 규칙

| 기능 | 방문자 | 학생 | 선생님 | 관리자 |
| --- | --- | --- | --- | --- |
| 프로젝트 목록 조회 | 가능 | 가능 | 가능 | 가능 |
| 프로젝트 상세 조회 | 가능 | 가능 | 가능 | 가능 |
| 프로젝트 생성/수정/삭제 | 불가 | 불가 | 불가 | 서비스 화면에서는 불가, DB/seed로만 처리 |
| 프로젝트 공개/비공개 변경 | 불가 | 불가 | 불가 | 서비스 화면에서는 불가, DB/seed로만 처리 |
| 피드백 작성 | 가능 | 가능, 단 익명 처리 | 가능, 단 익명 처리 | 가능, 단 익명 처리 |
| 피드백 조회 | 불가 | 본인 팀 프로젝트만 | 전체 가능 | 전체 가능 |
| 피드백 상태 변경 | 불가 | 불가 | 가능 | 가능 |
| 컨택 작성 | 불가 | 불가 | 가능 | 가능 |
| 컨택 목록/상세 조회 | 불가 | 불가 | 전체 가능 | 전체 가능 |
| 컨택 상태 변경 | 불가 | 불가 | 가능 | 가능 |
| 명함 이미지 조회 | 불가 | 불가 | 가능 | 가능 |
| 금칙어 관리 | 불가 | 불가 | 가능 | 가능 |
| 통계 조회 | 불가 | 본인 팀 일부 통계 | 전체 가능 | 전체 가능 |
| 사용자 역할 변경 | 불가 | 불가 | 불가 | 서비스 화면에서는 불가, env/Mirim OAuth 기준 |

## 5. 프론트엔드 화면 기획

프론트엔드 기술은 별도로 정하지 않는다. 아래 화면과 API 계약을 기준으로 개발한다.

### 5.1 공개 화면

#### 5.1.0 최초 방문자 설정 모달

- 표시 시점: 방문자가 메인 페이지에 처음 접속했을 때
- 표시 조건
  - `localStorage`에 `ieum.visitorProfile`가 없을 때 표시한다.
  - 이미 저장된 설정이 있으면 다음 접속부터 표시하지 않는다.
- 목적
  - 방문자의 연령대와 유형을 먼저 수집한다.
  - 회사 관계자라면 프로젝트 탐색 전에 명함을 먼저 등록한다.
- 입력값
  - 연령대
  - 방문자 유형: 일반 / 회사 관계자
  - 명함 이미지: 회사 관계자일 때 필수
- 동작
  1. 방문자가 메인 페이지에 접속한다.
  2. 방문자 설정 모달이 열린다.
  3. 방문자는 연령대와 방문자 유형을 선택한다.
  4. 방문자 유형이 회사 관계자이면 명함을 촬영하거나 업로드한다.
  5. 프론트엔드는 방문자 설정 생성 API를 호출한다.
  6. 서버는 방문자 프로필을 생성하고 명함 이미지를 저장한다.
  7. 프론트엔드는 응답받은 `visitorProfileId`와 기본 설정을 `localStorage`에 저장한다.
  8. 이후 방문자는 프로젝트 목록과 상세를 자유롭게 둘러본다.

- 주의
  - 명함 이미지 원본을 `localStorage`에 저장하지 않는다.
  - 명함 파일은 서버 파일 저장소에 저장한다.
  - 방문자 설정을 다시 하고 싶은 사용자를 위해 설정 초기화 버튼을 제공한다.

#### 5.1.1 프로젝트 목록 화면

- 경로 예시: `/`
- 목적: 방문자가 전체 프로젝트를 둘러본다.
- 표시 정보
  - 프로젝트 썸네일
  - 서비스명
  - 팀명
  - 짧은 설명
  - 개발 스택
  - 디자인 스택
  - 피드백 수
  - 컨택 수 또는 관심 수
- 기능
  - 프로젝트 검색
  - 스택 필터
  - 공개 프로젝트만 표시
  - 프로젝트 상세 이동

#### 5.1.2 프로젝트 상세 화면

- 경로 예시: `/projects/:projectId`
- 목적: 방문자가 특정 프로젝트 정보를 자세히 본다.
- 표시 정보
  - 서비스명
  - 팀명
  - 서비스 설명
  - 썸네일
  - 팀원 목록
  - 팀원별 컨택 버튼 또는 팀원 선택 영역
  - 개발 스택
  - 디자인 스택
  - 피드백 작성 버튼
  - 컨택 작성 버튼
- 기능
  - 피드백 작성 화면 이동
  - 컨택 작성 화면 이동
  - 특정 팀원을 선택해 컨택 작성 화면으로 이동
- 컨택 진입 규칙
  - `localStorage`에 방문자 설정이 없으면 먼저 최초 방문자 설정 모달을 띄운다.
  - 회사 관계자인데 명함 등록이 완료되지 않았으면 명함 등록을 먼저 요구한다.

#### 5.1.3 피드백 작성 화면

- 경로 예시: `/projects/:projectId/feedback/new`
- 목적: 사용자가 프로젝트에 익명 피드백을 남긴다.
- 익명 원칙
  - 로그인 상태여도 피드백 작성자 정보는 저장하지 않는다.
  - 학생/선생님/관리자가 작성해도 피드백은 동일하게 익명 처리한다.
  - 운영 목적의 rate limit에 필요한 `ip_hash`, `user_agent`만 저장할 수 있다.
- 입력값
  - 피드백 내용
- 프론트 검증
  - 빈 값 불가
  - 2자 이상
  - 500자 이하
- 제출 결과
  - 공개 등록 완료
  - 금칙어 포함으로 차단
  - 서버 오류

#### 5.1.4 컨택 작성 화면

- 경로 예시: `/projects/:projectId/contacts/new`
- 목적: 방문자가 프로젝트를 둘러본 뒤 마음에 드는 프로젝트의 특정 팀원에게 컨택 의사를 남긴다.
- 진입 조건
  - 최초 방문자 설정이 완료되어 있어야 한다.
  - 프론트는 `localStorage.ieum.visitorProfile`를 가지고 있어야 한다.
  - 방문자 유형이 회사 관계자여야 한다.
  - 명함 등록이 완료되어 있어야 한다.
  - 일반 방문자와 학생은 컨택 작성 화면에 진입할 수 없다.
- 표시 정보
  - 현재 프로젝트명
  - 팀명
  - 팀원 목록
  - 현재 선택된 컨택 대상 팀원
  - 내 방문자 유형과 연령대 요약
  - 회사 관계자 명함 등록 완료 상태
- 입력값
  - 컨택 대상 팀원
  - 이름
  - 회사/기관
  - 직책
  - 이메일
  - 전화번호
  - 메모
  - 프론트 검증
  - 컨택 대상 팀원 선택 필수
  - 선택한 팀원이 현재 프로젝트 팀원 목록에 있어야 함
  - `visitorProfileId` 필수
  - 방문자 유형이 회사 관계자인지 확인
  - 이메일 입력 시 이메일 형식 확인
  - 전화번호 입력 시 전화번호 형식 확인
  - 기능
  - 프로젝트 상세에서 팀원을 미리 선택해 진입하면 해당 팀원을 기본 선택한다.
  - 컨택 작성 화면에서도 팀원을 변경할 수 있다.
  - 방문자 설정 수정이 필요하면 설정 초기화/수정 화면으로 이동한다.
  - 제출 성공/실패 안내를 표시한다.
- 제출 시 서버로 보내는 핵심 값
  - `visitorProfileId`
  - `targetMemberUserId`
  - 이름/회사/직책/이메일/전화번호/메모

### 5.2 로그인/내 정보 화면

#### 5.2.1 로그인 화면

- 경로 예시: `/login`
- 기능
  - `mirim-oauth-react`의 `MirimOAuthProvider`와 `useMirimOAuth` Hook을 사용한다.
  - 로그인 버튼은 `useMirimOAuth().logIn()`으로 동작한다.
  - 로그인 상태와 사용자 정보는 `currentUser`, `isLoggedIn`, `isLoading`으로 처리한다.
  - 로그인 완료 후 역할에 따라 이동한다.
    - 학생: `/student/projects`
    - 선생님/관리자: `/admin/dashboard`

#### 5.2.2 내 정보 화면

- 경로 예시: `/me`
- 표시 정보
  - 이름
  - 이메일
  - 역할
  - OAuth provider

### 5.3 학생 화면

#### 5.3.1 학생 내 프로젝트 화면

- 경로 예시: `/student/projects`
- 표시 정보
  - 내가 속한 프로젝트 목록
  - 프로젝트별 피드백 개수
  - 프로젝트별 최근 피드백 시각
- 기능
  - 프로젝트별 피드백 목록 이동

#### 5.3.2 학생 피드백 목록 화면

- 경로 예시: `/student/projects/:projectId/feedback`
- 표시 정보
  - 공개 상태 피드백 내용
  - 작성 시각
- 기능
  - 최신순 정렬
  - 자동 새로고침 또는 실시간 갱신
- 제한
  - 본인 팀 프로젝트가 아니면 접근 불가
  - 차단/삭제 피드백은 표시하지 않음

#### 5.3.3 학생 통계 화면

- 경로 예시: `/student/projects/:projectId/stats`
- 표시 정보
  - 내 프로젝트 피드백 수
  - 날짜별 피드백 수
  - 최근 피드백 수
- 제한
  - 컨택 상세 정보는 표시하지 않음

### 5.4 선생님/관리자 화면

#### 5.4.1 관리자 대시보드

- 경로 예시: `/admin/dashboard`
- 표시 정보
  - 전체 프로젝트 수
  - 전체 피드백 수
  - 전체 컨택 수
  - 신규 컨택 수
  - 날짜별 피드백/컨택 그래프

#### 5.4.2 프로젝트 조회 화면

- 경로 예시: `/admin/projects`
- 목적: 선생님/관리자가 사전 등록된 프로젝트와 연결 데이터를 확인한다.
- 기능
  - 프로젝트 목록 조회
  - 검색/필터
  - 프로젝트 상세 확인
  - 팀원 목록 확인
  - 피드백/컨택 수 확인
- 제한
  - 서비스 화면에서 프로젝트 생성/수정/삭제는 제공하지 않는다.
  - 프로젝트, 팀원, 스택, 썸네일, 공개 여부는 개발자 또는 관리자가 DB seed/마이그레이션/직접 DB 작업으로 사전에 넣는다.

#### 5.4.3 피드백 관리 화면

- 경로 예시: `/admin/feedback`
- 기능
  - 전체 피드백 조회
  - 프로젝트별 필터
  - 상태별 필터
  - 검색
  - 피드백 상세 확인
  - 공개 처리
  - 차단 처리
  - 삭제 처리
  - 처리 사유 입력

#### 5.4.4 컨택 관리 화면

- 경로 예시: `/admin/contacts`
- 기능
  - 전체 컨택 조회
  - 프로젝트별 필터
  - 방문자 유형별 필터
  - 상태별 필터
  - 검색
  - 컨택 상세 확인
  - 명함 이미지 확인
  - OCR 추출 결과 확인/수정
  - 상태 변경
  - 삭제/보관 처리

#### 5.4.5 금칙어 관리 화면

- 경로 예시: `/admin/banned-words`
- 기능
  - 금칙어 목록 조회
  - 금칙어 추가
  - 금칙어 수정
  - 금칙어 활성/비활성 변경
  - 금칙어 삭제

#### 5.4.6 사용자 조회 화면

- 경로 예시: `/admin/users`
- 기능
  - 사용자 목록 조회
  - 이름/이메일 검색
  - 역할 필터
  - OAuth ID 확인
  - 관리자 env 등록 여부 확인
- 제한
  - 서비스 화면에서 역할 변경은 제공하지 않는다.
  - 선생님은 Mirim OAuth 계정의 역할값으로 판정한다.
  - 관리자는 env에 미리 입력한 Mirim OAuth ID 목록으로 판정한다.

#### 5.4.7 통계/리포트 화면

- 경로 예시: `/admin/reports`
- 기능
  - 프로젝트별 피드백/컨택 통계
  - 날짜별 피드백/컨택 통계
  - 방문자 유형별 통계
  - 상태별 통계
  - 행사 요약 리포트 조회

## 6. 백엔드 기술 기획

### 6.1 기술 스택

- Framework: NestJS
- Database: PostgreSQL
- ORM: TypeORM 권장
- Auth: `mirim-oauth-react` + Mirim OAuth access token 검증
- File Upload: NestJS Multer 기반 업로드 처리
- Cache/Rate Limit/PubSub: Redis
- Event Streaming/Async Pipeline: Kafka
- Background Job: BullMQ + Kafka consumer
- Realtime: NestJS SSE + Redis Pub/Sub + PostgreSQL 이벤트 기록
- OCR: Tesseract.js 라이브러리 사용
- Static/File Delivery: Cloudflare R2 + Cloudflare CDN
- DB Connection Pool: PgBouncer 사용
- API Documentation: `@nestjs/swagger` 기반 Swagger UI
- Banned Word Matching: Aho-Corasick trie

### 6.2 Swagger UI 문서화

- NestJS는 `@nestjs/swagger`를 사용해 Swagger 문서를 생성한다.
- Swagger UI 경로는 `/docs`로 고정한다.
- OpenAPI JSON 경로는 `/docs-json`으로 둔다.
- 개발/스테이징 환경에서는 Swagger UI를 활성화한다.
- 운영 환경에서는 관리자 접근 또는 내부망 접근으로 제한한다.
- DTO에는 `@ApiProperty`, controller에는 `@ApiTags`, 인증이 필요한 endpoint에는 `@ApiBearerAuth`를 사용한다.
- 기획서에는 API 구조를 길게 나열하지 않고, 실제 구현 코드의 decorator를 기준으로 Swagger 문서를 최신 상태로 유지한다.


### 6.4 인증 흐름

직접 OAuth callback/code 교환 흐름을 구현하지 않고, 프론트엔드에서 `mirim-oauth-react` 라이브러리를 사용한다.

라이브러리 조사 기준:

- npm 패키지명: `mirim-oauth-react`
- 현재 확인 버전: `1.1.0`
- React Provider: `MirimOAuthProvider`
- React Hook: `useMirimOAuth`
- 주요 함수: `logIn`, `logOut`, `refreshUserInfo`, `refreshTokens`, `makeAuthenticatedRequest`
- 주요 사용자 필드: `id`, `email`, `nickname`, `major`, `isGraduated`, `admission`, `role`, `generation`
- 라이브러리 기능: PKCE, 자동 토큰 갱신, localStorage 저장, 팝업 인증
- 기본 OAuth 서버 URL: `https://api-auth.mmhs.app`

프론트엔드 흐름:

1. 앱 최상단을 `MirimOAuthProvider`로 감싼다.
2. Provider에 `clientId`, `clientSecret`, `redirectUri`, `scopes`, `oauthServerUrl`을 설정한다.
3. 로그인 버튼은 `useMirimOAuth().logIn()`을 호출한다.
4. 라이브러리는 Mirim OAuth 인증, PKCE, 토큰 저장, 사용자 정보 조회를 처리한다.
5. 프론트엔드는 `currentUser`와 `isLoggedIn`으로 화면 접근을 분기한다.
6. 프론트엔드는 서버 요청 시 라이브러리가 보유한 access token을 `Authorization: Bearer <mirim_access_token>` 형태로 전달한다.

백엔드 흐름:

1. NestJS는 프론트엔드가 보낸 Mirim OAuth access token을 받는다.
2. 백엔드는 토큰을 신뢰하지 않고 Mirim OAuth 서버의 토큰 검증 엔드포인트로 실제 사용자를 확인한다.
3. 토큰 검증은 `POST /api/v1/oauth/verify-token`을 사용한다.
4. 토큰 전달 방식은 다음 둘 중 하나를 지원한다.

```http
POST /api/v1/oauth/verify-token
Authorization: Bearer <access_token>
```

또는

```json
{
  "token": "<access_token>"
}
```

5. 검증 성공 응답에서 받은 Mirim 사용자 `id`를 `users.oauth_id`와 매칭한다.
6. 사용자가 없으면 `users`에 생성하고, 있으면 이름/이메일을 업데이트한다.
7. 역할은 관리자 env 목록과 Mirim OAuth 역할값으로 계산해 `users.role`에 동기화한다.
8. 최종 권한은 동기화된 `users.role`을 기준으로 판단한다.
9. 백엔드는 자체 OAuth callback endpoint나 OAuth 코드 교환 책임을 갖지 않는다.

보안 주의:

- 브라우저에 저장되는 값은 라이브러리 토큰과 사용자 상태이며, 서버 권한 판단의 최종 근거는 아니다.
- 백엔드는 매 요청마다 `POST /api/v1/oauth/verify-token`으로 access token을 검증하거나, Redis에 5분 TTL로 검증 결과를 캐싱해 사용자 신원을 확인한다.
- `clientSecret`이 진짜 비밀값이면 프론트엔드에 둘 수 없으므로, Mirim OAuth 앱 설정에서 웹 공개 클라이언트용 값인지 확인해야 한다.

### 6.5 역할 결정 방식

역할은 서비스 화면에서 수동 변경하지 않는다.

우선순위:

1. 검증된 Mirim OAuth 사용자 ID가 env `ADMIN_MIRIM_OAUTH_IDS`에 포함되어 있으면 `admin`이다.
2. Mirim OAuth 사용자 정보의 역할값이 선생님이면 `teacher`다.
3. 그 외 사용자는 `student`다.

운영 규칙:

- `ADMIN_MIRIM_OAUTH_IDS`는 comma-separated 문자열로 관리한다. 예: `ADMIN_MIRIM_OAUTH_IDS=oauth_id_1,oauth_id_2`
- 선생님 계정은 Mirim OAuth 계정 자체에 선생님 역할로 등록되어 있어야 한다.
- 로그인/토큰 검증 시 계산된 역할을 `users.role`에 동기화한다.
- DB의 `users.role`은 권한 판정을 빠르게 하기 위한 동기화 값이며, 원천은 env와 Mirim OAuth 역할값이다.

## 7. PostgreSQL DB 구조

### 7.1 users

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | uuid | PK | 내부 사용자 ID |
| oauth_provider | varchar(50) | not null | 예: `mirim_oauth` |
| oauth_id | varchar(100) | unique, not null | OAuth 사용자 ID |
| name | varchar(100) | not null | 사용자 이름 |
| email | varchar(255) | not null | 이메일 |
| role | user_role | not null default 'student' | env/Mirim OAuth 기준으로 동기화된 역할 |
| created_at | timestamptz | not null | 생성 시각 |
| updated_at | timestamptz | not null | 수정 시각 |

### 7.2 visitor_profiles

브라우저 `localStorage`에 저장되는 방문자 설정과 서버에 저장되는 명함 정보를 연결하는 익명 방문자 프로필이다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | uuid | PK | 방문자 프로필 ID |
| age_group | contact_age_group | not null | 최초 방문 시 선택한 연령대 |
| visitor_type | contact_visitor_type | not null | 일반/회사 관계자 |
| business_card_file_id | uuid | FK files.id, nullable | 회사 관계자 명함 이미지 파일 ID |
| business_card_registered | boolean | not null default false | 명함 등록 완료 여부 |
| ocr_raw_text | text | nullable | 명함 OCR 원문 |
| ocr_name | varchar(100) | nullable | OCR 추출 이름 |
| ocr_organization | varchar(150) | nullable | OCR 추출 회사/기관 |
| ocr_position | varchar(100) | nullable | OCR 추출 직책 |
| ocr_email | varchar(255) | nullable | OCR 추출 이메일 |
| ocr_phone | varchar(50) | nullable | OCR 추출 전화번호 |
| created_at | timestamptz | not null | 생성 시각 |
| updated_at | timestamptz | not null | 수정 시각 |

제약:

- `visitor_type = 'recruiter'`이면 `business_card_file_id`가 필요하다. 여기서 `recruiter`는 회사 관계자를 의미한다.
- 프론트엔드는 `visitor_profiles.id`를 `ieum.visitorProfile` localStorage 값 안에 저장한다.
- 명함 이미지 파일 자체는 `localStorage`에 저장하지 않는다.

### 7.3 projects

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | uuid | PK | 프로젝트 ID |
| service_name | varchar(100) | not null | 서비스명 |
| team_name | varchar(100) | not null | 팀명 |
| description | text | nullable | 서비스 설명 |
| thumbnail_file_id | uuid | FK files.id, nullable | 썸네일 파일 ID |
| development_stacks | text[] | not null default '{}' | 개발 스택 |
| design_stacks | text[] | not null default '{}' | 디자인 스택 |
| is_published | boolean | not null default true | 공개 여부 |
| created_at | timestamptz | not null | 생성 시각 |
| updated_at | timestamptz | not null | 수정 시각 |
| deleted_at | timestamptz | nullable | 삭제 시각 |

### 7.4 project_members

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | uuid | PK | 프로젝트 멤버 ID |
| project_id | uuid | FK projects.id, not null | 프로젝트 ID |
| user_id | uuid | FK users.id, not null | 학생 사용자 ID |
| display_order | int | not null default 0 | 표시 순서 |
| created_at | timestamptz | not null | 생성 시각 |

제약:

- `unique(project_id, user_id)`

### 7.5 feedback

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | uuid | PK | 피드백 ID |
| project_id | uuid | FK projects.id, not null | 대상 프로젝트 ID |
| content | text | not null | 피드백 내용 |
| status | feedback_status | not null | 공개/검토/차단/삭제 상태 |
| moderation_reason | text | nullable | 차단/보류/상태 변경 사유 |
| ip_hash | varchar(255) | nullable | rate limit용 해시 |
| user_agent | text | nullable | 작성 환경 |
| created_at | timestamptz | not null | 작성 시각 |
| updated_at | timestamptz | not null | 수정 시각 |

익명 원칙:

- `feedback` 테이블에는 `author_user_id`를 두지 않는다.
- 로그인한 학생/선생님/관리자가 작성해도 사용자 ID와 연결하지 않는다.
- `ip_hash`와 `user_agent`는 작성자 식별 목적이 아니라 rate limit, 악용 방지, 운영 로그 목적으로만 사용한다.

### 7.6 contacts

컨택은 회사 관계자만 작성할 수 있으므로 로그인 사용자 작성자 컬럼을 두지 않는다. 컨택 작성 권한은 `visitor_profiles.visitor_type = 'recruiter'`와 명함 등록 여부로 판단한다. 개인정보 수집 동의는 화면 안내/정책으로 처리하고 별도 boolean 컬럼으로 저장하지 않는다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | uuid | PK | 컨택 ID |
| project_id | uuid | FK projects.id, not null | 대상 프로젝트 ID |
| visitor_profile_id | uuid | FK visitor_profiles.id, not null | 최초 방문자 설정 프로필 ID |
| target_member_user_id | uuid | FK users.id, not null | 컨택 대상 팀원 사용자 ID |
| age_group | contact_age_group | not null | 방문자 프로필의 연령대 스냅샷 |
| visitor_type | contact_visitor_type | not null | 방문자 프로필의 유형 스냅샷 |
| name | varchar(100) | nullable | 이름 |
| organization | varchar(150) | nullable | 회사/기관 |
| position | varchar(100) | nullable | 직책 |
| email | varchar(255) | nullable | 이메일 |
| phone | varchar(50) | nullable | 전화번호 |
| memo | text | nullable | 메모 |
| business_card_file_id | uuid | FK files.id, nullable | 명함 이미지 파일 ID |
| ocr_raw_text | text | nullable | OCR 원문 |
| ocr_name | varchar(100) | nullable | OCR 추출 이름 |
| ocr_organization | varchar(150) | nullable | OCR 추출 회사/기관 |
| ocr_position | varchar(100) | nullable | OCR 추출 직책 |
| ocr_email | varchar(255) | nullable | OCR 추출 이메일 |
| ocr_phone | varchar(50) | nullable | OCR 추출 전화번호 |
| status | contact_status | not null default 'new' | 처리 상태 |
| ip_hash | varchar(255) | nullable | rate limit용 해시 |
| user_agent | text | nullable | 작성 환경 |
| created_at | timestamptz | not null | 작성 시각 |
| updated_at | timestamptz | not null | 수정 시각 |

제약:

- `target_member_user_id`는 해당 `project_id`의 팀원이어야 한다.
- `visitor_profile_id`는 서버에 존재해야 한다.
- `visitor_type = 'recruiter'`이면 연결된 방문자 프로필에 명함 파일이 등록되어 있어야 한다. 여기서 `recruiter`는 회사 관계자를 의미한다.

### 7.7 files

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | uuid | PK | 파일 ID |
| original_name | varchar(255) | not null | 원본 파일명 |
| mime_type | varchar(100) | not null | MIME 타입 |
| size | int | not null | 파일 크기 byte |
| storage_key | text | not null | 저장 경로/key |
| public_url | text | nullable | 공개 가능한 경우의 URL |
| access_level | varchar(30) | not null | public/private |
| created_by_user_id | uuid | FK users.id, nullable | 업로더 |
| created_at | timestamptz | not null | 업로드 시각 |

### 7.8 banned_words

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | uuid | PK | 금칙어 ID |
| word | varchar(100) | unique, not null | 원본 금칙어 |
| normalized_word | varchar(100) | unique, not null | 정규화된 매칭용 금칙어 |
| is_active | boolean | not null default true | 활성 여부 |
| created_at | timestamptz | not null | 생성 시각 |
| updated_at | timestamptz | not null | 수정 시각 |

운영 규칙:

- 활성 금칙어의 `normalized_word` 목록으로 Aho-Corasick automaton을 구성한다.
- 금칙어가 추가/수정/비활성화되면 Redis 캐시와 automaton을 무효화하고 재생성한다.
- 원본 `word`는 관리자 화면 표시용이고, 실제 매칭은 `normalized_word`로 수행한다.

### 7.9 audit_logs

피드백 상태 변경, 컨택 조회/상태 변경처럼 운영자가 수행한 주요 작업을 공통으로 기록한다. 피드백 상태 변경 이력과 컨택 접근 기록은 별도 전용 테이블을 두지 않고 이 테이블의 `resource_type`, `resource_id`, `metadata`로 남긴다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | uuid | PK | 감사 로그 ID |
| actor_user_id | uuid | FK users.id, nullable | 수행자 |
| action | audit_action | not null | 작업 유형 |
| resource_type | varchar(50) | not null | 대상 리소스 종류 |
| resource_id | uuid | nullable | 대상 리소스 ID |
| metadata | jsonb | nullable | 추가 정보 |
| created_at | timestamptz | not null | 생성 시각 |

### 7.10 realtime_events

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | uuid | PK | 이벤트 ID |
| type | realtime_event_type | not null | 이벤트 유형 |
| project_id | uuid | FK projects.id, nullable | 관련 프로젝트 |
| target_role | user_role | nullable | 대상 역할 |
| payload | jsonb | not null | 이벤트 데이터 |
| created_at | timestamptz | not null | 생성 시각 |

용도:

- SSE 연결이 끊겼을 때 마지막 이벤트 이후 데이터를 다시 가져오는 기준으로 사용한다.
- Redis 장애 시에도 PostgreSQL 이벤트 기록을 기준으로 최신 상태를 복구한다.
- Kafka 발행용 outbox는 `event_outbox` 테이블로 분리한다.

### 7.11 event_outbox

Kafka 발행 안정성을 위해 `realtime_events`와 분리한 outbox 테이블이다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | uuid | PK | outbox 이벤트 ID |
| topic | varchar(120) | not null | Kafka topic 이름 |
| event_key | varchar(120) | nullable | Kafka partition key |
| event_type | varchar(120) | not null | 이벤트 유형 |
| aggregate_type | varchar(80) | not null | 원본 리소스 종류 |
| aggregate_id | uuid | nullable | 원본 리소스 ID |
| payload | jsonb | not null | 발행할 이벤트 데이터 |
| status | varchar(30) | not null default 'pending' | `pending`, `published`, `failed` |
| retry_count | int | not null default 0 | 재시도 횟수 |
| last_error | text | nullable | 마지막 발행 실패 사유 |
| published_at | timestamptz | nullable | 발행 성공 시각 |
| created_at | timestamptz | not null | 생성 시각 |
| updated_at | timestamptz | not null | 수정 시각 |

운영 규칙:

- DB transaction 안에서 원본 데이터와 `event_outbox`를 함께 저장한다.
- outbox publisher는 `pending` 이벤트를 Kafka로 발행한 뒤 `published`로 변경한다.
- 실패 시 `retry_count`를 증가시키고 `failed` 또는 재시도 대상으로 남긴다.

## 8. 서버 검증 규칙

### 8.1 프로젝트

- 서비스명 필수
- 팀명 필수
- 설명은 선택
- 스택 배열은 빈 배열 허용
- 팀원은 존재하는 학생 사용자만 등록 가능
- 썸네일은 이미지 파일만 허용

### 8.2 피드백

- 작성자 사용자 ID 저장 금지
- 내용 필수
- 2자 이상 500자 이하
- HTML/script 태그 입력 방어
- 피드백 내용을 정규화한 뒤 Aho-Corasick automaton으로 금칙어 포함 여부 검사
- 금칙어 포함 시 기본 상태는 `blocked`
- `blocked` 피드백은 학생/방문자 화면에 절대 노출하지 않는다.
- 반복 작성 방지를 위한 rate limit 적용

### 8.3 방문자 프로필/컨택

- 최초 방문자 설정에서 연령대는 필수다.
- 최초 방문자 설정에서 방문자 유형은 필수다.
- 회사 관계자는 최초 방문자 설정 단계에서 명함 이미지가 필수다.
- 명함 이미지는 `jpg`, `jpeg`, `png`, `webp`만 허용한다.
- 파일 크기는 5MB 이하로 제한한다.
- OCR 실패 시 방문자 프로필 생성은 실패하지 않고 OCR 필드만 비워둔다.
- 컨택 작성 시 `visitorProfileId`는 필수다.
- 컨택 작성 시 `targetMemberUserId`는 필수다.
- `targetMemberUserId`는 현재 프로젝트 팀원이어야 한다.
- 방문자 프로필이 회사 관계자가 아니면 컨택 작성이 실패한다.
- 방문자 프로필이 회사 관계자인데 명함 등록이 없으면 컨택 작성이 실패한다.
- 이메일 입력 시 형식을 검증한다.
- 전화번호 입력 시 형식을 검증한다.

### 8.4 금칙어

- 같은 금칙어 중복 등록 불가
- 공백만 있는 금칙어 등록 불가
- 금칙어 저장 시 `normalized_word`를 함께 생성한다.
- 피드백 검사 전 입력 문자열도 같은 규칙으로 정규화한다.
- 정규화 규칙은 소문자화, 앞뒤 공백 제거, 반복 공백 축소, zero-width 문자 제거, 일부 특수문자 제거를 포함한다.
- 활성 금칙어 목록으로 Aho-Corasick trie와 failure link를 구성한다.
- 피드백 검사는 `O(피드백 길이 + 매칭 수)` 시간에 처리한다.
- 비활성 금칙어는 automaton 구성에서 제외한다.

### 8.5 삭제 정책

- 피드백 삭제는 실제 삭제가 아니라 `feedback.status = 'deleted'`로 변경한다.
- 컨택 삭제는 실제 삭제가 아니라 `contacts.status = 'deleted'`로 변경한다.
- `deleted` 상태 데이터는 일반 목록/학생 화면/방문자 화면에 노출하지 않는다.
- 관리자 화면에서는 필요 시 `deleted` 상태 필터로 확인할 수 있다.

## 9. 실시간/준실시간 설계

### 9.1 기본 방식

- 서버는 피드백/컨택 생성 또는 상태 변경 시 `realtime_events`에 이벤트를 저장한다.
- 단일 서버 환경에서는 NestJS SSE로 이벤트를 전달한다.
- 다중 서버 환경에서는 Redis Pub/Sub으로 서버 간 이벤트를 전파한다.
- 이벤트 재처리, 통계 집계, OCR, 리포트 생성처럼 비동기 처리가 필요한 작업은 Kafka topic으로 발행한다.
- 클라이언트는 이벤트를 받으면 관련 목록을 다시 조회한다.
- 연결이 끊기면 `lastEventId` 이후 이벤트를 다시 조회한다.

### 9.2 fallback

- 실시간 연결 실패 시 5초 간격 polling으로 대체한다.
- 목록 조회는 항상 최신순 정렬을 지원한다.
- 클라이언트는 같은 ID의 이벤트를 중복 반영하지 않는다.
- Redis/Kafka 장애 시에도 PostgreSQL의 `realtime_events`를 기준으로 최신 상태를 복구한다.

## 10. 성능/확장성 개선 설계

### 10.1 PostgreSQL 성능 최적화

- 모든 목록 조회는 offset 기반 페이지네이션보다 cursor 기반 페이지네이션을 우선한다.
- 프로젝트 목록은 `is_published`, `created_at` 기준 인덱스를 둔다.
- 학생 피드백 조회를 위해 `feedback(project_id, status, created_at DESC)` 복합 인덱스를 둔다.
- 관리자 피드백 필터를 위해 `feedback(status, created_at DESC)` 인덱스를 둔다.
- 컨택 목록 조회를 위해 `contacts(project_id, status, created_at DESC)` 복합 인덱스를 둔다.
- 대상 팀원별 컨택 조회를 위해 `contacts(target_member_user_id, created_at DESC)` 인덱스를 둔다.
- 학생별 프로젝트 조회를 위해 `project_members(user_id, project_id)` 인덱스를 둔다.
- 검색이 필요한 컬럼은 PostgreSQL full-text search 또는 trigram index를 검토한다.
- 통계 화면은 매 요청마다 원본 테이블 전체를 집계하지 않고 집계 테이블 또는 materialized view를 사용한다.
- 대량 조회 화면은 필요한 컬럼만 select하고 N+1 query를 방지한다.
- PostgreSQL 연결 수 관리를 위해 PgBouncer를 사용한다.
- 느린 쿼리 로그를 켜고 p95/p99 응답 시간을 기준으로 인덱스를 조정한다.

### 10.2 Redis 활용

- 프로젝트 목록/상세 캐시를 Redis에 저장한다.
- 대시보드 통계와 프로젝트별 카운트를 Redis에 캐시한다.
- 금칙어 목록과 Aho-Corasick automaton 버전을 Redis에 캐시해 피드백 검사를 빠르게 처리한다.
- Mirim OAuth token 검증 결과를 5분 TTL로 캐시해 외부 인증 서버 호출을 줄인다.
- 공개 작성 요청의 rate limit 카운터를 Redis에 저장한다.
- SSE를 여러 NestJS 인스턴스에서 운영할 경우 Redis Pub/Sub으로 이벤트를 fan-out한다.
- 캐시 무효화는 프로젝트 seed 변경 후 배포/운영 작업, 피드백/컨택 생성, 상태 변경, 금칙어 변경 시 수행한다.
- 개인정보가 들어간 컨택 상세 데이터는 Redis에 장기 캐시하지 않는다.

Redis TTL 기준:

| 데이터 | Redis key 규칙 | TTL |
| --- | --- | --- |
| OAuth token 검증 결과 | `ieum:{env}:auth:token:{tokenHash}` | 5분 |
| 프로젝트 목록 | `ieum:{env}:projects:list:{filterHash}` | 60초 |
| 프로젝트 상세 | `ieum:{env}:projects:detail:{projectId}` | 5분 |
| 대시보드 통계 | `ieum:{env}:stats:dashboard` | 30초 |
| 프로젝트별 카운트 | `ieum:{env}:stats:project:{projectId}` | 60초 |
| 금칙어 목록 | `ieum:{env}:banned_words:active` | 10분, 변경 시 즉시 무효화 |
| 금칙어 automaton 버전 | `ieum:{env}:banned_words:automaton:version` | 금칙어 변경 시 증가 |
| 공개 작성 rate limit | `ieum:{env}:ratelimit:{scope}:{ipHash}` | 1분 또는 10분 |

### 10.3 Kafka 활용

- 피드백/컨택 생성 같은 핵심 이벤트는 DB 저장 후 `event_outbox`를 통해 Kafka로 발행한다.
- Kafka topic 이름 규칙은 `ieum.<domain>.<event>.v1`로 고정한다.
- Kafka consumer group 이름 규칙은 `ieum.<worker>.v1`로 고정한다.
- Kafka topic 목록
  - `ieum.feedback.created.v1`
  - `ieum.feedback.status-changed.v1`
  - `ieum.contact.created.v1`
  - `ieum.contact.status-changed.v1`
  - `ieum.visitor-profile.created.v1`
  - `ieum.file.uploaded.v1`
  - `ieum.ocr.requested.v1`
  - `ieum.audit.created.v1`
  - `ieum.stats.aggregate-requested.v1`
- Kafka consumer group 예시
  - `ieum.ocr-worker.v1`
  - `ieum.stats-worker.v1`
  - `ieum.report-worker.v1`
  - `ieum.audit-worker.v1`
- Kafka consumer는 OCR 처리, 통계 집계, 리포트 생성, 감사 로그 후처리, 알림 전송을 비동기로 수행한다.
- DB 저장과 Kafka 발행의 불일치를 줄이기 위해 `event_outbox` 테이블을 사용한다.
- outbox publisher는 `event_outbox.status = 'pending'` 이벤트를 Kafka로 발행하고 성공 시 `published`로 변경한다.
- consumer는 같은 이벤트가 여러 번 들어와도 안전하도록 idempotent하게 구현한다.

### 10.4 Background Job/OCR 최적화

- 명함 OCR은 Tesseract.js 라이브러리로 처리하며, 컨택 작성 요청 안에서 오래 기다리지 않도록 비동기 job으로 실행한다.
- 업로드 직후 컨택은 먼저 생성하고, OCR 결과는 나중에 업데이트한다.
- OCR job 실패 시 재시도 횟수와 실패 상태를 기록한다.
- 파일 정리, 오래된 visitor profile 정리, 통계 재계산, 리포트 생성은 background job으로 처리한다.
- 짧고 단순한 job은 BullMQ로 처리하고, 이벤트 재처리와 다중 consumer가 필요한 작업은 Kafka consumer로 처리한다.

### 10.5 파일/이미지 전송 최적화

- 프로젝트 썸네일과 명함 이미지는 Cloudflare R2에 저장한다.
- 공개 썸네일은 Cloudflare CDN 캐시를 적용한다.
- 명함 이미지는 private object로 저장하고 선생님/관리자에게만 signed URL 또는 프록시 응답으로 제공한다.
- 업로드 이미지는 용량 제한, MIME 검증, 이미지 리사이징, 썸네일 생성을 적용한다.
- 이미지 응답은 가능한 WebP/압축 포맷을 사용한다.

### 10.6 서버 응답 최적화

- 목록 화면은 반드시 pagination을 적용한다.
- 관리자 목록은 필터 조건을 명확히 하고 기본 조회 범위를 제한한다.
- HTTP compression을 적용한다.
- 클라이언트 polling은 화면이 보일 때만 수행하고, 탭이 백그라운드면 주기를 늘린다.
- 프론트는 동일 요청 중복 호출을 방지하고, 검색 입력은 debounce를 적용한다.
- 서버는 stateless하게 구성해 NestJS 인스턴스를 수평 확장할 수 있게 한다.

### 10.7 모니터링 기준

- 프로젝트 목록 응답 p95
- 프로젝트 상세 응답 p95
- 피드백 작성 응답 p95
- 컨택 작성 응답 p95
- 관리자 대시보드 응답 p95
- PostgreSQL slow query 수
- Redis cache hit ratio
- Kafka consumer lag
- OCR job 처리 시간
- SSE 연결 수
- 에러율과 rate limit 발생 수

## 11. 보안 요구사항

1. 권한 검사는 프론트가 아니라 백엔드에서 최종 수행한다.
2. 학생 피드백 조회는 서버 요청마다 프로젝트 멤버 여부를 확인한다.
3. 학생과 방문자는 컨택 목록/상세 서버 요청에 접근할 수 없다.
4. 명함 이미지는 private 파일로 저장하고 선생님/관리자만 조회한다.
5. 컨택 상세 조회와 상태 변경은 `audit_logs`에 접근/작업 기록을 남긴다.
6. 관리자 작업은 `audit_logs`에 기록한다.
7. 공개 작성 요청에는 rate limit을 적용한다.
8. 모든 입력값은 DTO validation을 통과해야 한다.
9. 에러 응답에 민감한 내부 정보를 포함하지 않는다.
10. 삭제된 리소스는 기본 조회에서 제외한다.

## 12. 개발 작업 순서

### 12.1 백엔드 작업 순서

1. NestJS 프로젝트 세팅
2. PostgreSQL/TypeORM 세팅
3. DB schema 및 migration 작성
4. 프로젝트/팀원 seed 데이터 구조 작성
5. 공통 validation/error/response 구조 작성
6. Auth 모듈 구현
7. User 모듈 구현
8. Role guard 구현
9. Project 조회 모듈 구현
10. File 업로드 모듈 구현
11. Visitor Profile 모듈 구현
12. Feedback 모듈 구현
13. Banned Words 모듈 구현
14. Contact 모듈 구현
15. Tesseract.js OCR 모듈 구현
16. Stats/Reports 모듈 구현
17. Redis 캐시/rate limit/PubSub 설정
18. Kafka producer/consumer 및 event_outbox 발행 구조 구현
19. Background job/OCR 비동기 처리 구현
20. Realtime 이벤트 모듈 구현
21. Audit log 모듈 구현
22. 성능 모니터링/slow query 로깅 설정
23. 테스트 작성
24. Swagger UI 설정 및 백엔드 기능 문서화

### 12.2 프론트엔드 작업 순서

1. 라우팅 구조 생성
2. 서버 통신 client 구조 생성
3. 최초 방문자 설정 모달
4. 프로젝트 목록 화면
5. 프로젝트 상세 화면
6. 피드백 작성 화면
7. 팀원 선택 컨택 작성 화면
8. OAuth 로그인 연결
9. 학생 프로젝트 화면
10. 학생 피드백 화면
11. 학생 통계 화면
12. 관리자 대시보드
13. 프로젝트 조회 화면
14. 피드백 관리 화면
15. 컨택 관리 화면
16. 금칙어 관리 화면
17. 사용자 조회 화면
18. 통계/리포트 화면
19. 실시간 이벤트 연결
20. 에러/로딩/빈 상태 UI 정리
21. 모바일 반응형 처리

## 13. 테스트 계획

### 13.1 백엔드 단위 테스트

- Aho-Corasick 금칙어 검사
- 금칙어/피드백 정규화 로직 검증
- 피드백 상태 자동 판정
- 방문자 프로필 필수값 검증
- 회사 관계자 최초 명함 필수 검증
- 컨택 대상 팀원 검증
- 이메일/전화번호 검증
- 프로젝트 멤버 권한 검증
- 역할별 guard 검증
- 통계 집계 로직 검증
- Redis 캐시 key 생성/무효화 검증
- Kafka event payload/idempotency 검증

### 13.2 백엔드 통합 테스트

- OAuth 로그인 후 사용자 생성/업데이트
- seed로 사전 등록된 프로젝트/팀원 조회 확인
- 피드백 작성 후 학생 조회
- 다른 팀 학생의 피드백 조회 차단
- 금칙어 포함 피드백 차단
- 컨택 작성 후 관리자 조회
- 회사 관계자 최초 방문자 설정에서 명함 누락 시 실패
- 컨택 대상 팀원이 프로젝트 멤버가 아니면 실패
- 컨택 상세 조회/상태 변경 audit log 기록
- 통계 집계 결과 확인
- realtime_events 생성 확인
- Redis 캐시 무효화 확인
- Kafka 이벤트 발행 및 consumer 처리 확인
- OCR background job 재시도/실패 처리 확인

### 13.3 프론트 E2E 테스트

- 방문자가 프로젝트 목록에서 상세로 이동한다.
- 방문자가 정상 피드백을 작성한다.
- 학생이 로그인 후 본인 프로젝트 피드백을 확인한다.
- 학생이 다른 프로젝트 피드백 URL 접근 시 차단된다.
- 비속어 포함 `blocked` 피드백은 학생/방문자 화면에 표시되지 않는다.
- 최초 접속 시 방문자 설정 모달이 뜨고 설정 완료 후 localStorage에 저장된다.
- 저장된 방문자 설정이 있으면 다음 접속부터 모달이 뜨지 않는다.
- 일반 방문자는 컨택 작성 화면에 진입할 수 없다.
- 회사 관계자가 최초 설정 단계에서 명함 없이 진행하려 하면 실패한다.
- 회사 관계자가 최초 설정에서 명함을 등록한 뒤 팀원 1명을 선택해 컨택 제출 시 성공한다.
- 선생님이 컨택 목록과 상세를 확인한다.
- 학생은 컨택 상세에 접근할 수 없다.
- 관리자가 금칙어를 추가하고 이후 피드백 검사에 반영된다.
- 관리자가 피드백 상태를 변경하면 학생 화면에 반영된다.
- 관리자 대시보드 통계가 표시된다.

## 14. 완료 기준

전체 개발 완료 기준은 다음과 같다.

1. DB seed/직접 DB 작업으로 사전 등록된 공개 프로젝트를 목록/상세에서 조회할 수 있다.
2. 서비스 화면에서는 프로젝트 생성/수정/삭제 기능을 제공하지 않는다.
3. `mirim-oauth-react` 로그인 후 학생/선생님/관리자 역할이 env와 Mirim OAuth 역할값 기준으로 구분된다.
4. 관리자는 `ADMIN_MIRIM_OAUTH_IDS` env 목록으로 지정된다.
5. 모든 사용자는 로그인 여부와 무관하게 익명 피드백을 작성할 수 있다.
6. Aho-Corasick 기반 금칙어 검사로 금칙어 포함 피드백은 자동 차단된다.
7. 학생은 본인 프로젝트의 공개 피드백만 볼 수 있다.
8. 선생님/관리자는 모든 피드백을 조회하고 상태를 변경할 수 있다.
9. 최초 방문자는 연령대와 방문자 유형을 설정해야 하며, 설정은 `localStorage`에 저장된다.
10. 저장된 방문자 설정이 있으면 다음 접속부터 설정 모달이 생략된다.
11. 회사 관계자는 최초 방문자 설정 단계에서 명함 이미지 없이 진행할 수 없다.
12. 회사 관계자만 프로젝트 팀원 중 1명을 선택해 컨택을 작성할 수 있다.
13. 컨택 대상 팀원이 해당 프로젝트 소속이 아니면 컨택 작성이 실패한다.
14. 명함 이미지는 저장되고 선생님/관리자만 조회할 수 있다.
15. OCR 결과를 컨택 상세에서 확인하고 수정할 수 있다.
16. 선생님/관리자는 모든 컨택을 조회하고 상태를 변경할 수 있다.
17. 학생/방문자는 컨택 정보에 접근할 수 없다.
18. 금칙어 관리 기능이 동작한다.
19. 사용자 관리 기능이 동작한다.
20. 대시보드와 통계/리포트 기능이 동작한다.
21. 실시간 또는 준실시간 이벤트 갱신이 동작한다.
22. 컨택 상세 접근과 관리자 작업이 `audit_logs`에 기록된다.
23. Redis 캐시, rate limit, Pub/Sub 구조가 동작한다.
24. Kafka 기반 비동기 이벤트 처리와 `event_outbox` 복구 흐름이 동작한다.
25. Tesseract.js OCR/통계/리포트 같은 무거운 작업은 background job으로 처리된다.
26. 주요 목록 조회는 pagination과 인덱스를 사용한다.
27. Swagger UI에서 주요 요청/응답 스키마를 확인할 수 있다.
28. 백엔드 단위/통합 테스트가 통과한다.
28. 삭제 처리는 실제 삭제가 아니라 `deleted` 상태 변경으로 동작한다.
30. 프론트 E2E 테스트가 통과한다.

## 15. 확정 운영 결정

- 프론트엔드는 React + TypeScript를 사용한다.
- 선생님은 Mirim OAuth 계정의 역할값으로 판정한다.
- 관리자는 env `ADMIN_MIRIM_OAUTH_IDS`에 미리 입력한 Mirim OAuth ID로 판정한다.
- 프로젝트/팀원 seed 데이터는 `src/database/seeds/projects.seed.ts`에서 관리한다.
- 파일 저장소는 Cloudflare R2를 사용하고 공개 이미지는 Cloudflare CDN으로 제공한다.
- OCR은 외부 API가 아니라 Tesseract.js 라이브러리로 처리한다.
- 개인정보가 포함된 컨택 데이터는 행사 종료 후 1년 보관 후 `deleted` 상태로 변경하고, 명함 파일은 별도 정리 job으로 삭제한다.
- 컨택 삭제와 피드백 삭제는 실제 삭제가 아니라 `deleted` 상태 변경으로 처리한다.
- 실시간 방식은 SSE로 고정한다.
- 방문자 설정 localStorage key는 `ieum.visitorProfile`로 고정한다.
- 금칙어 검사는 Aho-Corasick trie 기반으로 처리한다.
- 금칙어 포함 피드백은 `blocked`로 저장하고 학생/방문자 화면에는 노출하지 않는다.
- 학생 통계 화면에는 컨택 수를 노출하지 않는다.
- Redis TTL은 `10.2 Redis 활용`의 TTL 표를 기준으로 한다.
- Kafka topic 이름은 `ieum.<domain>.<event>.v1` 규칙을 사용한다.
- Kafka consumer group 이름은 `ieum.<worker>.v1` 규칙을 사용한다.
- Kafka outbox는 `event_outbox` 별도 테이블로 분리한다.
- PostgreSQL connection pooler는 PgBouncer를 사용한다.
- CDN은 Cloudflare CDN을 사용한다.
- Swagger UI는 `/docs`, OpenAPI JSON은 `/docs-json` 경로를 사용한다.
