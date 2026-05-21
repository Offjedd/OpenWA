import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { CustomerJwtPayload } from '../guards/customer-jwt.guard';

export const CUSTOMER_PUBLIC_KEY = 'customerPublic';

export const CustomerPublic = () => SetMetadata(CUSTOMER_PUBLIC_KEY, true);

export const CurrentCustomer = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CustomerJwtPayload => {
    const request = ctx.switchToHttp().getRequest<Request & { customer: CustomerJwtPayload }>();
    return request.customer;
  },
);
