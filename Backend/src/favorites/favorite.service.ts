// src/favorites/favorites.service.ts

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { User } from '@/auth/entities/user.entity';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { shouldTriggerAlert } from '@/favorites/alert.util';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepo: Repository<Favorite>,
    private readonly eventEmitter: EventEmitter2,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * 유저 기준 즐겨찾기 전체 조회 (선택적으로 source 필터링 가능)
   */
  async findAllByUser(userId: string, source?: 'auction' | 'market') {
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
  async create(userId: string, dto: CreateFavoriteDto) {
    const id = String(userId);
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
  async remove(userId: string, favoriteId: string) {
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
  async updateTargetPrice(userId: string, favoriteId: string, price: number) {
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

  /**
   * 부분 업데이트(patch) -> DB 반영 후 다시 조회
   * 스케줄러/배치 작업에서 여러 즐겨찾기를 돌며 스냅샷 갱신 + 알림 체크
   */
  async updateSnapshotAndCheck(favoriteId: string, patch: Partial<Favorite>) {
    await this.favoriteRepo.update({ id: favoriteId }, patch);
    const updated = await this.favoriteRepo.findOne({
      where: { id: favoriteId },
      relations: ['user'],
    });

    if (updated && shouldTriggerAlert(updated)) {
      // 알림 큐에 push
      await this.eventEmitter.emitAsync('favorite.alert', updated);
      // 플래그 업데이트
      updated.isAlerted = true;
      await this.favoriteRepo.save(updated);
    }

    return updated;
  }

  /**
   * 특정 아이템의 가격을 실시간으로 단건 업데이트
   * currentPrice 하나만 갱신하는 단일 책임 함수
   * 이전 가격을 직접 previousPrice에 넣고 저장
   */
  async updateFavoritePrice(id: string, currentPrice: number) {
    const favorite = await this.favoriteRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!favorite) throw new NotFoundException('Favorite not found');

    favorite.previousPrice = favorite.currentPrice;
    favorite.currentPrice = currentPrice;
    await this.favoriteRepo.save(favorite);

    if (shouldTriggerAlert(favorite)) {
      this.eventEmitter.emit('favorite.alert', favorite);
    }

    return favorite;
  }
}
