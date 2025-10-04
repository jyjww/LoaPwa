// src/pages/PushHelp.tsx
import { useEffect, useMemo, useState, type FC, type ReactNode } from 'react';
import { issueFcmTokenWithVapid, deleteFcmToken, getMessagingIfSupported } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type CheckRow = { label: string; value: string | boolean; warn?: boolean };

const Section: FC<{ title: string; children: ReactNode; id?: string }> = ({
  title,
  children,
  id,
}) => (
  <div id={id} className="space-y-2">
    <h3 className="text-lg font-semibold">{title}</h3>
    <div className="rounded-lg border p-3 mobile-card">{children}</div>
  </div>
);

export default function PushHelp() {
  const [token, setToken] = useState<string | null>(null);
  const [perm, setPerm] = useState<NotificationPermission>(
    typeof Notification === 'undefined' ? 'default' : Notification.permission,
  );
  const [swReady, setSwReady] = useState<boolean>(false);
  const [fcmSupported, setFcmSupported] = useState<boolean>(false);

  // ── 환경 판별 ────────────────────────────────────────────────────────────────
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iP(hone|ad|od)/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isMac = /Mac OS X/.test(ua) && !isIOS;
  const isWindows = /Windows NT/.test(ua);
  const isChrome = /Chrome\/\d+/.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua);
  const isEdge = /Edg\//.test(ua);
  const isFirefox = /Firefox\/\d+/.test(ua);
  const isSafari = /Safari\/\d+/.test(ua) && !isChrome && !isEdge;

  const displayModeStandalone = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    );
  }, []);

  // ── 초기 상태 갱신 ─────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      const hasSW = 'serviceWorker' in navigator;
      if (!hasSW) {
        if (mounted) setSwReady(false);
      } else {
        try {
          // ready까지 확인되면 true
          await navigator.serviceWorker.ready;
          if (mounted) setSwReady(true);
        } catch {
          if (mounted) setSwReady(false);
        }
      }

      try {
        const msg = await getMessagingIfSupported();
        if (mounted) setFcmSupported(!!msg);
      } catch {
        if (mounted) setFcmSupported(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ── 표 상단 진단 정보 (모두 "사용"해서 경고 제거) ───────────────────────────
  const osLabel = isIOS
    ? 'iOS'
    : isAndroid
      ? 'Android'
      : isMac
        ? 'macOS'
        : isWindows
          ? 'Windows'
          : 'Unknown';

  const browserLabel = isChrome
    ? 'Chrome'
    : isEdge
      ? 'Edge'
      : isFirefox
        ? 'Firefox'
        : isSafari
          ? 'Safari'
          : 'Unknown';

  const checks: CheckRow[] = [
    { label: 'OS', value: osLabel },
    { label: 'Browser', value: browserLabel },
    {
      label: 'PWA 설치(Standalone)',
      value: displayModeStandalone ? 'Yes' : 'No',
      warn: !displayModeStandalone && (isIOS || isAndroid),
    },
    { label: 'Service Worker ready', value: swReady },
    { label: 'Push API 지원', value: 'PushManager' in window },
    { label: 'FCM 사용 가능', value: fcmSupported },
    { label: '알림 권한(Notification.permission)', value: perm },
  ];

  // ── 액션 ───────────────────────────────────────────────────────────────────
  const requestPermission = async () => {
    if (typeof Notification === 'undefined') {
      alert('이 브라우저는 Notification API를 지원하지 않아요.');
      return;
    }
    const res = await Notification.requestPermission();
    setPerm(res);
  };

  const subscribe = async () => {
    const t = await issueFcmTokenWithVapid();
    if (!t) {
      alert('토큰 발급 실패. 브라우저/권한/환경변수를 확인하세요.');
      return;
    }
    setToken(t);
    navigator.clipboard?.writeText(t).catch(() => {});
    alert('구독 완료! (토큰을 클립보드에 복사했어요)');
  };

  const unsubscribe = async () => {
    await deleteFcmToken();
    setToken(null);
    alert('구독 해지 완료!');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>알림 사용 가이드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 즉시 진단 & 액션 */}
          <Section title="1) 환경 진단 & 빠른 액션">
            <div className="grid sm:grid-cols-2 gap-3">
              {checks.map((c) => (
                <div
                  key={c.label}
                  className={`flex justify-between rounded border p-2 ${c.warn ? 'border-yellow-500' : 'mobile-card'}`}
                >
                  <span className="font-medium">{c.label}</span>
                  <span className="text-muted-foreground">{String(c.value)}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-3">
              <Button onClick={requestPermission}>알림 권한 요청</Button>
              <Button variant="secondary" onClick={subscribe}>
                구독(FCM 토큰 발급)
              </Button>
              <Button variant="outline" onClick={unsubscribe}>
                구독 해지
              </Button>
            </div>

            {token && (
              <div className="mt-3 text-xs break-all bg-muted p-2 rounded">
                <div className="font-semibold">FCM Token</div>
                <div className="opacity-80">{token}</div>
              </div>
            )}
          </Section>

          {/* 플랫폼별 가이드 */}
          <Section title="2) 플랫폼별 설정 가이드">
            <div className="space-y-4">
              {/* iOS (Safari & Home Screen) */}
              <div id="ios" className="space-y-2">
                <h4 className="font-semibold">iOS (Safari / 홈 화면 추가)</h4>
                <ol className="list-decimal ml-5 space-y-1 text-sm">
                  <li>
                    Safari로 사이트 접속 → 공유(⬆️) 버튼 → <b>홈 화면에 추가</b>.
                  </li>
                  <li>
                    홈 화면 앱으로 실행 → 첫 실행 시 <b>알림 허용</b> 수락.
                  </li>
                  <li>
                    설정 &gt; 알림 &gt; 해당 앱에서 <b>알림 허용</b> 확인.
                  </li>
                  <li>
                    앱 실행 후 이 페이지에서 <b>알림 권한 요청</b> → <b>구독</b>.
                  </li>
                </ol>
                <p className="text-xs text-muted-foreground">
                  ※ iOS는 Safari 기반 PWA에서만 푸시가 동작합니다(홈 화면 추가 필요).
                </p>
              </div>

              {/* Android (Chrome) */}
              <div id="android" className="space-y-2">
                <h4 className="font-semibold">Android (Chrome)</h4>
                <ol className="list-decimal ml-5 space-y-1 text-sm">
                  <li>
                    주소창 메뉴 → <b>앱 설치</b> 또는 <b>홈 화면에 추가</b>.
                  </li>
                  <li>앱 실행 → 첫 실행 시 알림 권한 허용.</li>
                  <li>
                    이 페이지에서 <b>알림 권한 요청</b> → <b>구독</b>.
                  </li>
                </ol>
              </div>

              {/* macOS */}
              <div id="mac" className="space-y-2">
                <h4 className="font-semibold">macOS</h4>
                <p className="text-sm">지원 브라우저: Safari, Chrome, Edge, Firefox(최신)</p>
                <ol className="list-decimal ml-5 space-y-1 text-sm">
                  <li>
                    브라우저 사이트 권한에서 <b>알림 허용</b>.
                  </li>
                  <li>시스템 설정 &gt; 알림에서 해당 브라우저 알림 허용 확인.</li>
                  <li>
                    이 페이지에서 <b>알림 권한 요청</b> → <b>구독</b>.
                  </li>
                </ol>
              </div>

              {/* Windows */}
              <div id="windows" className="space-y-2">
                <h4 className="font-semibold">Windows</h4>
                <p className="text-sm">지원 브라우저: Chrome, Edge, Firefox(최신)</p>
                <ol className="list-decimal ml-5 space-y-1 text-sm">
                  <li>
                    브라우저 사이트 권한에서 <b>알림 허용</b>.
                  </li>
                  <li>Windows 설정 &gt; 시스템 &gt; 알림에서 브라우저 알림 허용.</li>
                  <li>
                    이 페이지에서 <b>알림 권한 요청</b> → <b>구독</b>.
                  </li>
                </ol>
              </div>

              {/* Chrome/Edge 공통 팁 */}
              <div id="chrome" className="space-y-2">
                <h4 className="font-semibold">Chrome / Edge</h4>
                <ul className="list-disc ml-5 space-y-1 text-sm">
                  <li>
                    주소창 자물쇠 아이콘 &gt; 사이트 설정 &gt; <b>알림 허용</b>.
                  </li>
                  <li>PWA(앱 설치) 상태에서도 정상 동작.</li>
                </ul>
              </div>

              {/* Safari */}
              <div id="safari" className="space-y-2">
                <h4 className="font-semibold">Safari</h4>
                <ul className="list-disc ml-5 space-y-1 text-sm">
                  <li>macOS: Safari &gt; 설정 &gt; 웹 사이트 &gt; 알림에서 허용.</li>
                  <li>
                    iOS: 반드시 <b>홈 화면에 추가한 PWA</b>에서만 웹푸시 가능.
                  </li>
                </ul>
              </div>

              {/* Firefox */}
              <div id="firefox" className="space-y-2">
                <h4 className="font-semibold">Firefox</h4>
                <ul className="list-disc ml-5 space-y-1 text-sm">
                  <li>설정 &gt; 개인정보 및 보안 &gt; 권한 &gt; 알림 &gt; 예외 관리.</li>
                  <li>버전에 따라 PWA 설치/푸시 지원 여부가 다를 수 있음.</li>
                </ul>
              </div>
            </div>
          </Section>

          {/* 문제 해결 */}
          <Section title="3) 문제 해결">
            <ul className="list-disc ml-5 space-y-1 text-sm">
              <li>
                <b>권한이 granted인데 수신이 안 됨</b>: 서비스워커 재등록(앱 재실행), 토큰
                재발급(구독→해지→구독).
              </li>
              <li>
                <b>iOS 푸시 미수신</b>: 반드시 홈 화면에 추가한 PWA에서 테스트.
              </li>
              <li>
                <b>FCM 토큰 null</b>: .env(VAPID, projectId 등) 확인 & HTTPS + 올바른 SW
                경로(`/firebase-messaging-sw.js`).
              </li>
            </ul>
          </Section>
        </CardContent>
      </Card>
    </div>
  );
}
