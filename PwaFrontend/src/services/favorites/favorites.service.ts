import type { FavoritePayload, FavoriteResponse } from './favorites.dto';
import axiosInstance from '@/services/axiosInstance';

// ✅ 즐겨찾기 전체 조회
export async function fetchFavorites(): Promise<FavoriteResponse[]> {
  const res = await axiosInstance.get<FavoriteResponse[]>('/favorites');
  return res.data;
}

// ✅ 즐겨찾기 추가
export async function addFavorite(payload: FavoritePayload): Promise<FavoriteResponse> {
  const res = await axiosInstance.post<FavoriteResponse>('/favorites', payload);
  return res.data;
}

// ✅ 즐겨찾기 삭제
export async function removeFavorite(id: string): Promise<{ message: string }> {
  const res = await axiosInstance.delete<{ message: string }>(`/favorites/${id}`);
  return res.data;
}

// ✅ 타겟 가격 수정
export async function updateTargetPrice(id: string, price: number): Promise<FavoriteResponse> {
  const res = await axiosInstance.patch<FavoriteResponse>(`/favorites/${id}`, {
    targetPrice: price,
  });
  return res.data;
}

// ✅ 알림 설정 수정
export async function updateFavoriteAlarm(
  id: string,
  payload: { isAlerted: boolean; targetPrice: number },
): Promise<FavoriteResponse> {
  const res = await axiosInstance.patch<FavoriteResponse>(`/favorites/${id}/alarm`, payload);
  return res.data;
}
