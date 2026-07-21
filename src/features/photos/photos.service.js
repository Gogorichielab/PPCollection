const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALLOWED_MIME_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_PHOTOS_PER_FIREARM = 12;

function createPhotosService({ photosRepository, photosDir }) {
  function absolutePath(filename) {
    return path.join(photosDir, filename);
  }

  function unlinkQuietly(filename) {
    try {
      fs.unlinkSync(absolutePath(filename));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  return {
    listByFirearm(firearmId) {
      return photosRepository.listByFirearm(firearmId);
    },

    get(id, firearmId) {
      return photosRepository.get(id, firearmId);
    },

    countForFirearm(firearmId) {
      return photosRepository.countForFirearm(firearmId);
    },

    storePhoto(firearmId, file) {
      const extension = ALLOWED_MIME_TYPES[file.mimetype];
      if (!extension) {
        throw Object.assign(new Error('Only JPEG, PNG, WebP, and GIF images are allowed.'), {
          code: 'INVALID_FILE_TYPE'
        });
      }

      if (photosRepository.countForFirearm(firearmId) >= MAX_PHOTOS_PER_FIREARM) {
        throw Object.assign(new Error(`A firearm can have at most ${MAX_PHOTOS_PER_FIREARM} photos.`), {
          code: 'PHOTO_LIMIT'
        });
      }

      // Filenames are always generated server-side; the client name is kept
      // only as display metadata.
      const filename = `${crypto.randomBytes(16).toString('hex')}.${extension}`;
      fs.mkdirSync(photosDir, { recursive: true });
      fs.writeFileSync(absolutePath(filename), file.buffer);

      try {
        const id = photosRepository.create({
          firearm_id: firearmId,
          filename,
          original_name: file.originalname || '',
          mime: file.mimetype,
          size: file.size ?? file.buffer.length
        });
        return { id, filename };
      } catch (err) {
        unlinkQuietly(filename);
        throw err;
      }
    },

    removePhoto(id, firearmId) {
      const photo = photosRepository.get(id, firearmId);
      if (!photo) {
        return false;
      }
      photosRepository.remove(id, firearmId);
      unlinkQuietly(photo.filename);
      return true;
    },

    // The DB rows cascade when the firearm row goes, but the files do not —
    // call this before deleting the firearm so the filenames are still known.
    removeAllForFirearm(firearmId) {
      const photos = photosRepository.listByFirearm(firearmId);
      for (const photo of photos) {
        unlinkQuietly(photo.filename);
      }
      photosRepository.removeByFirearm(firearmId);
      return photos.length;
    }
  };
}

module.exports = {
  createPhotosService,
  ALLOWED_MIME_TYPES,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS_PER_FIREARM
};
