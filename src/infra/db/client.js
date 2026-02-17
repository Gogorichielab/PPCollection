const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

function ensureDirectoryForFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createDbClient(databasePath) {
  ensureDirectoryForFile(databasePath);
  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

module.exports = { createDbClient };
