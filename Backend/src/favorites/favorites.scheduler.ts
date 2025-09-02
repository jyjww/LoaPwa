import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FavoritesService } from './favorite.service';
import { MarketService } from '@/markets/market.service';
import { AuctionService } from '@/auctions/auction.service';

@Injectable()
export class FavoritesScheduler {
  private readonly logger = new Logger(FavoritesScheduler.name);

  constructor(
    private readonly favoritesService: FavoritesService,
    private readonly marketService: MarketService,
    private readonly auctionService: AuctionService,
  ) {}

  /**
   * 5분마다 즐겨찾기 갱신 배치 실행
   */
  @Cron('0 0 * * *')
  async handleCron() {
    this.logger.log('🔔 FavoritesScheduler 실행');

    // 1️⃣ 활성 즐겨찾기 조회
    const favorites = await this.favoritesService.findActive();

    // 2️⃣ unique itemId 추출
    const uniqueIds = [...new Set(favorites.map((f) => f.itemId).filter(Boolean))];
    this.logger.log(`🎯 처리할 unique itemIds: ${uniqueIds.length}`);

    // 3️⃣ LostArk API 호출 (시장/경매 분리)
    for (const itemId of uniqueIds) {
      try {
        // source 구분
        const sample = favorites.find((f) => f.itemId === itemId);
        if (!sample) continue;

        if (sample.source === 'market') {
          const res = await this.marketService.search({ query: sample.name });
          const item = res.items.find((i) => i.id === sample.itemId);
          if (item) {
            // 4️⃣ DB 업데이트 + 알림 조건 체크
            await this.favoritesService.updateSnapshotAndCheck(sample.id, {
              currentPrice: item.currentMinPrice,
              previousPrice: item.yDayAvgPrice ?? sample.previousPrice,
              marketInfo: item,
              lastCheckedAt: new Date(),
            });
          }
        }

        if (sample.source === 'auction') {
          const res = await this.auctionService.search({ query: sample.name });
          const item = res.items.find((i) => i.id === sample.itemId);
          if (item) {
            await this.favoritesService.updateSnapshotAndCheck(sample.id, {
              currentPrice: item.currentPrice,
              previousPrice: item.previousPrice ?? sample.previousPrice,
              auctionInfo: item,
              lastCheckedAt: new Date(),
            });
          }
        }
      } catch (err) {
        this.logger.error(`❌ itemId=${itemId} 업데이트 실패`, err);
      }
    }
  }
}
