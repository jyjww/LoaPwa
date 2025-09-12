// src/favorites/dto/create-favorite.dto.ts
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateFavoriteDto {
  @IsEnum(['auction', 'market'] as const)
  source: 'auction' | 'market';

  // 식별자
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => (value === null ? undefined : value))
  @IsNumber()
  itemId?: number | null;

  @IsOptional()
  @IsString()
  matchKey?: string;

  // 공통
  @IsString()
  name: string;

  @IsString()
  grade: string;

  @IsString()
  icon: string;

  @IsOptional()
  @IsNumber()
  currentPrice?: number;

  @IsOptional()
  @IsNumber()
  previousPrice?: number;

  @IsOptional()
  @IsNumber()
  targetPrice?: number;

  // 선택(경매장)
  @IsOptional()
  @IsNumber()
  tier?: number;

  @IsOptional()
  @IsNumber()
  quality?: number;

  @IsOptional()
  auctionInfo?: any;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: false })
  @Type(() => Object)
  options?: { name: string; value: number; displayValue: number }[];

  // 선택(거래소)
  @IsOptional()
  marketInfo?: {
    currentMinPrice?: number;
    yDayAvgPrice?: number;
    recentPrice?: number;
    tradeRemainCount?: number;
  };
}
