const DISPOSITION_STATUSES = new Set(['sold', 'lost/stolen', 'lost', 'stolen']);

const FIELD_LIMITS = {
  make: 100,
  model: 100,
  serial: 64,
  caliber: 50,
  firearm_type: 50,
  condition: 50,
  location: 100,
  status: 50,
  purchase_date: 32,
  disposition_name: 100,
  disposition_address: 200,
  disposition_date: 32,
  disposition_reason: 500,
  notes: 4000
};

const MAX_PURCHASE_PRICE = 1_000_000;

function isDispositionStatus(status) {
  return DISPOSITION_STATUSES.has(String(status || '').trim().toLowerCase());
}

function sanitizeFirearmInput(body) {
  const status = (body.status || '').trim();

  return {
    make: (body.make || '').trim(),
    model: (body.model || '').trim(),
    serial: (body.serial || '').trim(),
    caliber: (body.caliber || '').trim(),
    purchase_date: (body.purchase_date || '').trim(),
    purchase_price: body.purchase_price ? Number(body.purchase_price) : null,
    condition: (body.condition || '').trim(),
    location: (body.location || '').trim(),
    status,
    disposition_name: isDispositionStatus(status) ? (body.disposition_name || '').trim() : '',
    disposition_address: isDispositionStatus(status) ? (body.disposition_address || '').trim() : '',
    disposition_date: isDispositionStatus(status) ? (body.disposition_date || '').trim() : '',
    disposition_reason: isDispositionStatus(status) ? (body.disposition_reason || '').trim() : '',
    notes: (body.notes || '').trim(),
    gun_warranty: body.gun_warranty ? 1 : 0,
    firearm_type: (body.firearm_type || '').trim()
  };
}

function validateFirearmInput(data) {
  const fieldErrors = {};

  if (!data.make) {
    fieldErrors.make = 'Make is required.';
  }

  if (!data.model) {
    fieldErrors.model = 'Model is required.';
  }

  for (const [field, maxLength] of Object.entries(FIELD_LIMITS)) {
    const value = data[field];
    if (typeof value === 'string' && value.length > maxLength) {
      fieldErrors[field] = fieldErrors[field] || `${humanizeField(field)} must be ${maxLength} characters or fewer.`;
    }
  }

  if (data.purchase_price !== null) {
    if (Number.isNaN(data.purchase_price)) {
      fieldErrors.purchase_price = 'Purchase price must be a number.';
    } else if (data.purchase_price < 0) {
      fieldErrors.purchase_price = 'Purchase price cannot be negative.';
    } else if (data.purchase_price > MAX_PURCHASE_PRICE) {
      fieldErrors.purchase_price = `Purchase price must be ${MAX_PURCHASE_PRICE.toLocaleString()} or less.`;
    }
  }

  if (isDispositionStatus(data.status)) {
    if (!data.disposition_name) {
      fieldErrors.disposition_name = `Transferred/Sold To is required when status is ${data.status}.`;
    }
    if (!data.disposition_date) {
      fieldErrors.disposition_date = `Date of Transfer is required when status is ${data.status}.`;
    }
  }

  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors
  };
}

function humanizeField(field) {
  return field
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

module.exports = {
  sanitizeFirearmInput,
  validateFirearmInput,
  isDispositionStatus,
  FIELD_LIMITS,
  MAX_PURCHASE_PRICE
};
