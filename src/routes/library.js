const express = require('express');
const router = express.Router();
const { library } = require('../db');
const Joi = require('joi');

router.get('/', (req, res) => {
  const sortBy = req.query.sort || 'make';
  const sortDir = req.query.dir || 'asc';
  const search = req.query.search || '';
  const items = library.all(sortBy, sortDir, search);
  res.render('library/index', { items, sortBy, sortDir, search });
});

router.get('/export', (req, res) => {
  const search = req.query.search || '';
  const items = library.all('make', 'asc', search);
  
  // CSV headers
  const headers = ['Make', 'Model', 'Serial', 'Caliber', 'Type', 'Purchase Date', 'Purchase Price', 'Purchase Location', 'Condition', 'Status', 'Notes', 'Buyer Name', 'Buyer Address', 'Sold Date'];
  
  // Convert items to CSV rows
  const rows = items.map(item => [
    escapeCSV(item.make),
    escapeCSV(item.model),
    escapeCSV(item.serial || ''),
    escapeCSV(item.caliber || ''),
    escapeCSV(item.type || ''),
    escapeCSV(item.purchase_date || ''),
    escapeCSV(item.purchase_price !== null ? item.purchase_price : ''),
    escapeCSV(item.purchase_location || ''),
    escapeCSV(item.condition || ''),
    escapeCSV(item.status || ''),
    escapeCSV(item.notes || ''),
    escapeCSV(item.buyer_name || ''),
    escapeCSV(item.buyer_address || ''),
    escapeCSV(item.sold_date || '')
  ]);
  
  // Combine headers and rows
  const csv = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');
  
  // Set headers for file download
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="library-collection.csv"');
  res.send(csv);
});

router.get('/new', (req, res) => {
  res.render('library/new', { item: {} });
});

router.post('/', (req, res) => {
  try {
    const data = sanitize(req.body);
    const id = library.create(data);
    res.redirect(`/library/${id}`);
  } catch (error) {
    if (error.statusCode === 400) {
      // Re-render the form with validation errors
      return res.status(400).render('library/new', {
        item: req.body,
        error: error.message,
        errors: error.validationErrors
      });
    }
    throw error;
  }
});

router.get('/:id', (req, res) => {
  const item = library.get(req.params.id);
  if (!item) return res.status(404).send('Not found');
  res.render('library/show', { item });
});

router.get('/:id/edit', (req, res) => {
  const item = library.get(req.params.id);
  if (!item) return res.status(404).send('Not found');
  res.render('library/edit', { item });
});

router.put('/:id', (req, res) => {
  const item = library.get(req.params.id);
  if (!item) return res.status(404).send('Not found');
  try {
    const data = sanitize(req.body);
    library.update(req.params.id, data);
    res.redirect(`/library/${req.params.id}`);
  } catch (error) {
    if (error.statusCode === 400) {
      // Re-render the form with validation errors
      return res.status(400).render('library/edit', {
        item: { ...item, ...req.body, id: req.params.id },
        error: error.message,
        errors: error.validationErrors
      });
    }
    throw error;
  }
});

router.post('/:id/delete', (req, res) => {
  library.remove(req.params.id);
  res.redirect('/library');
});

// Validation schema for item data
const itemSchema = Joi.object({
  make: Joi.string().trim().required().messages({
    'string.empty': 'Make is required',
    'any.required': 'Make is required'
  }),
  model: Joi.string().trim().required().messages({
    'string.empty': 'Model is required',
    'any.required': 'Model is required'
  }),
  serial: Joi.string().trim().allow('').optional(),
  caliber: Joi.string().trim().allow('').optional(),
  type: Joi.string().trim().allow('').optional(),
  purchase_date: Joi.string().trim().allow('').optional(),
  purchase_price: Joi.number().positive().allow(null, '').optional().messages({
    'number.base': 'Purchase price must be a valid number',
    'number.positive': 'Purchase price must be a positive number'
  }),
  purchase_location: Joi.string().trim().allow('').optional(),
  condition: Joi.string().trim().allow('').optional(),
  status: Joi.string().trim().allow('').optional(),
  notes: Joi.string().trim().allow('').optional(),
  buyer_name: Joi.string().trim().allow('').optional(),
  buyer_address: Joi.string().trim().allow('').optional(),
  sold_date: Joi.string().trim().allow('').optional()
});

function sanitize(body) {
  // Validate the input data
  const { error, value } = itemSchema.validate(body, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });

  if (error) {
    // Collect all validation errors into user-friendly messages
    const errors = error.details.map(detail => detail.message);
    const err = new Error('Validation failed: ' + errors.join(', '));
    err.statusCode = 400;
    err.validationErrors = errors;
    throw err;
  }

  // Return sanitized and validated data
  return {
    make: value.make,
    model: value.model,
    serial: value.serial || '',
    caliber: value.caliber || '',
    type: value.type || '',
    purchase_date: value.purchase_date || '',
    purchase_price: value.purchase_price ?? null,
    purchase_location: value.purchase_location || '',
    condition: value.condition || '',
    status: value.status || '',
    notes: value.notes || '',
    buyer_name: value.buyer_name || '',
    buyer_address: value.buyer_address || '',
    sold_date: value.sold_date || ''
  };
}

// Helper function to escape CSV values
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

module.exports = router;

