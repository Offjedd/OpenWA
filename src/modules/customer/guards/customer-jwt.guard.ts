import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { CUSTOMER_PUBLIC_KEY } from '../decorators/customer.decorators';

export interface CustomerJwtPayload {
  sub: string;
  email: string;
  plan: string;
}

@Injectable()
export class CustomerJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(CUSTOMER_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Customer authentication required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<CustomerJwtPayload>(token);
      (request as Request & { customer: CustomerJwtPayload }).customer = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: Request): string | undefined {
    const auth = request.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.substring(7);
    return undefined;
  }
}
