import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Favorite } from '../src/favorites/entities/favorite.entity';

describe('Favorites with Anon Principal (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let anonId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // 테스트 전에 테이블들 정리
    await dataSource.query('DELETE FROM favorite');
    await dataSource.query('DELETE FROM anon_users');

    // anon user 생성
    const initResponse = await request(app.getHttpServer()).post('/api/anon/init').send({});

    anonId = initResponse.body.data.anonId;
  });

  describe('Favorites with anon principal', () => {
    it('should create favorite for anon user', async () => {
      const createFavoriteDto = {
        source: 'auction',
        name: 'Test Item',
        grade: 'Legendary',
        icon: 'test-icon.png',
        currentPrice: 1000,
        targetPrice: 800,
        tier: 3,
        quality: 100,
        options: [{ name: 'Attack Power', value: 100, displayValue: 100 }],
        auctionInfo: {
          StartPrice: 1000,
          BuyPrice: 1500,
          BidPrice: 1000,
          EndDate: '2024-01-01T00:00:00Z',
          BidCount: 0,
          BidStartPrice: 1000,
          IsCompetitive: false,
          TradeAllowCount: 1,
          UpgradeLevel: null,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/favorites')
        .set('X-Anon-Id', anonId)
        .send(createFavoriteDto)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('Test Item');
      expect(response.body.source).toBe('auction');

      // DB에서 확인 - anon_id가 설정되었는지 확인
      const favorite = await dataSource.query('SELECT * FROM favorite WHERE id = $1', [
        response.body.id,
      ]);
      expect(favorite.length).toBe(1);
      expect(favorite[0].anon_id).toBe(anonId);
      expect(favorite[0].user_id).toBeNull();
    });

    it('should get favorites for anon user', async () => {
      // 먼저 즐겨찾기 생성
      const createFavoriteDto = {
        source: 'market',
        itemId: 12345,
        name: 'Market Test Item',
        grade: 'Epic',
        icon: 'market-icon.png',
        currentPrice: 500,
        targetPrice: 400,
      };

      await request(app.getHttpServer())
        .post('/api/favorites')
        .set('X-Anon-Id', anonId)
        .send(createFavoriteDto)
        .expect(201);

      // 즐겨찾기 목록 조회
      const response = await request(app.getHttpServer())
        .get('/api/favorites')
        .set('X-Anon-Id', anonId)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe('Market Test Item');
    });

    it('should delete favorite for anon user', async () => {
      // 먼저 즐겨찾기 생성
      const createResponse = await request(app.getHttpServer())
        .post('/api/favorites')
        .set('X-Anon-Id', anonId)
        .send({
          source: 'auction',
          name: 'To Delete Item',
          grade: 'Rare',
          icon: 'delete-icon.png',
          currentPrice: 300,
          targetPrice: 250,
        })
        .expect(201);

      const favoriteId = createResponse.body.id;

      // 즐겨찾기 삭제
      await request(app.getHttpServer())
        .delete(`/api/favorites/${favoriteId}`)
        .set('X-Anon-Id', anonId)
        .expect(200);

      // DB에서 삭제되었는지 확인
      const favorite = await dataSource.query('SELECT * FROM favorite WHERE id = $1', [favoriteId]);
      expect(favorite.length).toBe(0);
    });

    it('should prevent access to other anon user favorites', async () => {
      // 다른 anon user 생성
      const otherInitResponse = await request(app.getHttpServer()).post('/api/anon/init').send({});
      const otherAnonId = otherInitResponse.body.data.anonId;

      // 첫 번째 anon user로 즐겨찾기 생성
      const createResponse = await request(app.getHttpServer())
        .post('/api/favorites')
        .set('X-Anon-Id', anonId)
        .send({
          source: 'auction',
          name: 'Private Item',
          grade: 'Legendary',
          icon: 'private-icon.png',
          currentPrice: 1000,
          targetPrice: 800,
        })
        .expect(201);

      const favoriteId = createResponse.body.id;

      // 다른 anon user로 접근 시도 - 403 에러 예상
      await request(app.getHttpServer())
        .delete(`/api/favorites/${favoriteId}`)
        .set('X-Anon-Id', otherAnonId)
        .expect(403);
    });

    it('should handle missing anonId gracefully', async () => {
      // anonId 없이 요청
      const response = await request(app.getHttpServer()).get('/api/favorites').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should create favorite with cookie instead of header', async () => {
      // 쿠키로 anonId 설정
      const cookie = `anonId=${anonId}; Path=/`;

      const response = await request(app.getHttpServer())
        .post('/api/favorites')
        .set('Cookie', cookie)
        .send({
          source: 'auction',
          name: 'Cookie Test Item',
          grade: 'Epic',
          icon: 'cookie-icon.png',
          currentPrice: 600,
          targetPrice: 500,
        })
        .expect(201);

      expect(response.body.name).toBe('Cookie Test Item');

      // DB에서 확인
      const favorite = await dataSource.query('SELECT * FROM favorite WHERE id = $1', [
        response.body.id,
      ]);
      expect(favorite[0].anon_id).toBe(anonId);
    });
  });

  describe('Database schema validation', () => {
    it('should have proper unique constraints', async () => {
      // 같은 anon user가 같은 아이템을 중복 추가하려고 시도
      const createFavoriteDto = {
        source: 'auction',
        name: 'Duplicate Test',
        grade: 'Legendary',
        icon: 'test-icon.png',
        currentPrice: 1000,
        targetPrice: 800,
        matchKey: 'test-match-key',
      };

      // 첫 번째 생성 - 성공
      await request(app.getHttpServer())
        .post('/api/favorites')
        .set('X-Anon-Id', anonId)
        .send(createFavoriteDto)
        .expect(201);

      // 두 번째 생성 - 실패 (unique constraint 위반)
      await request(app.getHttpServer())
        .post('/api/favorites')
        .set('X-Anon-Id', anonId)
        .send(createFavoriteDto)
        .expect(500); // DB constraint violation
    });
  });
});
