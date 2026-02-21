const { Router } = require('express');

function createHomeRoutes(homeController) {
  const router = Router();

  router.get('/', homeController.index);
  router.get('/home', homeController.index);
  router.get('/report', (req, res) => res.redirect('https://github.com/Gogorichielab/PPCollection/issues'));

  return router;
}

module.exports = { createHomeRoutes };
