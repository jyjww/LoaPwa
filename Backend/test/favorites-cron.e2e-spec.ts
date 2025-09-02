import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '@/app.module';
import { FavoritesService } from '@/favorites/favorite.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FcmService } from '@/fcm/fcm.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '@/auth/entities/user.entity';
import { Repository } from 'typeorm';

jest.mock('@/fcm/fcm.service');

describe('Fav Cron', () => {
  let app: INestApplication;
  let favoritesService: FavoritesService;
  let eventEmitter: EventEmitter2;
  let fcmService: FcmService;
  let userRepo: Repository<User>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    favoritesService = app.get(FavoritesService);
    eventEmitter = app.get(EventEmitter2);
    fcmService = app.get(FcmService);
    userRepo = app.get<Repository<User>>(getRepositoryToken(User));

    (fcmService.sendPush as jest.Mock).mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should trigger alert when snapshot update meets condition', async () => {
    // 1️⃣ 유저 생성
    const user = await userRepo.save({
      email: `cron+${Date.now()}@test.com`,
      name: 'CronTester',
    });

    // 2️⃣ 즐겨찾기 생성 (조건 충족 보장)
    const fakeFavorite = await favoritesService.create(user.id, {
      name: '테스트 아이템',
      grade: '희귀',
      source: 'market',
      currentPrice: 6000,
      previousPrice: 6000,
      targetPrice: 2000, // == currentPrice → 조건 충족
      icon: 'https://dummy.icon/test.png',
    });

    // 3️⃣ snapshot 업데이트 → 조건 체크
    await favoritesService.updateSnapshotAndCheck(fakeFavorite.id, {
      currentPrice: 1000,
      previousPrice: 6000,
      // isAlerted: false,
    });

    // 4️⃣ sendPush 호출 검증
    expect(fcmService.sendPush).toHaveBeenCalled();
  });
});
