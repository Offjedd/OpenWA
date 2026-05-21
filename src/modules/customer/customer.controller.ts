import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { RegisterCustomerDto, LoginCustomerDto, UpdateCustomerDto, CreateCustomerSessionDto } from './dto/customer.dto';
import { CustomerJwtGuard } from './guards/customer-jwt.guard';
import { CustomerPublic, CurrentCustomer } from './decorators/customer.decorators';
import type { CustomerJwtPayload } from './guards/customer-jwt.guard';
import { Public } from '../auth/decorators/auth.decorators';

@Public()
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @CustomerPublic()
  @Post('register')
  async register(@Body() dto: RegisterCustomerDto) {
    return this.customerService.register(dto);
  }

  @CustomerPublic()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginCustomerDto) {
    return this.customerService.login(dto);
  }

  @UseGuards(CustomerJwtGuard)
  @Get('me')
  async getProfile(@CurrentCustomer() customer: CustomerJwtPayload) {
    return this.customerService.getProfile(customer.sub);
  }

  @UseGuards(CustomerJwtGuard)
  @Put('me')
  async updateProfile(@CurrentCustomer() customer: CustomerJwtPayload, @Body() dto: UpdateCustomerDto) {
    return this.customerService.updateProfile(customer.sub, dto);
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  @UseGuards(CustomerJwtGuard)
  @Post('me/sessions')
  async createSession(@CurrentCustomer() customer: CustomerJwtPayload, @Body() dto: CreateCustomerSessionDto) {
    return this.customerService.createSession(customer.sub, dto);
  }

  @UseGuards(CustomerJwtGuard)
  @Get('me/sessions')
  async getSessions(@CurrentCustomer() customer: CustomerJwtPayload) {
    return this.customerService.getSessions(customer.sub);
  }

  @UseGuards(CustomerJwtGuard)
  @Get('me/sessions/:sessionId')
  async getSession(@CurrentCustomer() customer: CustomerJwtPayload, @Param('sessionId') sessionId: string) {
    return this.customerService.getSession(customer.sub, sessionId);
  }

  @UseGuards(CustomerJwtGuard)
  @Post('me/sessions/:sessionId/start')
  async startSession(@CurrentCustomer() customer: CustomerJwtPayload, @Param('sessionId') sessionId: string) {
    return this.customerService.startSession(customer.sub, sessionId);
  }

  @UseGuards(CustomerJwtGuard)
  @Get('me/sessions/:sessionId/qr')
  async getQRCode(@CurrentCustomer() customer: CustomerJwtPayload, @Param('sessionId') sessionId: string) {
    return this.customerService.getQRCode(customer.sub, sessionId);
  }

  @UseGuards(CustomerJwtGuard)
  @Post('me/sessions/:sessionId/disconnect')
  async disconnectSession(@CurrentCustomer() customer: CustomerJwtPayload, @Param('sessionId') sessionId: string) {
    return this.customerService.disconnectSession(customer.sub, sessionId);
  }

  @UseGuards(CustomerJwtGuard)
  @Delete('me/sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSession(@CurrentCustomer() customer: CustomerJwtPayload, @Param('sessionId') sessionId: string) {
    await this.customerService.deleteSession(customer.sub, sessionId);
  }
}
