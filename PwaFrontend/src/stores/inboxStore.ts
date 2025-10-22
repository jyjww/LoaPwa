// src/stores/inboxStore.ts
import { useSyncExternalStore } from 'react';
import { idbClear } from '@/lib/inboxIdb';

export type InboxMessage = {
  title: string;
  body: string;
  url?: string;
  ts: number; // epoch ms
  type?: string;
};

type State = {
  items: InboxMessage[];
  unread: number;
};

const LS_KEY = 'push_inbox_v1';

// ---- 내부 상태 & 구독자 목록 ----
let state: State = loadFromLS();
const listeners = new Set<() => void>();

function emit() {
  saveToLS(state);
  for (const l of listeners) l();
}

function loadFromLS(): State {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { items: [], unread: 0 };
    const parsed = JSON.parse(raw);
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      unread: typeof parsed.unread === 'number' ? parsed.unread : 0,
    };
  } catch {
    return { items: [], unread: 0 };
  }
}

function saveToLS(s: State) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {}
}

// ---- 외부에서 사용할 API ----
export const inboxStore = {
  // React 외부에서도 바로 접근 가능
  getState(): State {
    return state;
  },
  setAll(items: InboxMessage[]) {
    state = { items: items.slice().sort((a, b) => b.ts - a.ts), unread: state.unread };
    emit();
  },
  append(msg: InboxMessage) {
    // 중복 방지: messageId 또는 타임스탬프+제목으로 체크
    const exists = state.items.some((m) => {
      // messageId로 중복 체크 (더 정확)
      if ((m as any).raw?.messageId && (msg as any).raw?.messageId) {
        return (m as any).raw.messageId === (msg as any).raw.messageId;
      }
      if ((m as any).raw?.fcmMessageId && (msg as any).raw?.fcmMessageId) {
        return (m as any).raw.fcmMessageId === (msg as any).raw.fcmMessageId;
      }
      // 폴백: 타임스탬프+제목으로 체크
      return m.ts === msg.ts && m.title === msg.title;
    });

    if (exists) {
      console.log('🚫 Duplicate message prevented:', msg.title);
      return;
    }

    state = {
      items: [msg, ...state.items].slice(0, 200), // 최대 200개 보관 (원하면 조절)
      unread: state.unread + 1,
    };
    emit();
  },
  resetUnread() {
    state = { ...state, unread: 0 };
    emit();

    // 읽음 처리 후 오래된 메시지 자동 삭제 (7일 이상)
    this.cleanupOldMessages();
  },

  cleanupOldMessages() {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const oldCount = state.items.filter((item) => item.ts < sevenDaysAgo).length;

    if (oldCount > 0) {
      state = {
        ...state,
        items: state.items.filter((item) => item.ts >= sevenDaysAgo),
      };
      emit();
      console.log(`🧹 Cleaned up ${oldCount} old messages (older than 7 days)`);
    }
  },

  clearAll() {
    const clearedCount = state.items.length;
    state = { items: [], unread: 0 };
    emit();

    // IndexedDB에서도 삭제
    idbClear().catch((err) => {
      console.warn('Failed to clear IndexedDB:', err);
    });

    console.log(`🗑️ Cleared all ${clearedCount} messages`);
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

// ---- React 훅: usePushInbox ----
export function usePushInbox() {
  const snapshot = useSyncExternalStore(
    inboxStore.subscribe,
    inboxStore.getState,
    inboxStore.getState,
  );

  return {
    items: snapshot.items,
    unread: snapshot.unread,
    resetUnread: inboxStore.resetUnread,
    // 필요 시 확장용
    setAll: inboxStore.setAll,
    append: inboxStore.append,
    clearAll: inboxStore.clearAll,
  };
}
