import api from '@/services/axiosInstance';

export interface BaseSearchDto {
  query?: string;
  grade?: string;
  tier?: number | '전체';
  className?: string;
  category?: number | '전체';
  subCategory?: number | '전체';
  pageNo?: number;
}

export interface MarketSearchDto extends BaseSearchDto {}

// export const searchMarket = async (dto: MarketSearchDto) => {
//   const res = await api.post('/markets/search', dto);
//   return res.data; // { pageNo, pageSize, totalCount, items: [...] }
// };

export const searchMarket = async (dto: MarketSearchDto, opts?: { signal?: AbortSignal }) => {
  const res = await api.post('/markets/search', dto, {
    signal: opts?.signal, // ← 여기만 추가
  });
  return res.data; // { pageNo, pageSize, totalCount, items: [...] }
};
