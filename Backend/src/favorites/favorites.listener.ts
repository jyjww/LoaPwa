import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { Favorite } from './entities/favorite.entity';
import { FcmService } from '../fcm/fcm.service';

@Injectable()
export class FavoritesListener {
  constructor(private readonly fcmService: FcmService) {}

  @OnEvent('favorite.alert')
  async handleAlertEvent(favorite: Favorite) {
    await this.fcmService.sendPush({
      userId: favorite.user.id,
      title: `📢 ${favorite.name} 알림`,
      body: `현재가 ${favorite.currentPrice.toLocaleString()}G`,
    });
  }
}
