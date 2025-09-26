import { IsOptional, IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';

export class MarketSearchDto {
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
  category?: number | '전체';

  @IsOptional()
  @IsNumber()
  subCategory?: number | '전체';

  @IsOptional()
  @IsString()
  sort?: string = 'GRADE';

  @IsOptional()
  @IsString()
  sortCondition?: 'ASC' | 'DESC' = 'ASC';

  @IsOptional()
  @IsNumber()
  pageNo?: number = 1;
}
