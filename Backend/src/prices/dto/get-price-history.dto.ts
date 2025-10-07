import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetPriceHistoryDto {
  /**
   * 버킷 단위 (집계 해상도)
   * - minute(분), hour(시간), day(일) 중 하나
   */
  @IsOptional()
  @IsIn(['minute', 'hour', 'day'])
  bucket: 'minute' | 'hour' | 'day' = 'hour';

  /**
   * 몇 일 전부터 조회할지 (기본 7일)
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
