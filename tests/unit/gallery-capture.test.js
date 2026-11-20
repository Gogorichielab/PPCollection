const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const request = require('supertest');
const { createApp } = require('../../src/app/createApp');

test('capture the documentation screens with a disposable demo collection', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gallery-'));
  let browser, app;
  try {
    app = await createApp({config: {port: 0, sessionSecret: 'gallery-fixture', adminUser: 'demo', adminPass: 'Example-password1', databasePath: path.join(temp,'app.db')}});
    const agent = request.agent(app);
    const token = html => html.match(/name="_csrf" value="([^"]+)"/)[1];
    await agent.post('/login').type('form').send({username:'demo', password:'Example-password1', _csrf:token((await agent.get('/login')).text)});
    await agent.post('/change-password').type('form').send({current_password:'Example-password1',new_password:'Example-password2',confirm_password:'Example-password2',_csrf:token((await agent.get('/change-password')).text)});
    const db = app.locals.db;
    const insert = db.prepare('INSERT INTO firearms(make,model,caliber,firearm_type,serial,status,condition,purchase_price,purchase_date) VALUES(?,?,?,?,?,?,?,?,?)');
    for (const [i,row] of [
      ['Browning','Buck Mark','.22 LR','Pistol'],['Henry','Golden Boy','.22 LR','Rifle'],['Mossberg','500','12 Gauge','Shotgun'],
      ['Ruger','Mark IV','.22 LR','Pistol'],['Smith & Wesson','Model 10','.38 Special','Revolver'],['Winchester','Model 70','.308 Win','Rifle']
    ].entries()) insert.run(...row,i===4?'':`DEMO-00${i+1}`,'Active','Good',i===4?null:325+i*65,`202${i}-06-10`);
    const ammo=db.prepare('INSERT INTO ammo_inventory(manufacturer,product_line,caliber,boxes,rounds_per_box,total_rounds) VALUES(?,?,?,?,?,?)');
    ammo.run('Federal','Champion','.22 LR',4,50,200);
    ammo.run('Winchester','Target','12 Gauge',2,25,50);
    ammo.run('Remington','Target','.38 Special',1,50,50);
    db.prepare('INSERT INTO saved_inventory_views(user_id,kind,name,query) VALUES(1,?,?,?)').run('firearms','Active collection','filter_status=active');
    db.prepare('INSERT INTO firearm_documents(firearm_id,category,filename,contents) VALUES(1,?,?,?)').run('Receipt','Sample receipt.pdf',Buffer.from('%PDF-1.4 demo'));
    db.exec("INSERT INTO maintenance_logs(firearm_id,date,type,notes) VALUES(1,'2026-09-03','Cleaning','Annual inspection'); INSERT INTO range_sessions(firearm_id,date,location,rounds_fired) VALUES(1,'2026-10-10','Club range',25)");
    await agent.post('/ammo/import').type('text/plain').set('x-csrf-token',token((await agent.get('/ammo')).text)).set('x-import-name','sample-inventory.csv').send('Manufacturer,Caliber,Loose Rounds\nFederal,.22 LR,25\nWinchester,12 Gauge,10');
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

    const shots = [
      ['dashboard','/',1440,1000],['dashboard-light','/',1440,1000],['inventory','/firearms',1440,1080],
      ['inventory-mobile','/firearms',390,680,'[data-inventory-results]'],['firearm-detail','/firearms/1',1280,840],
      ['ammo','/ammo',1280,900],['stats','/reports',960,680,'section[aria-labelledby="ammunition-title"]'],
      ['insurance-report','/firearms/report',1280,900],['import-undo','/collection/ammo/imports/1',1000,700],
      ['documents','/firearms/1',1000,400,'#documents'],['add-firearm','/firearms/new',1280,850],['profile','/profile',1280,850]
    ];
    for (const [name,url,width,height,selector] of shots) {
      const response=await agent.get(url).expect(200);
      const file=path.join(temp,`${name}.html`);
      const html=response.text.replace(/(["'])\/static\//g,`$1file://${process.cwd()}/src/public/`);
      fs.writeFileSync(file,html);
      await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},sessionId);
      await command('Page.navigate',{url:`file://${file}`},sessionId);
      async function evaluate(expression) {
        const r=await command('Runtime.evaluate',{expression,returnByValue:true},sessionId);
        if(r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
        return r.result.value;
      }
      for (let i=0;i<100;i++) {
        if(await evaluate(`location.href.endsWith('/${name}.html') && document.readyState==='complete'`)) break;
        await new Promise(resolve=>setTimeout(resolve,50));
      }
      await evaluate(`document.documentElement.dataset.theme='${name==='dashboard'?'dark':'light'}'`);
      if(name==='inventory') await evaluate("document.querySelector('[data-inventory-summary] details').open=true");
      if(selector) await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start',behavior:'instant'})`);
      await new Promise(resolve=>setTimeout(resolve,400));
      const {data}=await command('Page.captureScreenshot',{format:'webp',quality:90},sessionId);
      for(let i=0;i<data.length;i+=3500) process.stdout.write(`GALLERY|${name}|${i}|${data.slice(i,i+3500)}|END\n`);
    }
  } finally {
    if (browser) {
      const stopped = browser.exitCode !== null || browser.signalCode ? Promise.resolve() : new Promise(resolve => browser.once('exit', resolve));
      browser.stdio[3].destroy();
      browser.stdio[4].destroy();
      browser.kill('SIGKILL');
      await stopped;
    }
    if (app) app.locals.db.close();
    fs.rmSync(temp, { recursive: true, force: true });
  }
}, 100000);
