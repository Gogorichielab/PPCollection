const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  createPhotosService,
  MAX_PHOTOS_PER_FIREARM
} = require('../../src/features/photos/photos.service');

function fakeFile(overrides = {}) {
  const buffer = Buffer.from('fake image bytes');
  return {
    originalname: 'range-day.jpg',
    mimetype: 'image/jpeg',
    size: buffer.length,
    buffer,
    ...overrides
  };
}

describe('photos service', () => {
  let photosDir;
  let photosRepository;
  let service;

  beforeEach(() => {
    photosDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-photos-svc-'));
    photosRepository = {
      listByFirearm: jest.fn(() => []),
      get: jest.fn(),
      countForFirearm: jest.fn(() => 0),
      create: jest.fn(() => 5),
      remove: jest.fn(),
      removeByFirearm: jest.fn()
    };
    service = createPhotosService({ photosRepository, photosDir });
  });

  afterEach(() => {
    fs.rmSync(photosDir, { recursive: true, force: true });
  });

  describe('storePhoto', () => {
    test('writes the file with a generated name and records the row', async () => {
      const result = await service.storePhoto(3, fakeFile());

      expect(result.id).toBe(5);
      expect(result.filename).toMatch(/^[a-f0-9]{32}\.jpg$/);
      expect(fs.readFileSync(path.join(photosDir, result.filename), 'utf8')).toBe('fake image bytes');
      expect(photosRepository.create).toHaveBeenCalledWith({
        firearm_id: 3,
        filename: result.filename,
        original_name: 'range-day.jpg',
        mime: 'image/jpeg',
        size: fakeFile().size
      });
    });

    test('derives the extension from the mime type, not the client filename', async () => {
      const result = await service.storePhoto(3, fakeFile({ originalname: 'sneaky.exe', mimetype: 'image/png' }));

      expect(result.filename).toMatch(/^[a-f0-9]{32}\.png$/);
    });

    test('rejects a disallowed mime type', async () => {
      await expect(service.storePhoto(3, fakeFile({ mimetype: 'text/plain' }))).rejects.toMatchObject({
        code: 'INVALID_FILE_TYPE'
      });
      expect(photosRepository.create).not.toHaveBeenCalled();
    });

    test('rejects an upload past the per-firearm cap', async () => {
      photosRepository.countForFirearm.mockReturnValue(MAX_PHOTOS_PER_FIREARM);

      await expect(service.storePhoto(3, fakeFile())).rejects.toMatchObject({ code: 'PHOTO_LIMIT' });
      expect(fs.readdirSync(photosDir)).toHaveLength(0);
    });

    test('removes the written file when the insert fails', async () => {
      photosRepository.create.mockImplementation(() => {
        throw new Error('UNIQUE constraint failed');
      });

      await expect(service.storePhoto(3, fakeFile())).rejects.toThrow('UNIQUE constraint failed');
      expect(fs.readdirSync(photosDir)).toHaveLength(0);
    });
  });

  describe('removePhoto', () => {
    test('deletes the row and the file', () => {
      const filename = `${'c'.repeat(32)}.jpg`;
      fs.writeFileSync(path.join(photosDir, filename), 'bytes');
      photosRepository.get.mockReturnValue({ id: 9, firearm_id: 3, filename });

      expect(service.removePhoto(9, 3)).toBe(true);
      expect(photosRepository.remove).toHaveBeenCalledWith(9, 3);
      expect(fs.existsSync(path.join(photosDir, filename))).toBe(false);
    });

    test('tolerates a file that is already gone', () => {
      photosRepository.get.mockReturnValue({ id: 9, firearm_id: 3, filename: `${'d'.repeat(32)}.jpg` });

      expect(service.removePhoto(9, 3)).toBe(true);
    });

    test('returns false for an unknown photo', () => {
      photosRepository.get.mockReturnValue(undefined);

      expect(service.removePhoto(9, 3)).toBe(false);
      expect(photosRepository.remove).not.toHaveBeenCalled();
    });

    test('keeps the row when the unlink fails with a real error', () => {
      photosRepository.get.mockReturnValue({ id: 9, firearm_id: 3, filename: `${'a'.repeat(32)}.jpg` });
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {
        throw Object.assign(new Error('operation not permitted'), { code: 'EPERM' });
      });

      expect(() => service.removePhoto(9, 3)).toThrow('operation not permitted');
      expect(photosRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('removeAllForFirearm', () => {
    test('unlinks every file and clears the rows', () => {
      const filenames = [`${'e'.repeat(32)}.jpg`, `${'f'.repeat(32)}.png`];
      for (const filename of filenames) {
        fs.writeFileSync(path.join(photosDir, filename), 'bytes');
      }
      photosRepository.listByFirearm.mockReturnValue(filenames.map((filename, index) => ({ id: index + 1, filename })));

      expect(service.removeAllForFirearm(3)).toBe(2);
      expect(fs.readdirSync(photosDir)).toHaveLength(0);
      expect(photosRepository.removeByFirearm).toHaveBeenCalledWith(3);
    });
  });
});
