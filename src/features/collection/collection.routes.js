const express = require('express');
const { requireAuth } = require('../../app/middleware/auth');

function createCollectionRoutes(service) {
  const router = express.Router();
  router.use(requireAuth);
  for (const kind of ['firearms', 'ammo']) {
    const root = '/' + kind;
    router.get(root + '/imports', (req, res) => {
      const batches = service.batches(req.session.user.id, kind);
      res.render('collection/imports', { kind, batches, entry: null });
    });
    router.get(root + '/imports/:id', (req, res) => {
      const userId = req.session.user.id;
      const entry = service.batch(userId, kind, req.params.id);
      if (!entry) return res.status(404).render('errors/404');
      return res.render('collection/imports', { kind, entry, rows: service.members(userId, kind, entry.id) });
    });
    router.post(root + '/imports/:id/undo', (req, res) => {
      service.undo(req.session.user.id, kind, req.params.id);
      res.redirect('/collection' + root + '/imports');
    });
    router.post(root + '/views', (req, res) => {
      const error = service.saveSelection(req.session.user.id, kind, req.body.name, req.query);
      if (error) req.session.flash = { type: 'error', message: error };
      res.redirect(root + '?' + new URLSearchParams(req.originalUrl.split('?')[1] || ''));
    });
    router.post(root + '/views/:id/delete', (req, res) => {
      service.deleteView(req.session.user.id, kind, req.params.id);
      res.redirect(root);
    });
  }

  router.post('/firearms/:id/documents', express.raw({ type: 'application/pdf', limit: '5mb' }), (req, res) => {
    const error = service.attach(req.session.user.id, req.params.id, req.query.category, req.get('x-document-name'), req.body);
    if (error) return res.status(400).json({ error });
    return res.status(201).json({ saved: true });
  });
  router.get('/documents/:id', (req, res) => {
    const doc = service.document(req.session.user.id, req.params.id);
    if (!doc) return res.status(404).render('errors/404');
    res.set('Cache-Control', 'private, no-store');
    return res.attachment(doc.filename).type('application/pdf').send(doc.contents);
  });
  router.post('/firearms/:id/documents/:doc/delete', (req, res) => {
    service.deleteDocument(req.session.user.id, req.params.id, req.params.doc);
    res.redirect('/firearms/' + encodeURIComponent(req.params.id) + '#documents');
  });
  return router;
}

module.exports = { createCollectionRoutes };
