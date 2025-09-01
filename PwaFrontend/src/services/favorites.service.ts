import type { FavoritePayload, FavoriteResponse } from './favorites.dto';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

function getToken() {
  const token = localStorage.getItem('access_token');
  if (!token) throw new Error('로그인이 필요합니다.');
  return token;
}

// ✅ 즐겨찾기 전체 조회
export async function fetchFavorites(): Promise<FavoriteResponse[]> {
  const token = getToken();
  const res = await fetch(`${API}/favorites`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`즐겨찾기 조회 실패: ${res.status}`);
  return res.json();
}

// ✅ 즐겨찾기 추가
export async function addFavorite(payload: FavoritePayload): Promise<FavoriteResponse> {
  const token = getToken();
  const res = await fetch(`${API}/favorites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`즐겨찾기 추가 실패: ${res.status}`);
  return res.json();
}

// ✅ 즐겨찾기 삭제
export async function removeFavorite(id: string): Promise<{ message: string }> {
  const token = getToken();
  const res = await fetch(`${API}/favorites/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`즐겨찾기 삭제 실패: ${res.status}`);
  return res.json();
}

// ✅ 타겟 가격 수정
export async function updateTargetPrice(id: string, price: number): Promise<FavoriteResponse> {
  const token = getToken();
  const res = await fetch(`${API}/favorites/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ targetPrice: price }),
  });

  if (!res.ok) throw new Error(`타겟 가격 수정 실패: ${res.status}`);
  return res.json();
}
