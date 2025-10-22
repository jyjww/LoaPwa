// src/fcm/fcm.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/auth/entities/user.entity';
import { FcmToken } from '@/fcm/entities/fcm-token.entity';

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(FcmToken) private readonly fcmRepo: Repository<FcmToken>,
  ) {
    // 이미 초기화돼 있으면 스킵
    if (admin.apps.length) return;

    // 1) 우선순위: 서비스계정 JSON 전체 (권장)
    const saJson = process.env.FIREBASE_SA_JSON;

    try {
      if (saJson) {
        const cred = JSON.parse(saJson);

        // Secret에 \n이 문자로 들어간 형태까지 모두 커버
        if (typeof cred.private_key === 'string') {
          cred.private_key = cred.private_key.replace(/\\n/g, '\n');
        }

        admin.initializeApp({
          credential: admin.credential.cert(cred as admin.ServiceAccount),
        });
        this.logger.log('Firebase Admin initialized via FIREBASE_SA_JSON');
      } else {
        // 2) 개별 ENV 3종 (기존 방식)
        const projectId = process.env.FCM_PROJECT_ID;
        const clientEmail = process.env.FCM_CLIENT_EMAIL;
        const privateKey = (process.env.FCM_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');

        if (!projectId || !clientEmail || !privateKey) {
          throw new Error(
            'Missing Firebase credentials. Provide FIREBASE_SA_JSON or FCM_PROJECT_ID/FCM_CLIENT_EMAIL/FCM_PRIVATE_KEY.',
          );
        }

        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        this.logger.log('Firebase Admin initialized via FCM_* envs');
      }
    } catch (e: any) {
      this.logger.error(`Firebase Admin init failed: ${e?.message || e}`);
      // 초기화 실패 시 이후 로직에서 바로 죽어버리므로 그대로 throw
      throw e;
    }
  }

  // src/fcm/fcm.service.ts (발췌)
  async sendPush(message: {
    userId: string;
    title: string; // 예) "📉 거래소 알림"
    body: string; // 예) "원한 반지 25,000G (목표 26,000G, -4%)"
    url?: string; // 예) "/favorites" 또는 "/items/123"
    data?: Record<string, unknown>; // itemId, source 등 추가 메타
  }): Promise<void> {
    try {
      const user = await this.userRepo.findOne({
        where: { id: message.userId },
        relations: ['fcmTokens'],
      });

      if (!user || user.fcmTokens.length === 0) {
        this.logger.warn(`⚠️ FCM 토큰 없음: userId=${message.userId}`);
        return;
      }

      const link = message.url || '/favorites';
      // data는 문자열만 허용하므로 강제 문자열화
      const extraData: Record<string, string> = {
        url: link,
        type: 'ALERT',
        userId: message.userId,
        ...Object.fromEntries(Object.entries(message.data ?? {}).map(([k, v]) => [k, String(v)])),
      };

      for (const tokenEntity of user.fcmTokens) {
        try {
          await admin.messaging().send({
            token: tokenEntity.token,
            notification: {
              title: message.title,
              body: message.body,
            },
            webpush: {
              fcmOptions: { link }, // SW 없어도 브라우저가 이 링크로 이동 시도
              notification: {
                icon: '/icons/icon-192.png',
                badge: '/icons/badge-72.png',
                // tag: extraData.itemId ? `item-${extraData.itemId}` : undefined, // 중복 교체 원하면 사용
                // renotify: true,
              },
              headers: { Urgency: 'high' },
            },
            data: extraData,
          });

          this.logger.log(`✅ FCM 전송 성공: "${message.title}" → token=${tokenEntity.token}`);
        } catch (error: any) {
          if (error?.code === 'messaging/registration-token-not-registered') {
            await this.unregisterToken(tokenEntity.token);
            this.logger.warn(`🗑️ 만료된 토큰 삭제: ${tokenEntity.token}`);
          } else {
            this.logger.error(
              `❌ FCM 전송 실패: token=${tokenEntity.token} / ${error?.message || error}`,
            );
          }
        }
      }
    } catch (error: any) {
      this.logger.error(`❌ sendPush 실행 실패: ${error?.message || error}`);
    }
  }

  async registerToken(userId: string, token: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const exists = await this.fcmRepo.findOne({ where: { token } });
    if (exists) {
      exists.user = user;
      return this.fcmRepo.save(exists);
    }

    const fcmToken = this.fcmRepo.create({ user, token });
    return this.fcmRepo.save(fcmToken);
  }

  async unregisterToken(token: string) {
    await this.fcmRepo.delete({ token });
    return { message: 'Token removed' };
  }
}
