const express = require('express');
const router = express.Router();
const { firearms } = require('../db');

router.get('/', (req, res) => {
  const items = firearms.all();
  res.render('firearms/index', { items });
});

router.get('/export', (req, res) => {
  const items = firearms.all();
  
  // CSV headers
  const headers = ['Make', 'Model', 'Serial', 'Caliber', 'Purchase Date', 'Purchase Price', 'Condition', 'Location', 'Status', 'Notes'];
  
  // Convert items to CSV rows
  const rows = items.map(item => [
    item.make || '',
    item.model || '',
    item.serial || '',
    item.caliber || '',
    item.purchase_date || '',
    item.purchase_price ?? '',
    item.condition || '',
    item.location || '',
    item.status || '',
    item.notes || ''
  ]);
  
  // Helper function to escape CSV values
  const escapeCSV = (value) => {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  
  // Build CSV content
  const csvLines = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ];
  
  const csvContent = csvLines.join('\n');
  
  // Set headers for file download
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="firearms.csv"');
  res.send(csvContent);
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
  };
}

module.exports = router;

