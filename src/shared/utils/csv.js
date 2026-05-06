function parseCsv(text) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i <= normalized.length; i++) {
    const ch = i < normalized.length ? normalized[i] : undefined;
    const atEnd = ch === undefined;

    if (inQuotes && !atEnd) {
      if (ch === '"' && normalized[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || atEnd) {
      // An unclosed quote at end-of-input — flush whatever was accumulated
      // rather than swallowing the partial row silently.
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) {
        rows.push(row);
      }
      row = [];
      inQuotes = false;
    } else {
      field += ch;
    }
  }

  return rows;
}

function escapeCsvValue(value) {
  const stringValue = String(value);
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function toCsv(headers, rows) {
  const csvLines = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => row.map(escapeCsvValue).join(','))
  ];

  return csvLines.join('\n');
}

module.exports = { parseCsv, toCsv };
