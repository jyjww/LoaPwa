// src/hooks/usePushInbox.ts
import { useEffect, useState } from 'react';

export type PushItem = { title: string; body: string; url: string; type: string; ts: number };

export function usePushInbox(onNotify?: (p: PushItem) => void) {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<PushItem[]>([]);

  useEffect(() => {
    const onMsg = (evt: MessageEvent) => {
      if (evt.data?.type === 'PUSH_RECEIVED') {
        const p: PushItem = evt.data.payload;
        setItems((xs) => [p, ...xs].slice(0, 50));
        setUnread((n) => n + 1);

        // ✅ 옵션: 토스트/알림이 필요하면 바깥에서 콜백으로
        onNotify?.(p);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMsg);
    return () => navigator.serviceWorker.removeEventListener('message', onMsg);
  }, [onNotify]);

  const resetUnread = () => setUnread(0);
  return { unread, items, resetUnread };
}
