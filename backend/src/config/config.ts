import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const parseAllowedOrigins = (): (string | RegExp)[] => {
  const defaultOrigins = [
    'https://smartclassroompccoe.netlify.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
  ];

  const envOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
        .map((origin) => origin.trim().replace(/\/+$/, ''))
        .filter(Boolean)
    : [];

  const combined = Array.from(new Set([...defaultOrigins, ...envOrigins]));

  return [
    ...combined,
    /^https:\/\/[a-zA-Z0-9-]+--smartclassroompccoe\.netlify\.app$/,
  ];
};

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: requireEnv('DATABASE_URL'),
  },

  jwt: {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  cors: {
    frontendUrl: process.env.FRONTEND_URL || 'https://smartclassroompccoe.netlify.app',
    allowedOrigins: parseAllowedOrigins(),
  },

  storage: {
    uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB default
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
