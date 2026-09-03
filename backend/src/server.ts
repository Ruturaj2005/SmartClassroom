import { config } from './config/config';
import { logger } from './utils/logger';
import { prisma } from './config/database';
import app from './app';

async function main() {
  // Test database connection
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to connect to database', { error });
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    logger.info('SmartClass API server started', {
      port: config.port,
      environment: config.nodeEnv,
      swagger: `http://localhost:${config.port}/api-docs`,
    });
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason });
  });
}

main();
