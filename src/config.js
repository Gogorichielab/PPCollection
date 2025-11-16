const path = require('path');
const bcrypt = require('bcryptjs');

// Pre-computed hash for default password 'changeme'
// Generated with: bcrypt.hashSync('changeme', 10)
const DEFAULT_PASSWORD_HASH = '$2b$10$n9ltB2FRl72JqqoGJvrCDuLwVqFl7hWffe1jsmso.Ss80TwnTdUPK';

// Support migration from plain-text password to hashed password
let adminPasswordHash;
if (process.env.ADMIN_PASSWORD_HASH) {
  // Preferred: Use pre-hashed password
  adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
} else if (process.env.ADMIN_PASSWORD) {
  // Migration path: Hash the plain-text password
  console.warn('WARNING: ADMIN_PASSWORD is deprecated. Please use ADMIN_PASSWORD_HASH instead.');
  console.warn('Generate a hash by running: node scripts/hash-password.js <your-password>');
  adminPasswordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
} else {
  // Default: Use pre-computed hash for default password
  adminPasswordHash = DEFAULT_PASSWORD_HASH;
}

module.exports = {
  port: process.env.PORT ? Number(process.env.PORT) : 3000,
  sessionSecret: process.env.SESSION_SECRET || 'ppcollection_dev_secret',
  adminUser: process.env.ADMIN_USERNAME || 'admin',
  adminPasswordHash: adminPasswordHash,
  databasePath: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'app.db')
};

