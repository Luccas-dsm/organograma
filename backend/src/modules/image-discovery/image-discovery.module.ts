import { Module } from '@nestjs/common';
import { ImageDiscoveryController } from './image-discovery.controller';
import { ImageDiscoveryService } from './image-discovery.service';

@Module({
  controllers: [ImageDiscoveryController],
  providers: [ImageDiscoveryService],
  exports: [ImageDiscoveryService],
})
export class ImageDiscoveryModule {}
