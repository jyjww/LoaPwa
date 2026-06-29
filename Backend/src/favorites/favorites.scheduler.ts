// src/favorites/favorites.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import pLimit from 'p-limit';
import { Favorite } from '@/favorites/entities/favorite.entity';
import { FavoritesService } from './favorite.service';
import { MarketService } from '@/markets/market.service';
import { AuctionService } from '@/auctions/auction.service';
import { PriceService } from '@/prices/price.service';
import {
  isAuctionMatchKey,
  makeAuctionKey,
  normalizeAuctionKey,
  guessCategory,
  type CategoryKey,
} from '@shared/matchAuctionKey';
import {
  allowedFirstOptionsForCategory,
  buildEtcOptionDtos,
} from '@/auctions/utils/build-etc-option-filters';

type MarketInfoFlat = {
  currentMinPrice?: number;
  yDayAvgPrice?: number | null;
  recentPrice?: number;
  tradeRemainCount?: number | null;
};

type AuctionInfoFlat = any;

type Snapshot = {
  currentPrice: number;
  previousPrice?: number | null;
  info: MarketInfoFlat | AuctionInfoFlat;
};

@Injectable()
export class FavoritesScheduler {
  private readonly logger = new Logger(FavoritesScheduler.name);

  // ---------- 캐싱 전략 ----------
  private cache = new Map<string, { snap: Snapshot; expiresAt: number }>();
  private static readonly CACHE_TTL_MS = 10 * 60 * 1000; // 크론 주기(1분) 이하 권장
  private static readonly CACHE_MAX_KEYS = 5000;

  // 안전장치: 경매장 페이지 탐색 상한(과도한 API 호출 방지)
  private static readonly MAX_AUCTION_PAGES = 10;

  // TTL 검사 + LRU 갱신
  private getFromCache(key: string): Snapshot | null {
    const e = this.cache.get(key);
    if (!e) return null;
    // TTL 만료면 제거
    if (e.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }
    // LRU 갱신: 접근했으니 가장 최근으로 밀기
    this.cache.delete(key);
    this.cache.set(key, e);
    return e.snap;
  }

