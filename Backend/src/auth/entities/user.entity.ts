import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Favorite } from '@/favorites/entities/favorite.entity';
import { FcmToken } from '@/fcm/entities/fcm-token.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  picture: string;

  @Column({ nullable: true })
  provider: string; // 'google', 'kakao' 등

  // 사용자 기준 즐겨찾기 목록
  @OneToMany(() => Favorite, (favorite: Favorite) => favorite.user)
  favorites: Favorite[];

  @OneToMany(() => FcmToken, (fcm: FcmToken) => fcm.user, { cascade: true })
  fcmTokens: FcmToken[];
}
