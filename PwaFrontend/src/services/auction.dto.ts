import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000', // ✅ NestJS 서버 주소
});

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

export const searchAuctions = async (dto: AuctionSearchDto) => {
  const res = await api.post('/auctions/search', dto);
  return res.data; // { pageNo, pageSize, totalCount, items: [...] }
};
