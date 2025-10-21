// src/favorites/favorites.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from '@/favorites/entities/favorite.entity';
import { FcmService } from '@/fcm/fcm.service';
import { AnonFcmService } from '@/anon/anon-fcm.service';

type FavoriteAlertEvt = {
  favoriteId: string;
  userId: string;
  itemId?: number | null;
  currentPrice: number;
  targetPrice?: number | null;
  source: 'market' | 'auction';
};

type ResolvedPayload = FavoriteAlertEvt & {
  name?: string | null;
  previousPrice?: number | null;
};

@Injectable()
export class FavoritesListener {
  private readonly logger = new Logger(FavoritesListener.name);

  constructor(
    @InjectRepository(Favorite) private readonly favRepo: Repository<Favorite>,
    private readonly fcmService: FcmService,
    private readonly anonFcmService: AnonFcmService,
  ) {}

  @OnEvent('favorite.alert', { async: true })
  async handleAlertEvent(evt: FavoriteAlertEvt | Favorite) {
    const p = await this.resolvePayload(evt);

    // 문구 구성
    const channel = p.source === 'market' ? '거래소' : '경매';
    const name = p.name ?? '알 수 없는 아이템';

    const currStr = this.formatGold(p.currentPrice);
    const tgtStr = p.targetPrice != null ? this.formatGold(p.targetPrice) : '-';

    const pct =
      p.previousPrice && p.previousPrice > 0
        ? Math.round(((p.currentPrice - p.previousPrice) / p.previousPrice) * 1000) / 10 // 소수점 1자리
        : null;
    const pctStr = pct != null ? (pct > 0 ? `, +${pct}%` : `, ${pct}%`) : '';

    const title = `📉 ${channel} 알림`;
    const body = `${name} ${currStr} (목표 ${tgtStr}${pctStr})`;

    // 딥링크(원하면 상세로 연결)
    const url = p.source === 'market' && p.itemId ? `/market/${p.itemId}` : '/favorites';

    this.logger.log(
      `📬 favorite.alert user=${p.userId} fav=${p.favoriteId} ` +
        `price=${p.currentPrice} target=${p.targetPrice} prev=${p.previousPrice} src=${p.source}`,
    );

    // 🔔 실제 FCM 푸시 발송 (사용자 타입에 따라 분기)
    const favorite = await this.favRepo.findOne({
      where: { id: p.favoriteId },
      relations: ['user', 'anonUser'],
    });

    if (favorite?.user) {
      // 일반 사용자에게 푸시 발송
      await this.fcmService.sendPush({
        userId: p.userId,
        title,
        body,
        url,
        data: {
          itemName: name ?? '',
          itemId: p.itemId != null ? String(p.itemId) : '',
          source: p.source,
          currentPrice: String(p.currentPrice),
          targetPrice: p.targetPrice != null ? String(p.targetPrice) : '',
        },
      });
    } else if (favorite?.anonUser) {
      // 익명 사용자에게 푸시 발송
      await this.anonFcmService.sendPush({
        anonId: favorite.anonUser.id,
        title,
        body,
        url,
        data: {
          itemName: name ?? '',
          itemId: p.itemId != null ? String(p.itemId) : '',
          source: p.source,
          currentPrice: String(p.currentPrice),
          targetPrice: p.targetPrice != null ? String(p.targetPrice) : '',
        },
      });
    } else {
      this.logger.warn(`No user or anonymous user found for favorite: ${p.favoriteId}`);
    }
  }

  // --- helpers ---

  // evt가 Favorite 엔티티든, 축약 이벤트든 모두 동일 형태로 정규화
  private async resolvePayload(evt: FavoriteAlertEvt | Favorite): Promise<ResolvedPayload> {
    // 이미 축약 이벤트 형태인 경우: 이름/이전가를 채우기 위해 DB 조회(있으면)
    if ((evt as any)?.userId) {
      const base = evt as FavoriteAlertEvt;
      try {
        const fav = await this.favRepo.findOne({ where: { id: base.favoriteId } });
        return {
          ...base,
          name: fav?.name ?? undefined,
          previousPrice: fav?.previousPrice ?? null,
        };
      } catch {
        return { ...base, name: undefined, previousPrice: null };
      }
    }

    // Favorite 엔티티가 들어온 경우
    const f = evt as Favorite;
    const userId = (f as any)?.user?.id ?? (f as any)?.userId;
    if (!userId) throw new Error('favorite.alert payload has no userId');

    return {
      favoriteId: f.id,
      userId,
      itemId: (f as any).itemId ?? null,
      currentPrice: f.currentPrice,
      targetPrice: f.targetPrice ?? null,
      source: f.source,
      name: f.name ?? null,
      previousPrice: f.previousPrice ?? null,
    };
  }

  private formatGold(n: number) {
    try {
      return `${n.toLocaleString()}G`;
    } catch {
      return `${n}G`;
    }
  }
}
