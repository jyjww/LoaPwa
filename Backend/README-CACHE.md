# 🚀 Redis 캐싱 전략 (7-Day Price History)

## 📋 개요

로스트아크 거래소/경매장 가격 데이터를 Redis에 캐싱하여 빠른 조회 성능을 제공합니다.

### 핵심 목표

- ⚡ **응답 속도**: DB 조회 대비 10배 빠름 (100-300ms → 10-30ms)
- 💾 **DB 부하 감소**: 복잡한 GROUP BY 쿼리 → Redis ZSET 조회
- 📊 **7일 히스토리**: 시계열 가격 데이터를 메모리에 캐싱

---

## 🏗️ 아키텍처

### 전체 흐름

```
[사용자 활동]
    ↓
┌─────────────────────────────────────────┐
│ 1. 데이터 수집 (2가지 경로)              │
└─────────────────────────────────────────┘
    ↓
┌───────────────────┐  ┌──────────────────┐
│ A. Favorites      │  │ B. Auto-Watch    │
│ (즐겨찾기)         │  │ (자동 추적)       │
│                   │  │                  │
│ - 매 1분마다      │  │ - 매일 오전 9시  │
│ - 실시간 추적     │  │ - 배치 수집      │
└───────────────────┘  └──────────────────┘
    ↓                       ↓
    └───────┬───────────────┘
            ↓
    [price_history DB]
            ↓
┌─────────────────────────────────────────┐
│ 2. Redis 동기화                          │
│ PriceCacheScheduler (매 5분)            │
└─────────────────────────────────────────┘
            ↓
    [Redis ZSET/STRING]
            ↓
┌─────────────────────────────────────────┐
│ 3. 조회 (Redis 우선)                     │
│ PriceHistoryService                     │
└─────────────────────────────────────────┘
            ↓
    [프론트엔드 그래프]
```

---

## 🗄️ 데이터 구조

### Redis Keys

#### 1. `price:current:{itemKey}` (STRING)

현재 가격 스냅샷 (TTL: 7일)

```json
{
  "price": 1000,
  "ts": 1234567890123
}
```

**예시:**

```redis
SET price:current:market:66130001 '{"price":1000,"ts":1234567890123}' EX 604800
```

#### 2. `price:hist:{itemKey}` (ZSET)

7일 가격 히스토리 (score=timestamp, member=price)

```
ZADD price:hist:market:66130001 1234567890000 "1000"
ZADD price:hist:market:66130001 1234571490000 "1005"
ZADD price:hist:market:66130001 1234575090000 "998"
```

**조회:**

```redis
# 최근 7일 데이터
ZRANGEBYSCORE price:hist:market:66130001 <7일전_ms> <now_ms> WITHSCORES
```

#### 3. `cache:heartbeat` (STRING)

마지막 스케줄러 실행 시각 (TTL: 1일)

```redis
SET cache:heartbeat "1234567890123" EX 86400
```

#### 4. `cache:metrics:writes` (STRING)

총 캐시 업데이트 횟수 (누적)

```redis
INCRBY cache:metrics:writes 10
```

#### 5. `cache:metrics:changes` (STRING)

가격 변동 이벤트 수 (누적)

```redis
INCRBY cache:metrics:changes 5
```

---

## 🔄 주요 컴포넌트

### 1. PriceCacheScheduler (`prices/price-cache.scheduler.ts`)

**역할:** DB → Redis 동기화

**실행 주기:** 매 5분 (`0 */5 * * * *`)

**동작:**

1. DB에서 최근 10분 내 스냅샷 조회 (item_id별 최신 1건)
2. Redis `price:current:{itemKey}` 업데이트
3. Redis `price:hist:{itemKey}` ZSET에 추가
4. 메트릭 갱신 (`cache:heartbeat`, `cache:metrics:*`)

**코드 예시:**

```typescript
@Cron('0 */5 * * * *')
async syncPriceCache() {
  const snapshots = await this.fetchRecentSnapshots();

  for (const snap of snapshots) {
    // Redis 동기화
    await this.syncToRedis(snap);
  }

  await this.updateHeartbeat();
  await this.updateMetrics(writeCount, changeCount);
}
```

---

### 2. PriceHistoryService (`prices/price-history.service.ts`)

**역할:** Redis 우선 조회 → DB fallback

**조회 전략:**

