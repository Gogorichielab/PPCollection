const bcrypt = require('bcrypt');

function createAuthService({ adminUser, settingsRepository }) {
  return {
    async validateCredentials(username, password) {
      if (username !== adminUser) {
        return false;
      }

      const storedHash = settingsRepository.get('password_hash');
      if (!storedHash) {
        return false;
      }

      return await bcrypt.compare(password, storedHash);
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

    mustChangePassword() {
      const value = settingsRepository.get('must_change_password');
      return value === '1';
    },

    async initializePasswordHash(password) {
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
    }
  };
}

module.exports = { createAuthService };
