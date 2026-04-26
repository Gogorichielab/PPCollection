const https = require('https');

const RELEASES_URL = 'https://api.github.com/repos/Gogorichielab/PPCollection/releases/latest';
const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5_000;

function createVersionService({ currentVersion, enabled }) {
  let cache = null;
  let lastChecked = null;
  let inflightFetch = null;

  function fetchLatestVersion() {
    return new Promise((resolve) => {
      const options = {
        headers: {
          'User-Agent': `PPCollection/${currentVersion}`,
          Accept: 'application/vnd.github+json'
        }
      };
      const req = https.get(RELEASES_URL, options, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return resolve(null);
        }
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.tag_name ? json.tag_name.replace(/^v/, '') : null);
          } catch {
            resolve(null);
          }
        });
        res.on('error', () => resolve(null));
      });
      // Abort the request if GitHub is slow or unreachable so that we never
      // block startup or per-request rendering on a stalled socket.
      req.setTimeout(REQUEST_TIMEOUT_MS, () => {
        req.destroy();
        resolve(null);
      });
      req.on('error', () => resolve(null));
    });
  }

  async function getVersionInfo() {
    if (!enabled) {
      return { currentVersion, latestVersion: null, updateAvailable: false };
    }
    const now = Date.now();
    if (!cache || !lastChecked || now - lastChecked > CACHE_TTL_MS) {
      if (!inflightFetch) {
        lastChecked = now;
        inflightFetch = fetchLatestVersion().finally(() => {
          inflightFetch = null;
        });
      }
      cache = await inflightFetch;
    }
    return {
      currentVersion,
      latestVersion: cache,
      updateAvailable: !!cache && cache !== currentVersion
    };
  }

  return { getVersionInfo };
}

module.exports = { createVersionService };
