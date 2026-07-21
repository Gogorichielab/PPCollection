const { isValidIsoDate } = require('../../shared/utils/dates');

const LOCATION_MAX_LENGTH = 100;
const NOTES_MAX_LENGTH = 2000;
const MAX_ROUNDS_FIRED = 100000;

function sanitizeRangeSessionInput(body) {
  const rawRounds = body.rounds_fired;
  const hasRounds = rawRounds !== undefined && rawRounds !== null && String(rawRounds).trim() !== '';

  return {
    date: (body.date || '').trim(),
    location: (body.location || '').trim(),
    rounds_fired: hasRounds ? Number(rawRounds) : null,
    notes: (body.notes || '').trim()
  };
}

function validateRangeSessionInput(data) {
  const fieldErrors = {};

  if (!data.date) {
    fieldErrors.date = 'Date is required.';
  } else if (!isValidIsoDate(data.date)) {
    fieldErrors.date = 'Date must be a valid date in YYYY-MM-DD format.';
  }

  if (data.location.length > LOCATION_MAX_LENGTH) {
    fieldErrors.location = `Location must be ${LOCATION_MAX_LENGTH} characters or fewer.`;
  }

  if (data.notes.length > NOTES_MAX_LENGTH) {
    fieldErrors.notes = `Notes must be ${NOTES_MAX_LENGTH} characters or fewer.`;
  }

  if (data.rounds_fired !== null) {
    if (!Number.isInteger(data.rounds_fired)) {
      fieldErrors.rounds_fired = 'Rounds fired must be a whole number.';
    } else if (data.rounds_fired < 0) {
      fieldErrors.rounds_fired = 'Rounds fired cannot be negative.';
    } else if (data.rounds_fired > MAX_ROUNDS_FIRED) {
      fieldErrors.rounds_fired = `Rounds fired must be ${MAX_ROUNDS_FIRED} or less.`;
    }
  }

  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors
  };
}

module.exports = {
  sanitizeRangeSessionInput,
  validateRangeSessionInput,
  LOCATION_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  MAX_ROUNDS_FIRED
};
