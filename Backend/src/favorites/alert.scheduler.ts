import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FavoritesService } from './favorite.service';
import { shouldTriggerAlert } from './alert.util';

/**
 * AlertScheduler runs every 5 minutes.
 * It reads active favorites from DB only — no external API calls.
 * Price data must already be up-to-date via PriceRefreshScheduler.
 */
@Injectable()
export class AlertScheduler {
  private readonly logger = new Logger(AlertScheduler.name);

  constructor(
    private readonly favoritesService: FavoritesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron('0 */5 * * * *')
  async handleCron(): Promise<void> {
    const runId = Date.now().toString(36);
    this.logger.debug(`⏰ [${runId}] AlertScheduler start`);

    let favorites;
    try {
      favorites = await this.favoritesService.findActive();
    } catch (err: any) {
      this.logger.error(`❌ [${runId}] Failed to load active favorites: ${err?.message}`);
      return;
    }

    if (!favorites.length) {
      this.logger.debug(`ℹ️ [${runId}] No active favorites`);
      return;
    }

    let alertCount = 0;
    const now = new Date();

    for (const fav of favorites) {
      try {
        const shouldAlert = shouldTriggerAlert(
          {
            active: fav.active,
            isAlerted: fav.isAlerted,
            lastNotifiedAt: fav.lastNotifiedAt,
            previousPrice: fav.previousPrice,
            currentPrice: fav.currentPrice,
            targetPrice: fav.targetPrice,
          },
          { now },
        );

        if (!shouldAlert) continue;

        const userId = (fav as any)?.user?.id ?? (fav as any)?.anonUser?.id;
        if (!userId) continue;

        this.eventEmitter.emit('favorite.alert', {
          favoriteId: fav.id,
          userId,
          itemId: fav.itemId ?? null,
          currentPrice: fav.currentPrice,
          targetPrice: fav.targetPrice,
          source: fav.source,
        });

        alertCount++;
        this.logger.log(
          `🔔 [${runId}] Alert emitted: fav=${fav.id} price=${fav.currentPrice} target=${fav.targetPrice}`,
        );
      } catch (err: any) {
        this.logger.error(`❌ [${runId}] Error evaluating fav=${fav.id}: ${err?.message}`);
      }
    }

    this.logger.debug(
      `✅ [${runId}] AlertScheduler done: checked=${favorites.length} alerted=${alertCount}`,
    );
  }
}
