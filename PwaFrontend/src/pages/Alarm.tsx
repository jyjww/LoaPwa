import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
import { updateFavoriteAlarm } from '@/services/favorites/favorites.service';

interface AlarmProps {
  favoriteId: string;
  defaultTargetPrice?: number;
  defaultIsAlerted?: boolean;
  isFavorite: boolean;
}

const Alarm = ({ favoriteId, defaultTargetPrice = 0, defaultIsAlerted = false }: AlarmProps) => {
  const [open, setOpen] = useState(false);

  const [enabled, setEnabled] = useState(defaultIsAlerted);
  const [price, setPrice] = useState(defaultTargetPrice);

  useEffect(() => setEnabled(defaultIsAlerted), [defaultIsAlerted]);
  useEffect(() => setPrice(defaultTargetPrice), [defaultTargetPrice]);

  const handleSave = async () => {
    try {
      await updateFavoriteAlarm(favoriteId, { isAlerted: enabled, targetPrice: price });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="알림 설정"
          className={[
            'p-0 sm:p-0 shrink-0 items-start justify-end',
            'bg-transparent hover:bg-transparent focus-visible:ring-0',
            '[&_svg]:!h-5 [&_svg]:!w-5',
            'group/bell',
          ].join(' ')}
        >
          <Bell
            className={[
              'transition-all duration-150',
              enabled
                ? 'text-[var(--color-accent)] [fill:currentColor] [stroke:none]'
                : 'text-muted-foreground group-hover/bell:text-[var(--color-accent)] group-hover/bell:[fill:currentColor] group-hover/bell:[stroke:none]',
            ].join(' ')}
          />
        </Button>
      </AlertDialogTrigger>

      {/* ✅ aria-describedby를 Content에, Description에는 id를 부여 */}
      <AlertDialogContent aria-describedby="alarm-desc">
        {/* ✅ 헤더를 좌우 정렬로 바꾸고, 우측에 톱니 버튼 배치 */}
        <AlertDialogHeader className="flex items-center justify-between gap-2">
          <AlertDialogTitle>알림 설정</AlertDialogTitle>
        </AlertDialogHeader>

        <AlertDialogDescription id="alarm-desc">
          즐겨찾기 항목에 대한 가격 알림을 켜거나 끌 수 있고, 목표 가격을 지정할 수 있습니다.
        </AlertDialogDescription>

        {/* 🔹 알림 조건 UI */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enableAlerts"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <label htmlFor="enableAlerts">알림 활성화</label>
          </div>
          <div>
            <label className="block mb-1 text-sm text-muted-foreground">목표 가격</label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              placeholder="예: 5000"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={handleSave}>저장</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default Alarm;
