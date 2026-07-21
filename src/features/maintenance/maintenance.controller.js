const { sanitizeMaintenanceInput, validateMaintenanceInput } = require('./maintenance.validators');
const { auditLog } = require('../../services/audit.service');

function createMaintenanceController({ maintenanceService, firearmsService }) {
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

      const data = sanitizeMaintenanceInput(req.body);
      const { isValid, fieldErrors } = validateMaintenanceInput(data);

      // The add form lives on the composite detail page, so validation errors
      // surface as a flash on redirect instead of a re-rendered form.
      if (!isValid) {
        if (req.session) req.session.flash = { type: 'error', message: Object.values(fieldErrors)[0] };
        return res.redirect(`/firearms/${firearm.id}#maintenance`);
      }

      const logId = maintenanceService.create(firearm.id, data);
      if (req.session) req.session.flash = { type: 'success', message: 'Maintenance entry added.' };
      auditLog('maintenance.create', { id: req.id, ip: req.ip, firearmId: firearm.id, logId });
      return res.redirect(`/firearms/${firearm.id}#maintenance`);
    },

    remove(req, res) {
      const firearm = loadFirearm(req, res);
      if (!firearm) return undefined;

      const existing = maintenanceService.get(req.params.logId, firearm.id);
      if (!existing) {
        return res.status(404).render('errors/404');
      }

      maintenanceService.remove(req.params.logId, firearm.id);
      if (req.session) req.session.flash = { type: 'success', message: 'Maintenance entry deleted.' };
      auditLog('maintenance.delete', { id: req.id, ip: req.ip, firearmId: firearm.id, logId: req.params.logId });
      return res.redirect(`/firearms/${firearm.id}#maintenance`);
    }
  };
}

module.exports = { createMaintenanceController };
