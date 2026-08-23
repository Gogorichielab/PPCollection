const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 64;
const MIN_PASSWORD_LENGTH = 12;
// bcrypt only consumes the first 72 bytes; the cap just keeps absurd payloads
// out of the hasher and matches the field limits used elsewhere in the app.
const MAX_PASSWORD_LENGTH = 200;
const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;

function validateSetupSubmission({ username, password, confirmPassword }) {
  const normalizedUsername = String(username ?? '').trim();

  if (normalizedUsername.length < MIN_USERNAME_LENGTH) {
    return { valid: false, error: `Username must be at least ${MIN_USERNAME_LENGTH} characters.` };
  }

  if (normalizedUsername.length > MAX_USERNAME_LENGTH) {
    return { valid: false, error: `Username must be ${MAX_USERNAME_LENGTH} characters or fewer.` };
  }

  if (!USERNAME_PATTERN.test(normalizedUsername)) {
    return {
      valid: false,
      error: 'Username may only contain letters, numbers, dots, underscores, and hyphens.'
    };
  }

  const rawPassword = String(password ?? '');

  if (rawPassword.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  if (rawPassword.length > MAX_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.` };
  }

  if (rawPassword !== String(confirmPassword ?? '')) {
    return { valid: false, error: 'Passwords do not match.' };
  }

  return { valid: true, username: normalizedUsername, password: rawPassword };
}

module.exports = {
  validateSetupSubmission,
  MIN_USERNAME_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH
};
