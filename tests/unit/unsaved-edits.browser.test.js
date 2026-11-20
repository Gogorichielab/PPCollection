const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// The Linux CI runner includes Chrome. Other hosts still run the HTTP tests.
const chrome = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].find(file => fs.existsSync(file));
(chrome ? test : test.skip)('record forms warn only for unsaved changes and preserve edits on cancel', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'edit-guard-'));
  try {
    const root = path.join(__dirname, '../../src');
    const dialog = fs.readFileSync(path.join(root, 'views/partials/discard-dialog.ejs'), 'utf8').split('<script')[0];
    const guard = fs.readFileSync(path.join(root, 'public/js/unsaved-edits.js'), 'utf8');
    for (const kind of ['ammo', 'firearms']) {
      for (const page of ['new', 'edit']) {
        const template = fs.readFileSync(path.join(root, 'views', kind, `${page}-content.ejs`), 'utf8');
        expect(template).toContain('data-guard-edits');
        expect(template).toContain("include('../partials/discard-dialog')");
      }
    }
    const file = path.join(temp, 'form.html');
    fs.writeFileSync(file, `<!doctype html><form data-guard-edits><input name="name" value="original"></form>
      <a href="form.html?leave=1">Leave</a>${dialog}<script>${guard}</script><script>
      const input = document.querySelector('input');
      const link = document.querySelector('a');
      const modal = document.querySelector('dialog');
      const edit = value => { input.value = value; input.dispatchEvent(new Event('input', { bubbles:true })); };
      const unloadBlocked = () => !window.dispatchEvent(new Event('beforeunload', {cancelable:true}));
      edit('revised');
      link.click();
      if (!modal.open || !unloadBlocked()) throw Error('missing warning');
      modal.querySelector('button').click();
      if (modal.open || input.value !== 'revised') throw Error('lost input');
      edit('original');
      if (unloadBlocked()) throw Error('prompt after revert');
      edit('second edit');
      document.querySelector('form').dispatchEvent(new Event('submit'));
      if (unloadBlocked()) throw Error('prompt on save');
      document.body.dataset.result = 'passed';
      </script>`);
    const html = execFileSync(chrome, ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      `--user-data-dir=${path.join(temp, 'profile')}`, '--dump-dom', `file://${file}`],
    { encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'] });
    expect(html).toContain('<body data-result="passed">');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}, 30000);
