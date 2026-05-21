import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventsGateway } from '../events/events.gateway';
import { ConversationService } from './conversation.service';
import { CustomerService } from './customer.service';
import { CustomerSessionStatus } from './entities/customer-session.entity';
import { createLogger } from '../../common/services/logger.service';

/**
 * Listens to session events emitted by the EventsGateway and syncs them
 * to Supabase for the customer data layer.
 */
@Injectable()
export class CustomerMessageListener implements OnModuleInit {
  private readonly logger = createLogger('CustomerMessageListener');

  constructor(
    private readonly eventsGateway: EventsGateway,
    private readonly conversationService: ConversationService,
    private readonly customerService: CustomerService,
  ) {}

  onModuleInit(): void {
    // Patch the EventsGateway to intercept message emissions
    const originalEmitMessage = this.eventsGateway.emitMessage.bind(this.eventsGateway);
    this.eventsGateway.emitMessage = (sessionId: string, message: Record<string, unknown>): void => {
      originalEmitMessage(sessionId, message);
      this.handleIncomingMessage(sessionId, message);
    };

    const originalEmitStatus = this.eventsGateway.emitSessionStatus.bind(this.eventsGateway);
    this.eventsGateway.emitSessionStatus = (
      sessionId: string,
      status: string,
      data?: Record<string, unknown>,
    ): void => {
      originalEmitStatus(sessionId, status, data);
      this.handleSessionStatus(sessionId, status, data);
    };

    this.logger.log('Customer message listener initialized');
  }

  private handleIncomingMessage(openwaSessionId: string, message: Record<string, unknown>): void {
    void this.conversationService.handleIncomingMessage(openwaSessionId, message).catch(err => {
      this.logger.error('Failed to sync incoming message to Supabase', String(err));
    });
  }

  private handleSessionStatus(
    openwaSessionId: string,
    status: string,
    data?: Record<string, unknown>,
  ): void {
    let customerStatus: CustomerSessionStatus | null = null;
    let phoneNumber: string | undefined;

    switch (status) {
      case 'ready':
        customerStatus = CustomerSessionStatus.READY;
        phoneNumber = (data?.phone as string) || undefined;
        break;
      case 'qr_ready':
        customerStatus = CustomerSessionStatus.QR_READY;
        break;
      case 'connecting':
      case 'initializing':
      case 'authenticating':
        customerStatus = CustomerSessionStatus.CONNECTING;
        break;
      case 'disconnected':
      case 'failed':
        customerStatus = CustomerSessionStatus.DISCONNECTED;
        break;
    }

    if (customerStatus) {
      void this.customerService
        .updateSessionStatus(openwaSessionId, customerStatus, phoneNumber)
        .catch(err => {
          this.logger.error('Failed to update customer session status', String(err));
        });
    }
  }
}
