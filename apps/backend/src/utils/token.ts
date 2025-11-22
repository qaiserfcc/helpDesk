import jwt, { JwtPayload } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env.js';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

type TokenKind = 'access' | 'refresh';

type TokenSubject = {
  id: string;
  role: Role;
};

export type AccessTokenPayload = JwtPayload & TokenSubject & { type: 'access' };
export type RefreshTokenPayload = JwtPayload & TokenSubject & { type: 'refresh' };

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

function signToken(subject: TokenSubject, kind: TokenKind) {
  const secret = kind === 'access' ? env.JWT_ACCESS_SECRET : env.JWT_REFRESH_SECRET;
  const expiresIn = kind === 'access' ? ACCESS_TOKEN_TTL : REFRESH_TOKEN_TTL;

  return jwt.sign(
    {
      sub: subject.id,
      role: subject.role,
      type: kind
    },
    secret,
    { expiresIn }
  );
}

function verifyToken(token: string, kind: TokenKind) {
  const secret = kind === 'access' ? env.JWT_ACCESS_SECRET : env.JWT_REFRESH_SECRET;
  const decoded = jwt.verify(token, secret);

  if (typeof decoded === 'string' || decoded.type !== kind) {
    throw new jwt.JsonWebTokenError('Invalid token payload');
  }

  return decoded as (AccessTokenPayload | RefreshTokenPayload) & { type: typeof kind };
}

export function createTokenPair(subject: TokenSubject): TokenPair {
  return {
    accessToken: signToken(subject, 'access'),
    refreshToken: signToken(subject, 'refresh')
  };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return verifyToken(token, 'access') as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return verifyToken(token, 'refresh') as RefreshTokenPayload;
}
