export interface TrackedItem {
  key: string;
  searchName: string;
  label: string;
  /** 0 = 전체(fallback 사용) */
  categoryCode: number;
  icon: string;
  group: string;
}

export const TRACKED_ITEMS: TrackedItem[] = [
  // ─── 강화 재료 ────────────────────────────────────────────────────────────
  {
    key: 'popular:정제된파괴강석',
    searchName: '정제된 파괴강석',
    label: '정제된 파괴강석',
    categoryCode: 50010,
    icon: '⚔️',
    group: '강화석',
  },
  {
    key: 'popular:정제된수호강석',
    searchName: '정제된 수호강석',
    label: '정제된 수호강석',
    categoryCode: 50010,
    icon: '🛡️',
    group: '강화석',
  },
  {
    key: 'popular:운명의파괴석',
    searchName: '운명의 파괴석',
    label: '운명의 파괴석',
    categoryCode: 50010,
    icon: '⚔️',
    group: '강화석',
  },
  {
    key: 'popular:운명의수호석',
    searchName: '운명의 수호석',
    label: '운명의 수호석',
    categoryCode: 50010,
    icon: '🛡️',
    group: '강화석',
  },
  {
    key: 'popular:운명의파괴석결정',
    searchName: '운명의 파괴석 결정',
    label: '운명의 파괴석 결정',
    categoryCode: 50010,
    icon: '⚔️',
    group: '강화석',
  },
  {
    key: 'popular:운명의수호석결정',
    searchName: '운명의 수호석 결정',
    label: '운명의 수호석 결정',
    categoryCode: 50010,
    icon: '🛡️',
    group: '강화석',
  },

  // ─── 돌파석 ──────────────────────────────────────────────────────────────
  {
    key: 'popular:찬란한명예의돌파석',
    searchName: '찬란한 명예의 돌파석',
    label: '찬란한 명예의 돌파석',
    categoryCode: 50010,
    icon: '💎',
    group: '돌파석',
  },
  {
    key: 'popular:운명의돌파석',
    searchName: '운명의 돌파석',
    label: '운명의 돌파석',
    categoryCode: 50010,
    icon: '💎',
    group: '돌파석',
  },
  {
    key: 'popular:위대한운명의돌파석',
    searchName: '위대한 운명의 돌파석',
    label: '위대한 운명의 돌파석',
    categoryCode: 50010,
    icon: '💎',
    group: '돌파석',
  },

  // ─── 융화 재료 ────────────────────────────────────────────────────────────
  {
    key: 'popular:최상급오레하융화재료',
    searchName: '최상급 오레하 융화 재료',
    label: '최상급 오레하 융화 재료',
    categoryCode: 50010,
    icon: '🔥',
    group: '융화재료',
  },
  {
    key: 'popular:아비도스융화재료',
    searchName: '아비도스 융화 재료',
    label: '아비도스 융화 재료',
    categoryCode: 50010,
    icon: '🔥',
    group: '융화재료',
  },
  {
    key: 'popular:상급아비도스융화재료',
    searchName: '상급 아비도스 융화 재료',
    label: '상급 아비도스 융화 재료',
    categoryCode: 50010,
    icon: '🔥',
    group: '융화재료',
  },

  // ─── 명예의 파편 ──────────────────────────────────────────────────────────
  {
    key: 'popular:명예의파편(소)',
    searchName: '명예의 파편 주머니(소)',
    label: '명파 주머니(소)',
    categoryCode: 50010,
    icon: '💜',
    group: '파편',
  },
  {
    key: 'popular:명예의파편(중)',
    searchName: '명예의 파편 주머니(중)',
    label: '명파 주머니(중)',
    categoryCode: 50010,
    icon: '💜',
    group: '파편',
  },
  {
    key: 'popular:명예의파편(대)',
    searchName: '명예의 파편 주머니(대)',
    label: '명파 주머니(대)',
    categoryCode: 50010,
    icon: '💜',
    group: '파편',
  },

  // ─── 운명의 파편 ──────────────────────────────────────────────────────────
  {
    key: 'popular:운명의파편(소)',
    searchName: '운명의 파편 주머니(소)',
    label: '운파 주머니(소)',
    categoryCode: 50010,
    icon: '🔮',
    group: '파편',
  },
  {
    key: 'popular:운명의파편(중)',
    searchName: '운명의 파편 주머니(중)',
    label: '운파 주머니(중)',
    categoryCode: 50010,
    icon: '🔮',
    group: '파편',
  },
  {
    key: 'popular:운명의파편(대)',
    searchName: '운명의 파편 주머니(대)',
    label: '운파 주머니(대)',
    categoryCode: 50010,
    icon: '🔮',
    group: '파편',
  },

  // ─── 숨결 ────────────────────────────────────────────────────────────────
  {
    key: 'popular:용암의숨결',
    searchName: '용암의 숨결',
    label: '용암의 숨결',
    categoryCode: 0,
    icon: '🌋',
    group: '숨결',
  },
  {
    key: 'popular:빙하의숨결',
    searchName: '빙하의 숨결',
    label: '빙하의 숨결',
    categoryCode: 0,
    icon: '❄️',
    group: '숨결',
  },

  // ─── 기타 ────────────────────────────────────────────────────────────────
  {
    key: 'popular:에스더의기운',
    searchName: '에스더의 기운',
    label: '에스더의 기운',
    categoryCode: 0,
    icon: '✨',
    group: '기타',
  },
];
