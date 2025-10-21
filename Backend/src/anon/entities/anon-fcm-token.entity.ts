import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';

@Entity('anon_fcm_tokens')
@Index('idx_anon_fcm_token', ['token'], { unique: true })
@Index('idx_anon_fcm_user', ['anonUser'])
export class AnonFcmToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  token: string;

  @ManyToOne('AnonUser', { onDelete: 'CASCADE' })
  anonUser: any;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  lastUsedAt: Date;
}
