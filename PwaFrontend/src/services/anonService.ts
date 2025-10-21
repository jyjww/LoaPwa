import axiosInstance from '@/services/axiosInstance';

export interface AnonUserResponse {
  success: boolean;
  data: {
    anonId: string;
  };
}

// 쿠키에서 익명 사용자 ID 읽기
function getAnonIdFromCookie(): string | null {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'anonId') {
      return value;
    }
  }
  return null;
}

// 익명 사용자 ID 생성 또는 기존 ID 반환
export async function getOrCreateAnonId(): Promise<string> {
  console.log('🔍 getOrCreateAnonId 호출됨');

  // 쿠키에서 기존 ID 확인
  const existingId = getAnonIdFromCookie();
  console.log('🍪 쿠키에서 기존 ID:', existingId);

  if (existingId) {
    return existingId;
  }

  try {
    console.log('📡 서버에 익명 사용자 생성 요청 중...');
    // 서버에서 새 익명 사용자 생성 (쿠키가 없을 때만)
    const response = await axiosInstance.post<AnonUserResponse>('/anon/init');
    console.log('📡 서버 응답:', response.data);
    const anonId = response.data.data.anonId;
    console.log('✅ 익명 사용자 ID 받음:', anonId);

    return anonId;
  } catch (error) {
    console.error('❌ 익명 사용자 생성 실패:', error);
    throw new Error('익명 사용자 생성에 실패했습니다.');
  }
}

// 현재 익명 사용자 ID 반환 (쿠키에서만)
export function getCurrentAnonId(): string | null {
  // 기존 localStorage 정리
  if (localStorage.getItem('anon_user_id')) {
    localStorage.removeItem('anon_user_id');
  }

  return getAnonIdFromCookie();
}

// 익명 사용자 ID 삭제 (쿠키는 서버에서 관리)
export function clearAnonId(): void {
  // 쿠키는 서버에서 관리하므로 클라이언트에서는 삭제할 수 없음
  console.log('쿠키는 서버에서 관리됩니다.');
}
