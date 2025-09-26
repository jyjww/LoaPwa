export type AlertCandidate = {
  active: boolean;
  isAlerted: boolean; // 알림 설정 on/off
  lastNotifiedAt?: Date | null;
  previousPrice?: number | null;
  currentPrice: number;
  targetPrice?: number | null;
};

export type AlertOptions = {
  cooldownMs?: number; // 기본 30분
  crossingOnly?: boolean; // 재하락(크로싱)만 허용할지
  now?: Date; // 테스트용 주입
};

export function shouldTriggerAlert(fav: AlertCandidate, opts: AlertOptions = {}): boolean {
  const { cooldownMs = 30 * 60 * 1000, crossingOnly = false, now = new Date() } = opts;

  if (!fav.active || !fav.isAlerted) return false;

  if (fav.lastNotifiedAt) {
    const elapsed = now.getTime() - new Date(fav.lastNotifiedAt).getTime();
    if (elapsed < cooldownMs) return false;
  }

  const hasTarget = typeof fav.targetPrice === 'number' && !Number.isNaN(fav.targetPrice);
  const hitTarget =
    hasTarget &&
    typeof fav.currentPrice === 'number' &&
    fav.currentPrice <= (fav.targetPrice as number);

  const hasPrev = typeof fav.previousPrice === 'number' && !Number.isNaN(fav.previousPrice);
  const bigDrop =
    hasPrev &&
    typeof fav.currentPrice === 'number' &&
    fav.currentPrice <= (fav.previousPrice as number) * 0.8;

  if (!hitTarget && !bigDrop) return false;

  if (crossingOnly && hasPrev && hasTarget && hitTarget) {
    const wasAbove = (fav.previousPrice as number) > (fav.targetPrice as number);
    const nowBelowOrEqual = fav.currentPrice <= (fav.targetPrice as number);
    if (!(wasAbove && nowBelowOrEqual)) return false;
  }

  return true;
}
