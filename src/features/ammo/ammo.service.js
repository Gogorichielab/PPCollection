function computeTotalRounds(data) {
  return data.boxes * data.rounds_per_box + data.loose_rounds;
}

function createAmmoService(ammoRepository) {
  return {
    paginate(page, perPage, userId) {
      return ammoRepository.paginate(page, perPage, userId);
    },

    list(userId) {
      return ammoRepository.all(userId);
    },

    getById(id, userId) {
      return ammoRepository.get(id, userId);
    },

    // total_rounds is never trusted from the caller — it is always recomputed
    // here from the structural fields, so the HTML form (and, later, CSV
    // import) can never write an inconsistent value.
    create(data, userId) {
      const total_rounds = computeTotalRounds(data);
      return ammoRepository.create({ ...data, total_rounds, user_id: userId });
    },

    update(id, data, userId) {
      const total_rounds = computeTotalRounds(data);
      ammoRepository.update(id, { ...data, total_rounds }, userId);
    },

    remove(id, userId) {
      ammoRepository.remove(id, userId);
    },

    getCaliberBreakdown(userId) {
      return ammoRepository.getCaliberBreakdown(userId);
    },

    getTotalRounds(userId) {
      return ammoRepository.getTotalRounds(userId);
    }
  };
}

module.exports = { createAmmoService };
