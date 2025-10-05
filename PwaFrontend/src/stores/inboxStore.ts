// src/stores/inboxStore.ts
import { useSyncExternalStore } from 'react';

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
    // 중복 방지(타임스탬프 동일 메시지 가정)
    const exists = state.items.some((m) => m.ts === msg.ts && m.title === msg.title);
    if (exists) return;

    state = {
      items: [msg, ...state.items].slice(0, 200), // 최대 200개 보관 (원하면 조절)
      unread: state.unread + 1,
    };
    emit();
  },
  resetUnread() {
    state = { ...state, unread: 0 };
    emit();
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
  };
}
