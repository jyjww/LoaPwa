// src/favorites/favorites.service.ts

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { User } from '@/auth/entities/user.entity';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { shouldTriggerAlert, type AlertCandidate } from '@/favorites/alert.util';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHash } from 'crypto';

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

    function norm(s: unknown) {
      return String(s ?? '')
        .normalize('NFKC')
        .trim()
        .replace(/\s+/g, ' ');
    }
    function buildAuctionMatchKeyLike(dto: {
      name?: string;
      grade?: string;
      tier?: number;
      options?: Array<{ name: string; value: number }>;
    }) {
      const base = [
        'v1',
        `name=${norm(dto.name)}`,
        `grade=${norm(dto.grade)}`,
        `tier=${dto.tier ?? ''}`,
        `opts=${(dto.options ?? [])
          .map((o) => `${norm(o.name)}=${o.value}`)
          .sort()
          .join('|')}`,
      ].join('|');
      return 'auc:' + createHash('sha1').update(base).digest('base64url').slice(0, 16);
    }

    const matchKey =
      dto.matchKey ??
      (dto.source === 'auction'
        ? buildAuctionMatchKeyLike({
            name: dto.name,
            grade: dto.grade,
            tier: dto.tier,
            options: (dto.options ?? []).map((o) => ({ name: o.name, value: o.value })),
          })
        : typeof dto.itemId === 'number'
          ? `mkt:${dto.itemId}`
          : undefined);

    const favorite = this.favoriteRepo.create({
      user, // User는 NotNull 보장
      source: dto.source,

      // 식별자
      itemId: dto.itemId ?? undefined,
      matchKey: matchKey,

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
    return this.favoriteRepo.find({ where: { active: true }, relations: ['user'] });
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
   * 특정 아이템의 가격을 실시간으로 단건 업데이트
   * currentPrice 하나만 갱신하는 단일 책임 함수
   * 이전 가격을 직접 previousPrice에 넣고 저장
   */
  // 단건 실시간 갱신
  // 단건 실시간 갱신
  async updateFavoritePrice(id: string, currentPrice: number) {
    const favorite = await this.favoriteRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!favorite) throw new NotFoundException('Favorite not found');

    // 1) shouldTriggerAlert에 넘길 최소 필드 구성 (업데이트 '이후' 상태 기준)
    const nextForCheck: AlertCandidate = {
      active: favorite.active,
      isAlerted: favorite.isAlerted,
      lastNotifiedAt: favorite.lastNotifiedAt ?? null,
      previousPrice: favorite.currentPrice ?? null, // 직전가 = 기존 currentPrice
      currentPrice, // 새로 들어온 가격
      targetPrice: favorite.targetPrice ?? null,
    };

    // 2) 알림 여부 판단
    const shouldNotify = shouldTriggerAlert(nextForCheck, {
      cooldownMs: 30 * 60 * 1000,
      crossingOnly: false,
    });

    // 3) DB patch 한 번에 반영 (알림이면 lastNotifiedAt 포함)
    const patch: Partial<Favorite> = {
      previousPrice: favorite.currentPrice,
      currentPrice,
      ...(shouldNotify ? { lastNotifiedAt: new Date() } : {}),
    };
    await this.favoriteRepo.update(id, patch);

    // 4) 알림 이벤트 발행
    if (shouldNotify) {
      this.eventEmitter.emit('favorite.alert', {
        favoriteId: favorite.id,
        userId: favorite.user.id,
        itemId: favorite.itemId,
        currentPrice,
        targetPrice: favorite.targetPrice,
        source: favorite.source,
      });
    }

    // 5) 최신 상태 반환
    return this.favoriteRepo.findOne({ where: { id }, relations: ['user'] });
  }

  async updateFavoriteAlarm(
    userId: string,
    favoriteId: string,
    alarmDto: { isAlerted: boolean; targetPrice: number },
  ) {
    const favorite = await this.favoriteRepo.findOne({
      where: { id: favoriteId },
      relations: ['user'],
    });

    if (!favorite) throw new NotFoundException('Favorite not found');
    if (favorite.user.id !== userId) throw new ForbiddenException();

    // 🔹 프론트에서 넘어온 알림 설정 반영
    favorite.isAlerted = alarmDto.isAlerted;
    favorite.targetPrice = alarmDto.targetPrice;

    return this.favoriteRepo.save(favorite);
  }

  async updateSnapshotsAndEvaluateAll(
    favorites: Favorite[],
    snap: {
      currentPrice: number;
      previousPrice?: number;
      info: any;
      lastCheckedAt: Date;
    },
  ) {
    for (const fav of favorites) {
      // 1) 이번 배치로 적용될 스냅샷 값
      const nextCurrent = snap.currentPrice;
      const nextPrevious = snap.previousPrice ?? fav.previousPrice;

      // 2) "업데이트 이후 상태"를 기준으로 shouldTriggerAlert 판정
      const nextForCheck: AlertCandidate = {
        active: fav.active,
        isAlerted: fav.isAlerted,
        lastNotifiedAt: fav.lastNotifiedAt ?? null,
        previousPrice: snap.previousPrice ?? fav.previousPrice ?? null,
        currentPrice: snap.currentPrice,
        targetPrice: fav.targetPrice ?? null,
      };

      const shouldNotify = shouldTriggerAlert(nextForCheck, {
        cooldownMs: 30 * 60 * 1000,
        crossingOnly: false,
      });

      // 3) DB patch를 한 번에 구성 (알림이면 lastNotifiedAt 포함)
      const patch: Partial<Favorite> = {
        currentPrice: nextCurrent,
        previousPrice: nextPrevious,
        marketInfo: fav.source === 'market' ? snap.info : fav.marketInfo,
        auctionInfo: fav.source === 'auction' ? snap.info : fav.auctionInfo,
        lastCheckedAt: snap.lastCheckedAt,
        ...(shouldNotify ? { lastNotifiedAt: new Date() } : {}),
      };

      // 4) 알림 이벤트 발행 (FCM 리스너에서 처리)
      if (shouldNotify) {
        this.eventEmitter.emit('favorite.alert', {
          favoriteId: fav.id,
          userId: fav.user.id,
          itemId: fav.itemId,
          currentPrice: nextCurrent,
          targetPrice: fav.targetPrice,
          source: fav.source,
        });
      }

      // 5) 최종 1회 업데이트
      await this.favoriteRepo.update(fav.id, patch);
    }
  }
}
