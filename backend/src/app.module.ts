import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OcrModule } from './modules/ocr/ocr.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ImageDiscoveryModule } from './modules/image-discovery/image-discovery.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    OcrModule,
    InventoryModule,
    ImageDiscoveryModule,
  ],
})
export class AppModule {}
