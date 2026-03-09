import { UserRole } from '../entities/user.entity';

export interface JwtPayload {
  username: string;
  sub: string;
  role: UserRole;
}