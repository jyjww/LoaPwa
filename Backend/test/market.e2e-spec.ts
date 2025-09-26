import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Markets API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/markets/search (POST)', async () => {
    const res = await request(app.getHttpServer())
      .post('/markets/search')
      .send({
        query: '무기',
        grade: '영웅',
        tier: 3,
        className: '버서커',
        category: 20000,
        subCategory: 20010,
        pageNo: 1,
      })
      .expect(200);

    console.log(res.body);

    // ✅ 응답 구조 검증
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
    if (res.body.items.length > 0) {
      expect(res.body.items[0]).toHaveProperty('id');
      expect(res.body.items[0]).toHaveProperty('name');
      expect(res.body.items[0]).toHaveProperty('grade');
      expect(res.body.items[0]).toHaveProperty('icon');
    }
  });
});
