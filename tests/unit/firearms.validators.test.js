const {
  sanitizeFirearmInput,
  validateFirearmInput,
  FIELD_LIMITS,
  MAX_PURCHASE_PRICE
} = require('../../src/features/firearms/firearms.validators');

describe('firearms.validators', () => {
  test('sanitizeFirearmInput trims strings and normalizes values', () => {
    const data = sanitizeFirearmInput({
      make: '  Glock ',
      model: ' 19 ',
      purchase_price: '500.25',
      gun_warranty: 'on'
    });

    expect(data.make).toBe('Glock');
    expect(data.model).toBe('19');
    expect(data.purchase_price).toBe(500.25);
    expect(data.gun_warranty).toBe(1);
  });

  test('validateFirearmInput requires make and model', () => {
    const result = validateFirearmInput({ make: '', model: '' });

    expect(result.isValid).toBe(false);
    expect(result.fieldErrors).toEqual({
      make: 'Make is required.',
      model: 'Model is required.'
    });
  });

  test('validateFirearmInput rejects make exceeding length limit', () => {
    const result = validateFirearmInput({
      make: 'a'.repeat(FIELD_LIMITS.make + 1),
      model: 'M1'
    });

    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.make).toMatch(/100 characters or fewer/);
  });

  test('validateFirearmInput rejects notes exceeding length limit', () => {
    const result = validateFirearmInput({
      make: 'Glock',
      model: '19',
      notes: 'x'.repeat(FIELD_LIMITS.notes + 1)
    });

    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.notes).toMatch(/4000 characters or fewer/);
  });

  test('validateFirearmInput rejects purchase price above maximum', () => {
    const result = validateFirearmInput({
      make: 'Glock',
      model: '19',
      purchase_price: MAX_PURCHASE_PRICE + 1
    });

    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.purchase_price).toMatch(/or less/);
  });

  test('validateFirearmInput rejects NaN purchase price', () => {
    const result = validateFirearmInput({
      make: 'Glock',
      model: '19',
      purchase_price: Number.NaN
    });

    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.purchase_price).toBe('Purchase price must be a number.');
  });

  test('validateFirearmInput accepts a fully valid record', () => {
    const result = validateFirearmInput({
      make: 'Glock',
      model: '19',
      serial: 'ABC123',
      notes: 'normal notes',
      purchase_price: 500
    });

    expect(result.isValid).toBe(true);
    expect(result.fieldErrors).toEqual({});
  });
});
