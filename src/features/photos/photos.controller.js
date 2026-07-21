const { auditLog } = require('../../services/audit.service');

const SAFE_FILENAME_PATTERN = /^[a-f0-9]{32}\.(jpg|png|webp|gif)$/;

function createPhotosController({ photosService, firearmsService, photosDir }) {
  function loadFirearm(req) {
    const userId = req.session.user?.id ?? 1;
    return firearmsService.getById(req.params.firearmId, userId);
  }

  return {
    async upload(req, res) {
      const firearm = loadFirearm(req);
      if (!firearm) {
        return res.status(404).json({ error: 'Firearm not found.' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'No photo received.' });
      }

      try {
        const { id } = await photosService.storePhoto(firearm.id, req.file);
        auditLog('photo.upload', { id: req.id, ip: req.ip, firearmId: firearm.id, photoId: id });
        return res.status(201).json({ id });
      } catch (err) {
        if (err.code === 'INVALID_FILE_TYPE' || err.code === 'PHOTO_LIMIT') {
          return res.status(400).json({ error: err.message });
        }
        throw err;
      }
    },

    serve(req, res) {
      const firearm = loadFirearm(req);
      if (!firearm) {
        return res.status(404).render('errors/404');
      }

      const photo = photosService.get(req.params.photoId, firearm.id);
      // The filename comes exclusively from the DB row; the pattern check is
      // defense-in-depth on top of sendFile's root containment.
      if (!photo || !SAFE_FILENAME_PATTERN.test(photo.filename)) {
        return res.status(404).render('errors/404');
      }

      return res.sendFile(
        photo.filename,
        { root: photosDir, headers: { 'Cache-Control': 'private, max-age=86400' } },
        (err) => {
          if (err && !res.headersSent) {
            res.status(404).render('errors/404');
          }
        }
      );
    },

    remove(req, res) {
      const firearm = loadFirearm(req);
      if (!firearm) {
        return res.status(404).render('errors/404');
      }

      const removed = photosService.removePhoto(req.params.photoId, firearm.id);
      if (!removed) {
        return res.status(404).render('errors/404');
      }

      if (req.session) req.session.flash = { type: 'success', message: 'Photo deleted.' };
      auditLog('photo.delete', { id: req.id, ip: req.ip, firearmId: firearm.id, photoId: req.params.photoId });
      return res.redirect(`/firearms/${firearm.id}#photos`);
    }
  };
}

module.exports = { createPhotosController };
