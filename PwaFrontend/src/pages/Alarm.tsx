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
  const [enabled, setEnabled] = useState(defaultIsAlerted);
  const [price, setPrice] = useState(defaultTargetPrice);

  useEffect(() => {
    setEnabled(defaultIsAlerted);
  }, [defaultIsAlerted]);
  useEffect(() => {
    setPrice(defaultTargetPrice);
  }, [defaultTargetPrice]);

  const handleSave = async () => {
    try {
      await updateFavoriteAlarm(favoriteId, {
        isAlerted: enabled,
        targetPrice: price,
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="알림 설정"
          className={[
            'p-0 sm:p-0 shrink-0 items-start justify-end',
            'bg-transparent hover:bg-transparent focus-visible:ring-0',
            '[&_svg]:!h-5 [&_svg]:!w-5', // 아이콘 크기統一
            'group/bell', // 독립 hover 그룹명
          ].join(' ')}
        >
          <Bell
            className={[
              'transition-all duration-150',
              enabled
                ? // ✅ 켜짐: 항상 강조색 + 채움
                  'text-[var(--color-accent)] [fill:currentColor] [stroke:none]'
                : // ⬇︎ 꺼짐: 흐림 + hover 시만 강조
                  'text-muted-foreground group-hover/bell:text-[var(--color-accent)] group-hover/bell:[fill:currentColor] group-hover/bell:[stroke:none]',
            ].join(' ')}
          />
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>알림 설정</AlertDialogTitle>
          <AlertDialogDescription aria-describedby="alarm">
            즐겨찾기 항목에 대한 가격 알림을 켜거나 끌 수 있고, 목표 가격을 지정할 수 있습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>

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
