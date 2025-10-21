import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnonUser } from './anon-user.entity';
import { AnonFcmToken } from './entities/anon-fcm-token.entity';
import { AnonUserService } from './anon.service';
import { AnonController } from './anon.controller';
import { AnonFcmService } from './anon-fcm.service';
import { AnonFcmController } from './anon-fcm.controller';
import { AnonCleanupScheduler } from './anon-cleanup.scheduler';

@Module({
  imports: [TypeOrmModule.forFeature([AnonUser, AnonFcmToken])],
  controllers: [AnonController, AnonFcmController],
  providers: [AnonUserService, AnonFcmService, AnonCleanupScheduler],
  exports: [AnonUserService, AnonFcmService],
})
export class AnonModule {}
