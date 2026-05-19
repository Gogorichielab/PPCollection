function createReportsController(reportsService) {
  return {
    index(req, res) {
      const data = reportsService.getReports();
      return res.render('reports/index', data);
    }
  };
}

module.exports = { createReportsController };
