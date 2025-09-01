import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';

describe('Auth Test (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    authService = moduleFixture.get(AuthService);

    // ✅ 테스트용 가짜 유저로 JWT 발급
    const fakeUser = { id: 1, email: 'test@example.com', name: 'Test User' } as any;
    token = await authService.generateJwt(fakeUser);
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/google (GET) should redirect to Google', async () => {
    const res = await request(app.getHttpServer()).get('/auth/google');
    expect([302, 200]).toContain(res.status);
  });

  it('/auth/google/callback (GET) should redirect (mock)', async () => {
    const res = await request(app.getHttpServer()).get('/auth/google/callback');
    expect([302, 200]).toContain(res.status);
  });

  it('/auth/me (GET) with token should return user', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('email');
  });

  it('/auth/me (GET) without token should fail', async () => {
    const res = await request(app.getHttpServer()).get('/auth/me');
    expect(res.status).toBe(401);
  });
});
