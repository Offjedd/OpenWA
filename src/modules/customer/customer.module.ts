import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { MulterModule } from '@nestjs/platform-express';
import { Customer } from './entities/customer.entity';
import { CustomerSessionEntity } from './entities/customer-session.entity';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { SessionModule } from '../session/session.module';
import { CustomerMessageListener } from './customer-message.listener';
import { mkdirSync } from 'fs';

// Ensure uploads directory exists
try {
  mkdirSync('./data/uploads', { recursive: true });
} catch {
  // ignore
}

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, CustomerSessionEntity], 'main'),
    JwtModule.register({
      global: false,
      secret: process.env.CUSTOMER_JWT_SECRET || 'openwa-customer-secret-change-in-production',
      signOptions: { expiresIn: '30d' },
    }),
    MulterModule.register({}),
    SessionModule,
  ],
  controllers: [CustomerController, ConversationController],
  providers: [CustomerService, ConversationService, CustomerMessageListener],
  exports: [CustomerService, ConversationService],
})
export class CustomerModule {}
