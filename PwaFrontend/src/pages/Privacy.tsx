import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Navigation from '@/components/Navigation';

export default function Privacy() {
  return (
    <div className="p-4 bg-background">
      <div className="max-w-3xl mx-auto">
        <Navigation />

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">개인정보 처리방침 (익명 사용자)</h1>
          <p className="text-muted-foreground">
            LostArk PWA는 로그인 없이도 이용 가능한 익명(임시) 사용자 기능을 제공합니다.
          </p>
        </div>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>수집하는 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>필수</strong>: 익명 사용자 ID(UUID), 생성일시, 마지막 활동일시
            </p>
            <p>
              <strong>선택(푸시 알림 사용 시)</strong>: FCM 토큰, 브라우저 정보(User-Agent)
            </p>
            <p>※ 이메일/이름 등 개인 식별 정보는 저장하지 않습니다.</p>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>이용 목적</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>즐겨찾기 저장 및 가격 알림 제공을 위한 식별과 동기화에 사용됩니다.</p>
            <p className="text-xs">
              (*선택) 비정상 요청 방지 등 서비스 안정성을 위해 최소한의 익명 메트릭을 사용할 수
              있습니다.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>보관 및 삭제</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>30일 이상 활동이 없는 익명 사용자 정보는 자동으로 삭제됩니다.</p>
            <p>브라우저의 쿠키/로컬스토리지를 삭제하면 즉시 무효화됩니다.</p>
            <p className="text-xs">쿠키 만료: 1년</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
