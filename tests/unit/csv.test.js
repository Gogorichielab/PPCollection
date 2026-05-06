const { parseCsv } = require('../../src/shared/utils/csv');

describe('parseCsv', () => {
  test('parses a simple CSV with header and one row', () => {
    const text = 'Make,Model,Serial\nGlock,19,ABC123';
    expect(parseCsv(text)).toEqual([
      ['Make', 'Model', 'Serial'],
      ['Glock', '19', 'ABC123']
    ]);
  });

  test('handles quoted fields containing commas', () => {
    const text = 'Make,Notes\nGlock,"Bought at, local shop"';
    expect(parseCsv(text)).toEqual([
      ['Make', 'Notes'],
      ['Glock', 'Bought at, local shop']
    ]);
  });

  test('handles escaped double quotes inside quoted fields', () => {
    const text = 'Make,Notes\nGlock,"Has ""great"" trigger"';
    expect(parseCsv(text)).toEqual([
      ['Make', 'Notes'],
      ['Glock', 'Has "great" trigger']
    ]);
  });

  test('handles Windows-style CRLF line endings', () => {
    const text = 'Make,Model\r\nGlock,19\r\nSig,P320';
    expect(parseCsv(text)).toEqual([
      ['Make', 'Model'],
      ['Glock', '19'],
      ['Sig', 'P320']
    ]);
  });

  test('skips blank lines', () => {
    const text = 'Make,Model\nGlock,19\n\nSig,P320';
    expect(parseCsv(text)).toEqual([
      ['Make', 'Model'],
      ['Glock', '19'],
      ['Sig', 'P320']
    ]);
  });

  test('returns empty array for empty string', () => {
    expect(parseCsv('')).toEqual([]);
  });

  test('returns only headers row when no data rows present', () => {
    expect(parseCsv('Make,Model\n')).toEqual([['Make', 'Model']]);
  });

  test('whitespace-only rows are ignored', () => {
    const text = 'Make,Model\nGlock,19\n   \n\t\nSig,P320';
    expect(parseCsv(text)).toEqual([
      ['Make', 'Model'],
      ['Glock', '19'],
      ['Sig', 'P320']
    ]);
  });

  test('unclosed quote does not throw and consumes rest of input as one field', () => {
    const text = 'Make,Notes\nGlock,"Bought at local shop\nSig,P320';
    expect(() => parseCsv(text)).not.toThrow();
    const rows = parseCsv(text);
    expect(rows[0]).toEqual(['Make', 'Notes']);
    expect(rows[1][0]).toBe('Glock');
    expect(rows[1][1]).toContain('Bought at local shop');
  });

  test('CRLF and lone CR line endings are normalised', () => {
    const crlf = 'Make,Model\r\nGlock,19';
    const cr = 'Make,Model\rGlock,19';
    expect(parseCsv(crlf)).toEqual([['Make', 'Model'], ['Glock', '19']]);
    expect(parseCsv(cr)).toEqual([['Make', 'Model'], ['Glock', '19']]);
  });
});
