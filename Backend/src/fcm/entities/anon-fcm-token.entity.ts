import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { AnonUser } from '@/anon/anon-user.entity';

@Entity('anon_fcm_tokens')
export class AnonFcmToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  token: string;

  @ManyToOne(() => AnonUser, (user) => user.fcmTokens, { onDelete: 'CASCADE' })
  user: AnonUser;
}
