import { IsOptional, IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class EtcOptionDto {
  @IsString()
  type: string;

  @IsOptional()
  @IsNumber()
  value: number | null;

  @IsOptional()
  @IsNumber()
  minValue?: number | null;

  @IsOptional()
  @IsNumber()
  maxValue?: number | null;
}

export class AuctionSearchDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsNumber()
  tier?: number;

  @IsOptional()
  @IsString()
  className?: string;

  @IsOptional()
  @IsNumber()
  category?: number;

  @IsOptional()
  @IsString()
  subCategory?: string | number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EtcOptionDto)
  etcOptions?: EtcOptionDto[];

  @IsOptional()
  @IsNumber()
  pageNo?: number = 1;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsString()
  sortCondition?: 'ASC' | 'DESC';
}
