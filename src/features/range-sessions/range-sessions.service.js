function createRangeSessionsService(rangeSessionsRepository) {
  return {
    listByFirearm(firearmId) {
      return rangeSessionsRepository.listByFirearm(firearmId);
    },

    get(id, firearmId) {
      return rangeSessionsRepository.get(id, firearmId);
    },

    create(firearmId, data) {
      return rangeSessionsRepository.create({ ...data, firearm_id: firearmId });
    },

    remove(id, firearmId) {
      rangeSessionsRepository.remove(id, firearmId);
    },

    totalsForFirearm(firearmId) {
      return rangeSessionsRepository.totalsForFirearm(firearmId);
    }
  };
}

module.exports = { createRangeSessionsService };
