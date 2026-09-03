// Test setup: set required environment variables before any module loads config
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/smartclass_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-vitest-only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.PORT = '4001';
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.UPLOAD_DIR = 'test-uploads';
process.env.MAX_FILE_SIZE = '52428800';
process.env.LOG_LEVEL = 'silent';
