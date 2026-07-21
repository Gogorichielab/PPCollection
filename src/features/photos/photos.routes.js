const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../../app/middleware/auth');
const { ALLOWED_MIME_TYPES, MAX_PHOTO_BYTES } = require('./photos.service');

function createPhotosRoutes(photosController) {
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

  router.post('/:firearmId/photos', requireAuth, upload.single('photo'), photosController.upload);
  router.get('/:firearmId/photos/:photoId', requireAuth, photosController.serve);
  router.post('/:firearmId/photos/:photoId/delete', requireAuth, photosController.remove);

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
