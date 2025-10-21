// Backend/src/data-source.ts
import 'dotenv/config';
import { DataSource } from 'typeorm';

// 엔티티들 전부 import
import { User } from './auth/entities/user.entity';
import { Favorite } from './favorites/entities/favorite.entity';
import { FcmToken } from './fcm/entities/fcm-token.entity';
import { AutoWatch } from './watch/entities/auto-watch.entity';
import { PriceHistory } from './prices/entities/price-history.entity';

const isProd = process.env.NODE_ENV === 'production';
const hasUrl = !!process.env.DATABASE_URL;

const base = hasUrl
  ? { url: process.env.DATABASE_URL as string }
  : {
      host: process.env.DB_HOST, // ex) /cloudsql/PROJECT:REGION:INSTANCE
      port: Number(process.env.DB_PORT || 5432),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    };

export default new DataSource({
  type: 'postgres',
  ...base,
  entities: [User, Favorite, FcmToken, AutoWatch, PriceHistory],
  migrations: isProd ? ['dist/migrations/*.js'] : ['src/migrations/*.ts'],
  schema: 'public',
});
