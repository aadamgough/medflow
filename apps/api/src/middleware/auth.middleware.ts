import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types';

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: 'Authorization header missing' });
      return;
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({ error: 'Invalid authorization header format. Expected: Bearer <token>' });
      return;
    }

    const token = parts[1];

    try {
      const decoded = verifyToken(token);
      
      req.user = {
        id: decoded.userId,
        email: decoded.email,
      };

      next();
    } catch (error) {
      logger.warn('Token verification failed', { error });
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
  } catch (error) {
    logger.error('Authentication middleware error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
