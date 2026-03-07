const { Router } = require('express');
const { requireAuth } = require('../../app/middleware/auth');

function createHomeRoutes(homeController) {
  const router = Router();

  router.get('/', requireAuth, homeController.index);
  router.get('/home', requireAuth, homeController.index);
  router.get('/report', (req, res) => res.redirect('https://github.com/Gogorichielab/PPCollection/issues'));

  return router;
}

module.exports = { createHomeRoutes };
