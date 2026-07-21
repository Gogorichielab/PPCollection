const { isDispositionStatus } = require('../firearms/firearms.validators');

const MAINTENANCE_DUE_SETTING_KEY = 'maintenance_due_days';
const DEFAULT_CLEANING_DUE_DAYS = 90;
const MIN_CLEANING_DUE_DAYS = 1;
const MAX_CLEANING_DUE_DAYS = 365;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseMaintenanceDueDays(raw) {
  const parsed = Number(String(raw ?? '').trim());
  if (Number.isInteger(parsed) && parsed >= MIN_CLEANING_DUE_DAYS && parsed <= MAX_CLEANING_DUE_DAYS) {
    return parsed;
  }
  return DEFAULT_CLEANING_DUE_DAYS;
}

function daysSinceIsoDate(dateString, now) {
  const timestamp = Date.parse(`${dateString}T00:00:00Z`);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return Math.floor((now - timestamp) / MS_PER_DAY);
}

// Dates are validated to YYYY-MM-DD on the way in, so string comparison is a
// safe chronological comparison here.
function evaluateCleaningDue({ last_cleaned, last_range }, thresholdDays, now) {
  if (last_range && (!last_cleaned || last_range > last_cleaned)) {
    return {
      reason: 'Range session since last cleaning',
      daysSince: last_cleaned ? daysSinceIsoDate(last_cleaned, now) : null
    };
  }

  if (last_cleaned) {
    const days = daysSinceIsoDate(last_cleaned, now);
    if (days !== null && days >= thresholdDays) {
      return { reason: `Last cleaned ${days} days ago`, daysSince: days };
    }
  }

  return null;
}

function createMaintenanceService(maintenanceRepository, settingsRepository) {
  function getDueDays() {
    return parseMaintenanceDueDays(settingsRepository.get(MAINTENANCE_DUE_SETTING_KEY));
  }

  return {
    listByFirearm(firearmId) {
      return maintenanceRepository.listByFirearm(firearmId);
    },

    get(id, firearmId) {
      return maintenanceRepository.get(id, firearmId);
    },

    create(firearmId, data) {
      return maintenanceRepository.create({ ...data, firearm_id: firearmId });
    },

    remove(id, firearmId) {
      maintenanceRepository.remove(id, firearmId);
    },

    getDueForCleaning(userId = 1) {
      const thresholdDays = getDueDays();
      const now = Date.now();
      const items = [];

      for (const row of maintenanceRepository.getCleaningStatus(userId)) {
        if (isDispositionStatus(row.status)) {
          continue;
        }
        const due = evaluateCleaningDue(row, thresholdDays, now);
        if (due) {
          items.push({
            id: row.id,
            label: `${row.make} ${row.model}`.trim(),
            reason: due.reason,
            daysSince: due.daysSince
          });
        }
      }

      return { count: items.length, items, thresholdDays };
    },

    getCleaningStatusForFirearm(firearmId, status) {
      const thresholdDays = getDueDays();
      if (isDispositionStatus(status)) {
        return { due: false, reason: null, lastCleaned: null, thresholdDays };
      }

      const dates = maintenanceRepository.getFirearmCleaningDates(firearmId) || {};
      const due = evaluateCleaningDue(dates, thresholdDays, Date.now());

      return {
        due: Boolean(due),
        reason: due ? due.reason : null,
        lastCleaned: dates.last_cleaned || null,
        thresholdDays
      };
    }
  };
}

module.exports = {
  createMaintenanceService,
  parseMaintenanceDueDays,
  MAINTENANCE_DUE_SETTING_KEY,
  DEFAULT_CLEANING_DUE_DAYS,
  MIN_CLEANING_DUE_DAYS,
  MAX_CLEANING_DUE_DAYS
};
