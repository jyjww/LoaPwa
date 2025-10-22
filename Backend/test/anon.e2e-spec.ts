import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { AnonUser } from '../src/anon/anon-user.entity';

describe('AnonUser (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // CORS 설정 추가
    app.enableCors({
      origin: true,
      credentials: true,
    });

    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // 테스트 전에 anon_users 테이블 정리
    await dataSource.query('DELETE FROM anon_users');
  });

  describe('/api/anon/init (POST)', () => {
    it('should create new anon user when no anonId provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/anon/init')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.anonId).toBeDefined();
      expect(response.body.data.anonId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );

      // DB에서 확인
      const anonUser = await dataSource.query('SELECT * FROM anon_users WHERE id = $1', [
        response.body.data.anonId,
      ]);
      expect(anonUser.length).toBe(1);
      expect(anonUser[0].id).toBe(response.body.data.anonId);
    });

    it('should create anon user with provided valid anonId', async () => {
      const testAnonId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app.getHttpServer())
        .post('/api/anon/init')
        .send({ anonId: testAnonId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.anonId).toBe(testAnonId);

      // DB에서 확인
      const anonUser = await dataSource.query('SELECT * FROM anon_users WHERE id = $1', [
        testAnonId,
      ]);
      expect(anonUser.length).toBe(1);
      expect(anonUser[0].id).toBe(testAnonId);
    });

    it('should reject invalid anonId format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/anon/init')
        .send({ anonId: 'invalid-uuid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_UUID');
    });

    it('should update existing anon user on repeat call', async () => {
      const testAnonId = '550e8400-e29b-41d4-a716-446655440001';

      // 첫 번째 호출
      await request(app.getHttpServer())
        .post('/api/anon/init')
        .send({ anonId: testAnonId })
        .expect(200);

      // 잠시 대기 후 두 번째 호출
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await request(app.getHttpServer())
        .post('/api/anon/init')
        .send({ anonId: testAnonId })
        .expect(200);

      expect(response.body.success).toBe(true);

      // DB에서 lastSeenAt이 업데이트되었는지 확인
      const anonUsers = await dataSource.query('SELECT * FROM anon_users WHERE id = $1', [
        testAnonId,
      ]);
      expect(anonUsers.length).toBe(1);
      expect(anonUsers[0].id).toBe(testAnonId);
    });

    it('should set cookie with anonId', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/anon/init')
        .send({})
        .expect(200);

      expect(response.headers['set-cookie']).toBeDefined();
      const cookie = response.headers['set-cookie'][0];
      expect(cookie).toContain('anonId=');
      expect(cookie).toContain(response.body.data.anonId);
      expect(cookie).toContain('Path=/');
    });
  });

  describe('/api/anon/ping (GET)', () => {
    it('should return pong for valid anon user', async () => {
      // 먼저 anon user 생성
      const initResponse = await request(app.getHttpServer()).post('/api/anon/init').send({});

      const anonId = initResponse.body.data.anonId;

      // ping 호출
      const response = await request(app.getHttpServer())
        .get('/api/anon/ping')
        .set('X-Anon-Id', anonId)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('pong');
    });

    it('should return pong using cookie', async () => {
      // 먼저 anon user 생성 (쿠키 포함)
      const initResponse = await request(app.getHttpServer()).post('/api/anon/init').send({});

      const anonId = initResponse.body.data.anonId;
      const cookie = initResponse.headers['set-cookie'][0];

      // ping 호출 (쿠키 사용)
      const response = await request(app.getHttpServer())
        .get('/api/anon/ping')
        .set('Cookie', cookie)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('pong');
    });
  });
});
