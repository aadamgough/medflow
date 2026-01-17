import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const result = await authService.register({ email, password, name });

      res.status(201).json(result);
    } catch (error) {
      logger.error('Registration error', error);
      
      if (error instanceof Error) {
        if (error.message === 'Email already in use') {
          res.status(400).json({ error: error.message });
          return;
        }
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const result = await authService.login({ email, password });

      res.status(200).json(result);
    } catch (error) {
      logger.error('Login error', error);

      if (error instanceof Error) {
        if (error.message === 'Invalid credentials') {
          res.status(401).json({ error: error.message });
          return;
        }
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await authService.getUserById(req.user.id);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json({ user });
    } catch (error) {
      logger.error('Get user error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async refreshToken(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await authService.refreshToken(req.user.id);

      res.status(200).json(result);
    } catch (error) {
      logger.error('Token refresh error', error);

      if (error instanceof Error) {
        if (error.message === 'User not found') {
          res.status(404).json({ error: error.message });
          return;
        }
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async uploadProfilePicture(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      const result = await authService.updateProfilePicture(req.user.id, req.file);

      res.status(200).json(result);
    } catch (error) {
      logger.error('Profile picture upload error', error);

      if (error instanceof Error) {
        if (error.message === 'User not found') {
          res.status(404).json({ error: error.message });
          return;
        }
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async removeProfilePicture(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await authService.removeProfilePicture(req.user.id);

      res.status(200).json(result);
    } catch (error) {
      logger.error('Profile picture removal error', error);

      if (error instanceof Error) {
        if (error.message === 'User not found') {
          res.status(404).json({ error: error.message });
          return;
        }
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const authController = new AuthController();
