const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

// The Linux CI runner includes Chrome. Other hosts still run the HTTP tests.
const chrome = fs.existsSync('/usr/bin/google-chrome');
(chrome ? test : test.skip)('record forms warn only for unsaved changes and preserve edits on cancel', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'edit-guard-'));
  let browser;
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
      edit('original');
      document.body.dataset.result = 'passed';
      </script>`);
    // Drive Chrome through its DevTools pipe so startup and teardown do not depend on a network port.
    browser = spawn('/usr/bin/google-chrome', ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--no-first-run', '--disable-background-networking', '--remote-debugging-pipe',
      `--user-data-dir=${path.join(temp, 'profile')}`, 'about:blank'], { stdio: ['ignore','ignore','ignore','pipe','pipe'] });
    let sequence = 0;
    let pending = '';
    const replies = new Map();
    browser.stdio[4].on('data', chunk => {
      pending += chunk.toString();
      let end;
      while ((end = pending.indexOf('\0')) >= 0) {
        const message = JSON.parse(pending.slice(0, end));
        pending = pending.slice(end + 1);
        const resolve = replies.get(message.id);
        if (resolve) {
          replies.delete(message.id);
          resolve(message);
        }
      }
    });
    async function command(method, params, sessionId) {
      const id = ++sequence;
      const reply = new Promise(resolve => replies.set(id, resolve));
      browser.stdio[3].write(`${JSON.stringify({ id, method, params, sessionId })}\0`);
      const message = await reply;
      if (message.error) throw new Error(message.error.message);
      return message.result;
    }
    const { targetId } = await command('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await command('Target.attachToTarget', { targetId, flatten: true });
    await command('Page.navigate', { url: `file://${file}` }, sessionId);
    let result;
    for (let attempt = 0; attempt < 100; attempt++) {
      result = await command('Runtime.evaluate', { expression: 'document.body?.dataset.result' }, sessionId);
      if (result.result.value === 'passed') break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    expect(result.result.value).toBe('passed');
  } finally {
    if (browser) {
      const stopped = browser.exitCode !== null || browser.signalCode ? Promise.resolve() : new Promise(resolve => browser.once('exit', resolve));
      const forceStop = setTimeout(() => browser.kill('SIGKILL'), 3000);
      try {
        browser.kill('SIGTERM');
        await stopped;
      } finally {
        clearTimeout(forceStop);
        browser.stdio[3].destroy();
        browser.stdio[4].destroy();
      }
    }
    fs.rmSync(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}, 30000);
