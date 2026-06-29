import { Module, forwardRef } from '@nestjs/common';
import { AuctionController } from './auction.controller';
import { AuctionService } from './auction.service';
import { AppCacheModule } from '@/cache/cache.module';
import { LostArkApiModule } from '@/lostark/lostark-api.module';

@Module({
  imports: [forwardRef(() => AppCacheModule), LostArkApiModule],
  controllers: [AuctionController],
  providers: [AuctionService],
  exports: [AuctionService],
})
export class AuctionModule {}
