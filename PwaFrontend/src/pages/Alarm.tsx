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
import { useState } from 'react';
import { updateFavoriteAlarm } from '@/services/favorites/favorites.service';

interface AlarmProps {
  favoriteId: string;
  defaultTargetPrice?: number;
  defaultIsAlerted?: boolean;
}

const Alarm = ({ favoriteId, defaultTargetPrice = 0, defaultIsAlerted = false }: AlarmProps) => {
  const [enabled, setEnabled] = useState(defaultIsAlerted);
  const [price, setPrice] = useState(defaultTargetPrice);

  const handleSave = async () => {
    try {
      await updateFavoriteAlarm(favoriteId, {
        isAlerted: enabled,
        targetPrice: price,
      });
      console.log('✅ 알림 설정 저장 완료');
    } catch (err) {
      console.error('❌ 알림 설정 실패:', err);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-2">
          <Bell className="h-4 w-4 mr-1" />
          알림 설정
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>알림 설정</AlertDialogTitle>
          <AlertDialogDescription>
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
