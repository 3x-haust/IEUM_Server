import { UserRole } from '../../database/entities';

export interface MirimUserPayload {
  id: string;
  email: string;
  nickname?: string;
  name?: string;
  role?: string;
  major?: string;
  grade?: string | number;
  isGraduated?: boolean;
  admission?: string | number;
  generation?: string | number;
}

export interface VerifiedUserPayload {
  oauthId: string;
  name: string;
  email: string;
  role: UserRole;
  grade: number | null;
}

export interface JwtSessionPayload {
  sub: string;
  oauthId: string;
  role: UserRole;
  typ: 'access';
}
