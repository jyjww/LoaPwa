// src/watch/entities/auto-watch.entity.ts
import { Column, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('auto_watch')
@Index(['enabled'])
export class AutoWatch {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column('uuid', { name: 'user_id' })
  user_id!: string;

  @Column({ name: 'item_key', length: 128 })
  item_key!: string; // "market:123" | "auction:auc:xxxx"

  @Column({ default: true })
  enabled!: boolean;

  @Column({ type: 'timestamptz', name: 'last_seen_at', default: () => 'now()' })
  last_seen_at!: Date;

  @Column({ type: 'timestamptz', name: 'last_snapshot_at', nullable: true })
  last_snapshot_at?: Date | null;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'now()' })
  created_at!: Date;
}
