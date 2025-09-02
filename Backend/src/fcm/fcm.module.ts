import { Module } from '@nestjs/common';
import { FcmService } from './fcm.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FcmToken } from './entities/fcm-token.entity';
import { User } from '@/auth/entities/user.entity';
import { FcmController } from './fcm.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, FcmToken])],
  providers: [FcmService],
  controllers: [FcmController],
  exports: [FcmService],
})
export class FcmModule {}
