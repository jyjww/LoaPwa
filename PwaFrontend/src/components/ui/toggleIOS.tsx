import clsx from 'clsx';

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
};

export default function ToggleIOS({ checked, onChange, label, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={clsx(
        'group inline-flex w-full items-center justify-between gap-3 rounded-xl',
        'bg-muted/60 px-3 py-2 border border-border/50',
        disabled && 'opacity-60 cursor-not-allowed',
      )}
    >
      <span className="text-sm">{label ?? '알림 허용'}</span>

      {/* 트랙 */}
      <span
        className={clsx(
          'relative h-6 w-11 rounded-full transition-colors duration-200',
          checked ? 'bg-[var(--color-accent)]' : 'bg-muted-foreground/30',
        )}
      >
        {/* 노브: 좌우는 left/right로 고정, 세로만 translateY로 정중앙 */}
        <span
          className={clsx(
            'absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white shadow',
            'transition-all duration-200',
            checked ? 'right-0.5' : 'left-0.5', // ← 여기만 토글
          )}
        />
      </span>
    </button>
  );
}
