import type { FavoritePayload, FavoriteResponse } from './favorites.dto';
import authFetch from '@/services/authFetch';

// ✅ 즐겨찾기 전체 조회
export async function fetchFavorites(): Promise<FavoriteResponse[]> {
  const res = await authFetch('/favorites', {
    method: 'GET',
    // headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`즐겨찾기 조회 실패: ${res.status}`);
  return res.json();
}

// ✅ 즐겨찾기 추가
export async function addFavorite(payload: FavoritePayload): Promise<FavoriteResponse> {
  const res = await authFetch('/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`즐겨찾기 추가 실패: ${res.status}`);
  return res.json();
}

// ✅ 즐겨찾기 삭제
export async function removeFavorite(id: string): Promise<{ message: string }> {
  const res = await authFetch(`/favorites/${id}`, { method: 'DELETE' });

  if (!res.ok) throw new Error(`즐겨찾기 삭제 실패: ${res.status}`);
  return res.json();
}

// ✅ 타겟 가격 수정
export async function updateTargetPrice(id: string, price: number): Promise<FavoriteResponse> {
  const res = await authFetch(`/favorites/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetPrice: price }),
  });

  if (!res.ok) throw new Error(`타겟 가격 수정 실패: ${res.status}`);
  return res.json();
}

export async function updateFavoriteAlarm(
  id: string,
  payload: { isAlerted: boolean; targetPrice: number },
) {
  const res = await authFetch(`/favorites/${id}/alarm`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`알림 설정 실패: ${res.status}`);
  return res.json();
}
