import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  Mantimentos: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
  Objetos: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
  Limpeza: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400',
  Higiene: 'https://images.unsplash.com/photo-1612831455359-970e23a1e4e9?w=400',
  Outros: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400',
};

@Injectable()
export class ImageDiscoveryService {
  private readonly logger = new Logger(ImageDiscoveryService.name);
  private readonly unsplashUrl = 'https://api.unsplash.com/search/photos';

  constructor(private readonly configService: ConfigService) {}

  async findProductImage(cleanName: string, category: string): Promise<string> {
    const accessKey = this.configService.get<string>('UNSPLASH_ACCESS_KEY');

    if (!accessKey) {
      this.logger.warn('UNSPLASH_ACCESS_KEY not set – using category fallback image');
      return CATEGORY_FALLBACK_IMAGES[category] ?? CATEGORY_FALLBACK_IMAGES['Outros'];
    }

    try {
      const query = encodeURIComponent(cleanName);
      const url = `${this.unsplashUrl}?query=${query}&per_page=1&orientation=squarish`;
      const response = await fetch(url, {
        headers: { Authorization: `Client-ID ${accessKey}` },
      });

      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const imageUrl: string | undefined = data?.results?.[0]?.urls?.small;

      if (imageUrl) {
        this.logger.log(`Image found for "${cleanName}": ${imageUrl}`);
        return imageUrl;
      }
    } catch (e) {
      this.logger.warn(`Failed to fetch image for "${cleanName}": ${e}`);
    }

    return CATEGORY_FALLBACK_IMAGES[category] ?? CATEGORY_FALLBACK_IMAGES['Outros'];
  }
}
