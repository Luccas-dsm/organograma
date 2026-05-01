import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';

export enum ProductCategory {
  MANTIMENTOS = 'Mantimentos',
  OBJETOS = 'Objetos',
  LIMPEZA = 'Limpeza',
  HIGIENE = 'Higiene',
  OUTROS = 'Outros',
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsEnum(ProductCategory)
  category: ProductCategory;

  @IsNumber()
  @Min(0)
  current_stock: number;

  @IsNumber()
  @Min(0)
  min_stock: number;

  @IsNumber()
  @Min(0)
  average_price: number;

  @IsOptional()
  @IsString()
  image_url?: string;
}
