#!/usr/bin/env node

/**
 * Utility script to generate bcrypt password hashes
 * Usage: node scripts/hash-password.js <password>
 * 
 * This script generates a bcrypt hash that can be used with the
 * ADMIN_PASSWORD_HASH environment variable for secure authentication.
 */

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Error: Password argument is required');
  console.log('\nUsage: node scripts/hash-password.js <password>');
  console.log('\nExample:');
  console.log('  node scripts/hash-password.js mySecurePassword123');
  console.log('\nThen set the environment variable:');
  console.log('  export ADMIN_PASSWORD_HASH="<generated-hash>"');
  process.exit(1);
}

// Generate hash with salt rounds = 10
const hash = bcrypt.hashSync(password, 10);

console.log('\nPassword hash generated successfully!');
console.log('\nSet this environment variable:');
console.log(`ADMIN_PASSWORD_HASH="${hash}"`);
console.log('\nFor Docker:');
console.log(`  -e ADMIN_PASSWORD_HASH="${hash}"`);
console.log('\nFor docker-compose.yml:');
console.log(`  ADMIN_PASSWORD_HASH: "${hash}"`);
console.log();
