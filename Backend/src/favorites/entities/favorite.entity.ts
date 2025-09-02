// src/favorites/entities/favorite.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '@/auth/entities/user.entity';

@Entity()
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.favorites, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  name: string;

  @Column()
  grade: string;

  // 경매장만 있는 값이므로 nullable 권장
  @Column({ nullable: true })
  tier?: number;

  @Column()
  icon: string;

  @Column({ nullable: true })
  quality?: number;

  // 공통 스냅샷(표준화한 현재가/이전가)
  @Column()
  currentPrice: number; // market이면 recentPrice 또는 currentMinPrice 중 택1
  @Column({ nullable: true })
  previousPrice?: number; // market이면 yDayAvgPrice

  @Column({ default: 0 })
  targetPrice: number;

  @Column()
  source: 'auction' | 'market';

  // 거래소 식별자(있으면 dedup 등에 유용)
  @Column({ type: 'bigint', nullable: true })
  itemId?: number;

  // 경매장 원본 데이터
  @Column('jsonb', { nullable: true })
  auctionInfo?: {
    StartPrice: number;
    BuyPrice: number;
    BidPrice: number;
    EndDate: string;
    BidCount: number;
    BidStartPrice: number;
    IsCompetitive: boolean;
    TradeAllowCount: number;
    UpgradeLevel: number | null;
  };

  // 거래소 원본 데이터
  @Column('jsonb', { nullable: true })
  marketInfo?: {
    currentMinPrice?: number;
    yDayAvgPrice?: number;
    recentPrice?: number;
    tradeRemainCount?: number;
  };

  @Column('jsonb', { nullable: true })
  options?: Array<{ name: string; value: number; displayValue: number }>;

  // 폴링/알림 운영용(선택)
  @Column({ default: false })
  isAlerted: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastCheckedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastNotifiedAt?: Date;

  @Column({ default: true })
  active: boolean;
}
