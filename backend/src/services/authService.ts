import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { config } from '../config/config';
import { hashPassword, verifyPassword } from '../utils/password';
import { JwtPayload } from '../types';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { CreateUserInput, LoginInput } from '../validators/schemas';

export class AuthService {
  /**
   * Authenticate a user with email and password.
   * Returns a signed JWT on success.
   */
  async login(input: LoginInput): Promise<{ token: string; user: object }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { faculty: true },
    });

    if (!user || !user.isActive) {
      // Use same error message to avoid email enumeration
      logger.warn('Login failed: user not found or inactive', { email: input.email });
      throw createError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const passwordValid = await verifyPassword(input.password, user.passwordHash);
    if (!passwordValid) {
      logger.warn('Login failed: invalid password', { email: input.email });
      throw createError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      facultyId: user.faculty?.id,
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);

    logger.info('User logged in', { userId: user.id, role: user.role });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.faculty?.name,
        facultyId: user.faculty?.id,
      },
    };
  }

  /**
   * Create a new user with an associated faculty profile.
   * Only called by admin during faculty creation flow.
   */
  async createUser(input: CreateUserInput): Promise<object> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw createError(409, 'DUPLICATE_EMAIL', 'A user with this email already exists');
    }

    const existingFaculty = await prisma.faculty.findUnique({
      where: { employeeId: input.employeeId },
    });

    if (existingFaculty) {
      throw createError(409, 'DUPLICATE_EMPLOYEE_ID', 'A faculty with this employee ID already exists');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: input.role,
        faculty: {
          create: {
            employeeId: input.employeeId,
            name: input.name,
            department: input.department,
            designation: input.designation,
          },
        },
      },
      include: { faculty: true },
    });

    logger.info('User created', { userId: user.id, role: user.role });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      faculty: user.faculty,
    };
  }

  /**
   * Get current user profile from JWT.
   */
  async getMe(userId: string): Promise<object> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        faculty: {
          include: {
            rfidCards: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });

    if (!user) {
      throw createError(404, 'NOT_FOUND', 'User not found');
    }

    // Never return passwordHash
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }
}

export const authService = new AuthService();
