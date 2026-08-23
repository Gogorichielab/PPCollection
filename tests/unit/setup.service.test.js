const fs = require('fs');
const os = require('os');
const path = require('path');
const bcrypt = require('bcrypt');

const { createSetupService } = require('../../src/features/setup/setup.service');
const { createSetupCodeStore } = require('../../src/features/setup/setup-code');
const { createAuthService } = require('../../src/features/auth/auth.service');
const { createDbClient } = require('../../src/infra/db/client');
const { migrate } = require('../../src/infra/db/migrate');
const { createSettingsRepository } = require('../../src/infra/db/repositories/settings.repository');

const CODE = 'ABCD-EFGH-JKMN';
const SUBMISSION = {
  username: 'range.boss',
  password: 'CorrectHorseBattery',
  confirmPassword: 'CorrectHorseBattery',
  code: CODE
};

describe('setup service', () => {
  let tempDir;
  let db;
  let settingsRepository;
  let authService;
  let setupCodeStore;
  let setupService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-setup-svc-'));
    db = createDbClient(path.join(tempDir, 'app.db'));
    migrate(db);
    settingsRepository = createSettingsRepository(db);
    authService = createAuthService({ adminUser: 'admin', settingsRepository });
    setupCodeStore = createSetupCodeStore({ code: CODE });
    setupService = createSetupService({ authService, setupCodeStore });
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('isAvailable', () => {
    test('is true on a fresh database', () => {
      expect(setupService.isAvailable()).toBe(true);
    });

    test('is false once a password hash exists', async () => {
      await authService.claimAdministratorAccount('range.boss', 'CorrectHorseBattery');
      expect(setupService.isAvailable()).toBe(false);
    });

    test('re-reads the database rather than caching the first answer', async () => {
      expect(setupService.isAvailable()).toBe(true);
      settingsRepository.set('password_hash', '$2b$12$someexistinghashvalue');
      expect(setupService.isAvailable()).toBe(false);
    });
  });

  describe('completeSetup', () => {
    test('creates the administrator and consumes the code', async () => {
      const result = await setupService.completeSetup(SUBMISSION);

      expect(result).toEqual({ success: true, username: 'range.boss' });
      expect(settingsRepository.get('username')).toBe('range.boss');
      expect(setupCodeStore.isActive()).toBe(false);
    });

    test('stores a bcrypt hash rather than the password', async () => {
      await setupService.completeSetup(SUBMISSION);

      const hash = settingsRepository.get('password_hash');
      expect(hash).toMatch(/^\$2[aby]\$12\$/);
      expect(hash).not.toContain('CorrectHorseBattery');
      await expect(bcrypt.compare('CorrectHorseBattery', hash)).resolves.toBe(true);
    });

    test('does not force a password change — the operator chose the password', async () => {
      await setupService.completeSetup(SUBMISSION);

      expect(settingsRepository.get('must_change_password')).toBe('0');
      expect(authService.mustChangePassword()).toBe(false);
    });

    test('leaves the new credentials usable for login', async () => {
      await setupService.completeSetup(SUBMISSION);

      await expect(authService.validateCredentials('range.boss', 'CorrectHorseBattery')).resolves.toBe(true);
      await expect(authService.validateCredentials('range.boss', 'wrong-password')).resolves.toBe(false);
    });

    test.each([
      ['a wrong code', 'ZZZZ-ZZZZ-ZZZZ'],
      ['an empty code', ''],
      ['a missing code', undefined]
    ])('rejects %s and leaves the account uncreated', async (_label, code) => {
      const result = await setupService.completeSetup({ ...SUBMISSION, code });

      expect(result.success).toBe(false);
      expect(result.codeRejected).toBe(true);
      expect(settingsRepository.exists('password_hash')).toBe(false);
      expect(setupCodeStore.isActive()).toBe(true);
    });

    test('accepts the code in a normalized form', async () => {
      const result = await setupService.completeSetup({ ...SUBMISSION, code: 'abcdefghjkmn' });
      expect(result.success).toBe(true);
    });

    test('rejects an expired code from a previous process', async () => {
      setupCodeStore.consume();

      const result = await setupService.completeSetup(SUBMISSION);

      expect(result.success).toBe(false);
      expect(result.codeRejected).toBe(true);
      expect(settingsRepository.exists('password_hash')).toBe(false);
    });

    test('checks the code before the submitted fields', async () => {
      const result = await setupService.completeSetup({
        ...SUBMISSION,
        code: 'ZZZZ-ZZZZ-ZZZZ',
        password: 'short',
        confirmPassword: 'mismatch'
      });

      expect(result.codeRejected).toBe(true);
      expect(result.error).not.toMatch(/at least 12/);
    });

    test('rejects invalid input even with a correct code', async () => {
      const result = await setupService.completeSetup({
        ...SUBMISSION,
        password: 'short',
        confirmPassword: 'short'
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/at least 12/);
      expect(settingsRepository.exists('password_hash')).toBe(false);
      expect(setupCodeStore.isActive()).toBe(true);
    });

    test('refuses once an administrator already exists', async () => {
      settingsRepository.set('password_hash', '$2b$12$someexistinghashvalue');

      const result = await setupService.completeSetup(SUBMISSION);

      expect(result.success).toBe(false);
      expect(result.alreadyComplete).toBe(true);
      expect(settingsRepository.get('password_hash')).toBe('$2b$12$someexistinghashvalue');
    });

    test('only one of several concurrent submissions can succeed', async () => {
      const results = await Promise.all([
        setupService.completeSetup({ ...SUBMISSION, username: 'first.admin' }),
        setupService.completeSetup({ ...SUBMISSION, username: 'second.admin' }),
        setupService.completeSetup({ ...SUBMISSION, username: 'third.admin' }),
        setupService.completeSetup({ ...SUBMISSION, username: 'fourth.admin' })
      ]);

      const succeeded = results.filter((result) => result.success);
      expect(succeeded).toHaveLength(1);

      // The winner's username is the one persisted — no partial write from a loser.
      expect(settingsRepository.get('username')).toBe(succeeded[0].username);
      expect(settingsRepository.get('must_change_password')).toBe('0');

      for (const loser of results.filter((result) => !result.success)) {
        expect(loser.alreadyComplete).toBe(true);
      }
    });

    test('the winner of a concurrent race is the account that can log in', async () => {
      const results = await Promise.all([
        setupService.completeSetup({ ...SUBMISSION, username: 'first.admin', password: 'FirstPassword123' , confirmPassword: 'FirstPassword123' }),
        setupService.completeSetup({ ...SUBMISSION, username: 'second.admin', password: 'SecondPassword123', confirmPassword: 'SecondPassword123' })
      ]);

      const winner = results.find((result) => result.success);
      const winningPassword = winner.username === 'first.admin' ? 'FirstPassword123' : 'SecondPassword123';
      const losingPassword = winner.username === 'first.admin' ? 'SecondPassword123' : 'FirstPassword123';

      await expect(authService.validateCredentials(winner.username, winningPassword)).resolves.toBe(true);
      await expect(authService.validateCredentials(winner.username, losingPassword)).resolves.toBe(false);
    });
  });
});
