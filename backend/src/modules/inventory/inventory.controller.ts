import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateProductDto } from './dto/create-product.dto';
import { SavePurchaseDto } from './dto/save-purchase.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';

@Controller('inventory')
@UseGuards(FirebaseAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('products')
  getAllProducts() {
    return this.inventoryService.getAllProducts();
  }

  @Get('products/:id')
  getProduct(@Param('id') id: string) {
    return this.inventoryService.getProductById(id);
  }

  @Post('products')
  createProduct(@Body() dto: CreateProductDto) {
    return this.inventoryService.createProduct(dto);
  }

  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: Partial<CreateProductDto>) {
    return this.inventoryService.updateProduct(id, dto);
  }

  @Patch('products/:id/deduct')
  deductStock(@Param('id') id: string, @Body('qty') qty: number) {
    return this.inventoryService.deductStock(id, qty ?? 1);
  }

  @Post('purchases')
  savePurchase(@Body() dto: SavePurchaseDto) {
    return this.inventoryService.savePurchase(dto);
  }

  @Get('purchases')
  getPurchasesByMonth(
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.inventoryService.getPurchasesByMonth(year, month);
  }
}
