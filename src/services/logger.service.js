function writeLog(level, event, meta = {}) {
  const entry = {
    ...meta,
    ts: new Date().toISOString(),
    level,
    event
  };
  const serialized = JSON.stringify(entry);

  if (level === 'error') {
    console.error(serialized);
  } else if (level === 'warn') {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }

  return entry;
}

function info(event, meta) {
  return writeLog('info', event, meta);
}

function warn(event, meta) {
  return writeLog('warn', event, meta);
}

function error(event, meta) {
  return writeLog('error', event, meta);
}

module.exports = { info, warn, error };
