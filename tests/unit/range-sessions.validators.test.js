const {
  sanitizeRangeSessionInput,
  validateRangeSessionInput,
  LOCATION_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  MAX_ROUNDS_FIRED
} = require('../../src/features/range-sessions/range-sessions.validators');

describe('sanitizeRangeSessionInput', () => {
  test('trims strings and converts an empty rounds count to null', () => {
    const result = sanitizeRangeSessionInput({
      date: ' 2025-06-01 ',
      location: ' Indoor Range ',
      rounds_fired: '',
      notes: ' Good session '
    });

    expect(result).toEqual({
      date: '2025-06-01',
      location: 'Indoor Range',
      rounds_fired: null,
      notes: 'Good session'
    });
  });

  test('converts a numeric rounds string to a number', () => {
    expect(sanitizeRangeSessionInput({ rounds_fired: '200' }).rounds_fired).toBe(200);
  });

  test('defaults missing fields to empty values', () => {
    expect(sanitizeRangeSessionInput({})).toEqual({
      date: '',
      location: '',
      rounds_fired: null,
      notes: ''
    });
  });
});

describe('validateRangeSessionInput', () => {
  const VALID = { date: '2025-06-01', location: 'Outdoor Range', rounds_fired: 150, notes: '' };

  test('accepts a valid session', () => {
    expect(validateRangeSessionInput(VALID)).toEqual({ isValid: true, fieldErrors: {} });
  });

  test('accepts optional fields left empty', () => {
    expect(validateRangeSessionInput({ ...VALID, location: '', rounds_fired: null }).isValid).toBe(true);
  });

  test('requires a date', () => {
    const result = validateRangeSessionInput({ ...VALID, date: '' });
    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.date).toBe('Date is required.');
  });

  test.each(['2025-02-30', '06/01/2025', 'soon'])('rejects malformed date %s', (date) => {
    const result = validateRangeSessionInput({ ...VALID, date });
    expect(result.fieldErrors.date).toBe('Date must be a valid date in YYYY-MM-DD format.');
  });

  test('rejects a location over the limit', () => {
    const result = validateRangeSessionInput({ ...VALID, location: 'x'.repeat(LOCATION_MAX_LENGTH + 1) });
    expect(result.fieldErrors.location).toBe(`Location must be ${LOCATION_MAX_LENGTH} characters or fewer.`);
  });

  test('rejects notes over the limit', () => {
    const result = validateRangeSessionInput({ ...VALID, notes: 'x'.repeat(NOTES_MAX_LENGTH + 1) });
    expect(result.fieldErrors.notes).toBe(`Notes must be ${NOTES_MAX_LENGTH} characters or fewer.`);
  });

  test('rejects invalid rounds fired values', () => {
    expect(validateRangeSessionInput({ ...VALID, rounds_fired: 1.5 }).fieldErrors.rounds_fired).toBe(
      'Rounds fired must be a whole number.'
    );
    expect(validateRangeSessionInput({ ...VALID, rounds_fired: -1 }).fieldErrors.rounds_fired).toBe(
      'Rounds fired cannot be negative.'
    );
    expect(validateRangeSessionInput({ ...VALID, rounds_fired: MAX_ROUNDS_FIRED + 1 }).fieldErrors.rounds_fired).toBe(
      `Rounds fired must be ${MAX_ROUNDS_FIRED} or less.`
    );
    expect(validateRangeSessionInput({ ...VALID, rounds_fired: MAX_ROUNDS_FIRED }).isValid).toBe(true);
  });
});