  // 용량 제한 + TTL 설정하여 저장
  private setToCache(key: string, snap: Snapshot): void {
    // 용량 초과 시, 가장 오래된 키 1개 삭제
    if (this.cache.size >= FavoritesScheduler.CACHE_MAX_KEYS) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { snap, expiresAt: Date.now() + FavoritesScheduler.CACHE_TTL_MS });
  }

  private getGroupKey(f: Favorite): string | null {
    if (!f?.source) return null;

    if (f.source === 'market') {
      const n = Number(f.itemId);
      return Number.isFinite(n) ? `market:${n}` : null;
    }

    if (f.source === 'auction') {
      // 경매장은 숫자 id 신뢰 X → 프런트/백 공용 규칙으로 만든 matchKey(auc:xxxx)로 그룹
      const raw: unknown = f.matchKey;
      return isAuctionMatchKey(raw) ? `auction:${String(raw)}` : null;
    }

    return null;
  }

  constructor(
    private readonly favoritesService: FavoritesService,
    private readonly marketService: MarketService,
    private readonly auctionService: AuctionService,
    private readonly priceService: PriceService,
  ) {}

  @Cron('*/1 * * * *')
  async handleCron(): Promise<void> {
    const runId = Date.now().toString(36);
    this.logger.log(`🔔 [${runId}] FavoritesScheduler 실행`);

    // 1) 활성 즐겨찾기 조회
    const activeFavorites: Favorite[] = await this.favoritesService.findActive();

    // 2) 유효 그룹(식별 키 생성 가능)만 추림
    const valid = activeFavorites.filter((f) => this.getGroupKey(f) !== null);
    const missing = activeFavorites.filter((f) => this.getGroupKey(f) === null);

    if (missing.length) {
      this.logger.warn(
        `⚠️ [${runId}] favorites missing/invalid key: ${missing.length} (sample: ` +
          missing
            .slice(0, 3)
            .map((m) =>
              m.source === 'auction'
                ? `${m.name}/${m.source}:${String(m.matchKey)}[${typeof m.matchKey}]`
                : `${m.name}/${m.source}:${String(m.itemId)}[${typeof m.itemId}]`,
            )
            .join(', ') +
          `${missing.length > 3 ? '...' : ''})`,
      );
    }

    // 3) 동일 아이템(그룹 키)로 묶기
    const groups = this.groupByItem(valid);
    this.logger.debug(
      `📊 [${runId}] favorites=${activeFavorites.length}, valid=${valid.length}, groups=${Object.keys(groups).length}`,
    );

    if (Object.keys(groups).length === 0) {
      this.logger.debug(`ℹ️ [${runId}] 처리할 그룹이 없습니다. 종료`);
      this.logger.log(`✅ [${runId}] FavoritesScheduler 완료`);
      return;
    }

    // 4) 동시 실행 제한
    const limit = pLimit(5);

    // 5) 그룹 단위 처리
    const tasks = Object.entries(groups).map(([key, favs]) =>
      limit(async () => {
        const colon = key.indexOf(':');
        if (colon < 0) {
          this.logger.warn(`⚠️ invalid group key: ${key}`);
          return;
        }
        const source = key.slice(0, colon) as 'market' | 'auction';
        const payload = key.slice(colon + 1); // market: "123", auction: "auc:...."

        const name = favs[0]?.name ?? '(unknown)';
        const groupSize = favs.length;

        try {
          // 5-1) 그룹 캐시 확인
          let snapshot = this.getFromCache(key);
          let isCacheHit = !!snapshot;

          if (!snapshot) {
            // ---------- 거래소 ----------
            if (source === 'market') {
              const itemId = Number(payload);
              if (!Number.isFinite(itemId)) {
                this.logger.warn(`⚠️ invalid market itemId: ${payload}`);
                return;
              }

              // 즐겨찾기에서 카테고리 정보 추출
              const sampleFav = favs[0];
              const categoryCode = sampleFav?.marketInfo?.categoryCode || 0;
              const subCategoryCode = sampleFav?.marketInfo?.subCategoryCode || 0;

              const t0 = Date.now();
              const res = await this.marketService.search({
                query: name,
                category: categoryCode > 0 ? categoryCode : undefined,
                subCategory: subCategoryCode > 0 ? subCategoryCode : undefined,
              });
              this.logger.debug(
                `🛰️  [${runId}] market.search("${name}", cat=${categoryCode}, sub=${subCategoryCode}) -> items=${res.items?.length ?? 0} (${Date.now() - t0}ms)`,
              );

              const item = res.items?.find((i: any) => i.id === itemId);
              if (!item) {
                this.logger.warn(`⚠️ market itemId=${itemId} not found for "${name}"`);
                return;
              }

              const info: MarketInfoFlat = item.marketInfo ?? {};
              snapshot = {
                currentPrice: info.currentMinPrice ?? info.recentPrice ?? 0,
                previousPrice: info.yDayAvgPrice ?? null,
                info,
              };
            }
            // ---------- 경매장 ----------
            else if (source === 'auction') {
              const matchKey = payload; // 우리가 찾을 대상의 고유 매칭 키 (auc:xxxxxxxx)

              // (a) 카테고리 추정 → API의 CategoryCode로 변환
              const cat = guessCategory(favs[0]); // 'stone' | 'gem' | 'accessory' | 'generic'
              const categoryCode =
                cat === 'stone'
                  ? 30000 // 어빌리티 스톤
                  : cat === 'gem'
                    ? 210000 // 보석
                    : cat === 'accessory'
                      ? 200000 // 장신구(대분류)
                      : 10000; // 장비(안전 기본값)

              // (b) 허용되는 상세옵션 그룹(FirstOption) 목록 계산
              //     - 스톤(30000)은 정책상 '각인 효과'만 허용(감소 효과 제외)
              const allowedFirsts = allowedFirstOptionsForCategory(categoryCode);

              // (c) 즐겨찾기 옵션 → API 등가 필터 DTO 변환 (두 각인 모두 포함됨)
              //     - Min/Max 동일값으로 고정해서 "정확히 10" 같은 조건으로 조회
              const etcOptions = buildEtcOptionDtos(
                favs[0]?.options?.map(({ name, value }) => ({ name, value })),
                allowedFirsts,
                { looseValues: categoryCode === 30000 },
              );

              // (d) 페이지네이션으로 끝까지 탐색 (두 각인 모두 유지, 완화 없음)
              const t0 = Date.now();
              const found = await this.findAuctionAcrossPagesStrict({
                name,
                categoryCode,
                etcOptions,
                matchKey,
                maxPages: FavoritesScheduler.MAX_AUCTION_PAGES,
                grade: favs[0]?.grade, // 예: '고대'
                tier: favs[0]?.tier ?? 4, // 예: 4
              });
              this.logger.debug(
                `🛰️  [${runId}] auction.search("${name}", cat=${cat}/${categoryCode}) -> ` +
                  `${found ? 'HIT' : 'MISS'} (${Date.now() - t0}ms)`,
              );

              if (!found) {
                this.logger.warn(`⚠️ auction matchKey=${matchKey} not found for "${name}"`);
                return;
              }

              const buy = found.currentPrice ?? 0; // BuyPrice
              const start = found.previousPrice ?? 0; // StartPrice
              const effectiveCurrent = buy > 0 ? buy : start;

              snapshot = {
                currentPrice: effectiveCurrent, // ✅ 구매가 없으면 시작가 사용
                previousPrice: buy > 0 ? start : null, // 참고값(있으면 유지)
                info: found as AuctionInfoFlat,
              };
            } else {
              this.logger.warn(`⚠️ unknown source="${source}" for key=${key}`);
              return;
            }

            // 5-2) 스냅샷 캐싱 (메모리)
            this.setToCache(key, snapshot);

            // 5-3) price_history에 저장 (DB) - 캐시 미스인 경우에만
            if (!isCacheHit) {
              // favorites 테이블의 matchKey를 그대로 사용
              const matchKey = favs[0]?.matchKey;
              if (!matchKey) {
                this.logger.warn(`⚠️ [${runId}] No matchKey found for ${key}`);
                return;
              }

              try {
                await this.priceService.saveSnapshot(matchKey, snapshot.currentPrice, source, {
                  name,
                  previousPrice: snapshot.previousPrice,
                  info: snapshot.info,
                });
                this.logger.debug(
                  `💾 [${runId}] saved to price_history: ${matchKey} price=${snapshot.currentPrice}`,
                );
              } catch (dbErr: any) {
                this.logger.warn(`⚠️ [${runId}] DB save failed for ${matchKey}: ${dbErr?.message}`);
              }
            }

            this.logger.debug(
              `✅ [${runId}] snapshot for ${key}: current=${snapshot.currentPrice}, prev=${snapshot.previousPrice ?? 'null'}`,
            );
          } else {
            this.logger.debug(`📦 [${runId}] cache hit for ${key} - skipping DB save`);
          }

          // 5-4) 스냅샷 저장 및 알림 판정
          await this.favoritesService.updateSnapshotsAndEvaluateAll(favs, {
            currentPrice: snapshot.currentPrice,
            previousPrice: snapshot.previousPrice ?? undefined,
            info: snapshot.info,
            lastCheckedAt: new Date(),
          });

          this.logger.debug(`💾 [${runId}] updated & evaluated favorites=${groupSize} for ${key}`);
        } catch (e: any) {
          const status = e?.response?.status;
          const body = e?.response?.data;
          this.logger.error(`❌ [${runId}] item=${key} 처리 실패: ${e?.message ?? e}`);
          if (status) this.logger.error(`   ↳ status=${status}`);
          if (body) this.logger.error(`   ↳ body=${JSON.stringify(body)}`);
          if (e?.stack) this.logger.error(e.stack);
        }
      }),
    );

    await Promise.allSettled(tasks);
    this.logger.log(`✅ [${runId}] FavoritesScheduler 완료`);
  }

  // 동일 그룹 키로 묶기
  private groupByItem(favorites: Favorite[]): Record<string, Favorite[]> {
    return favorites.reduce(
      (acc, f) => {
        const key = this.getGroupKey(f);
        if (!key) return acc;
        (acc[key] ||= []).push(f);
        return acc;
      },
      {} as Record<string, Favorite[]>,
    );
  }

  // ------------------------------------------------------------
  // 🔎 경매장 페이지네이션 전수 탐색(“두 각인 모두” 필터 고정; 완화 없이 엄격)
  //  - page 1부터 마지막 페이지까지 순회하며 matchKey 매칭되는 아이템을 찾는다.
  //  - items가 pageSize보다 적거나, page*pageSize >= totalCount이면 더 이상 페이지 없음.
  // ------------------------------------------------------------
  private async findAuctionAcrossPagesStrict(args: {
    name: string;
    categoryCode: number;
    grade?: string | null; // ✅ 등급도 같이 전달해서 검색 폭 축소
    tier?: number | null; // ✅ 티어도 같이 전달
    // ✅ 스톤 느슨 모드에서 min/max가 null일 수 있으므로 union 타입으로 변경
    etcOptions: Array<{
      type: string;
      value: number;
      minValue: number | null;
      maxValue: number | null;
    }>;
    matchKey: string;
    maxPages: number;
  }) {
    const { name, categoryCode, etcOptions, matchKey, maxPages, grade, tier } = args;

    let page = 1;
    while (page <= maxPages) {
      const res = await this.auctionService.search({
        query: name,
        category: categoryCode,
        pageNo: page,
        grade: grade ?? undefined, // ✅ grade/tier 전달
        tier: typeof tier === 'number' ? tier : undefined,
        etcOptions, // ✅ min/max null 허용
      });

      const items = res.items ?? [];
      const pageSize = res.pageSize || (items.length > 0 ? items.length : 10);
      const total = res.totalCount ?? 0;

      // 현재 페이지에서 키 일치 여부 검사
      const hit = items.find((i: any) => {
        const k = makeAuctionKey(i, guessCategory(i));
        return normalizeAuctionKey(k) === normalizeAuctionKey(matchKey);
      });
      if (hit) return hit;

      // 다음 페이지로 넘어갈지 판단
      if (items.length < pageSize) break; // 실제 반환 건수가 페이지크기 미만 → 마지막 페이지
      if (pageSize <= 0 || page * pageSize >= total) break; // 더 이상 없음
      page += 1;
    }
    return null;
  }
}
