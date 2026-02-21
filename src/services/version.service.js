const https = require('https');

const RELEASES_URL = 'https://api.github.com/repos/Gogorichielab/PPCollection/releases/latest';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function compareVersions(left, right) {
  const leftParts = String(left)
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = String(right)
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = leftParts[index] || 0;
    const rightPart = rightParts[index] || 0;

    if (leftPart > rightPart) {
      return 1;
    }

    if (leftPart < rightPart) {
      return -1;
    }
  }

  return 0;
}

function createVersionService({ currentVersion, enabled, now = () => Date.now() }) {
  let cachedLatestVersion = null;
  let lastCheckedAt = null;

  function fetchLatestVersion() {
    return new Promise((resolve) => {
      const request = https.get(
        RELEASES_URL,
        {
          headers: {
            'User-Agent': `PPCollection/${currentVersion}`,
            Accept: 'application/vnd.github+json'
          }
        },
        (response) => {
          let data = '';

          response.on('data', (chunk) => {
            data += chunk;
          });

          response.on('end', () => {
            if (response.statusCode !== 200) {
              resolve(null);
              return;
            }
            try {
              const json = JSON.parse(data);
              const normalized = typeof json.tag_name === 'string' ? json.tag_name.replace(/^v/i, '') : null;
              resolve(normalized || null);
            } catch {
              resolve(null);
            }
          });
        }
      );

      request.on('error', () => resolve(null));
      request.setTimeout(5000, () => {
        request.destroy();
        resolve(null);
      });
    });
  }

  async function getVersionInfo() {
    if (!enabled) {
      return { currentVersion, latestVersion: null, updateAvailable: false };
    }

    const timestamp = now();
    if (lastCheckedAt === null || timestamp - lastCheckedAt > CACHE_TTL_MS) {
      cachedLatestVersion = await fetchLatestVersion();
      lastCheckedAt = timestamp;
    }

    const updateAvailable =
      typeof cachedLatestVersion === 'string' && compareVersions(cachedLatestVersion, currentVersion) > 0;

    return {
      currentVersion,
      latestVersion: cachedLatestVersion,
      updateAvailable
    };
  }

  return { getVersionInfo };
}

module.exports = {
  CACHE_TTL_MS,
  RELEASES_URL,
  createVersionService
};
