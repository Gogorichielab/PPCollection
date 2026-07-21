const {
  sanitizeMaintenanceInput,
  validateMaintenanceInput,
  MAINTENANCE_TYPES,
  NOTES_MAX_LENGTH,
  MAX_ROUND_COUNT_DELTA
} = require('../../src/features/maintenance/maintenance.validators');

describe('sanitizeMaintenanceInput', () => {
  test('trims strings and converts an empty delta to null', () => {
    const result = sanitizeMaintenanceInput({
      date: ' 2025-06-01 ',
      type: ' Cleaning ',
      notes: ' Wiped down ',
      round_count_delta: ''
    });

    expect(result).toEqual({
      date: '2025-06-01',
      type: 'Cleaning',
      notes: 'Wiped down',
      round_count_delta: null
    });
  });

  test('converts a numeric delta string to a number', () => {
    expect(sanitizeMaintenanceInput({ round_count_delta: '150' }).round_count_delta).toBe(150);
    expect(sanitizeMaintenanceInput({ round_count_delta: '-25' }).round_count_delta).toBe(-25);
  });

  test('defaults missing fields to empty values', () => {
    expect(sanitizeMaintenanceInput({})).toEqual({
      date: '',
      type: '',
      notes: '',
      round_count_delta: null
    });
  });
});

describe('validateMaintenanceInput', () => {
  const VALID = { date: '2025-06-01', type: 'Cleaning', notes: '', round_count_delta: null };

  test('accepts a valid entry', () => {
    expect(validateMaintenanceInput(VALID)).toEqual({ isValid: true, fieldErrors: {} });
  });

  test('accepts every listed maintenance type', () => {
    for (const type of MAINTENANCE_TYPES) {
      expect(validateMaintenanceInput({ ...VALID, type }).isValid).toBe(true);
    }
  });

  test('requires a date', () => {
    const result = validateMaintenanceInput({ ...VALID, date: '' });
    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.date).toBe('Date is required.');
  });

  test.each(['2025-13-40', '2025-02-30', '01/02/2025', '2025-6-1', 'not-a-date'])(
    'rejects malformed date %s',
    (date) => {
      const result = validateMaintenanceInput({ ...VALID, date });
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors.date).toBe('Date must be a valid date in YYYY-MM-DD format.');
    }
  );

  test('requires a known type', () => {
    expect(validateMaintenanceInput({ ...VALID, type: '' }).fieldErrors.type).toBe('Type is required.');
    expect(validateMaintenanceInput({ ...VALID, type: 'Polishing' }).fieldErrors.type).toBe(
      'Type must be one of the listed maintenance types.'
    );
  });

  test('rejects notes over the limit', () => {
    const result = validateMaintenanceInput({ ...VALID, notes: 'x'.repeat(NOTES_MAX_LENGTH + 1) });
    expect(result.fieldErrors.notes).toBe(`Notes must be ${NOTES_MAX_LENGTH} characters or fewer.`);
  });

  test('rejects a non-integer round count adjustment', () => {
    const result = validateMaintenanceInput({ ...VALID, round_count_delta: 1.5 });
    expect(result.fieldErrors.round_count_delta).toBe('Round count adjustment must be a whole number.');
  });

  test('rejects a round count adjustment outside the allowed range', () => {
    const result = validateMaintenanceInput({ ...VALID, round_count_delta: MAX_ROUND_COUNT_DELTA + 1 });
    expect(result.isValid).toBe(false);
    expect(validateMaintenanceInput({ ...VALID, round_count_delta: -MAX_ROUND_COUNT_DELTA }).isValid).toBe(true);
  });
});
