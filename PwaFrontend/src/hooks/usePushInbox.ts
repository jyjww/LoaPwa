// src/hooks/usePushInbox.ts
import { useEffect, useState } from 'react';

export type PushItem = { title: string; body: string; url: string; type: string; ts: number };

export function usePushInbox() {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<PushItem[]>([]);

  useEffect(() => {
    const onMsg = (evt: MessageEvent) => {
      if (evt.data?.type === 'PUSH_RECEIVED') {
        const p: PushItem = evt.data.payload;
        setItems((xs) => [p, ...xs].slice(0, 50));
        setUnread((n) => n + 1);
        // 즉시 토스트
        try {
          // shadcn/ui toast 사용 시
          // toast({ title: p.title, description: p.body });
          // 간단 확인용:
          console.log('[PWA] toast:', p.title, p.body);
        } catch {}
      }
    };
    navigator.serviceWorker.addEventListener('message', onMsg);
    return () => navigator.serviceWorker.removeEventListener('message', onMsg);
  }, []);

  const resetUnread = () => setUnread(0);

  return { unread, items, resetUnread };
}
