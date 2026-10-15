import app from './app.js';
import { config } from './config/config.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';
import { redactMongoUri } from './utils/redact.js';
import { startScheduler } from './scheduler/scheduler.js';


let retryTimer = null;

const tryConnectDatabase = async () => {
  try {
    await connectDB();
    if (config.demoMode) {
      startScheduler();
    }
    if (retryTimer) {
      clearInterval(retryTimer);
      retryTimer = null;
    }
  } catch (err) {
    logger.error(`Database connection issue: ${redactMongoUri(err.message)}`);
    logger.warn('Server remains active. Retrying database connection every 10 seconds...');
    logger.info('💡 To fix Atlas: Ensure your current IP is whitelisted (0.0.0.0/0) in Atlas > Network Access, or use local Docker MongoDB: docker compose up -d');
    if (!retryTimer) {
      retryTimer = setInterval(tryConnectDatabase, 10000);
    }
  }
};

const start = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured');
  }
  if (!process.env.JWT_SECRET && config.nodeEnv === 'production') {
    throw new Error('JWT_SECRET is not configured');
  }

  const server = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} [${config.nodeEnv}]`);
    if (config.demoMode) logger.info('DEMO MODE enabled — execution simulation active');
  });

  await tryConnectDatabase();

  const shutdown = () => {
    if (retryTimer) clearInterval(retryTimer);
    server.close(() => {
      logger.info('Server shut down');
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

start().catch((err) => {
  logger.error(`Fatal startup error: ${redactMongoUri(err.message)}`);
  process.exit(1);
});

export default app;
