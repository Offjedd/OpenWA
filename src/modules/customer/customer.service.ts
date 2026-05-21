import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { Customer, CustomerPlan } from './entities/customer.entity';
import { CustomerSessionEntity, CustomerSessionStatus } from './entities/customer-session.entity';
import { RegisterCustomerDto, LoginCustomerDto, UpdateCustomerDto, CreateCustomerSessionDto } from './dto/customer.dto';
import { SessionService } from '../session/session.service';
import { createLogger } from '../../common/services/logger.service';

@Injectable()
export class CustomerService {
  private readonly logger = createLogger('CustomerService');
  private readonly supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  );

  constructor(
    @InjectRepository(Customer, 'main')
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(CustomerSessionEntity, 'main')
    private readonly customerSessionRepo: Repository<CustomerSessionEntity>,
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
  ) {}

  async register(dto: RegisterCustomerDto): Promise<{ token: string; customer: Omit<Customer, 'passwordHash'> }> {
    const existing = await this.customerRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const customer = this.customerRepo.create({
      email: dto.email,
      fullName: dto.fullName,
      passwordHash,
      plan: CustomerPlan.FREE,
      isActive: true,
    });

    const saved = await this.customerRepo.save(customer);

    // Mirror to Supabase for RLS-based frontend access
    await this.supabase.from('customers').upsert({
      id: saved.id,
      email: saved.email,
      full_name: saved.fullName,
      plan: saved.plan,
      is_active: saved.isActive,
      password_hash: passwordHash,
    });

    const token = this.signToken(saved);
    const { passwordHash: _ph, ...safeCustomer } = saved;
    return { token, customer: safeCustomer };
  }

  async login(dto: LoginCustomerDto): Promise<{ token: string; customer: Omit<Customer, 'passwordHash'> }> {
    const customer = await this.customerRepo.findOne({ where: { email: dto.email } });
    if (!customer) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!customer.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const valid = await bcrypt.compare(dto.password, customer.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.signToken(customer);
    const { passwordHash: _ph, ...safeCustomer } = customer;
    return { token, customer: safeCustomer };
  }

  async getProfile(customerId: string): Promise<Omit<Customer, 'passwordHash'>> {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');
    const { passwordHash: _ph, ...safe } = customer;
    return safe;
  }

  async updateProfile(customerId: string, dto: UpdateCustomerDto): Promise<Omit<Customer, 'passwordHash'>> {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    if (dto.email && dto.email !== customer.email) {
      const existing = await this.customerRepo.findOne({ where: { email: dto.email } });
      if (existing) throw new ConflictException('Email already in use');
      customer.email = dto.email;
    }

    if (dto.fullName) customer.fullName = dto.fullName;
    if (dto.password) customer.passwordHash = await bcrypt.hash(dto.password, 12);

    const saved = await this.customerRepo.save(customer);

    // Sync to Supabase
    await this.supabase.from('customers').upsert({
      id: saved.id,
      email: saved.email,
      full_name: saved.fullName,
      plan: saved.plan,
      is_active: saved.isActive,
      password_hash: saved.passwordHash,
    });

    const { passwordHash: _ph, ...safe } = saved;
    return safe;
  }

  async createSession(
    customerId: string,
    dto: CreateCustomerSessionDto,
  ): Promise<CustomerSessionEntity> {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    // Enforce plan limits
    const existingSessions = await this.customerSessionRepo.find({ where: { customerId } });
    if (customer.plan === CustomerPlan.FREE && existingSessions.length >= 1) {
      throw new ForbiddenException(
        'Free plan allows only 1 WhatsApp number. Upgrade to premium for more.',
      );
    }

    // Create session in OpenWA
    const sessionName = `cust_${customerId.substring(0, 8)}_${Date.now()}`;
    const openwaSession = await this.sessionService.create({ name: sessionName });

    // Store mapping in our DB
    const customerSession = this.customerSessionRepo.create({
      customerId,
      openwaSessionId: openwaSession.id,
      displayName: dto.displayName,
      status: CustomerSessionStatus.CREATED,
    });
    const saved = await this.customerSessionRepo.save(customerSession);

    // Mirror to Supabase
    await this.supabase.from('customer_sessions').upsert({
      id: saved.id,
      customer_id: customerId,
      openwa_session_id: openwaSession.id,
      display_name: dto.displayName,
      status: CustomerSessionStatus.CREATED,
    });

    this.logger.log(`Customer session created`, { customerId, sessionId: saved.id });
    return saved;
  }

  async getSessions(customerId: string): Promise<CustomerSessionEntity[]> {
    return this.customerSessionRepo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  async getSession(customerId: string, sessionId: string): Promise<CustomerSessionEntity> {
    const session = await this.customerSessionRepo.findOne({
      where: { id: sessionId, customerId },
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async startSession(customerId: string, sessionId: string): Promise<CustomerSessionEntity> {
    const session = await this.getSession(customerId, sessionId);
    await this.sessionService.start(session.openwaSessionId);

    session.status = CustomerSessionStatus.CONNECTING;
    const saved = await this.customerSessionRepo.save(session);
    await this.syncSessionToSupabase(saved);
    return saved;
  }

  async getQRCode(
    customerId: string,
    sessionId: string,
  ): Promise<{ qrCode: string; status: string }> {
    const session = await this.getSession(customerId, sessionId);
    const result = await this.sessionService.getQRCode(session.openwaSessionId);

    if (result.status === 'ready') {
      session.status = CustomerSessionStatus.READY;
      await this.customerSessionRepo.save(session);
      await this.syncSessionToSupabase(session);
    } else if (result.status === 'qr_ready') {
      session.status = CustomerSessionStatus.QR_READY;
      await this.customerSessionRepo.save(session);
      await this.syncSessionToSupabase(session);
    }

    return { qrCode: result.qrCode, status: result.status };
  }

  async disconnectSession(customerId: string, sessionId: string): Promise<CustomerSessionEntity> {
    const session = await this.getSession(customerId, sessionId);
    await this.sessionService.stop(session.openwaSessionId);

    session.status = CustomerSessionStatus.DISCONNECTED;
    const saved = await this.customerSessionRepo.save(session);
    await this.syncSessionToSupabase(saved);
    return saved;
  }

  async deleteSession(customerId: string, sessionId: string): Promise<void> {
    const session = await this.getSession(customerId, sessionId);
    await this.sessionService.delete(session.openwaSessionId);
    await this.customerSessionRepo.remove(session);
    await this.supabase.from('customer_sessions').delete().eq('id', sessionId);
  }

  async updateSessionStatus(
    openwaSessionId: string,
    status: CustomerSessionStatus,
    phoneNumber?: string,
  ): Promise<void> {
    const session = await this.customerSessionRepo.findOne({ where: { openwaSessionId } });
    if (!session) return;

    session.status = status;
    if (phoneNumber) {
      session.phoneNumber = phoneNumber;
      session.connectedAt = new Date();
    }
    await this.customerSessionRepo.save(session);
    await this.syncSessionToSupabase(session);
  }

  async getSessionByOpenwaId(openwaSessionId: string): Promise<CustomerSessionEntity | null> {
    return this.customerSessionRepo.findOne({ where: { openwaSessionId } }) ?? null;
  }

  private async syncSessionToSupabase(session: CustomerSessionEntity): Promise<void> {
    await this.supabase.from('customer_sessions').upsert({
      id: session.id,
      customer_id: session.customerId,
      openwa_session_id: session.openwaSessionId,
      display_name: session.displayName,
      status: session.status,
      phone_number: session.phoneNumber,
      connected_at: session.connectedAt,
    });
  }

  private signToken(customer: Customer): string {
    return this.jwtService.sign({
      sub: customer.id,
      email: customer.email,
      plan: customer.plan,
    });
  }
}
