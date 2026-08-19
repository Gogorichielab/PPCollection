const { timingSafeEqual } = require('crypto');

// Constant-time string comparison. Length is compared first and leaks, which is
// acceptable for the secrets this guards (fixed-length setup codes, usernames);
// what matters is that no early-exit reveals *where* two equal-length values
// diverge.
function safeStringEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

module.exports = { safeStringEqual };
