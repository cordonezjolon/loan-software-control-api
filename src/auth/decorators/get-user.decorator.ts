import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../entities/user.entity';

export const GetUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext): User | User[keyof User] => {
    const request = ctx.switchToHttp().getRequest<{ user: User }>();
    const user: User = request.user;
    
    return data ? user?.[data] : user;
  },
);