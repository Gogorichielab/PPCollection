const bcrypt = require('bcrypt');
const { timingSafeEqual } = require('crypto');
const {
  parseMaintenanceDueDays,
  MAINTENANCE_DUE_SETTING_KEY,
  MIN_CLEANING_DUE_DAYS,
  MAX_CLEANING_DUE_DAYS
} = require('../maintenance/maintenance.service');

// A pre-computed bcrypt hash of an unguessable value, used to equalise the
// wall-clock time of a wrong-username login with a wrong-password login.
// Format is a valid bcrypt hash so bcrypt.compare runs the full key-derivation.
const DUMMY_BCRYPT_HASH = '$2b$12$abcdefghijklmnopqrstuuM/T7lGZcZjV0L9j3gqpcgZMQzFvE.4Qm';

function safeStringEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function createAuthService({ adminUser, settingsRepository }) {
  return {
    getUsername() {
      return settingsRepository.get('username') || adminUser;
    },

    async validateCredentials(username, password) {
      const storedHash = settingsRepository.get('password_hash');
      const hashForCompare = storedHash || DUMMY_BCRYPT_HASH;
      const usernameMatches = safeStringEqual(username, this.getUsername());

      // Always run bcrypt.compare so attackers can't distinguish a missing user
      // (or missing hash) from a wrong password by measuring response time.
      const passwordMatches = await bcrypt.compare(password, hashForCompare);

      return Boolean(storedHash) && usernameMatches && passwordMatches;
    },

    async changePassword(currentPassword, newPassword) {
      const storedHash = settingsRepository.get('password_hash');
      if (!storedHash) {
        throw new Error('No password hash found');
      }

      const valid = await bcrypt.compare(currentPassword, storedHash);
      if (!valid) {
        return { success: false, error: 'Current password is incorrect.' };
      }

      if (newPassword.length < 12) {
        return { success: false, error: 'New password must be at least 12 characters.' };
      }

      const newHash = await bcrypt.hash(newPassword, 12);
      settingsRepository.set('password_hash', newHash);
      settingsRepository.set('must_change_password', '0');

      return { success: true };
    },

    updateUsername(newUsername) {
      const normalizedUsername = (newUsername || '').trim();

      if (normalizedUsername.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters.' };
      }

      settingsRepository.set('username', normalizedUsername);
      return { success: true, username: normalizedUsername };
    },

    mustChangePassword() {
      const value = settingsRepository.get('must_change_password');
      return value === '1';
    },

    async initializePasswordHash(password) {
      if (!settingsRepository.exists('username')) {
        settingsRepository.set('username', adminUser);
      }

      if (!settingsRepository.exists('password_hash')) {
        const hash = await bcrypt.hash(password, 12);
        settingsRepository.set('password_hash', hash);
        settingsRepository.set('must_change_password', '1');
      }
    },

    getTheme() {
      return settingsRepository.get('theme') || 'dark';
    },

    setTheme(theme) {
      if (theme !== 'dark' && theme !== 'light') {
        throw new Error('Invalid theme value');
      }
      settingsRepository.set('theme', theme);
    },

    getUpdateCheckEnabled() {
      return settingsRepository.get('update_check_enabled') === '1';
    },

    setUpdateCheckEnabled(enabled) {
      settingsRepository.set('update_check_enabled', enabled ? '1' : '0');
    },

    getMaintenanceDueDays() {
      return parseMaintenanceDueDays(settingsRepository.get(MAINTENANCE_DUE_SETTING_KEY));
    },

    setMaintenanceDueDays(value) {
      const parsed = Number(String(value ?? '').trim());
      if (!Number.isInteger(parsed) || parsed < MIN_CLEANING_DUE_DAYS || parsed > MAX_CLEANING_DUE_DAYS) {
        throw new Error(
          `Cleaning reminder must be a whole number of days between ${MIN_CLEANING_DUE_DAYS} and ${MAX_CLEANING_DUE_DAYS}.`
        );
      }
      settingsRepository.set(MAINTENANCE_DUE_SETTING_KEY, String(parsed));
    }
  };
}

module.exports = { createAuthService };
