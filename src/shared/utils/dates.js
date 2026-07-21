const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Strict YYYY-MM-DD check with a real-calendar round trip, so values like
// 2025-13-40 or 2025-02-30 are rejected. Log dates are compared as strings
// (e.g. by the cleaning-due rule), which is only safe with this format.
function isValidIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) {
    return false;
  }
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(timestamp)) {
    return false;
  }
  return new Date(timestamp).toISOString().slice(0, 10) === value;
}

module.exports = { isValidIsoDate };
