const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../../app/middleware/auth');
const { ALLOWED_MIME_TYPES, MAX_PHOTO_BYTES } = require('./photos.service');

function createPhotosRoutes(photosController) {
  // Limiters are created per-app so each createApp() call gets its own
  // in-memory store, mirroring auth.routes.js. Serving stays generous
  // (a full gallery is 12 image requests per detail-page view).
  const photoReadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many photo requests. Please try again in 15 minutes.'
  });

  const photoWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many photo changes. Please try again in 15 minutes.'
  });

  const router = express.Router();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
    fileFilter(req, file, cb) {
      if (ALLOWED_MIME_TYPES[file.mimetype]) {
        return cb(null, true);
      }
      return cb(
        Object.assign(new Error('Only JPEG, PNG, WebP, and GIF images are allowed.'), {
          code: 'INVALID_FILE_TYPE'
        })
      );
    }
  });

  router.post('/:firearmId/photos', requireAuth, photoWriteLimiter, upload.single('photo'), photosController.upload);
  router.get('/:firearmId/photos/:photoId', requireAuth, photoReadLimiter, photosController.serve);
  router.post('/:firearmId/photos/:photoId/delete', requireAuth, photoWriteLimiter, photosController.remove);

  // The upload is AJAX-only (the CSRF token must travel in a header), so
  // multer errors are translated into JSON 400s for the client.
  router.use((err, req, res, next) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `Photos must be ${MAX_PHOTO_BYTES / (1024 * 1024)} MB or smaller.` });
    }
    if (err && err.code === 'INVALID_FILE_TYPE') {
      return res.status(400).json({ error: err.message });
    }
    return next(err);
  });

  return router;
}

module.exports = { createPhotosRoutes };
