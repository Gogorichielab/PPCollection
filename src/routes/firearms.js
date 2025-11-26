const express = require('express');
const router = express.Router();
const { firearms } = require('../db');

router.get('/', (req, res) => {
  const items = firearms.all();
  res.render('firearms/index', { items });
});

router.get('/new', (req, res) => {
  res.render('firearms/new', { item: {} });
});

router.post('/', (req, res) => {
  const data = sanitize(req.body);
  const id = firearms.create(data);
  res.redirect(`/firearms/${id}`);
});

router.get('/:id', (req, res) => {
  const item = firearms.get(req.params.id);
  if (!item) return res.status(404).send('Not found');
  res.render('firearms/show', { item });
});

router.get('/:id/edit', (req, res) => {
  const item = firearms.get(req.params.id);
  if (!item) return res.status(404).send('Not found');
  res.render('firearms/edit', { item });
});

router.put('/:id', (req, res) => {
  const item = firearms.get(req.params.id);
  if (!item) return res.status(404).send('Not found');
  const data = sanitize(req.body);
  firearms.update(req.params.id, data);
  res.redirect(`/firearms/${req.params.id}`);
});

router.post('/:id/delete', (req, res) => {
  firearms.remove(req.params.id);
  res.redirect('/firearms');
});

function sanitize(body) {
  return {
    make: (body.make || '').trim(),
    model: (body.model || '').trim(),
    serial: (body.serial || '').trim(),
    caliber: (body.caliber || '').trim(),
    purchase_date: (body.purchase_date || '').trim(),
    purchase_price: body.purchase_price ? Number(body.purchase_price) : null,
    condition: (body.condition || '').trim(),
    location: (body.location || '').trim(),
    status: (body.status || '').trim(),
    notes: (body.notes || '').trim(),
    gun_warranty: body.gun_warranty ? 1 : 0,
    firearm_type: (body.firearm_type || '').trim(),
  };
}

module.exports = router;

