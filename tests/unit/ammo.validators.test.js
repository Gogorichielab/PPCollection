const {
  sanitizeAmmoInput,
  validateAmmoInput,
  FIELD_LIMITS
} = require('../../src/features/ammo/ammo.validators');

const VALID_QUANTITIES = { boxes: 2, rounds_per_box: 50, loose_rounds: 5 };

describe('ammo.validators', () => {
  describe('sanitizeAmmoInput', () => {
    test('trims strings and defaults quantity fields to 0 when blank', () => {
      const data = sanitizeAmmoInput({
        manufacturer: '  Federal ',
        product_line: ' American Eagle ',
        caliber: ' 9mm Luger ',
        load_type: ' FMJ ',
        location: ' Safe ',
        notes: ' notes '
      });

      expect(data.manufacturer).toBe('Federal');
      expect(data.product_line).toBe('American Eagle');
      expect(data.caliber).toBe('9mm Luger');
      expect(data.load_type).toBe('FMJ');
      expect(data.location).toBe('Safe');
      expect(data.notes).toBe('notes');
      expect(data.boxes).toBe(0);
      expect(data.rounds_per_box).toBe(0);
      expect(data.loose_rounds).toBe(0);
    });

    test('grain coerces to a number when present and null when blank', () => {
      expect(sanitizeAmmoInput({ grain: '115' }).grain).toBe(115);
      expect(sanitizeAmmoInput({ grain: '' }).grain).toBeNull();
      expect(sanitizeAmmoInput({ grain: undefined }).grain).toBeNull();
      expect(sanitizeAmmoInput({ grain: '  ' }).grain).toBeNull();
    });

    test('quantity fields coerce numeric strings', () => {
      const data = sanitizeAmmoInput({ boxes: '4', rounds_per_box: '50', loose_rounds: '12' });

      expect(data.boxes).toBe(4);
      expect(data.rounds_per_box).toBe(50);
      expect(data.loose_rounds).toBe(12);
    });
  });

  describe('validateAmmoInput', () => {
    test('requires manufacturer and caliber', () => {
      const result = validateAmmoInput({ manufacturer: '', caliber: '', grain: null, ...VALID_QUANTITIES });

      expect(result.isValid).toBe(false);
      expect(result.fieldErrors.manufacturer).toBe('Manufacturer is required.');
      expect(result.fieldErrors.caliber).toBe('Caliber is required.');
    });

    test('allows blank product_line and load_type', () => {
      const result = validateAmmoInput({
        manufacturer: 'Federal',
        caliber: '9mm Luger',
        product_line: '',
        load_type: '',
        grain: null,
        ...VALID_QUANTITIES
      });

      expect(result.isValid).toBe(true);
      expect(result.fieldErrors.product_line).toBeUndefined();
      expect(result.fieldErrors.load_type).toBeUndefined();
    });

    test('grain: null is valid, 0 is valid, negative and non-integer are rejected', () => {
      const base = { manufacturer: 'Federal', caliber: '9mm Luger', ...VALID_QUANTITIES };

      expect(validateAmmoInput({ ...base, grain: null }).isValid).toBe(true);
      expect(validateAmmoInput({ ...base, grain: 0 }).isValid).toBe(true);
      expect(validateAmmoInput({ ...base, grain: -5 }).fieldErrors.grain).toMatch(/non-negative/);
      expect(validateAmmoInput({ ...base, grain: 1.5 }).fieldErrors.grain).toMatch(/non-negative/);
    });

    test.each(['boxes', 'rounds_per_box', 'loose_rounds'])(
      '%s: 0 is valid, negative is rejected (explicit acceptance criterion), non-integer is rejected',
      (field) => {
        const base = { manufacturer: 'Federal', caliber: '9mm Luger', grain: null, ...VALID_QUANTITIES };

        expect(validateAmmoInput({ ...base, [field]: 0 }).isValid).toBe(true);

        const negativeResult = validateAmmoInput({ ...base, [field]: -1 });
        expect(negativeResult.isValid).toBe(false);
        expect(negativeResult.fieldErrors[field]).toMatch(/cannot be negative/);

        const nonIntegerResult = validateAmmoInput({ ...base, [field]: 1.5 });
        expect(nonIntegerResult.isValid).toBe(false);
        expect(nonIntegerResult.fieldErrors[field]).toMatch(/whole number/);
      }
    );

    test('rejects fields exceeding FIELD_LIMITS and accepts exactly-at-limit values', () => {
      const base = { manufacturer: 'Federal', caliber: '9mm Luger', grain: null, ...VALID_QUANTITIES };

      const atLimit = validateAmmoInput({ ...base, notes: 'x'.repeat(FIELD_LIMITS.notes) });
      expect(atLimit.isValid).toBe(true);

      const overLimit = validateAmmoInput({ ...base, notes: 'x'.repeat(FIELD_LIMITS.notes + 1) });
      expect(overLimit.isValid).toBe(false);
      expect(overLimit.fieldErrors.notes).toMatch(/4000 characters or fewer/);

      const overCaliber = validateAmmoInput({ ...base, caliber: 'x'.repeat(FIELD_LIMITS.caliber + 1) });
      expect(overCaliber.isValid).toBe(false);
      expect(overCaliber.fieldErrors.caliber).toMatch(/50 characters or fewer/);
    });

    test('accepts a fully valid payload', () => {
      const result = validateAmmoInput({
        manufacturer: 'Federal',
        product_line: 'American Eagle',
        caliber: '9mm Luger',
        grain: 115,
        load_type: 'FMJ',
        boxes: 4,
        rounds_per_box: 50,
        loose_rounds: 12,
        location: 'Safe',
        notes: ''
      });

      expect(result.isValid).toBe(true);
      expect(result.fieldErrors).toEqual({});
    });
  });
});
