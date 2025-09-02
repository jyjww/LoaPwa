import { Favorite } from './entities/favorite.entity';

export function shouldTriggerAlert(fav: Favorite): boolean {
  if (!fav.active || fav.isAlerted) return false; // 비활성/이미 알림된 경우 제외

  // 🎯 조건 1: 목표가 도달
  if (fav.targetPrice && fav.currentPrice >= fav.targetPrice) {
    return true;
  }

  // 🎯 조건 2: 20% 이상 가격 하락
  if (fav.previousPrice && fav.currentPrice <= fav.previousPrice * 0.8) {
    return true;
  }

  return false;
}
