const { sanitizeRangeSessionInput, validateRangeSessionInput } = require('./range-sessions.validators');
const { auditLog } = require('../../services/audit.service');

function createRangeSessionsController({ rangeSessionsService, firearmsService }) {
  function loadFirearm(req, res) {
    const userId = req.session.user?.id ?? 1;
    const firearm = firearmsService.getById(req.params.firearmId, userId);
    if (!firearm) {
      res.status(404).render('errors/404');
      return null;
    }
    return firearm;
  }

  return {
    create(req, res) {
      const firearm = loadFirearm(req, res);
      if (!firearm) return undefined;

      const data = sanitizeRangeSessionInput(req.body);
      const { isValid, fieldErrors } = validateRangeSessionInput(data);

      // The add form lives on the composite detail page, so validation errors
      // surface as a flash on redirect instead of a re-rendered form.
      if (!isValid) {
        if (req.session) req.session.flash = { type: 'error', message: Object.values(fieldErrors)[0] };
        return res.redirect(`/firearms/${firearm.id}#range-sessions`);
      }

      const sessionId = rangeSessionsService.create(firearm.id, data);
      if (req.session) req.session.flash = { type: 'success', message: 'Range session added.' };
      auditLog('rangeSession.create', { id: req.id, ip: req.ip, firearmId: firearm.id, sessionId });
      return res.redirect(`/firearms/${firearm.id}#range-sessions`);
    },

    remove(req, res) {
      const firearm = loadFirearm(req, res);
      if (!firearm) return undefined;

      const existing = rangeSessionsService.get(req.params.sessionId, firearm.id);
      if (!existing) {
        return res.status(404).render('errors/404');
      }

      rangeSessionsService.remove(req.params.sessionId, firearm.id);
      if (req.session) req.session.flash = { type: 'success', message: 'Range session deleted.' };
      auditLog('rangeSession.delete', { id: req.id, ip: req.ip, firearmId: firearm.id, sessionId: req.params.sessionId });
      return res.redirect(`/firearms/${firearm.id}#range-sessions`);
    }
  };
}

module.exports = { createRangeSessionsController };
