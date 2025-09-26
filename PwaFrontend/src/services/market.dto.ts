import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000', // ✅ NestJS 서버 주소
});

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

export const searchMarket = async (dto: MarketSearchDto) => {
  const res = await api.post('/markets/search', dto);
  return res.data; // { pageNo, pageSize, totalCount, items: [...] }
};
