import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ConversationService } from './conversation.service';
import { CustomerJwtGuard } from './guards/customer-jwt.guard';
import { CurrentCustomer } from './decorators/customer.decorators';
import type { CustomerJwtPayload } from './guards/customer-jwt.guard';
import { Public } from '../auth/decorators/auth.decorators';

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/3gp', 'video/mov', 'video/avi', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/webm'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
  ],
};

@Public()
@UseGuards(CustomerJwtGuard)
@Controller('customers')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get('me/sessions/:sessionId/conversations')
  async getConversations(
    @CurrentCustomer() customer: CustomerJwtPayload,
    @Param('sessionId') sessionId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.conversationService.getConversations(customer.sub, sessionId, limit, offset);
  }

  @Get('me/sessions/:sessionId/conversations/:chatId/messages')
  async getMessages(
    @CurrentCustomer() customer: CustomerJwtPayload,
    @Param('sessionId') sessionId: string,
    @Param('chatId') chatId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.conversationService.getMessages(customer.sub, sessionId, chatId, limit, offset);
  }

  @Post('me/sessions/:sessionId/conversations/:chatId/send/text')
  async sendText(
    @CurrentCustomer() customer: CustomerJwtPayload,
    @Param('sessionId') sessionId: string,
    @Param('chatId') chatId: string,
    @Body() body: { text: string },
  ) {
    return this.conversationService.sendMessage(customer.sub, sessionId, chatId, 'text', { text: body.text });
  }

  @Post('me/sessions/:sessionId/conversations/:chatId/send/image')
  async sendImage(
    @CurrentCustomer() customer: CustomerJwtPayload,
    @Param('sessionId') sessionId: string,
    @Param('chatId') chatId: string,
    @Body() body: { url?: string; base64?: string; mimetype?: string; caption?: string },
  ) {
    return this.conversationService.sendMessage(customer.sub, sessionId, chatId, 'image', body);
  }

  @Post('me/sessions/:sessionId/conversations/:chatId/send/video')
  async sendVideo(
    @CurrentCustomer() customer: CustomerJwtPayload,
    @Param('sessionId') sessionId: string,
    @Param('chatId') chatId: string,
    @Body() body: { url?: string; base64?: string; mimetype?: string; caption?: string },
  ) {
    return this.conversationService.sendMessage(customer.sub, sessionId, chatId, 'video', body);
  }

  @Post('me/sessions/:sessionId/conversations/:chatId/send/audio')
  async sendAudio(
    @CurrentCustomer() customer: CustomerJwtPayload,
    @Param('sessionId') sessionId: string,
    @Param('chatId') chatId: string,
    @Body() body: { url?: string; base64?: string; mimetype?: string },
  ) {
    return this.conversationService.sendMessage(customer.sub, sessionId, chatId, 'audio', body);
  }

  @Post('me/sessions/:sessionId/conversations/:chatId/send/document')
  async sendDocument(
    @CurrentCustomer() customer: CustomerJwtPayload,
    @Param('sessionId') sessionId: string,
    @Param('chatId') chatId: string,
    @Body() body: { url?: string; base64?: string; mimetype?: string; filename?: string },
  ) {
    return this.conversationService.sendMessage(customer.sub, sessionId, chatId, 'document', body);
  }

  @Post('me/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './data/uploads',
        filename: (
          _req: Express.Request,
          file: Express.Multer.File,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 64 * 1024 * 1024 }, // 64MB
      fileFilter: (
        _req: Express.Request,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        const allAllowed = Object.values(ALLOWED_MIME_TYPES).flat();
        if (allAllowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
        }
      },
    }),
  )
  async uploadMedia(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    const mediaType = Object.entries(ALLOWED_MIME_TYPES).find(([, mimes]) =>
      mimes.includes(file.mimetype),
    )?.[0] || 'document';

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 2785}`;
    const url = `${baseUrl}/api/customers/media/${file.filename}`;

    return {
      url,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      type: mediaType,
    };
  }

  @Get('media/:filename')
  async serveMedia(@Param('filename') filename: string) {
    return join(process.cwd(), 'data', 'uploads', filename);
  }
}
