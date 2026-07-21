function createHomeController(homeService) {
  return {
    index(req, res) {
      const username = req.session.user?.username || 'admin';
      const userId = req.session.user?.id ?? 1;
      const dashboard = homeService.getDashboard(username, userId);

      return res.render('home/index', { ...dashboard, pageTitle: 'Dashboard' });
    }
  };
}

module.exports = { createHomeController };
