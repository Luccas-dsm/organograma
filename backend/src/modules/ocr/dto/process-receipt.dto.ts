export class ProcessedReceiptItemDto {
  raw_name: string;
  clean_name: string;
  qty: number;
  unit_price: number;
  category: string;
}

export class ProcessedReceiptDto {
  market: string;
  items: ProcessedReceiptItemDto[];
}
