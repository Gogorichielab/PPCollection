const { sanitizeFirearmInput, validateFirearmInput } = require('../../src/features/firearms/firearms.validators');

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
});
