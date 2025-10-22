import { Entity, PrimaryColumn, Column, CreateDateColumn, Index, OneToMany } from 'typeorm';

@Entity('anon_users')
export class AnonUser {
  @PrimaryColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  @Index()
  lastSeenAt: Date;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  lastIp?: string;

  @OneToMany('AnonFcmToken', 'anonUser')
  fcmTokens: any[];
}
