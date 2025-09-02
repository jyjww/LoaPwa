import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '@/app.module';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FcmService } from '@/fcm/fcm.service';

// Mock FcmService (실제로 Firebase로 안 보내도록)
jest.mock('@/fcm/fcm.service');

describe('FCM Test', () => {
  let app: INestApplication;
  let eventEmitter: EventEmitter2;
  let fcmService: FcmService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    eventEmitter = app.get(EventEmitter2);
    fcmService = app.get(FcmService);

    // mock 함수 초기화
    (fcmService.sendPush as jest.Mock).mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should call FCM service when favorite.alert event emitted', async () => {
    const fakeFavorite = {
      id: '123',
      name: '테스트 아이템',
      currentPrice: 1000,
      user: { id: 'u1' },
    };

    // 이벤트 발생
    eventEmitter.emit('favorite.alert', fakeFavorite);

    // sendNotification 이 호출되었는지 검증
    expect(fcmService.sendPush).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: fakeFavorite.user.id,
        title: expect.stringContaining(fakeFavorite.name),
        body: expect.stringContaining(fakeFavorite.currentPrice.toLocaleString()),
      }),
    );
  });
});
