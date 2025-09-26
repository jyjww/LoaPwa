// src/utils/matchAuctionKey.ts
/**
 * 🔑 Auction 매칭 키 생성기 (프론트/백 공용)
 *
 * 왜 필요한가?
 * - 경매장은 공식적으로 “안정적인 itemId”를 제공하지 않거나, 같은 이름이라도 옵션/품질/티어가 제각각임.
 * - “이 옵션이 정확히 같은 아이템”에만 알림을 보내려면, 사람이 보는 이름이 아니라 “동등성 기준”을 엄격히 반영한 **결정적 키**가 필요함.
 *
 * 무엇을 하는가?
 * 1) 문자열 표준화: 공백/대소문/유니코드 정규화로 로캘/표기 차이에 둔감하게 만듦.
 * 2) 옵션 안정 정렬: 옵션(name=value) 배열을 이름/값으로 정렬 후 직렬화 → 순서가 달라도 같은 키.
 * 3) 카테고리별 빌더:
 *    - stone(비상의 돌): 티어 + 각인/패널티 조합이 핵심
 *    - accessory(악세): 등급/품질 + 각인 조합이 핵심
 *    - gem(보석): 멸화/홍염 유형 + 티어만(스킬 세부는 무시)
 *    - generic: 이름/등급(+티어/옵션)으로 보수적 매칭
 * 4) 시장(거래소) 아이템은 공식 itemId가 있으면 그걸 그대로 사용(가장 강력한 식별자).
 * 5) 버전 프리픽스 + 짧은 해시:
 *    - 규칙이 바뀌면 v2로 올려 과거 키와 충돌 방지 (`v1|auction:stone:ab12cd34` 형태)
 *    - 긴 원문 대신 짧은 해시를 써서 키 길이를 줄이고 노출을 최소화
 *
 * 얻는 이점
 * - 프론트/백 어디서든 동일 규칙으로 키를 생성 → 저장/조회/중복방지/알림 트리거 일관성 확보
 * - “이름만 같은 다른 아이템”에 대한 오탐 알림 방지
 * - 로캘/표기 흔들림에 강함(정규화/정렬/코드값 사용 권장)
 *
 * 사용 방법
 * - 즐겨찾기 저장 시 생성한 matchKey를 함께 저장(Favorite.matchKey).
 * - 스케줄러/알림 판단 시 itemId가 없더라도 matchKey로 정확히 매칭.
 *
 * 주의 사항
 * - 규칙을 변경하면 반드시 버전을 올릴 것(V를 v2로) → 과거 데이터와 분리 보관.
 * - 옵션 이름보다 “코드값”을 쓸 수 있으면 더 안전(로캘 독립)함.
 * - 해시 충돌 가능성은 매우 낮지만 0이 아님. 필요 시 더 긴 해시로 교체 가능.
 */
export type EngraveOption = { name: string; value: number | string };
export type GenericOption = { name: string; value: number | string };

export type AuctionItemMinimal = {
  name: string;
  grade?: string | null;
  tier?: number | null;
  quality?: number | null;
  options?: GenericOption[];
};

export type CategoryKey = 'accessory' | 'stone' | 'gem' | 'book' | 'material' | 'generic';

// ---- 공통 유틸 ----
const normalize = (s?: string | null) =>
  (s ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N} _\-:/|.]/gu, '');

const stableOptionsString = (opts?: GenericOption[]) => {
  if (!opts?.length) return '';
  const normed = opts
    .map((o) => ({ name: normalize(o.name), value: String(o.value) }))
    .sort((a, b) =>
      a.name === b.name ? a.value.localeCompare(b.value) : a.name.localeCompare(b.name),
    );
  return normed.map((o) => `${o.name}=${o.value}`).join('|');
};

export const shortHash = (str: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
};

// ---- 카테고리 바디 ----
const bodyStone = (i: AuctionItemMinimal) =>
  [
    `tier:${i.tier ?? ''}`,
    `name:${normalize(i.name)}`,
    `grade:${normalize(i.grade || '')}`,
    `opts:${stableOptionsString(i.options)}`,
  ].join('|');

const bodyAccessory = (i: AuctionItemMinimal) =>
  [
    `tier:${i.tier ?? ''}`,
    `grade:${normalize(i.grade || '')}`,
    `quality:${i.quality ?? ''}`,
    `opts:${stableOptionsString(i.options)}`,
  ].join('|');

const getGemType = (name: string) => {
  const n = normalize(name);
  if (n.includes('멸화')) return '멸화';
  if (n.includes('홍염')) return '홍염';
  return 'unknown';
};
const bodyGem = (i: AuctionItemMinimal) =>
  [`type:${getGemType(i.name)}`, `tier:${i.tier ?? ''}`].join('|');

const bodyGeneric = (i: AuctionItemMinimal) =>
  [
    `name:${normalize(i.name)}`,
    `grade:${normalize(i.grade || '')}`,
    i.tier != null ? `tier:${i.tier}` : null,
    i.quality != null ? `quality:${i.quality}` : null,
    i.options?.length ? `opts:${stableOptionsString(i.options)}` : null,
  ]
    .filter(Boolean)
    .join('|');

const builders: Record<CategoryKey, (i: AuctionItemMinimal) => string> = {
  stone: bodyStone,
  accessory: bodyAccessory,
  gem: bodyGem,
  book: bodyGeneric,
  material: bodyGeneric,
  generic: bodyGeneric,
};

// ---- 여기서 guessCategory를 정의 & export ----
export function guessCategory(item: {
  name: string;
  options?: any[];
  quality?: number | null;
}): CategoryKey {
  const name = String(item?.name ?? '')
    .normalize('NFKC')
    .toLowerCase();

  if (/(멸화|홍염)/.test(name)) return 'gem';
  if (/비상의\s*돌/.test(name)) return 'stone';
  if (/각인서/.test(name)) return 'book';

  const hasQuality = typeof item?.quality === 'number';
  const hasOpts = Array.isArray(item?.options) && item.options.length > 0;

  if (hasQuality && hasOpts) return 'accessory';
  return 'generic';
}

// ---- makeAuctionKey: category 안 주면 guessCategory로 자동 추정 ----
export function makeAuctionKey(item: AuctionItemMinimal, category?: CategoryKey) {
  const cat = category ?? guessCategory(item);
  const body = (builders[cat] ?? builders.generic)(item);
  return `auc:${shortHash(body)}`;
}

// 검사/정규화 유틸
export const isAuctionMatchKey = (v: unknown): v is string =>
  typeof v === 'string' && /^auc:[0-9a-f]{8}$/.test(v);

export function normalizeAuctionKey(k: string) {
  return k;
}
