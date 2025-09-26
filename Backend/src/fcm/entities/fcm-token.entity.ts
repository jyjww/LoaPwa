import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '@/auth/entities/user.entity';

@Entity('fcm_tokens')
export class FcmToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  token: string;

  @ManyToOne(() => User, (user) => user.fcmTokens, { onDelete: 'CASCADE' })
  user: User;
}
