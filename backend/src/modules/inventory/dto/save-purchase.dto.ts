import { IsString, IsNumber, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseItemDto {
  @IsString()
  product_id: string;

  @IsNumber()
  qty: number;

  @IsNumber()
  price: number;
}

export class SavePurchaseDto {
  @IsString()
  origin: string;

  @IsNumber()
  total_value: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];

  @IsOptional()
  @IsString()
  date?: string;
}
