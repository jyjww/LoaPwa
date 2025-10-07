// src/favorites/entities/favorite.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '@/auth/entities/user.entity';

@Entity()
@Index('idx_favorite_source_item', ['source', 'itemId']) // 조회 가속
@Index('idx_favorite_source_match', ['source', 'matchKey'])
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.favorites, { onDelete: 'CASCADE' })
  user: User;

  // 거래소 식별자
  @Column({
    type: 'bigint',
    nullable: true,
    transformer: {
      to: (v: number | null) => v, // DB로 저장할 때
      from: (v: string | null) => (v == null ? null : Number(v)), // DB에서 읽을 때
    },
  })
  itemId?: number;

  @Index('idx_favorite_matchkey', ['matchKey'])
  @Column({ type: 'varchar', length: 200, nullable: true })
  matchKey?: string;

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
  @Column('numeric', {
    precision: 12,
    scale: 2,
    transformer: {
      to: (v: number | null) => v,
      from: (v: string | null) => (v == null ? null : Number(v)),
    },
  })
  currentPrice: number;

  @Column('numeric', {
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: {
      to: (v: number | null) => v,
      from: (v: string | null) => (v == null ? null : Number(v)),
    },
  })
  previousPrice?: number;

  @Column('numeric', {
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (v: number | null) => v,
      from: (v: string | null) => (v == null ? null : Number(v)),
    },
  })
  targetPrice: number;

  @Column()
  source: 'auction' | 'market';

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

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
