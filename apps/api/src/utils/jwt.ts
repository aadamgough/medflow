import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types';
import { logger } from './logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRATION = '7d';

if (!process.env.JWT_SECRET) {
  logger.warn('JWT_SECRET not set in environment variables, using default (not secure for production)');
}

export function generateToken(userId: string, email: string): string {
  const payload: JWTPayload = {
    userId,
    email,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION,
  });
}

export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    logger.error('JWT verification failed', error);
    throw new Error('Invalid or expired token');
  }
}
