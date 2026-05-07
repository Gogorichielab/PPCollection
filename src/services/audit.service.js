// Lightweight structured audit log to stdout. Picked up by Docker / journald
// log collectors without adding a new sink. Sensitive fields are gated behind
// AUDIT_VERBOSE so the default log stream stays free of PII.
function auditLog(event, meta = {}) {
  if (process.env.NODE_ENV === 'test') return;

  const verbose = process.env.AUDIT_VERBOSE === 'true';
  const entry = { ts: new Date().toISOString(), event, ...meta };

  if (!verbose) {
    delete entry.username;
    delete entry.serial;
  }

  console.log(JSON.stringify(entry));
}

module.exports = { auditLog };
