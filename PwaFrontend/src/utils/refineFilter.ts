import { EtcOptions } from '@/constants/etcOptions';
import type { EtcSub } from '@/constants/etcOptions';

// 선택된 subCategory(목걸이, 귀걸이, 반지)에 따라 연마 옵션만 걸러내는 함수
export function getRefineOptionsForCategory(subCategory: number): EtcSub[] {
  // 1. "연마 효과" 옵션 그룹 찾기
  const refineGroup = EtcOptions.find((opt) => opt.Text === '연마 효과');
  if (!refineGroup) return [];

  // 2. 해당 카테고리에 매칭되는 Sub만 필터링
  return refineGroup.EtcSubs.filter((sub) => {
    // Categories에 null이면 공통 → 항상 포함
    if (!sub.Categories) return true;
    // Categories가 배열이면 포함 여부 확인
    if (Array.isArray(sub.Categories)) {
      return sub.Categories.includes(subCategory);
    }
    return sub.Categories === subCategory;
  });
}