```typescript
async getSeries(itemKey: string, opts: GetSeriesOpts) {
  // 1) Redis 조회 시도
  const redisData = await this.getSeriesFromRedis(...);
  if (redisData) return redisData; // ⚡ 10-30ms

  // 2) Redis miss → DB fallback
  return this.getSeriesFromDB(...); // 💾 100-300ms
}
```

**Redis 조회:**

```typescript
// ZRANGEBYSCORE로 범위 조회
const rawData = await this.redis.zrangebyscore(
  `price:hist:${itemKey}`,
  fromMs,
  toMs,
  true, // WITHSCORES
);

// bucket 단위로 집계 (hour/day/minute)
return this.aggregateToBucket(points, opts);
```

---

### 3. Auto-Watch System (`watch/`)

**역할:** 캐싱 대상 제품 결정

#### 데이터 수집 경로

##### A. Favorites (즐겨찾기)

- **트리거:** 사용자가 즐겨찾기 추가
- **주기:** 매 1분 (`FavoritesScheduler`)
- **대상:** `favorite` 테이블의 `active=true` 아이템
- **특징:** 실시간 추적

##### B. Auto-Watch (자동 추적)

- **트리거:** 사용자가 아이템 조회 (거래소/경매장)
- **주기:** 매일 오전 9시 (`AutoWatchScheduler`)
- **대상:** `auto_watch` 테이블의 `enabled=true` 아이템
- **특징:** 배치 수집, 관리자가 인기 아이템 수동 추가 가능

**Auto-Watch 활용:**

```typescript
// 관리자가 인기 아이템을 watch 리스트에 추가
await autoWatchService.upsert(
  'admin',
  'market:66130001', // 고급 오레하 융화 재료
  true, // enabled=true
);

// 다음 날 오전 9시 자동 수집 시작
// → price_history DB 저장
// → PriceCacheScheduler가 Redis로 복제
// → 프론트엔드에서 빠르게 조회 가능
```

---

## 🔍 Cache Audit Kit

### 관측 엔드포인트

#### 1. `GET /health/cache`

Redis 상태 및 스케줄러 메트릭

**응답:**

```json
{
  "success": true,
  "data": {
    "redis": "ok",
    "lastSchedulerRunAt": 1234567890123,
    "writerCounters": {
      "writes": 1500,
      "changes": 320
    }
  }
}
```

#### 2. `GET /api/debug/cache/keys?pattern=price:*&limit=100`

Redis 키 목록 조회 (SCAN)

**응답:**

```json
{
  "success": true,
  "data": {
    "pattern": "price:current:*",
    "keys": ["price:current:market:123", "..."],
    "count": 42,
    "limit": 100
  }
}
```

#### 3. `GET /api/debug/cache/item/:itemKey`

아이템 캐시 상세 (24h/7d 통계)

**응답:**

```json
{
  "success": true,
  "data": {
    "itemKey": "market:123",
    "current": { "price": 1000, "ts": 1234567890 },
    "history24hCount": 144,
    "history7dCount": 1008,
    "firstTs": 1234000000,
    "lastTs": 1234567890
  }
}
```

#### 4. `GET /api/prices/history/:itemKey?range=24h|7d`

가격 히스토리 조회 (Redis 우선)

**파라미터:**

- `range=24h`: 최근 24시간 (hour bucket)
- `range=7d`: 최근 7일 (hour bucket)
- 또는 `bucket=hour&days=7` (상세 설정)

**응답:**

```json
[
  { "t": "2025-01-01T00:00:00Z", "price": 1000, "lastAt": "..." },
  { "t": "2025-01-01T01:00:00Z", "price": 1005, "lastAt": "..." }
]
```

---

## 🛠️ 운영 가이드

### 1. Redis 연결 확인

```bash
curl -s http://localhost:3000/health/cache | jq
```

### 2. 캐시 키 목록 조회

```bash
# API로 조회 (SCAN 사용)
curl -s 'http://localhost:3000/api/debug/cache/keys?pattern=price:current:*&limit=20' | jq

# 또는 Redis CLI 직접 접근
docker compose exec redis redis-cli --scan --pattern 'price:current:*' | head -n 20
```

### 3. 특정 아이템 캐시 상태 확인

```bash
# 아이템 상세 조회
curl -s 'http://localhost:3000/api/debug/cache/item/market:66130001' | jq

# Redis CLI로 ZSET 확인
docker compose exec redis redis-cli ZCARD price:hist:market:66130001
docker compose exec redis redis-cli ZRANGEBYSCORE price:hist:market:66130001 -inf +inf WITHSCORES | head -n 10
```

