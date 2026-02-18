import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment configuration schema with Zod validation
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number).pipe(z.number().min(1).max(65535)),
  HOST: z.string().default('0.0.0.0'),

  // Database Configuration
  DATABASE_HOST: z.string().default('localhost'),
  DATABASE_PORT: z.string().default('5432').transform(Number).pipe(z.number()),
  DATABASE_NAME: z.string().default('submanager'),
  DATABASE_USER: z.string().default('submanager'),
  DATABASE_PASSWORD: z.string().min(1),
  DATABASE_POOL_MIN: z.string().default('2').transform(Number).pipe(z.number()),
  DATABASE_POOL_MAX: z.string().default('10').transform(Number).pipe(z.number()),

  // Redis Configuration
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform(Number).pipe(z.number()),
  REDIS_PASSWORD: z.string().optional().default(''),

  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),

  // Rate Limiting
  RATE_LIMIT_MAX: z.string().default('100').transform(Number).pipe(z.number()),
  RATE_LIMIT_TIMEWINDOW: z.string().default('60000').transform(Number).pipe(z.number()),

  // CORS Configuration
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // OpenAI Configuration (optional for now, required later)
  OPENAI_API_KEY: z.string().optional(),

  // Gmail API Configuration (optional for now, required later)
  GMAIL_CLIENT_ID: z.string().optional(),
  GMAIL_CLIENT_SECRET: z.string().optional(),
  GMAIL_REDIRECT_URI: z.string().optional(),
});

// Parse and validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join('\n');
      throw new Error(`Environment validation failed:\n${missingVars}`);
    }
    throw error;
  }
}

// Export validated configuration
export const config = validateEnv();

// Export configuration object with typed values
export const appConfig = {
  server: {
    env: config.NODE_ENV,
    port: config.PORT,
    host: config.HOST,
    isDevelopment: config.NODE_ENV === 'development',
    isProduction: config.NODE_ENV === 'production',
    isTest: config.NODE_ENV === 'test',
  },
  database: {
    host: config.DATABASE_HOST,
    port: config.DATABASE_PORT,
    database: config.DATABASE_NAME,
    user: config.DATABASE_USER,
    password: config.DATABASE_PASSWORD,
    min: config.DATABASE_POOL_MIN,
    max: config.DATABASE_POOL_MAX,
  },
  redis: {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD || undefined,
  },
  jwt: {
    secret: config.JWT_SECRET,
    accessExpiration: config.JWT_ACCESS_EXPIRATION,
    refreshExpiration: config.JWT_REFRESH_EXPIRATION,
  },
  rateLimit: {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_TIMEWINDOW,
  },
  cors: {
    origin: config.CORS_ORIGIN,
  },
  openai: {
    apiKey: config.OPENAI_API_KEY,
  },
  gmail: {
    clientId: config.GMAIL_CLIENT_ID,
    clientSecret: config.GMAIL_CLIENT_SECRET,
    redirectUri: config.GMAIL_REDIRECT_URI,
  },
};

export type AppConfig = typeof appConfig;
