import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('price_history')
@Index('idx_price_history_item_time', ['itemId', 'capturedAt'])
export class PriceHistory {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' }) id: string;

  @Column({ name: 'item_id', length: 64 }) itemId: string;

  @Column({ default: 'api', length: 32 }) source: string;

  @Column('numeric', { precision: 12, scale: 2 }) price: string;

  @Column({ name: 'captured_at', type: 'timestamptz', default: () => 'now()' })
  capturedAt: Date;

  @Column({ type: 'jsonb', nullable: true }) meta?: Record<string, any>;
}
