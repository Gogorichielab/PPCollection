const {
  createSetupCodeStore,
  generateSetupCode,
  normalizeSetupCode
} = require('../../src/features/setup/setup-code');

describe('generateSetupCode', () => {
  test('formats the code as three dash-separated groups of four', () => {
    expect(generateSetupCode()).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  test('never emits characters that are easy to misread', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateSetupCode()).not.toMatch(/[01ILOU]/);
    }
  });

  test('does not repeat across calls', () => {
    const codes = new Set();
    for (let i = 0; i < 200; i += 1) codes.add(generateSetupCode());
    expect(codes.size).toBe(200);
  });
});

describe('normalizeSetupCode', () => {
  test.each([
    ['ABCD-EFGH-JKMN', 'ABCDEFGHJKMN'],
    ['abcd-efgh-jkmn', 'ABCDEFGHJKMN'],
    ['abcdefghjkmn', 'ABCDEFGHJKMN'],
    ['  ABCD EFGH JKMN  ', 'ABCDEFGHJKMN']
  ])('normalizes %s', (input, expected) => {
    expect(normalizeSetupCode(input)).toBe(expected);
  });

  test.each([[null], [undefined], ['']])('maps %s to an empty string', (input) => {
    expect(normalizeSetupCode(input)).toBe('');
  });
});

describe('createSetupCodeStore', () => {
  test('generates a code when none is supplied', () => {
    expect(createSetupCodeStore().code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  test('accepts the exact code', () => {
    const store = createSetupCodeStore({ code: 'ABCD-EFGH-JKMN' });
    expect(store.matches('ABCD-EFGH-JKMN')).toBe(true);
  });

  test.each([
    ['lowercase', 'abcd-efgh-jkmn'],
    ['without dashes', 'ABCDEFGHJKMN'],
    ['lowercase without dashes', 'abcdefghjkmn'],
    ['with stray whitespace', ' ABCD-EFGH-JKMN ']
  ])('accepts the code %s', (_label, candidate) => {
    const store = createSetupCodeStore({ code: 'ABCD-EFGH-JKMN' });
    expect(store.matches(candidate)).toBe(true);
  });

  test.each([
    ['a different code', 'ZZZZ-ZZZZ-ZZZZ'],
    ['a prefix', 'ABCD'],
    ['an empty string', ''],
    ['null', null],
    ['undefined', undefined]
  ])('rejects %s', (_label, candidate) => {
    const store = createSetupCodeStore({ code: 'ABCD-EFGH-JKMN' });
    expect(store.matches(candidate)).toBe(false);
  });

  test('rejects every code once consumed', () => {
    const store = createSetupCodeStore({ code: 'ABCD-EFGH-JKMN' });
    store.consume();

    expect(store.isActive()).toBe(false);
    expect(store.matches('ABCD-EFGH-JKMN')).toBe(false);
  });

  test('reports itself active until consumed', () => {
    const store = createSetupCodeStore();
    expect(store.isActive()).toBe(true);
    store.consume();
    expect(store.isActive()).toBe(false);
  });
});
