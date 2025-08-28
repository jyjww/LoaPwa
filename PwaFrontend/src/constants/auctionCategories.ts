// src/constants/auctionCategories.ts
export type AuctionCategory = {
  code: number;
  label: string;
  subs?: { code: number; label: string }[];
};

export const auctionCategories: AuctionCategory[] = [
  {
    code: 10000,
    label: '장비',
    subs: [
      { code: 180000, label: '무기' },
      { code: 190010, label: '투구' },
      { code: 190020, label: '상의' },
      { code: 190030, label: '하의' },
      { code: 190040, label: '장갑' },
      { code: 190050, label: '어깨' },
    ],
  },
  {
    code: 200000,
    label: '장신구',
    subs: [
      { code: 200010, label: '목걸이' },
      { code: 200020, label: '귀걸이' },
      { code: 200030, label: '반지' },
      { code: 200040, label: '팔찌' },
    ],
  },
  { code: 30000, label: '어빌리티 스톤' },
  { code: 210000, label: '보석' },
];
