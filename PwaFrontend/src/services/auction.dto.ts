import api from '@/services/axiosInstance';

export interface AuctionSearchDto {
  query?: string;
  grade?: string;
  tier?: number | '전체';
  className?: string;
  category?: number | '전체';
  subCategory?: number | '전체';
  etcOptions?: Array<{ type: string; value: number | null }>;
  pageNo?: number;
}

export const searchAuctions = async (dto: AuctionSearchDto, opts?: { signal?: AbortSignal }) => {
  const res = await api.post('/auctions/search', dto, {
    signal: opts?.signal,
  });
  return res.data; // { pageNo, pageSize, totalCount, items: [...] }
};
