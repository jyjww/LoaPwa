// Backend/src/auctions/utils/build-etc-option-filters.ts
import { EtcOptions, CategoryEtcOptions, type EtcOptionType } from '@/constants/etcOptions';

// 이름 → (그룹텍스트, 그룹코드=first, 서브코드=second) 매핑
const NameToEntry = new Map<string, { typeText: string; first: number; second: number }>();
const TypeTextToFirst = new Map<string, number>(); // "각인 효과" → 3

for (const group of EtcOptions) {
  TypeTextToFirst.set(group.Text, group.Value);
  for (const sub of group.EtcSubs) {
    NameToEntry.set(sub.Text, { typeText: group.Text, first: group.Value, second: sub.Value });
  }
}

// 카테고리별 허용되는 FirstOption(그룹 코드) 목록
export function allowedFirstOptionsForCategory(categoryCode: number): number[] {
  const types: EtcOptionType[] = CategoryEtcOptions[categoryCode] ?? [];

  // ✅ 어빌리티 스톤(30000): '각인 효과'만 허용(패널티 무시)
  if (categoryCode === 30000) {
    const first = TypeTextToFirst.get('각인 효과');
    return typeof first === 'number' ? [first] : [];
  }

  return types.map((t) => TypeTextToFirst.get(t)).filter((v): v is number => typeof v === 'number');
}

/**
 * 즐겨찾기 옵션 → AuctionSearchDto용 etcOptions({type, value, minValue, maxValue})
 * - allowedFirstOptions: 허용 그룹 코드(FirstOption) 화이트리스트
 * - opts 내 두 각인을 모두 포함하면 API도 '두 각인 존재'로 필터됨
 * - looseValues=true 이면 Min/Max를 null로 둬서 '존재만' 필터(스톤에서 사용)
 */
export function buildEtcOptionDtos(
  opts?: Array<{ name: string; value: number }> | null,
  allowedFirstOptions?: number[],
  options?: { looseValues?: boolean },
) {
  const loose = options?.looseValues === true;

  if (!opts?.length) return [];
  return opts
    .map(({ name, value }) => {
      const entry = NameToEntry.get(name);
      if (!entry) return null;
      if (allowedFirstOptions && !allowedFirstOptions.includes(entry.first)) return null;

      const v = Number.isFinite(value) ? Number(value) : 10;

      return {
        type: entry.typeText, // '각인 효과' | '감소 효과' 등
        value: entry.second, // 서브 코드 (예: 각성=255, 구슬동자=134)
        minValue: loose ? null : v,
        maxValue: loose ? null : v,
      };
    })
    .filter(Boolean) as Array<{
    type: string;
    value: number;
    minValue: number | null;
    maxValue: number | null;
  }>;
}
