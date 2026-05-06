const { createApp } = require('./app/createApp');
const { getConfig } = require('./infra/config');

const SHUTDOWN_TIMEOUT_MS = 10_000;

const config = getConfig();

createApp({ config }).then((app) => {
  const server = app.listen(config.port, () => {
    console.log(`PPCollection listening on http://localhost:${config.port}`);
  });

  function shutdown(signal) {
    console.log(`[shutdown] received ${signal}, draining connections…`);
    server.close(() => {
      try {
        app.locals.db?.close();
      } catch {
        // Already closed or never opened — nothing to do.
      }
      process.exit(0);
    });
    setTimeout(() => {
      console.error('[shutdown] timed out waiting for connections, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
});
