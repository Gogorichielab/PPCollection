const { randomInt } = require('crypto');
const { safeStringEqual } = require('../../shared/utils/timing-safe');

// Excludes 0/1/I/L/O/U so a code read off a terminal cannot be mistyped into a
// different valid-looking code. 30 symbols over 12 characters is ~59 bits.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const GROUP_COUNT = 3;
const GROUP_SIZE = 4;

function generateSetupCode() {
  const groups = [];
  for (let group = 0; group < GROUP_COUNT; group += 1) {
    let chunk = '';
    for (let i = 0; i < GROUP_SIZE; i += 1) {
      // randomInt is rejection-sampled, so no modulo bias across the alphabet.
      chunk += ALPHABET[randomInt(0, ALPHABET.length)];
    }
    groups.push(chunk);
  }
  return groups.join('-');
}

// Accepts the code however the operator retyped it: lowercase, without the
// dashes, or with stray whitespace pasted from a terminal.
function normalizeSetupCode(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

// Holds the code for the lifetime of the process. A restart issues a new one,
// and completing setup consumes this one, so a code can never be replayed.
function createSetupCodeStore({ code = generateSetupCode() } = {}) {
  let active = code;

  return {
    get code() {
      return active;
    },

    isActive() {
      return active !== null;
    },

    matches(candidate) {
      if (active === null) return false;
      return safeStringEqual(normalizeSetupCode(candidate), normalizeSetupCode(active));
    },

    consume() {
      active = null;
    }
  };
}

module.exports = { createSetupCodeStore, generateSetupCode, normalizeSetupCode };
