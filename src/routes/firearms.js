const express = require('express');
const router = express.Router();
const { firearms } = require('../db');
const Joi = require('joi');

router.get('/', (req, res) => {
  const sortBy = req.query.sort || 'make';
  const sortDir = req.query.dir || 'asc';
  const search = req.query.search || '';
  const items = firearms.all(sortBy, sortDir, search);
  res.render('firearms/index', { items, sortBy, sortDir, search });
});

router.get('/export', (req, res) => {
  const search = req.query.search || '';
  const items = firearms.all('make', 'asc', search);
  
  // CSV headers
  const headers = ['Make', 'Model', 'Serial', 'Caliber', 'Purchase Date', 'Purchase Price', 'Condition', 'Location', 'Status', 'Notes'];
  
  // Convert items to CSV rows
  const rows = items.map(item => [
    escapeCSV(item.make),
    escapeCSV(item.model),
    escapeCSV(item.serial || ''),
    escapeCSV(item.caliber || ''),
    escapeCSV(item.purchase_date || ''),
    escapeCSV(item.purchase_price !== null ? item.purchase_price : ''),
    escapeCSV(item.condition || ''),
    escapeCSV(item.location || ''),
    escapeCSV(item.status || ''),
    escapeCSV(item.notes || '')
  ]);
  
  // Combine headers and rows
  const csv = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');
  
  // Set headers for file download
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="firearms-collection.csv"');
  res.send(csv);
});

router.get('/new', (req, res) => {
  res.render('firearms/new', { item: {} });
});

router.post('/', (req, res) => {
  try {
    const data = sanitize(req.body);
    const id = firearms.create(data);
    res.redirect(`/firearms/${id}`);
  } catch (error) {
    if (error.statusCode === 400) {
      // Re-render the form with validation errors
      return res.status(400).render('firearms/new', {
        item: req.body,
        error: error.message,
        errors: error.validationErrors
      });
    }
    throw error;
  }
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
  try {
    const data = sanitize(req.body);
    firearms.update(req.params.id, data);
    res.redirect(`/firearms/${req.params.id}`);
  } catch (error) {
    if (error.statusCode === 400) {
      // Re-render the form with validation errors
      return res.status(400).render('firearms/edit', {
        item: { ...item, ...req.body, id: req.params.id },
        error: error.message,
        errors: error.validationErrors
      });
    }
    throw error;
  }
});

router.post('/:id/delete', (req, res) => {
  firearms.remove(req.params.id);
  res.redirect('/firearms');
});

// Validation schema for firearm data
const firearmSchema = Joi.object({
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
  purchase_date: Joi.string().trim().allow('').optional(),
  purchase_price: Joi.number().positive().allow(null, '').optional().messages({
    'number.base': 'Purchase price must be a valid number',
    'number.positive': 'Purchase price must be a positive number'
  }),
  condition: Joi.string().trim().allow('').optional(),
  location: Joi.string().trim().allow('').optional(),
  status: Joi.string().trim().allow('').optional(),
  notes: Joi.string().trim().allow('').optional()
});

function sanitize(body) {
  // Validate the input data
  const { error, value } = firearmSchema.validate(body, {
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
    purchase_date: value.purchase_date || '',
    purchase_price: value.purchase_price ?? null,
    condition: value.condition || '',
    location: value.location || '',
    status: value.status || '',
    notes: value.notes || ''
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

