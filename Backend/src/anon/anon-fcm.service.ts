import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnonUser } from './anon-user.entity';
import { AnonFcmToken } from './entities/anon-fcm-token.entity';
import * as admin from 'firebase-admin';

@Injectable()
export class AnonFcmService {
  private readonly logger = new Logger(AnonFcmService.name);

  constructor(
    @InjectRepository(AnonUser)
    private readonly anonUserRepo: Repository<AnonUser>,
    @InjectRepository(AnonFcmToken)
    private readonly anonFcmRepo: Repository<AnonFcmToken>,
  ) {}

  // 익명 사용자 FCM 토큰 등록
  async registerToken(anonId: string, token: string): Promise<void> {
    try {
      // 기존 토큰이 있는지 확인
      const existingToken = await this.anonFcmRepo.findOne({
        where: { token },
      });

      if (existingToken) {
        // 이미 다른 익명 사용자에게 등록된 토큰이면 삭제
        await this.anonFcmRepo.remove(existingToken);
      }

      // 익명 사용자 조회
      const anonUser = await this.anonUserRepo.findOne({
        where: { id: anonId },
      });

      if (!anonUser) {
        throw new Error(`Anonymous user not found: ${anonId}`);
      }

      // 새 토큰 등록
      const fcmToken = this.anonFcmRepo.create({
        token,
        anonUser,
      });

      await this.anonFcmRepo.save(fcmToken);
      this.logger.log(`Registered FCM token for anonymous user: ${anonId.substring(0, 8)}...`);
    } catch (error) {
      this.logger.error(`Failed to register FCM token for anonymous user ${anonId}:`, error);
      throw error;
    }
  }

  // 익명 사용자 FCM 토큰 해제
  async unregisterToken(token: string): Promise<void> {
    try {
      const fcmToken = await this.anonFcmRepo.findOne({
        where: { token },
      });

      if (fcmToken) {
        await this.anonFcmRepo.remove(fcmToken);
        this.logger.log(`Unregistered FCM token: ${token.substring(0, 8)}...`);
      }
    } catch (error) {
      this.logger.error(`Failed to unregister FCM token ${token}:`, error);
      throw error;
    }
  }

  // 익명 사용자에게 푸시 알림 발송
  async sendPush(message: {
    anonId: string;
    title: string;
    body: string;
    url?: string;
    data?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const anonUser = await this.anonUserRepo.findOne({
        where: { id: message.anonId },
        relations: ['fcmTokens'],
      });

      if (!anonUser || anonUser.fcmTokens.length === 0) {
        this.logger.warn(
          `⚠️ No FCM tokens for anonymous user: ${message.anonId.substring(0, 8)}...`,
        );
        return;
      }

      const link = message.url || '/favorites';
      const extraData: Record<string, string> = {
        url: link,
        type: 'ALERT',
        anonId: message.anonId,
        ...Object.fromEntries(Object.entries(message.data ?? {}).map(([k, v]) => [k, String(v)])),
      };

      for (const tokenEntity of anonUser.fcmTokens) {
        try {
          await admin.messaging().send({
            token: tokenEntity.token,
            notification: {
              title: message.title,
              body: message.body,
            },
            data: extraData,
            webpush: {
              notification: {
                title: message.title,
                body: message.body,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                requireInteraction: true,
                actions: [
                  {
                    action: 'view',
                    title: '확인',
                  },
                ],
              },
              fcmOptions: {
                link: link,
              },
            },
          });

          // 토큰 사용 시간 업데이트
          tokenEntity.lastUsedAt = new Date();
          await this.anonFcmRepo.save(tokenEntity);

          this.logger.log(`📱 Push sent to anonymous user ${message.anonId.substring(0, 8)}...`);
        } catch (tokenError: any) {
          this.logger.warn(
            `Failed to send push to token ${tokenEntity.token.substring(0, 8)}...:`,
            tokenError.message,
          );

          // 토큰이 유효하지 않으면 삭제
          if (
            tokenError.code === 'messaging/invalid-registration-token' ||
            tokenError.code === 'messaging/registration-token-not-registered'
          ) {
            await this.anonFcmRepo.remove(tokenEntity);
            this.logger.log(`Removed invalid FCM token: ${tokenEntity.token.substring(0, 8)}...`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to send push to anonymous user ${message.anonId}:`, error);
      throw error;
    }
  }
}
