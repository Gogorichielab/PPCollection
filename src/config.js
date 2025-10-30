const path = require('path');

module.exports = {
  port: process.env.PORT ? Number(process.env.PORT) : 3000,
  sessionSecret: process.env.SESSION_SECRET || 'ppcollection_dev_secret',
  adminUser: process.env.ADMIN_USERNAME || 'admin',
  adminPass: process.env.ADMIN_PASSWORD || 'changeme',
  databasePath: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'app.db')
};

