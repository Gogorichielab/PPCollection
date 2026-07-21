const { isValidIsoDate } = require('../../shared/utils/dates');

const MAINTENANCE_TYPES = ['Cleaning', 'Repair', 'Part Replacement', 'Inspection', 'Other'];

const NOTES_MAX_LENGTH = 2000;
const MAX_ROUND_COUNT_DELTA = 100000;

function sanitizeMaintenanceInput(body) {
  const rawDelta = body.round_count_delta;
  const hasDelta = rawDelta !== undefined && rawDelta !== null && String(rawDelta).trim() !== '';

  return {
    date: (body.date || '').trim(),
    type: (body.type || '').trim(),
    notes: (body.notes || '').trim(),
    round_count_delta: hasDelta ? Number(rawDelta) : null
  };
}

function validateMaintenanceInput(data) {
  const fieldErrors = {};

  if (!data.date) {
    fieldErrors.date = 'Date is required.';
  } else if (!isValidIsoDate(data.date)) {
    fieldErrors.date = 'Date must be a valid date in YYYY-MM-DD format.';
  }

  if (!data.type) {
    fieldErrors.type = 'Type is required.';
  } else if (!MAINTENANCE_TYPES.includes(data.type)) {
    fieldErrors.type = 'Type must be one of the listed maintenance types.';
  }

  if (data.notes.length > NOTES_MAX_LENGTH) {
    fieldErrors.notes = `Notes must be ${NOTES_MAX_LENGTH} characters or fewer.`;
  }

  if (data.round_count_delta !== null) {
    if (!Number.isInteger(data.round_count_delta)) {
      fieldErrors.round_count_delta = 'Round count adjustment must be a whole number.';
    } else if (Math.abs(data.round_count_delta) > MAX_ROUND_COUNT_DELTA) {
      fieldErrors.round_count_delta = `Round count adjustment must be between -${MAX_ROUND_COUNT_DELTA} and ${MAX_ROUND_COUNT_DELTA}.`;
    }
  }

  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors
  };
}

module.exports = {
  sanitizeMaintenanceInput,
  validateMaintenanceInput,
  MAINTENANCE_TYPES,
  NOTES_MAX_LENGTH,
  MAX_ROUND_COUNT_DELTA
};
