<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## Cache Audit

이 섹션은 Redis 7일 캐시가 실제로 작동하는지 검증하는 명령어 모음입니다.

### 전제 조건

- Backend와 Redis가 Docker Compose로 실행 중
- 환경변수 `REDIS_URL`이 설정됨 (Upstash 또는 로컬 Redis)
- Backend 포트: 기본 `3000` (환경에 따라 변경)

### 1. Redis 연결 상태 및 스케줄러 메트릭 확인

```bash
# /health/cache 엔드포인트 호출
curl -s http://localhost:3000/health/cache | jq

# 출력 예시:
# {
#   "success": true,
#   "data": {
#     "redis": "ok",
#     "lastSchedulerRunAt": 1234567890123,
#     "writerCounters": {
#       "writes": 1500,
#       "changes": 320
#     }
#   }
# }
```

**확인 항목:**

- `redis: "ok"` - Redis 연결 정상
- `lastSchedulerRunAt` - 최근 스케줄러 실행 시각 (epoch ms)
- `writerCounters.writes` - 총 캐시 업데이트 횟수
- `writerCounters.changes` - 가격 변동 이벤트 수

---

### 2. Redis 키 목록 조회 (SCAN)

```bash
# /api/debug/cache/keys 엔드포인트로 키 목록 조회
curl -s 'http://localhost:3000/api/debug/cache/keys?pattern=price:current:*&limit=20' | jq

# 또는 Redis CLI로 직접 조회 (Docker Compose 환경)
docker compose exec redis redis-cli --scan --pattern 'price:current:*' | head -n 20

# 출력 예시:
# price:current:market:123
# price:current:market:456
# price:current:auction:auc:xyz
```

**확인 항목:**

- `price:current:*` 키가 존재하는지
- 키 네이밍 규칙 준수 여부

---

### 3. 특정 아이템의 히스토리 포인트 수 확인

```bash
# Redis CLI로 ZCARD 확인 (전체 포인트 수)
docker compose exec redis redis-cli ZCARD price:hist:market:123

# Redis CLI로 ZRANGEBYSCORE 확인 (최신 3개 포인트)
docker compose exec redis redis-cli ZRANGEBYSCORE price:hist:market:123 -inf +inf WITHSCORES | head -n 6

# 출력 예시:
# "1000.50"
# "1234567890000"
# "1001.00"
# "1234567950000"
```

**확인 항목:**

- ZCARD 결과가 0보다 큰지 (히스토리 데이터 존재)
- WITHSCORES로 타임스탬프가 epoch ms 형태인지

---

### 4. 아이템 캐시 상세 정보 조회 (24h/7d 통계)

```bash
# /api/debug/cache/item/:itemKey 엔드포인트 호출
curl -s 'http://localhost:3000/api/debug/cache/item/market:123' | jq

# 출력 예시:
# {
#   "success": true,
#   "data": {
#     "itemKey": "market:123",
#     "current": {
#       "price": 1000,
#       "ts": 1234567890123
#     },
#     "history24hCount": 144,
#     "history7dCount": 1008,
#     "firstTs": 1234000000000,
#     "lastTs": 1234567890123
#   }
# }
```

**확인 항목:**

- `history24hCount` - 최근 24시간 포인트 수 (정상: 매 10분 시 144개)
- `history7dCount` - 최근 7일 포인트 수 (정상: 1000개 이상)
- `history7dCount >= history24hCount` - 7일 ≥ 24시간
- `firstTs < lastTs` - 시간 순서 정상

---

### 5. 가격 히스토리 조회 (API 엔드포인트)

```bash
# range 파라미터로 간편 조회
curl -s 'http://localhost:3000/api/prices/history/market:123?range=24h' | jq
curl -s 'http://localhost:3000/api/prices/history/market:123?range=7d' | jq

# 상세 파라미터로 조회
curl -s 'http://localhost:3000/api/prices/history/market:123?bucket=hour&days=7' | jq

# 출력 예시:
# [
#   { "t": "2025-01-01T00:00:00Z", "price": 1000, "lastAt": "2025-01-01T00:59:00Z" },
#   { "t": "2025-01-01T01:00:00Z", "price": 1005, "lastAt": "2025-01-01T01:59:00Z" },
#   ...
# ]
```

**확인 항목:**

- 반환 데이터가 시계열 배열 형태
- `range=24h` → 24시간 데이터
- `range=7d` → 7일 데이터

---

### 6. 스케줄러 로그 확인

```bash
# Docker Compose 로그에서 PriceCacheScheduler 확인
docker compose logs -f backend | grep PriceCacheScheduler

# 정상 로그 예시:
# [PriceCacheScheduler] 🔄 [abc123] PriceCacheScheduler 시작
# [PriceCacheScheduler] ✅ [abc123] 완료: batch=45 changes=12 window=7d
```

**확인 항목:**

- `batch=<n>` - 업데이트된 아이템 수
- `changes=<k>` - 가격 변동 수
- `window=7d` - 7일 윈도우 사용 확인
- 매 5분마다 로그 출력 (Cron: `0 */5 * * * *`)

---

### 트러블슈팅

**1. `redis: "error"` 반환**

- Redis 연결 실패. `REDIS_URL` 환경변수 확인
- Upstash는 `rediss://` (TLS) 사용 필수

**2. `lastSchedulerRunAt: null`**

- 스케줄러가 아직 실행되지 않음
- 5분 대기 후 재확인 또는 수동 트리거

**3. `history24hCount: 0`**

- Redis에 히스토리 데이터 없음
- DB `price_history` 테이블에 데이터가 있는지 확인
- 스케줄러가 정상 동작하는지 로그 확인

**4. `ZCARD price:hist:* 결과가 0`**

- 스냅샷이 아직 저장되지 않음
- FavoritesScheduler가 가격 스냅샷을 DB에 저장하는지 확인
- PriceCacheScheduler가 DB → Redis 동기화하는지 확인

---

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
