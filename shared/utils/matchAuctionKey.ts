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
  options?: GenericOption[]; // 악세/돌: 각인/패널티 등 이름+값
  auctionInfo?: any; // 필요 시 참조
};

export type MarketItemMinimal = {
  id?: number | null; // 거래소 정식 id
  name: string;
  grade?: string | null;
  tier?: number | null;
  marketInfo?: any;
};

export type Source = 'auction' | 'market';
export type CategoryKey =
  | 'accessory' // 목걸이/귀걸이/반지
  | 'stone' // 비상의 돌
  | 'gem' // 보석 (홍염/멸화)
  | 'book' // 각인서 등
  | 'material' // 재료류
  | 'generic'; // 기타

// --------------- 공통 유틸 ---------------
const V = 'v1'; // 규칙 바꾸면 v2로 올려서 이전 키와 구분

const normalize = (s?: string | null) =>
  (s ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N} _\-:/|.]/gu, ''); // 한글/영숫자/몇몇 구분자만 유지

const stableOptionsString = (opts?: GenericOption[]) => {
  if (!opts?.length) return '';
  const normed = opts.map((o) => ({
    name: normalize(o.name),
    value: String(o.value),
  }));
  normed.sort((a, b) =>
    a.name === b.name
      ? a.value < b.value
        ? -1
        : a.value > b.value
        ? 1
        : 0
      : a.name < b.name
      ? -1
      : 1,
  );
  // name=value 조합을 '|'로 이어서 결정적 문자열 생성
  return normed.map((o) => `${o.name}=${o.value}`).join('|');
};

// 짧은 FNV-1a 32-bit 해시 → 8자리 hex
export const shortHash = (str: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  // 32-bit 양수화
  return (h >>> 0).toString(16).padStart(8, '0');
};

// --------------- 카테고리별 빌더 ---------------

// 1) 거래소: 공식 itemId가 있으면 그걸 최우선으로 사용(가장 강력한 식별자)
const buildMarketKey = (item: MarketItemMinimal) => {
  if (item.id != null) return `market:id:${item.id}`; // 이미 유니크
  // id가 없는 희귀 케이스 대비(안 쓰이길 권장)
  const body = [
    `name:${normalize(item.name)}`,
    item.grade ? `grade:${normalize(item.grade)}` : null,
    item.tier ? `tier:${item.tier}` : null,
  ]
    .filter(Boolean)
    .join('|');
  return `market:fallback:${shortHash(body)}`;
};

// 2) 비상의 돌: 이름은 사실상 고정, 티어 + 각인 2개 + 패널티 1개(값 포함)로 동등성 보장
const buildStoneKey = (item: AuctionItemMinimal) => {
  const body = [
    `tier:${item.tier ?? ''}`,
    // 이름·등급은 참고용만 포함(선택). 옵션이 결정적 요소.
    `name:${normalize(item.name)}`,
    `grade:${normalize(item.grade || '')}`,
    `opts:${stableOptionsString(item.options)}`,
  ].join('|');
  return `auction:stone:${shortHash(body)}`;
};

// 3) 악세사리: 품질/등급/각인(+패널티) 조합이 핵심
const buildAccessoryKey = (item: AuctionItemMinimal) => {
  const body = [
    `tier:${item.tier ?? ''}`,
    `grade:${normalize(item.grade || '')}`,
    `quality:${item.quality ?? ''}`, // 0~100
    `opts:${stableOptionsString(item.options)}`,
  ].join('|');
  return `auction:accessory:${shortHash(body)}`;
};

// 4) 보석: 네 요구대로 “세부 스킬 무시”하고 유형+티어만
//   - 이름에 '멸화/홍염'이 들어가니 유형만 추출해서 사용
const getGemType = (name: string) => {
  const n = normalize(name);
  if (n.includes('멸화')) return '멸화';
  if (n.includes('홍염')) return '홍염';
  return 'unknown';
};
const buildGemKey = (item: AuctionItemMinimal) => {
  const body = [`type:${getGemType(item.name)}`, `tier:${item.tier ?? ''}`].join('|');
  return `auction:gem:${shortHash(body)}`;
};

// 5) 각인서/재료/기타: 이름+등급(+티어) 정도로 보수적으로
const buildGenericAuctionKey = (item: AuctionItemMinimal) => {
  const body = [
    `name:${normalize(item.name)}`,
    `grade:${normalize(item.grade || '')}`,
    item.tier ? `tier:${item.tier}` : null,
    item.quality != null ? `quality:${item.quality}` : null,
    item.options?.length ? `opts:${stableOptionsString(item.options)}` : null,
  ]
    .filter(Boolean)
    .join('|');
  return `auction:generic:${shortHash(body)}`;
};

// --------------- 전략 레지스트리 ---------------
// 필요시 카테고리 매핑은 서버에서 LostArk CategoryCode → 내부 CategoryKey로 변환해서 넘겨주면 깔끔.
const AuctionKeyBuilders: Record<CategoryKey, (i: AuctionItemMinimal) => string> = {
  stone: buildStoneKey,
  accessory: buildAccessoryKey,
  gem: buildGemKey,
  book: buildGenericAuctionKey,
  material: buildGenericAuctionKey,
  generic: buildGenericAuctionKey,
};

export function makeMatchKey(
  source: Source,
  item: AuctionItemMinimal | MarketItemMinimal,
  category: CategoryKey = 'generic',
) {
  let raw = '';
  if (source === 'market') {
    raw = buildMarketKey(item as MarketItemMinimal);
  } else {
    const builder = AuctionKeyBuilders[category] || AuctionKeyBuilders.generic;
    raw = builder(item as AuctionItemMinimal);
  }
  // 버전 + 원본 키(디버깅 용이) + 짧은 해시
  return `${V}|${raw}`;
}
