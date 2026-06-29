import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('daily_price_summary')
@Index('idx_daily_price_summary_item_date', ['itemId', 'date'])
@Unique('uq_daily_price_summary_item_date', ['itemId', 'date'])
export class DailyPriceSummary {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'item_id', length: 64 })
  itemId: string;

  /** KST date string: YYYY-MM-DD */
  @Column({ type: 'date' })
  date: string;

  @Column('numeric', { precision: 12, scale: 2, name: 'min_price' })
  minPrice: string;

  @Column('numeric', { precision: 12, scale: 2, name: 'max_price' })
  maxPrice: string;

  @Column('numeric', { precision: 12, scale: 2, name: 'avg_price' })
  avgPrice: string;

  /** First recorded price of the day */
  @Column('numeric', { precision: 12, scale: 2, name: 'open_price' })
  openPrice: string;

  /** Last recorded price of the day */
  @Column('numeric', { precision: 12, scale: 2, name: 'close_price' })
  closePrice: string;

  @Column({ type: 'int', name: 'sample_count', default: 0 })
  sampleCount: number;

  @Column({ name: 'source', length: 32, default: 'api' })
  source: string;
}
