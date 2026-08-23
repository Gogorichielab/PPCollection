const bcrypt = require('bcrypt');
const { safeStringEqual } = require('../../shared/utils/timing-safe');
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

    isInitialized() {
      return settingsRepository.exists('password_hash');
    },

    // Seeds the admin from ADMIN_USERNAME / ADMIN_PASSWORD. Retained so existing
    // deployments that set those variables keep booting unattended; a fresh
    // install with no ADMIN_PASSWORD goes through the /setup wizard instead.
    async initializePasswordHash(password) {
      if (!settingsRepository.exists('username')) {
        settingsRepository.set('username', adminUser);
      }

      if (settingsRepository.exists('password_hash')) return;

      // Hash before opening the transaction — better-sqlite3 transactions are
      // synchronous and cannot await.
      const hash = await bcrypt.hash(password, 12);
      settingsRepository.transaction(() => {
        if (!settingsRepository.insertIfAbsent('password_hash', hash)) return;
        // Written in the same transaction as the hash so a crash can never
        // leave a seeded account that is never prompted to change its password.
        settingsRepository.set('must_change_password', '1');
      });
    },

    // Claims the single administrator slot for the first-run wizard. The
    // conditional insert is what decides the winner when two setup requests
    // race; the loser sees `false` and is told setup is already complete.
    // No forced password change follows — the operator chose this password.
    async claimAdministratorAccount(username, password) {
      const hash = await bcrypt.hash(password, 12);

      return settingsRepository.transaction(() => {
        if (!settingsRepository.insertIfAbsent('password_hash', hash)) return false;
        settingsRepository.set('username', username);
        settingsRepository.set('must_change_password', '0');
        return true;
      });
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
