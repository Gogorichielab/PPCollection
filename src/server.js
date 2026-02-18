const { createApp } = require('./app/createApp');
const { getConfig } = require('./infra/config');

const config = getConfig();

createApp({ config }).then((app) => {
  app.listen(config.port, () => {
    console.log(`PPCollection listening on http://localhost:${config.port}`);
  });
});
