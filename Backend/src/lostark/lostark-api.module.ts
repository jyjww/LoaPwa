import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LostArkApiClient } from './lostark-api.client';
import { ApiKeyCryptoService } from './api-key-crypto.service';
import { UserApiKeyController } from './user-api-key.controller';
import { User } from '@/auth/entities/user.entity';
import { AppCacheModule } from '@/cache/cache.module';

@Module({
  imports: [HttpModule, forwardRef(() => AppCacheModule), TypeOrmModule.forFeature([User])],
  controllers: [UserApiKeyController],
  providers: [LostArkApiClient, ApiKeyCryptoService],
  exports: [LostArkApiClient, ApiKeyCryptoService],
})
export class LostArkApiModule {}
