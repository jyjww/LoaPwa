// src/favorites/favorites.service.ts

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { User } from 'src/auth/entities/user.entity';
import { CreateFavoriteDto } from './dto/create-favorite.dto';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepo: Repository<Favorite>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * 유저 기준 즐겨찾기 전체 조회 (선택적으로 source 필터링 가능)
   */
  async findAllByUser(userId: number, source?: 'auction' | 'market') {
    const where: FindOptionsWhere<Favorite> = { user: { id: userId } as any };
    if (source) where.source = source;

    return this.favoriteRepo.find({
      where,
      order: { name: 'ASC' },
    });
  }

  /**
   * 즐겨찾기 생성
   * - 공통 스냅샷: currentPrice / previousPrice
   * - 원본 보존: auctionInfo / marketInfo
   * - 운영 필드: isAlerted / active / (lastCheckedAt, lastNotifiedAt 초기 null)
   */
  async create(userId: number, dto: CreateFavoriteDto) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    // null → undefined 정리
    const safeQuality = dto.quality ?? undefined;
    const safeTier = dto.tier ?? undefined;

    // source별 표준화 스냅샷
    let normalizedCurrentPrice = dto.currentPrice;
    let normalizedPreviousPrice = dto.previousPrice; // 그대로 두고 아래에서만 undefined로 조정

    if (dto.source === 'market' && dto.marketInfo) {
      if (normalizedCurrentPrice == null) {
        normalizedCurrentPrice = dto.marketInfo.recentPrice ?? dto.marketInfo.currentMinPrice ?? 0;
      }
      if (normalizedPreviousPrice == null) {
        normalizedPreviousPrice = dto.marketInfo.yDayAvgPrice; // number | undefined
      }
    }

    if (dto.source === 'auction') {
      normalizedCurrentPrice = normalizedCurrentPrice ?? 0;
      // normalizedPreviousPrice는 undefined 그대로 두기
    }

    const favorite = this.favoriteRepo.create({
      user, // User는 NotNull 보장
      source: dto.source,

      name: dto.name,
      grade: dto.grade,
      icon: dto.icon,

      currentPrice: normalizedCurrentPrice!,
      previousPrice: normalizedPreviousPrice ?? undefined, // ✅ 여기! null 금지

      // 선택 필드들
      tier: safeTier,
      quality: safeQuality,
      auctionInfo: dto.auctionInfo ?? undefined,
      options: dto.options ?? undefined,

      itemId: dto.itemId ?? undefined,
      marketInfo: dto.marketInfo ?? undefined,

      targetPrice: dto.targetPrice ?? normalizedCurrentPrice ?? 0,

      isAlerted: false,
      active: true,
      lastCheckedAt: undefined,
      lastNotifiedAt: undefined,
    });

    return this.favoriteRepo.save(favorite);
  }

  /**
   * 즐겨찾기 삭제
   */
  async remove(userId: number, favoriteId: string) {
    const favorite = await this.favoriteRepo.findOne({
      where: { id: favoriteId },
      relations: ['user'],
    });
    if (!favorite) throw new NotFoundException('Favorite not found');
    if (favorite.user.id !== userId) throw new ForbiddenException();

    await this.favoriteRepo.remove(favorite);
    return { message: 'Deleted' };
  }

  /**
   * 타겟 가격 수정
   */
  async updateTargetPrice(userId: number, favoriteId: string, price: number) {
    const favorite = await this.favoriteRepo.findOne({
      where: { id: favoriteId },
      relations: ['user'],
    });
    if (!favorite) throw new NotFoundException('Favorite not found');
    if (favorite.user.id !== userId) throw new ForbiddenException();

    favorite.targetPrice = price;
    return this.favoriteRepo.save(favorite);
  }

  /**
   * (선택) 활성 즐겨찾기 조회 - 스케줄러에서 사용
   */
  async findActive() {
    return this.favoriteRepo.find({ where: { active: true } });
  }

  /**
   * (선택) 최신 스냅샷 업데이트 - 스케줄러에서 사용
   */
  async updateSnapshot(
    favoriteId: string,
    patch: Partial<
      Pick<
        Favorite,
        | 'currentPrice'
        | 'previousPrice'
        | 'isAlerted'
        | 'lastCheckedAt'
        | 'lastNotifiedAt'
        | 'auctionInfo'
        | 'marketInfo'
      >
    >,
  ) {
    await this.favoriteRepo.update({ id: favoriteId }, patch);
    return this.favoriteRepo.findOneBy({ id: favoriteId });
  }
}
