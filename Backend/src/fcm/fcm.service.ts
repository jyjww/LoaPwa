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
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FCM_PROJECT_ID,
          clientEmail: process.env.FCM_CLIENT_EMAIL,
          privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
  }

  async sendPush(message: { userId: string; title: string; body: string }): Promise<void> {
    try {
      // 🔹 DB에서 userId로 fcmToken 목록 조회
      const user = await this.userRepo.findOne({
        where: { id: message.userId },
        relations: ['fcmTokens'], // User.fcmTokens 관계 가져오기
      });

      if (!user || user.fcmTokens.length === 0) {
        this.logger.warn(`⚠️ FCM 토큰 없음: userId=${message.userId}`);
        return;
      }

      for (const tokenEntity of user.fcmTokens) {
        try {
          await admin.messaging().send({
            token: tokenEntity.token,
            notification: {
              title: message.title,
              body: message.body,
            },
            data: {
              url: '/favorites', // 👈 클릭 시 열릴 페이지
              type: 'ALERT', // 👈 커스텀 이벤트 타입
              userId: message.userId, // 👈 유저 ID 전달
            },
          });
          this.logger.log(`✅ FCM 알림 전송 성공: ${message.title}, token=${tokenEntity.token}`);
        } catch (error: any) {
          if (error.code === 'messaging/registration-token-not-registered') {
            await this.unregisterToken(tokenEntity.token);
            this.logger.warn(`🗑️ 만료된 토큰 삭제: ${tokenEntity.token}`);
          } else {
            this.logger.error(`❌ FCM 전송 실패: token=${tokenEntity.token}`, error);
          }
        }
      }
    } catch (error) {
      this.logger.error('❌ sendPush 실행 실패', error);
    }
  }

  // 🔹 토큰 등록
  async registerToken(userId: string, token: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const exists = await this.fcmRepo.findOne({ where: { token } });
    if (exists) {
      exists.user = user; // 혹시 소유자 바뀌면 갱신
      return this.fcmRepo.save(exists);
    }

    const fcmToken = this.fcmRepo.create({ user, token });
    return this.fcmRepo.save(fcmToken);
  }

  // 🔹 토큰 삭제
  async unregisterToken(token: string) {
    await this.fcmRepo.delete({ token });
    return { message: 'Token removed' };
  }
}
