const { validateSetupSubmission } = require('./setup.validators');

const CODE_ERROR = 'That setup code is not valid. Check the container logs for the current code.';
const ALREADY_COMPLETE_ERROR = 'Setup has already been completed. Sign in with your administrator account.';

function createSetupService({ authService, setupCodeStore }) {
  return {
    // Read from the database on every call rather than cached at boot, so the
    // wizard closes the instant an account exists — including for requests
    // already in flight in this same process.
    isAvailable() {
      return !authService.isInitialized();
    },

    async completeSetup({ username, password, confirmPassword, code }) {
      if (!this.isAvailable()) {
        return { success: false, error: ALREADY_COMPLETE_ERROR, alreadyComplete: true };
      }

      // The code is checked before the submitted fields so a wrong code never
      // reveals whether the rest of the form would have been accepted.
      if (!setupCodeStore.matches(code)) {
        return { success: false, error: CODE_ERROR, codeRejected: true };
      }

      const validation = validateSetupSubmission({ username, password, confirmPassword });
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const claimed = await authService.claimAdministratorAccount(validation.username, validation.password);
      if (!claimed) {
        // Another request won the race between isAvailable() and the insert.
        return { success: false, error: ALREADY_COMPLETE_ERROR, alreadyComplete: true };
      }

      setupCodeStore.consume();
      return { success: true, username: validation.username };
    }
  };
}

module.exports = { createSetupService, CODE_ERROR, ALREADY_COMPLETE_ERROR };
