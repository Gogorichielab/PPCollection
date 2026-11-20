function createHomeController(homeService, ammoService) {
  return {
    index(req, res) {
      const username = req.session.user?.username || 'admin';
      const userId = req.session.user?.id ?? 1;
      const dashboard = homeService.getDashboard(username, userId);

      const ammunition = ammoService.getRoundStats(userId);
      return res.render('home/index', { ...dashboard, ammunition, pageTitle: 'Dashboard' });
    }
  };
}

module.exports = { createHomeController };
