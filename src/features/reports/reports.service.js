function createReportsService(reportsRepository) {
  return {
    getReports() {
      const summary = reportsRepository.getCollectionSummary();
      const byType = reportsRepository.getBreakdownByType();
      const byCaliber = reportsRepository.getBreakdownByCaliber();
      const byMake = reportsRepository.getBreakdownByMake();
      const acquisitionByMonth = reportsRepository.getAcquisitionByMonth();
      const avgPriceByYear = reportsRepository.getAvgPriceByYear();
      const disposition = reportsRepository.getDispositionStats();
      const byCondition = reportsRepository.getConditionBreakdown();

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
