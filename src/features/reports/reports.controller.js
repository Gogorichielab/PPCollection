function createReportsController(reportsService, ammoService) {
  return {
    index(req, res) {
      const userId = req.session.user?.id ?? 1;
      const data = reportsService.getReports(userId);
      return res.render('reports/index', { ...data, ammunition: ammoService.getRoundStats(userId) });
    }
  };
}

module.exports = { createReportsController };
