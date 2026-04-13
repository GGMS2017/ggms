# 🌟 Starfish Run LMS - MVP Prototype

K-Digital Training 및 다양한 부트캠프 교육 기관을 위한 전문 학습 관리 시스템(LMS) 형태의 MVP 프로젝트입니다. 현재 **프론트엔드(React) + 백엔드(Node.js)**가 분리된 구조로 구성되어 있으며 디자인 시스템과 목업 데이터가 대부분 갖춰져 있어, 즉시 비즈니스 로직(실제 DB 연동, 인증 강화 등)으로 고도화가 가능합니다. 

## 🛠 Tech Stack (기술 스택)
*   **Frontend:** React 18, Vite, Tailwind CSS v3, React Router DOM, Lucide-React
*   **Backend:** Node.js, Express.js, CORS
*   **Database:** 현재는 파일 시스템 기반 Mock DB (`backend/data/mockDB.json`) 사용 중

---

## 🚀 프로젝트 시작 가이드 (Getting Started)

이 프로젝트는 `backend`와 `frontend` 폴더가 각각 독립적인 패키지로 분리되어 있습니다. 환경을 띄우려면 두 폴더 모두에서 설치 및 실행 작업을 진행해야 합니다. 

### 1단계: Backend 실행
데이터를 서빙하는 백엔드 서버를 먼저 띄웁니다.
```bash
cd backend
npm install

# (최초 1회 필수) 초기 더미 데이터를 생성하는 스크립트 실행
node seed.js 

# 서버 실행 (기본 포트: 3000)
node server.js
```

### 2단계: Frontend 실행
사용자가 보게 될 화면을 렌더링합니다.
```bash
cd frontend
npm install

# Vite 개발 환경 빌드 (기본 포트: 5173)
npm run dev
```

> 두 서버가 성공적으로 켜졌다면, 웹 브라우저에서 `http://localhost:5173` 으로 접속하세요.

---

## 👩‍💻 계정 및 기능 안내 (MVP)

현재 백엔드의 로그인 엔드포인트(`/api/login`)는 입력된 이메일에 따라 **수강생 / 강사 / 관리자** 권한을 부여하고 있습니다. (비밀번호는 MVP 단계이므로 검사하지 않습니다.)

### 로그인 테스트용 계정
*   **관리자 전용 대시보드 접근:** `admin@test.com`
*   **강사 전용 대시보드 접근:** `instructor@test.com`
*   **일반 학생 (내 강의실) 접근:** `student@test.com`

---

## 📂 폴더 아키텍처 및 역할 가이드

### `/frontend/src`
*   `App.jsx`: 모든 라우팅 테이블이 관리되는 곳입니다. (Public, Student, Admin Route)
*   `components/`: 여러 페이지에 공통적으로 쓰이는 모듈. 대표적으로 상단 네비게이션 `Header.jsx`가 있습니다.
*   `pages/`: 
    *   `Home.jsx` : 랜딩 및 강의 검색 목록
    *   `CourseDetail.jsx` : 개별 강의 소개 및 수강 신청 버튼 
    *   `Dashboard.jsx` : 학생 개인의 학습 진도율 및 등록 강의 목록
    *   `Player.jsx` : 실제 동영상이 재생(Mock)되며 커리큘럼 아코디언이 함께 표시되는 메인 학습 화면
    *   `AdminDashboard.jsx` : (관리자/강사용) 통계 위젯, 등록된 유저 현황 정보 

### `/backend`
*   `server.js`: Express 서버 객체 및 API 앤드포인트 모음 (`/api/login`, `/api/enrollments` 등)
*   `seed.js`: `backend/data/mockDB.json` 파일에 더미 데이터(강의 7개, 사용자 3명 등)를 최초 생성해주는 스크립트.

---

## 🎯 다음 개발자를 위한 To-Do (Roadmap)

본 코드를 이어받아 개발하실 분들은 다음 작업부터 진행하시는 것을 추천합니다:

1.  **실제 Database 도입:** 현재의 JSON 파일 기반에서 PostgreSQL이나 MongoDB로 마이그레이션 (`server.js`의 `readDB()` 및 `writeDB()` 로직을 ORM이나 DB 쿼리로 교체).
2.  **보안 인증(Authentication) 강화:** JWT 기반의 Access/Refresh 토큰을 돌려주도록 로그인 API를 수정하고, Frontend의 `Auth.jsx` 와 Axios 인터셉터 등을 도입해 토큰이 헤더에 물리도록 적용해야 합니다.
3.  **상태 관리 라이브러리 도입:** 규모가 커질 경우 Redux Toolkit이나 Zustand를 적용해 `UserRole`, `UserId` 등의 전역 상태를 효과적으로 관리하세요.
4.  **강의 시청 기록 (Progress Tracker):** 현재는 '강의 수강 완료'가 단일 버튼이지만 이 후에는 Video Player의 `onEnded` 이벤트를 리스닝하여 자동 진행률 갱신이 되도록 고도화해 주세요.
