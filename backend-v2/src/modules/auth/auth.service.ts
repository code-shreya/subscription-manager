import { db } from '../../config/database';
import { User, RefreshToken } from '../../db/types';
import { hashPassword, comparePassword } from '../../shared/utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  getTokenExpiration,
} from '../../shared/utils/jwt';
import { RegisterInput, LoginInput } from '../../shared/schemas/auth.schema';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResponse {
  user: Omit<User, 'password_hash'>;
  tokens: AuthTokens;
}

/**
 * Authentication Service
 * Handles user registration, login, token management
 */
export class AuthService {
  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    const { email, password, name } = input;

    // Check if user already exists
    const existingUser = await db.query<User>(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await db.query<User>(
      `INSERT INTO users (email, password_hash, name, email_verified, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, avatar_url, email_verified, is_active, created_at, updated_at`,
      [email.toLowerCase(), passwordHash, name || null, false, true]
    );

    const user = result.rows[0];

    // Generate tokens
    const tokens = await this.generateTokensForUser(user.id, user.email);

    return {
      user,
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(input: LoginInput, deviceInfo?: any): Promise<AuthResponse> {
    const { email, password } = input;

    // Find user
    const result = await db.query<User>(
      `SELECT id, email, password_hash, name, avatar_url, email_verified, is_active, created_at, updated_at
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    const user = result.rows[0];

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is disabled');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await db.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Generate tokens
    const tokens = await this.generateTokensForUser(user.id, user.email, deviceInfo);

    // Remove password_hash from response
    const { password_hash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    let payload;
    try {
      payload = verifyToken(refreshToken);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }

    // Check if refresh token exists in database and is not revoked
    const tokenResult = await db.query<RefreshToken>(
      `SELECT id, user_id, expires_at, is_revoked
       FROM refresh_tokens
       WHERE token = $1`,
      [refreshToken]
    );

    const tokenRecord = tokenResult.rows[0];

    if (!tokenRecord) {
      throw new Error('Refresh token not found');
    }

    if (tokenRecord.is_revoked) {
      throw new Error('Refresh token has been revoked');
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      throw new Error('Refresh token has expired');
    }

    // Verify user exists and is active
    const userResult = await db.query<User>(
      'SELECT id, email, is_active FROM users WHERE id = $1',
      [payload.userId]
    );

    const user = userResult.rows[0];

    if (!user || !user.is_active) {
      throw new Error('User not found or inactive');
    }

    // Revoke old refresh token (token rotation)
    await this.revokeRefreshToken(refreshToken);

    // Generate new tokens
    return this.generateTokensForUser(user.id, user.email);
  }

  /**
   * Logout user by revoking refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    await this.revokeRefreshToken(refreshToken);
  }

  /**
   * Get current user by ID
   */
  async getCurrentUser(userId: string): Promise<Omit<User, 'password_hash'>> {
    const result = await db.query<User>(
      `SELECT id, email, name, avatar_url, email_verified, is_active, last_login_at, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: { name?: string; avatar_url?: string }
  ): Promise<Omit<User, 'password_hash'>> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }

    if (updates.avatar_url !== undefined) {
      fields.push(`avatar_url = $${paramIndex++}`);
      values.push(updates.avatar_url);
    }

    if (fields.length === 0) {
      return this.getCurrentUser(userId);
    }

    values.push(userId);

    const result = await db.query<User>(
      `UPDATE users
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING id, email, name, avatar_url, email_verified, is_active, last_login_at, created_at, updated_at`,
      values
    );

    return result.rows[0];
  }

  /**
   * Generate access and refresh tokens for a user
   */
  private async generateTokensForUser(
    userId: string,
    email: string,
    deviceInfo?: any
  ): Promise<AuthTokens> {
    const accessToken = generateAccessToken(userId, email);
    const refreshToken = generateRefreshToken(userId, email);

    // Store refresh token in database
    const expiresAt = getTokenExpiration(process.env.JWT_REFRESH_EXPIRATION || '7d');

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at, device_info, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        refreshToken,
        expiresAt,
        deviceInfo ? JSON.stringify(deviceInfo) : null,
        deviceInfo?.ipAddress || null,
        deviceInfo?.userAgent || null,
      ]
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
    };
  }

  /**
   * Revoke a refresh token
   */
  private async revokeRefreshToken(token: string): Promise<void> {
    await db.query(
      `UPDATE refresh_tokens
       SET is_revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
       WHERE token = $1`,
      [token]
    );
  }

  /**
   * Clean up expired refresh tokens (can be called by a scheduled job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await db.query(
      `DELETE FROM refresh_tokens
       WHERE expires_at < CURRENT_TIMESTAMP
          OR (is_revoked = TRUE AND revoked_at < CURRENT_TIMESTAMP - INTERVAL '30 days')`
    );

    return result.rowCount || 0;
  }
}

// Export singleton instance
export const authService = new AuthService();