### 4. 스케줄러 로그 확인

```bash
# PriceCacheScheduler 동작 확인
docker compose logs -f backend | grep PriceCacheScheduler

# 정상 로그 예시:
# [PriceCacheScheduler] 🔄 [abc123] PriceCacheScheduler start
# [PriceCacheScheduler] ✅ [abc123] Done: batch=45 changes=12 window=7d
```

### 5. Redis 성능 확인

```bash
# Redis hit/miss 비율 확인
docker compose logs backend | grep "Redis hit" | wc -l
docker compose logs backend | grep "DB fallback" | wc -l
```

---

## 📊 성능 비교

| 항목           | Before (DB 직접)       | After (Redis 캐시)  |
| -------------- | ---------------------- | ------------------- |
| 평균 응답 시간 | ~100-300ms             | ~10-30ms            |
| DB 부하        | 높음 (복잡한 GROUP BY) | 거의 없음           |
| 동시 처리      | 제한적 (DB 연결 풀)    | 높음 (Redis 메모리) |
| 실시간성       | 즉시                   | 5분 딜레이          |
| 확장성         | 수직 확장 필요         | 수평 확장 가능      |

---

## 🚨 트러블슈팅

### 1. `redis: "error"` 반환

- Redis 연결 실패
- `REDIS_URL` 환경변수 확인
- Upstash는 `rediss://` (TLS) 필수

### 2. `lastSchedulerRunAt: null`

- 스케줄러가 아직 실행되지 않음
- 5분 대기 후 재확인
- 로그에서 스케줄러 동작 확인

### 3. `history24hCount: 0`

- Redis에 데이터 없음
- `price_history` DB에 데이터 있는지 확인
- PriceCacheScheduler 정상 동작 확인

### 4. Redis miss가 너무 많음

- 스케줄러 주기 확인 (현재: 5분)
- auto-watch에 아이템이 등록되어 있는지 확인
- 즐겨찾기가 활성화되어 있는지 확인

---

## 🔧 설정

### 환경변수

```bash
# Redis 연결 (필수)
REDIS_URL=rediss://default:password@upstash-url:6379

# 스케줄러 설정 (선택)
CACHE_SYNC_INTERVAL=5 # 분 단위 (기본: 5분)
AUTO_WATCH_EVICT_DAYS=3 # auto-watch 유지 기간 (기본: 3일)
```

### 스케줄러 주기 변경

```typescript
// price-cache.scheduler.ts
@Cron('0 */5 * * * *') // 현재: 5분마다
// 변경 예시:
// @Cron('0 */10 * * * *') // 10분마다
// @Cron('0 * * * * *')    // 1분마다 (주의: DB 부하)
```

---

## 📝 API 엔드포인트 요약

| 엔드포인트                       | 메서드 | 용도                       |
| -------------------------------- | ------ | -------------------------- |
| `/health/cache`                  | GET    | Redis 상태 및 메트릭       |
| `/api/debug/cache/keys`          | GET    | 키 목록 (SCAN)             |
| `/api/debug/cache/item/:itemKey` | GET    | 아이템 캐시 상세           |
| `/api/prices/history/:itemKey`   | GET    | 가격 히스토리 (Redis 우선) |

---

## 🎯 향후 개선 사항

### 1. 실시간성 개선

- WebSocket으로 가격 변동 실시간 푸시
- Redis Pub/Sub 활용

### 2. 캐시 워밍

- 인기 아이템 미리 캐싱
- 서버 시작 시 auto-watch 아이템 캐싱

### 3. TTL 최적화

- 인기도에 따른 차등 TTL 적용
- 7일 → 30일 (인기 아이템)

### 4. 관리자 UI

- auto-watch 추가/제거 대시보드
- 캐시 통계 시각화

---

## 📚 참고 자료

- [Redis ZSET 문서](https://redis.io/docs/data-types/sorted-sets/)
- [NestJS Schedule](https://docs.nestjs.com/techniques/task-scheduling)
- [cache-manager-redis-yet](https://github.com/node-cache-manager/node-cache-manager-redis-yet)

---

**작성일:** 2025-10-20  
**버전:** 1.0.0  
**최종 업데이트:** Cache Audit Kit 추가, Redis 우선 조회 전략 구현
