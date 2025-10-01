// Backend/src/data-source.ts
import 'dotenv/config';
import { DataSource } from 'typeorm';

// 엔티티들 전부 import
import { User } from './auth/entities/user.entity';
import { Favorite } from './favorites/entities/favorite.entity';
import { FcmToken } from './fcm/entities/fcm-token.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL, // ← CLI 실행 시 여기에 임시 DB URL을 넣을 거예요
  entities: [User, Favorite, FcmToken], // ← 반드시 실제 엔티티들을 나열
  migrations: ['src/migrations/*.ts'], // ← 생성 결과가 여기로 떨어짐 (ts)
  schema: 'public',
  // synchronize: false (기본 false)
});
