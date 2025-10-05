// src/lib/inboxIdb.ts
// 브라우저 기본 IndexedDB만 사용 (추가 의존성 없음)

export type InboxMessage = {
  id?: number; // autoIncrement
  title: string;
  body: string;
  url?: string;
  ts: number; // epoch ms
  type?: string;
  raw?: any;
};

const DB_NAME = 'inbox-db';
const STORE = 'messages';
const VERSION = 1;

// DB 오픈 & 스키마
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        os.createIndex('ts', 'ts', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// IDBTransaction 완료 대기 (tx.done 대체)
function txComplete(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// 단건 추가
export async function idbAdd(msg: InboxMessage): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  const key = await new Promise<number>((resolve, reject) => {
    const req = store.add(msg);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
  await txComplete(tx);
  db.close();
  return key;
}

// 여러 건 추가
export async function idbAddMany(msgs: InboxMessage[]): Promise<void> {
  if (!msgs.length) return;
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  await Promise.all(
    msgs.map(
      (m) =>
        new Promise<void>((resolve, reject) => {
          const req = store.add(m);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
    ),
  );
  await txComplete(tx);
  db.close();
}

// 최신순 가져오기 (limit 옵션)
export async function idbGetAll(limit: number = 200): Promise<InboxMessage[]> {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readonly');
  const store = tx.objectStore(STORE);
  const idx = store.index('ts');
  const result: InboxMessage[] = [];

  await new Promise<void>((resolve, reject) => {
    // 최신순: upperBound(∞)부터 prev 방향으로
    const cursorReq = idx.openCursor(null, 'prev');
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor || result.length >= limit) {
        resolve();
        return;
      }
      result.push(cursor.value as InboxMessage);
      cursor.continue();
    };
    cursorReq.onerror = () => reject(cursorReq.error);
  });

  await txComplete(tx);
  db.close();
  return result;
}

// 전체 삭제
export async function idbClear(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  await new Promise<void>((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  await txComplete(tx);
  db.close();
}

// 최대 보관 수 초과 시 오래된 것 제거 (옵션)
export async function idbTrim(max: number = 300): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  const idx = store.index('ts');

  // 전체 개수
  const count = await new Promise<number>((resolve, reject) => {
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  if (count <= max) {
    db.close();
    return;
  }

  const toDelete = count - max;
  let removed = 0;

  await new Promise<void>((resolve, reject) => {
    // 오래된 것부터 삭제: 정방향(오래된→최신) 커서
    const cursorReq = idx.openCursor(null, 'next');
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor || removed >= toDelete) {
        resolve();
        return;
      }
      const delReq = cursor.delete();
      delReq.onsuccess = () => {
        removed++;
        cursor.continue();
      };
      delReq.onerror = () => reject(delReq.error);
    };
    cursorReq.onerror = () => reject(cursorReq.error);
  });

  await txComplete(tx);
  db.close();
}
