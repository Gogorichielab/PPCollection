const { createApp } = require('./app/createApp');
const { getConfig } = require('./infra/config');
const logger = require('./services/logger.service');

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function start() {
  const config = getConfig();
  const app = await createApp({ config });
  const server = app.listen(config.port, () => {
    logger.info('server.started', { port: config.port, url: `http://localhost:${config.port}` });
  });

  function shutdown(signal) {
    logger.info('server.shutdown.started', { signal });
    server.close(() => {
      try {
        app.locals.db?.close();
      } catch {
        // Already closed or never opened — nothing to do.
      }
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('server.shutdown.timeout', { signal, timeoutMs: SHUTDOWN_TIMEOUT_MS });
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error('server.start.failed', { message: err.message });
  process.exit(1);
});
