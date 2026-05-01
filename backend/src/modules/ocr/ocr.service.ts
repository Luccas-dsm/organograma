import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProcessedReceiptDto } from './dto/process-receipt.dto';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly groqApiUrl = 'https://api.groq.com/openai/v1/chat/completions';

  constructor(private readonly configService: ConfigService) {}

  async processReceiptImage(imageBuffer: Buffer, mimeType: string): Promise<ProcessedReceiptDto> {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      throw new BadRequestException('GROQ_API_KEY not configured');
    }

    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const prompt = `Extraia os dados deste cupom fiscal. Retorne um JSON estritamente estruturado: { "market": string, "items": [{ "raw_name": string, "clean_name": string, "qty": number, "unit_price": number, "category": string }] }.
Regras: 'Mantimentos' para comida, 'Objetos' para utensílios, 'Limpeza' para químicos. Caso contrário, 'Outros'.`;

    const payload = {
      model: 'llama-3.2-11b-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: dataUrl },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2048,
    };

    this.logger.log(`Sending image to Groq API (${Math.round(imageBuffer.length / 1024)} KB)`);

    const response = await fetch(this.groqApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Groq API error: ${response.status} - ${error}`);
      throw new BadRequestException(`Groq API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new BadRequestException('Empty response from Groq API');
    }

    try {
      const parsed = JSON.parse(content) as ProcessedReceiptDto;
      this.logger.log(`Receipt parsed: market="${parsed.market}", items=${parsed.items?.length ?? 0}`);
      return parsed;
    } catch (e) {
      this.logger.error(`Failed to parse Groq response as JSON: ${content}`);
      throw new BadRequestException('Groq response is not valid JSON');
    }
  }
}
