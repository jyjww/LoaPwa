// src/favorites/favorites.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Favorite } from '@/favorites/entities/favorite.entity';
import { FcmService } from '@/fcm/fcm.service';

type FavoriteAlertEvt = {
  favoriteId: string;
  userId: string;
  itemId?: number;
  currentPrice: number;
  targetPrice: number;
  source: 'market' | 'auction';
};

@Injectable()
export class FavoritesListener {
  private readonly logger = new Logger(FavoritesListener.name);

  constructor(private readonly fcmService: FcmService) {}

  @OnEvent('favorite.alert')
  async handleAlertEvent(evt: FavoriteAlertEvt | Favorite) {
    const payload = this.normalize(evt);

    this.logger.log(
      `📬 favorite.alert user=${payload.userId} fav=${payload.favoriteId} ` +
        `price=${payload.currentPrice} target=${payload.targetPrice} source=${payload.source}`,
    );

    // 🔔 실제 FCM 푸시 발송
    await this.fcmService.sendPush({
      userId: payload.userId,
      title: `📉 ${payload.source.toUpperCase()} 알림`,
      body: `${payload.currentPrice} (목표: ${payload.targetPrice})`,
    });
  }

  private normalize(evt: FavoriteAlertEvt | Favorite): FavoriteAlertEvt {
    if ((evt as any)?.userId) return evt as FavoriteAlertEvt;

    const f = evt as Favorite;
    const userId = (f as any)?.user?.id ?? (f as any)?.userId;
    if (!userId) {
      throw new Error('favorite.alert payload has no userId');
    }
    return {
      favoriteId: f.id,
      userId,
      itemId: (f as any).itemId,
      currentPrice: f.currentPrice,
      targetPrice: f.targetPrice,
      source: f.source,
    };
  }
}
