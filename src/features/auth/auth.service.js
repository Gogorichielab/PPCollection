const bcrypt = require('bcrypt');

function createAuthService({ adminUser, settingsRepository }) {
  function recordFailedAttempt() {
    const raw = settingsRepository.get('login_failed_attempts');
    const attempts = parseInt(raw || '0', 10) + 1;
    settingsRepository.set('login_failed_attempts', String(attempts));

    if (attempts >= 5) {
      const lockoutUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      settingsRepository.set('login_lockout_until', lockoutUntil);
    }
  }

  return {
    getUsername() {
      return settingsRepository.get('username') || adminUser;
    },

    async validateCredentials(username, password) {
      const lockoutUntil = settingsRepository.get('login_lockout_until');
      if (lockoutUntil) {
        const lockoutTime = new Date(lockoutUntil);
        if (lockoutTime > new Date()) {
          return { valid: false, lockedUntil: lockoutTime };
        }
        settingsRepository.set('login_lockout_until', '');
        settingsRepository.set('login_failed_attempts', '0');
      }

      if (username !== this.getUsername()) {
        recordFailedAttempt();
        return { valid: false };
      }

      const storedHash = settingsRepository.get('password_hash');
      if (!storedHash) {
        recordFailedAttempt();
        return { valid: false };
      }

      const matches = await bcrypt.compare(password, storedHash);
      if (!matches) {
        recordFailedAttempt();
        return { valid: false };
      }

      settingsRepository.set('login_failed_attempts', '0');
      settingsRepository.set('login_lockout_until', '');
      return { valid: true };
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

      const nextVersion = (parseInt(settingsRepository.get('session_version') || '0', 10) + 1).toString();
      settingsRepository.set('session_version', nextVersion);

      return { success: true };
    },

    getSessionVersion() {
      return settingsRepository.get('session_version') || '0';
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
    }
  };
}

module.exports = { createAuthService };
