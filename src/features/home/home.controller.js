function createHomeController(homeService) {
  return {
    index(req, res) {
      const username = req.session.user?.username || 'Collector';
      const dashboard = homeService.getDashboard(username);

      return res.render('home/index', dashboard);
    }
  };
}

module.exports = { createHomeController };
