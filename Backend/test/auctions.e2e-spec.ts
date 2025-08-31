import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest'; // ✅ default import
import { AppModule } from '../src/app.module';

describe('Auctions API (e2e)', () => {
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

  it('/auctions/search (POST)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auctions/search')
      .send({
        query: '반지',
        grade: '전설',
        tier: 3,
        className: '전체',
        category: 200020,
        pageNo: 1,
      })
      .expect(200); // ✅ Controller에서 @HttpCode(200) 쓰는지 확인

    console.log(res.body);
    expect(res.body).toHaveProperty('items');
  });
});
