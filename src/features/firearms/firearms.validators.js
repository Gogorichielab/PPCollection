const DISPOSITION_STATUSES = new Set(['sold', 'lost/stolen', 'lost', 'stolen']);

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

  if (data.purchase_price !== null && data.purchase_price < 0) {
    fieldErrors.purchase_price = 'Purchase price cannot be negative.';
  }

  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors
  };
}

module.exports = { sanitizeFirearmInput, validateFirearmInput, isDispositionStatus };
