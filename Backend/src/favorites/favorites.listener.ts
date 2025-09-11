// src/favorites/favorites.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Favorite } from '@/favorites/entities/favorite.entity';

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

  @OnEvent('favorite.alert')
  async handleAlertEvent(evt: FavoriteAlertEvt | Favorite) {
    const payload = this.normalize(evt);

    // 일단 이벤트 수신만 확인 (푸시 미연결)
    this.logger.log(
      `📬 favorite.alert user=${payload.userId} fav=${payload.favoriteId} ` +
        `price=${payload.currentPrice} target=${payload.targetPrice} source=${payload.source}`,
    );

    // TODO: 여기서 실제 FCM/웹푸시 서비스 호출을 연결하세요.
    // ex) await this.fcmPushService.sendToUser(payload.userId, { title, body, data });
  }

  private normalize(evt: FavoriteAlertEvt | Favorite): FavoriteAlertEvt {
    // 신형 평면 페이로드({ userId, favoriteId, ... })인 경우
    if ((evt as any)?.userId) return evt as FavoriteAlertEvt;

    // 구형: Favorite 엔티티가 통째로 들어오는 경우 대응
    const f = evt as Favorite;
    const userId = (f as any)?.user?.id ?? (f as any)?.userId;
    if (!userId) {
      // 방어적으로 로그만 남기고 종료해도 됨
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
