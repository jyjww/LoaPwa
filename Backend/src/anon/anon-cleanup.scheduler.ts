import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnonUser } from './anon-user.entity';

@Injectable()
export class AnonCleanupScheduler {
  private readonly logger = new Logger(AnonCleanupScheduler.name);

  constructor(
    @InjectRepository(AnonUser)
    private readonly anonUserRepo: Repository<AnonUser>,
  ) {}

  // 매일 새벽 2시에 실행 (한국 시간 기준)
  @Cron('0 2 * * *', {
    name: 'anon-cleanup',
    timeZone: 'Asia/Seoul',
  })
  async cleanupInactiveAnonUsers() {
    try {
      // 30일 이상 활동이 없는 익명 사용자 삭제
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      const result = await this.anonUserRepo
        .createQueryBuilder()
        .delete()
        .where('lastSeenAt < :cutoffDate', { cutoffDate })
        .execute();

      if (result.affected && result.affected > 0) {
        this.logger.log(
          `🧹 Cleaned up ${result.affected} inactive anonymous users (older than 30 days)`,
        );
      } else {
        this.logger.log('🧹 No inactive anonymous users to clean up');
      }
    } catch (error) {
      this.logger.error('Failed to cleanup inactive anonymous users:', error);
    }
  }

  // 매주 일요일 새벽 3시에 실행 (한국 시간 기준)
  @Cron('0 3 * * 0', {
    name: 'anon-stats',
    timeZone: 'Asia/Seoul',
  })
  async logAnonUserStats() {
    try {
      const totalCount = await this.anonUserRepo.count();

      const recentCount = await this.anonUserRepo
        .createQueryBuilder()
        .where('lastSeenAt > :recentDate', {
          recentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7일
        })
        .getCount();

      this.logger.log(`📊 Anonymous users stats: Total=${totalCount}, Active(7d)=${recentCount}`);
    } catch (error) {
      this.logger.error('Failed to log anonymous user stats:', error);
    }
  }
}
