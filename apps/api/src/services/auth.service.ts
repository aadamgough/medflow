import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../config/database';
import { generateToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { AuthResponse, RegisterRequest, LoginRequest } from '../types';
import { storageService } from './storage.service';

const SALT_ROUNDS = 10;

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export class AuthService {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      // Validate input
      const validated = registerSchema.parse(data);
      logger.info('Registration attempt', { email: validated.email });

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: validated.email },
      });

      if (existingUser) {
        logger.warn('Registration failed - email already exists', { email: validated.email });
        throw new Error('Email already in use');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(validated.password, SALT_ROUNDS);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: validated.email,
          passwordHash,
          name: validated.name || null,
        },
      });

      logger.info('User registered successfully', { userId: user.id, email: user.email });

      // Generate token
      const token = generateToken(user.id, user.email);

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profilePicture: user.profilePicture,
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Registration validation failed', error.issues);
        throw new Error(error.issues[0].message);
      }
      throw error;
    }
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      // Validate input
      const validated = loginSchema.parse(data);
      logger.info('Login attempt', { email: validated.email });

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: validated.email },
      });

      if (!user) {
        logger.warn('Login failed - user not found', { email: validated.email });
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(validated.password, user.passwordHash);

      if (!isPasswordValid) {
        logger.warn('Login failed - invalid password', { email: validated.email });
        throw new Error('Invalid credentials');
      }

      logger.info('User logged in successfully', { userId: user.id, email: user.email });

      // Generate token
      const token = generateToken(user.id, user.email);

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profilePicture: user.profilePicture,
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Login validation failed', error.issues);
        throw new Error(error.issues[0].message);
      }
      throw error;
    }
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        profilePicture: true,
        createdAt: true,
      },
    });

    return user;
  }

  async refreshToken(userId: string): Promise<{ token: string }> {
    logger.info('Token refresh attempt', { userId });

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      logger.warn('Token refresh failed - user not found', { userId });
      throw new Error('User not found');
    }

    const token = generateToken(user.id, user.email);

    logger.info('Token refreshed successfully', { userId: user.id });

    return { token };
  }

  async updateProfilePicture(
    userId: string,
    file: Express.Multer.File
  ): Promise<{ user: { id: string; email: string; name: string | null; profilePicture: string | null } }> {
    logger.info('Profile picture update attempt', { userId });

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      logger.warn('Profile picture update failed - user not found', { userId });
      throw new Error('User not found');
    }

    // Upload the profile picture to Supabase storage
    const { publicUrl } = await storageService.uploadProfilePicture(file, userId);

    // Update the user's profilePicture field in the database
    const user = await prisma.user.update({
      where: { id: userId },
      data: { profilePicture: publicUrl },
      select: {
        id: true,
        email: true,
        name: true,
        profilePicture: true,
      },
    });

    logger.info('Profile picture updated successfully', { userId, profilePicture: publicUrl });

    return { user };
  }

  async removeProfilePicture(userId: string): Promise<{ user: { id: string; email: string; name: string | null; profilePicture: string | null } }> {
    logger.info('Profile picture removal attempt', { userId });

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      logger.warn('Profile picture removal failed - user not found', { userId });
      throw new Error('User not found');
    }

    // Delete the profile picture from Supabase storage
    await storageService.deleteProfilePicture(userId);

    // Update the user's profilePicture field to null
    const user = await prisma.user.update({
      where: { id: userId },
      data: { profilePicture: null },
      select: {
        id: true,
        email: true,
        name: true,
        profilePicture: true,
      },
    });

    logger.info('Profile picture removed successfully', { userId });

    return { user };
  }
}

export const authService = new AuthService();
