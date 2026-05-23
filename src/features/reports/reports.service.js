function createReportsService(reportsRepository) {
  return {
    getReports(userId = 1) {
      const summary = reportsRepository.getCollectionSummary(userId);
      const byType = reportsRepository.getBreakdownByType(userId);
      const byCaliber = reportsRepository.getBreakdownByCaliber(userId);
      const byMake = reportsRepository.getBreakdownByMake(userId);
      const acquisitionByMonth = reportsRepository.getAcquisitionByMonth(userId);
      const avgPriceByYear = reportsRepository.getAvgPriceByYear(userId);
      const disposition = reportsRepository.getDispositionStats(userId);
      const byCondition = reportsRepository.getConditionBreakdown(userId);

      return {
        summary: {
          totalFirearms: summary.total_firearms || 0,
          totalValue: summary.total_value || 0,
          activeCount: summary.active_count || 0,
          activeValue: summary.active_value || 0,
          soldCount: summary.sold_count || 0,
          soldValue: summary.sold_value || 0,
          lostCount: summary.lost_count || 0,
          repairCount: summary.repair_count || 0,
          transitCount: summary.transit_count || 0
        },
        charts: {
          byType,
          byCaliber,
          byMake,
          acquisitionByMonth,
          avgPriceByYear,
          byCondition
        },
        disposition: {
          disposedCount: disposition.disposed_count || 0,
          totalProceeds: disposition.total_proceeds || 0,
          avgHoldDays: disposition.avg_hold_days
        },
        isEmpty: (summary.total_firearms || 0) === 0
      };
    }
  };
}

module.exports = { createReportsService };
