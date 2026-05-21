import { Injectable, NotFoundException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CustomerService } from './customer.service';
import { SessionService } from '../session/session.service';
import { createLogger } from '../../common/services/logger.service';
import { MediaInput } from '../../engine/interfaces/whatsapp-engine.interface';

export interface ConversationRow {
  id: string;
  customer_session_id: string;
  chat_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  last_message_body: string | null;
  last_message_at: string | null;
  last_message_type: string;
  unread_count: number;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  customer_session_id: string;
  wa_message_id: string | null;
  direction: 'incoming' | 'outgoing';
  body: string | null;
  type: string;
  media_url: string | null;
  media_filename: string | null;
  media_mimetype: string | null;
  timestamp: number | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

@Injectable()
export class ConversationService {
  private readonly logger = createLogger('ConversationService');
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly customerService: CustomerService,
    private readonly sessionService: SessionService,
  ) {
    this.supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    );
  }

  async getConversations(
    customerId: string,
    sessionId: string,
    limit = 50,
    offset = 0,
  ): Promise<{ conversations: ConversationRow[]; total: number }> {
    const session = await this.customerService.getSession(customerId, sessionId);

    const { data, error, count } = await this.supabase
      .from('conversations')
      .select('*', { count: 'exact' })
      .eq('customer_session_id', session.id)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (error) {
      this.logger.error('Failed to fetch conversations', error.message);
      throw new Error(error.message);
    }

    return { conversations: (data as ConversationRow[]) || [], total: count || 0 };
  }

  async getMessages(
    customerId: string,
    sessionId: string,
    chatId: string,
    limit = 50,
    offset = 0,
  ): Promise<{ messages: MessageRow[]; total: number }> {
    const session = await this.customerService.getSession(customerId, sessionId);

    // Get or create conversation
    const conv = await this.upsertConversation(session.id, chatId, null, null);

    // Mark as read
    await this.supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', conv.id);

    const { data, error, count } = await this.supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('conversation_id', conv.id)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      this.logger.error('Failed to fetch messages', error.message);
      throw new Error(error.message);
    }

    return { messages: (data as MessageRow[]) || [], total: count || 0 };
  }

  async sendMessage(
    customerId: string,
    sessionId: string,
    chatId: string,
    type: string,
    payload: {
      text?: string;
      url?: string;
      base64?: string;
      mimetype?: string;
      filename?: string;
      caption?: string;
    },
  ): Promise<{ messageId: string; timestamp: number }> {
    const session = await this.customerService.getSession(customerId, sessionId);
    const engine = this.sessionService.getEngine(session.openwaSessionId);

    if (!engine) {
      throw new NotFoundException('WhatsApp session is not active. Please connect first.');
    }

    let result: { id: string; timestamp: number };

    if (type === 'text') {
      result = await engine.sendTextMessage(chatId, payload.text || '');
    } else {
      const media: MediaInput = {
        mimetype: payload.mimetype || 'application/octet-stream',
        data: payload.url || payload.base64 || '',
        filename: payload.filename,
        caption: payload.caption,
      };

      switch (type) {
        case 'image':
          result = await engine.sendImageMessage(chatId, media);
          break;
        case 'video':
          result = await engine.sendVideoMessage(chatId, media);
          break;
        case 'audio':
          result = await engine.sendAudioMessage(chatId, media);
          break;
        case 'document':
          result = await engine.sendDocumentMessage(chatId, media);
          break;
        default:
          result = await engine.sendTextMessage(chatId, payload.text || '');
      }
    }

    // Persist outgoing message
    const conv = await this.upsertConversation(session.id, chatId, null, null);
    const msgBody = payload.text || payload.caption || payload.filename || '';

    await this.supabase.from('messages').insert({
      conversation_id: conv.id,
      customer_session_id: session.id,
      wa_message_id: result.id,
      direction: 'outgoing',
      body: msgBody,
      type,
      media_url: payload.url || null,
      media_filename: payload.filename || null,
      media_mimetype: payload.mimetype || null,
      timestamp: result.timestamp,
      status: 'sent',
      metadata: {},
    });

    await this.supabase
      .from('conversations')
      .update({
        last_message_body: msgBody,
        last_message_at: new Date(result.timestamp * 1000).toISOString(),
        last_message_type: type,
      })
      .eq('id', conv.id);

    return { messageId: result.id, timestamp: result.timestamp };
  }

  async handleIncomingMessage(
    openwaSessionId: string,
    message: Record<string, unknown>,
  ): Promise<void> {
    const session = await this.customerService.getSessionByOpenwaId(openwaSessionId);
    if (!session) return;

    const chatId = (message.from as string) || (message.chatId as string);
    if (!chatId) return;

    const contactName = (message.pushName as string) || null;
    const contactPhone = chatId.replace('@c.us', '').replace('@g.us', '');

    const conv = await this.upsertConversation(session.id, chatId, contactName, contactPhone);

    const body = (message.body as string) || null;
    const type = (message.type as string) || 'text';
    const waMessageId = (message.id as string) || null;
    const timestamp = (message.timestamp as number) || Math.floor(Date.now() / 1000);

    const metadata: Record<string, unknown> = {};
    if (message.quotedMsg) metadata.quotedMsg = message.quotedMsg;
    if (message.hasMedia) metadata.hasMedia = true;

    // Upsert to avoid duplicates
    await this.supabase.from('messages').upsert(
      {
        conversation_id: conv.id,
        customer_session_id: session.id,
        wa_message_id: waMessageId,
        direction: 'incoming',
        body,
        type,
        timestamp,
        status: 'delivered',
        metadata,
      },
      { onConflict: 'customer_session_id,wa_message_id', ignoreDuplicates: true },
    );

    // Update conversation summary
    const preview = this.buildPreview(type, body);
    await this.supabase
      .from('conversations')
      .update({
        contact_name: contactName || conv.contact_name,
        contact_phone: contactPhone || conv.contact_phone,
        last_message_body: preview,
        last_message_at: new Date(timestamp * 1000).toISOString(),
        last_message_type: type,
        unread_count: (conv.unread_count || 0) + 1,
      })
      .eq('id', conv.id);
  }

  private async upsertConversation(
    customerSessionId: string,
    chatId: string,
    contactName: string | null,
    contactPhone: string | null,
  ): Promise<ConversationRow> {
    const { data: existing } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('customer_session_id', customerSessionId)
      .eq('chat_id', chatId)
      .maybeSingle();

    if (existing) return existing as ConversationRow;

    const { data, error } = await this.supabase
      .from('conversations')
      .insert({
        customer_session_id: customerSessionId,
        chat_id: chatId,
        contact_name: contactName,
        contact_phone: contactPhone || chatId.replace('@c.us', ''),
        unread_count: 0,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create conversation: ${error.message}`);
    return data as ConversationRow;
  }

  private buildPreview(type: string, body: string | null): string {
    if (body) return body.substring(0, 100);
    switch (type) {
      case 'image': return '📷 Photo';
      case 'video': return '🎥 Video';
      case 'audio': return '🎵 Audio';
      case 'document': return '📄 Document';
      case 'sticker': return '😀 Sticker';
      case 'location': return '📍 Location';
      case 'contact': return '📇 Contact';
      default: return '';
    }
  }
}
