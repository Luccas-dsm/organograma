import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ImageDiscoveryService } from './image-discovery.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';

@Controller('images')
@UseGuards(FirebaseAuthGuard)
export class ImageDiscoveryController {
  constructor(private readonly imageDiscoveryService: ImageDiscoveryService) {}

  @Get('search')
  findImage(
    @Query('name') name: string,
    @Query('category') category: string,
  ) {
    return this.imageDiscoveryService
      .findProductImage(name, category)
      .then((url) => ({ url }));
  }
}
