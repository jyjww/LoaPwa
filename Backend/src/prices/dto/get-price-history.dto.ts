import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetPriceHistoryDto {
  /**
   * 간편 범위 파라미터 (Cache Audit Kit 용)
   * - '24h': 최근 24시간 (bucket=hour, days=1)
   * - '7d': 최근 7일 (bucket=hour, days=7)
   * - range가 지정되면 bucket/days는 무시됨
   */
  @IsOptional()
  @IsIn(['24h', '7d'])
  range?: '24h' | '7d';

  /**
   * 버킷 단위 (집계 해상도)
   * - minute(분), hour(시간), day(일) 중 하나
   * - range가 지정되면 무시됨
   */
  @IsOptional()
  @IsIn(['minute', 'hour', 'day'])
  bucket: 'minute' | 'hour' | 'day' = 'hour';

  /**
   * 몇 일 전부터 조회할지 (기본 7일)
   * - range가 지정되면 무시됨
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days: number = 7;

  /**
   * minute 버킷일 때, 몇 분 단위로 묶을지 (옵션)
   * - 예: 5 -> 5분 버킷
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minuteStep?: number;

  /**
   * hour 버킷일 때, 몇 시간 단위로 묶을지 (옵션)
   * - 예: 3 -> 3시간 버킷
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  hourStep?: number;
}
