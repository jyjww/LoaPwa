import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Favorite } from 'src/favorites/entities/favorite.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  picture: string;

  @Column({ nullable: true })
  provider: string; // 'google', 'kakao' 등

  // 사용자 기준 즐겨찾기 목록
  @OneToMany(() => Favorite, (favorite) => favorite.user)
  favorites: Favorite[];
}
