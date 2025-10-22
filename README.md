<div align="center">
  <img src="PwaFrontend/src/assets/icon.svg" alt="LoAlarm Logo" width="120">
</div>

# 🔔 LoAlarm (로알람) - 로스트아크 거래소/경매장 시세 알림 웹앱

로알림은 스마일게이트 RPG의 게임 ‘로스트아크’ 거래소 시세를 확인하고, 가격 알림을 받을 수 있는 웹앱(PWA)입니다. 모바일에서도 바로 실행되며, 홈 화면에 추가하여 앱처럼 사용할 수 있습니다. 본 서비스는 스마일게이트 RPG의 공식 서비스가 아닌, 팬메이드 비공식 도구입니다.

개발 기간 : 2025.09 - 2025.10 (1 Month)

## 배포 링크 (Demo)

👉 [프로젝트 링크](https://loalarm.com)

📱 [앱 다운로드 가이드](https://loalarm.com/push-help)

## 주요 기능 (Features)

- 📑 시세 집계: 거래소/경매장 아이템을 한 화면에 비교
- 📈 최근가 그래프: 일/주 단위 변동 추적
- ⭐ 즐겨찾기: 관심 품목 묶음
- 🔔 가격 알림: 목표가 도달 시 푸시/브라우저 알림
- 📱 PWA: 홈 화면 추가, 오프라인 캐시

## 서비스 화면 (Pages)

|           메인 대시보드            |              즐겨찾기              |             알림 설정              |
| :--------------------------------: | :--------------------------------: | :--------------------------------: |
| <img src="이미지URL1" width="200"> | <img src="이미지URL2" width="200"> | <img src="이미지URL3" width="200"> |

## 기술 스택 (Tech Stack)

### Frontend

![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![React Query](https://img.shields.io/badge/React_Query-FF4154?style=for-the-badge&logo=react-query&logoColor=white)

### Backend

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeORM](https://img.shields.io/badge/TypeORM-FAFAFA?style=for-the-badge&logo=typeorm&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

### Infrastructure

![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

### CI/CD

![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)

## 시스템 아키텍처 (Architecture)

```mermaid
graph TD
  %% ───────── 사용자 영역 ─────────
  subgraph U["User"]
    BROWSER["PWA: Client Browser<br/>(Service Worker, Cache, Push)"]
  end

  %% ───────── 프론트엔드 (Firebase Hosting) ─────────
  subgraph FE["Frontend (Firebase Hosting/CDN)"]
    HOSTING["Firebase Hosting<br/>https://loalarm.com (또는 www)"]
  end

  %% ───────── 백엔드 (Cloud Run / NestJS) ─────────
  subgraph BE["Backend (Google Cloud)"]
    CR["Cloud Run (NestJS API)<br/>https://api.loalarm.com"]
    REDIS["Upstash Redis<br/>(cache / queues)"]
    PG["PostgreSQL (Managed/Cloud SQL 등)"]
    SCHED["Cloud Scheduler / Run Jobs<br/>(수집·갱신 배치)"]
    LOG["Cloud Logging / Error Reporting"]
  end

  %% ───────── 외부 데이터 소스 ─────────
  subgraph EXT["External Services"]
    LOSTARK["Lost Ark Auction/Market API"]
    FCM["Web Push (FCM)"]
  end

  %% ───────── CI/CD ─────────
  subgraph CI["CI/CD"]
    GH["GitHub Actions"]
  end

  %% 흐름: 사용자 → 프론트
  BROWSER -->|HTTPS| HOSTING

  %% 프론트 → 백엔드
  BROWSER -->|"API (fetch) /api/*"| CR

  %% 백엔드 내부 의존성
  CR <--> REDIS
  CR <--> PG
  CR --> LOG
  SCHED -->|배치 트리거| CR

  %% 외부 연동
  CR -->|시세 수집| LOSTARK
  CR -->|푸시/알림 등록| FCM
  BROWSER -->|푸시 수신| FCM

  %% 배포 파이프라인
  GH -->|deploy| HOSTING
  GH -->|build & deploy| CR
```

## 시작 가이드 (Get Started)

### 로컬 개발 환경 설정

#### 1. 저장소 클론

```bash
git clone https://github.com/your-username/LoaPwa.git
cd LoaPwa
```

#### 2. 백엔드 설정

```bash
cd Backend
npm install
cp .env.example .env  # 환경 변수 설정
npm run start:dev
```

#### 3. 프론트엔드 설정

```bash
cd ../PwaFrontend
npm install
npm run dev
```

#### 4. 데이터베이스 설정

- PostgreSQL 데이터베이스 생성
- Redis 서버 실행 (Upstash 또는 로컬)
- 환경 변수에 DB 연결 정보 입력

### 환경 변수 설정

#### Backend/.env

```env
DATABASE_URL=postgresql://username:password@localhost:5432/loalarm
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
FCM_SERVER_KEY=your-fcm-server-key
```

#### PwaFrontend/.env

```env
VITE_API_URL=http://localhost:3000
VITE_FCM_VAPID_KEY=your-vapid-key
```

### 개발 스크립트

```bash
# 백엔드 개발 서버 실행
npm run start:dev

# 프론트엔드 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 테스트 실행
npm run test
```

### 주요 디렉토리 구조

```
LoaPwa/
├── Backend/                 # NestJS 백엔드
│   ├── src/
│   │   ├── auth/           # 인증 모듈
│   │   ├── auctions/       # 경매장 API
│   │   ├── favorites/      # 즐겨찾기 기능
│   │   ├── fcm/           # 푸시 알림
│   │   └── watch/         # 가격 감시
│   └── test/              # E2E 테스트
├── PwaFrontend/            # React 프론트엔드
│   ├── src/
│   │   ├── components/    # 재사용 컴포넌트
│   │   ├── pages/         # 페이지 컴포넌트
│   │   ├── services/      # API 서비스
│   │   └── hooks/         # 커스텀 훅
│   └── public/            # 정적 파일
└── Infra/                 # 인프라 설정
    └── docker-compose.yml
```

## 라이선스 (License)

This project is licensed under the **MIT License**.
