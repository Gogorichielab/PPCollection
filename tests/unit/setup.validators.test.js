const { validateSetupSubmission } = require('../../src/features/setup/setup.validators');

const VALID = {
  username: 'range.boss',
  password: 'CorrectHorseBattery',
  confirmPassword: 'CorrectHorseBattery'
};

describe('validateSetupSubmission', () => {
  test('accepts a well-formed submission', () => {
    expect(validateSetupSubmission(VALID)).toEqual({
      valid: true,
      username: 'range.boss',
      password: 'CorrectHorseBattery'
    });
  });

  test('trims surrounding whitespace from the username', () => {
    const result = validateSetupSubmission({ ...VALID, username: '  range.boss  ' });
    expect(result.username).toBe('range.boss');
  });

  test.each([['admin'], ['a_b-c.d'], ['User123']])('accepts the username %s', (username) => {
    expect(validateSetupSubmission({ ...VALID, username }).valid).toBe(true);
  });

  test.each([
    ['too short', 'ab', /at least 3/],
    ['empty', '', /at least 3/],
    ['too long', 'a'.repeat(65), /64 characters or fewer/],
    ['with a space', 'range boss', /letters, numbers/],
    ['with a slash', 'range/boss', /letters, numbers/],
    ['with an angle bracket', '<script>', /letters, numbers/]
  ])('rejects a username that is %s', (_label, username, pattern) => {
    const result = validateSetupSubmission({ ...VALID, username });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(pattern);
  });

  test.each([[null], [undefined]])('rejects a %s username', (username) => {
    expect(validateSetupSubmission({ ...VALID, username }).valid).toBe(false);
  });

  test('rejects a password shorter than 12 characters', () => {
    const result = validateSetupSubmission({
      ...VALID,
      password: 'elevenchars',
      confirmPassword: 'elevenchars'
    });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/at least 12/);
  });

  test('accepts a password of exactly 12 characters', () => {
    const password = 'a'.repeat(12);
    expect(validateSetupSubmission({ ...VALID, password, confirmPassword: password }).valid).toBe(true);
  });

  test('rejects an over-long password', () => {
    const password = 'a'.repeat(201);
    const result = validateSetupSubmission({ ...VALID, password, confirmPassword: password });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/200 characters or fewer/);
  });

  test('rejects a mismatched confirmation', () => {
    const result = validateSetupSubmission({ ...VALID, confirmPassword: 'CorrectHorseBatteryX' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Passwords do not match.');
  });

  test('reports the length problem before the mismatch', () => {
    const result = validateSetupSubmission({ ...VALID, password: 'short', confirmPassword: 'different' });
    expect(result.error).toMatch(/at least 12/);
  });

  test('never returns the password on a rejection', () => {
    const result = validateSetupSubmission({ ...VALID, username: 'x' });
    expect(result.password).toBeUndefined();
  });
});
