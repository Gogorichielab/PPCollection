const { createApp } = require('./app/createApp');
const { getConfig } = require('./infra/config');

const config = getConfig();
const app = createApp({ config });

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`PPCollection listening on http://localhost:${config.port}`);
});
