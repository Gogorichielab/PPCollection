const { auditLog } = require('../../services/audit.service');
const { MIN_PASSWORD_LENGTH, MIN_USERNAME_LENGTH } = require('./setup.validators');

function createSetupController(setupService) {
  function viewModel(overrides = {}) {
    return {
      pageTitle: 'Set Up Administrator',
      error: null,
      usernameValue: '',
      minPasswordLength: MIN_PASSWORD_LENGTH,
      minUsernameLength: MIN_USERNAME_LENGTH,
      ...overrides
    };
  }

  return {
    showSetup(req, res) {
      return res.render('setup/setup', viewModel());
    },

    async completeSetup(req, res, next) {
      const { username, password, confirm_password, setup_code } = req.body;

      const result = await setupService.completeSetup({
        username,
        password,
        confirmPassword: confirm_password,
        code: setup_code
      });

      if (!result.success) {
        if (result.alreadyComplete) {
          auditLog('setup.rejected', { id: req.id, ip: req.ip, reason: 'already_complete' });
          return res.redirect('/login');
        }

        auditLog('setup.failure', {
          id: req.id,
          ip: req.ip,
          reason: result.codeRejected ? 'invalid_code' : 'invalid_input'
        });

        return res.status(400).render(
          'setup/setup',
          viewModel({ error: result.error, usernameValue: String(username ?? '').trim() })
        );
      }

      auditLog('setup.success', { id: req.id, ip: req.ip, username: result.username });

      // A fresh session id for the newly created administrator, so nothing from
      // the pre-setup session (including its CSRF identifier) carries over.
      return req.session.regenerate((regenerateError) => {
        if (regenerateError) return next(regenerateError);

        req.session.user = { username: result.username, id: 1 };
        req.session.mustChangePassword = false;
        req.session.flash = {
          type: 'success',
          message: `Welcome, ${result.username}. Your administrator account is ready.`
        };

        return req.session.save((saveError) => {
          if (saveError) return next(saveError);
          return res.redirect('/');
        });
      });
    }
  };
}

module.exports = { createSetupController };
