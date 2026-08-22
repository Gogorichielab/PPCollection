const FIELD_LIMITS = {
  manufacturer: 100,
  product_line: 100,
  caliber: 50,
  load_type: 100,
  location: 100,
  notes: 4000
};

function humanizeField(field) {
  return field
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function toQuantity(rawValue) {
  const trimmed = String(rawValue ?? '').trim();
  return trimmed === '' ? 0 : Number(trimmed);
}

function sanitizeAmmoInput(body) {
  const rawGrain = body.grain;
  const hasGrain = rawGrain !== undefined && rawGrain !== null && String(rawGrain).trim() !== '';

  return {
    manufacturer: (body.manufacturer || '').trim(),
    product_line: (body.product_line || '').trim(),
    caliber: (body.caliber || '').trim(),
    grain: hasGrain ? Number(rawGrain) : null,
    load_type: (body.load_type || '').trim(),
    boxes: toQuantity(body.boxes),
    rounds_per_box: toQuantity(body.rounds_per_box),
    loose_rounds: toQuantity(body.loose_rounds),
    location: (body.location || '').trim(),
    notes: (body.notes || '').trim()
  };
}

function validateAmmoInput(data) {
  const fieldErrors = {};

  if (!data.manufacturer) {
    fieldErrors.manufacturer = 'Manufacturer is required.';
  }

  if (!data.caliber) {
    fieldErrors.caliber = 'Caliber is required.';
  }

  if (data.grain !== null) {
    if (!Number.isInteger(data.grain) || data.grain < 0) {
      fieldErrors.grain = 'Grain must be a non-negative whole number, or left blank.';
    }
  }

  for (const [field, label] of [
    ['boxes', 'Boxes'],
    ['rounds_per_box', 'Rounds per box'],
    ['loose_rounds', 'Loose rounds']
  ]) {
    const value = data[field];
    if (!Number.isInteger(value)) {
      fieldErrors[field] = `${label} must be a whole number.`;
    } else if (value < 0) {
      fieldErrors[field] = `${label} cannot be negative.`;
    }
  }

  for (const [field, maxLength] of Object.entries(FIELD_LIMITS)) {
    if (!fieldErrors[field] && data[field] && data[field].length > maxLength) {
      fieldErrors[field] = `${humanizeField(field)} must be ${maxLength} characters or fewer.`;
    }
  }

  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors
  };
}

module.exports = { sanitizeAmmoInput, validateAmmoInput, FIELD_LIMITS };
