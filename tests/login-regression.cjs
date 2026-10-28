const {chromium, devices, request} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {createHash} = require('node:crypto');
const root = path.resolve(__dirname, '..');
const artifacts = path.join(__dirname, 'login-artifacts');
fs.mkdirSync(artifacts, {recursive:true});
const results = {started_at:new Date().toISOString(), browser:'Chromium', production_auth_tested:false, email_sent:false, tests:[]};
let browser, network, server, base;
const slug = value => value.replace(/[^a-z0-9]/gi, '_');
function authSource(cfg) {
  return `const cfg=${JSON.stringify(cfg)};export const calls=JSON.parse(sessionStorage.getItem("test-auth-calls")||"[]");
calls.push=function(...items){Array.prototype.push.apply(this,items);sessionStorage.setItem("test-auth-calls",JSON.stringify(this));return this.length;};
const session={user:{email:'member@example.invalid'}};
export async function getSession(){return cfg.session?session:null;}
export async function hasPermission(key){calls.push({op:'permission',key});if(cfg.permissionError)throw Error('test API unavailable');return key==='admin:manage'?!!cfg.admin:!cfg.denied;}
export const supabase={
 auth:{
  getSession:async()=>{if(cfg.sessionThrow)throw Error('test session rejected');return {data:{session:cfg.session?session:null},error:cfg.sessionError?{message:'test session failure'}:null}},
  signOut:async()=>{calls.push({op:'signOut'});return {error:null}},
  signInWithPassword:async args=>{calls.push({op:'password',email:args.email});return {data:{session},error:cfg.passwordError?{message:'test invalid credentials'}:null}},
  signInWithOtp:async args=>{calls.push({op:'otp',...args});return {error:cfg.otpError?{message:'test mail failure'}:null}}
 },
 rpc:async(name,args)=>{calls.push({op:'rpc',name,args});return {data:cfg.rpcNonBoolean?'true':(args.requested_key==='admin:manage'?!!cfg.admin:!cfg.denied),error:cfg.permissionError?{message:'test RPC failure'}:null}},
 from(table){calls.push({op:'from',table});const response=table==='club_modules'?{data:[{slug:'countrycheck',name:'Maut & Länderinfo',path:'/maut-laenderinfo',status:'live'}],error:null}:table==='countrycheck_countries'?{data:[],error:null}:{data:{online_version:'V65',development_version:'test',release_notes:'fixture'},error:null};const q=new Proxy({},{get(_,key){if(key==='then')return resolve=>Promise.resolve(response).then(resolve);return ()=>q;}});return q;}
};
export function createClient(){return supabase;}`;
}
async function check(name, device, run, kind='original-14') {
  const start=Date.now();
  try {const detail=await run();results.tests.push({name,device,kind,status:'passed',duration_ms:Date.now()-start,...(detail?{detail}:{})});console.log('PASS',device,name);}
  catch(error){results.tests.push({name,device,kind,status:'failed',duration_ms:Date.now()-start,error:error.message});console.error('FAIL',device,name,error.message);}
}
async function withPage(device, cfg, run, pathname='/') {
  const context=await browser.newContext(device==='Desktop'?{viewport:{width:1440,height:1000}}:devices[device]);
  const forbidden=[];
  await context.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.origin===base){
      if(u.pathname==='/assets/auth.js'&&!cfg.real&&!cfg.realHelper){
        if(cfg.authFailure)return route.abort();
        if(cfg.authHang){await new Promise(resolve=>{cfg.releaseAuth=resolve;});return route.abort().catch(()=>{});}
        return route.fulfill({contentType:'application/javascript',body:cfg.syntaxError?'export const = ;':cfg.invalidModule?'export const supabase={};':authSource(cfg)});
      }
      return route.continue();
    }
    if(cfg.realHelper&&u.hostname==='cdn.jsdelivr.net')return route.fulfill({contentType:'application/javascript',body:authSource(cfg)});
    if(!cfg.real)return route.abort();
    // Only public static resources. Never send real passwords, OTPs or member requests.
    if(route.request().method()!=='GET'||!['cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname)){
      forbidden.push(u.origin+u.pathname);return route.abort();
    }
    try {const response=await network.get(u.href);return route.fulfill({response});}catch{return route.abort();}
  });
  const page=await context.newPage();page.setDefaultTimeout(cfg.authHang?16000:8000);page.setDefaultNavigationTimeout(30000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.goto(base+pathname,{waitUntil:cfg.authHang?'domcontentloaded':'networkidle'});
    const value=await run(page,cfg);
    assert.deepEqual(forbidden,[], 'Unexpected real backend/authentication request');
    assert.deepEqual(errors,[], 'Unhandled browser errors');
    return value;
  } finally {if(cfg.releaseAuth)cfg.releaseAuth();await context.close();}
}
const login = p => p.locator('#loginView').waitFor({state:'visible'});
const portal = async p => {await p.locator('#portalView').waitFor({state:'visible'});await p.locator('#moduleGrid a').waitFor();};
const fill = async p => {await login(p);await p.locator('#email').fill('member@example.invalid');await p.locator('#password').fill('fixture-not-a-real-password');};
const calls = p => p.evaluate(async()=>{const m=await import('/assets/auth.js');return m.calls;});
async function recovery(p){
  await p.getByRole('alert').filter({hasText:'Die Anmeldung konnte nicht geladen werden'}).waitFor();
  assert.equal(await p.locator('#loginView').isVisible(),false);
  assert.equal(await p.locator('#portalView').isVisible(),false);
  assert.equal(await p.locator('#adminLink').isVisible(),false);
  assert.equal(await p.getByRole('button',{name:'Seite neu laden'}).isVisible(),true);
}
async function runDevice(device){
 await check('01 Original SDK, anonymous startup',device,()=>withPage(device,{real:true},async p=>{await login(p);assert.equal(await p.locator('#loginRecovery').isVisible(),false);}));
 await check('02 Original logo replaces title',device,()=>withPage(device,{},async p=>{await login(p);const image=p.locator('#loginView .login-logo');assert.equal(await image.getAttribute('src'),'./assets/campions-club-logo.png');assert.equal(await image.evaluate(e=>e.complete&&e.naturalWidth>0),true);assert.equal(await p.locator('#loginView h1').count(),0);const ratio=await image.evaluate(e=>{const r=e.getBoundingClientRect();return Math.abs(r.width/r.height-e.naturalWidth/e.naturalHeight)});assert.ok(ratio<0.01);}));
 await check('03 Layout, labels and touch targets',device,()=>withPage(device,{},async p=>{await login(p);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));for(const sel of ['#email','#password','.btn-primary','#magicLink']){await p.locator(sel).scrollIntoViewIfNeeded();assert.ok((await p.locator(sel).boundingBox()).height>=44);assert.equal(await p.locator(sel).isVisible(),true);}assert.equal(await p.getByLabel('E-Mail-Adresse',{exact:true}).count(),1);assert.equal(await p.getByLabel('Passwort',{exact:true}).count(),1);await p.screenshot({path:path.join(artifacts,slug(device)+'-login.png'),fullPage:true});}));
 await check('04 Keyboard and missing email notice',device,()=>withPage(device,{},async p=>{await login(p);await p.locator('#email').focus();await p.keyboard.press('Tab');assert.equal(await p.locator('#password').evaluate(e=>e===document.activeElement),true);await p.keyboard.press('Tab');assert.equal(await p.locator('.btn-primary').evaluate(e=>e===document.activeElement),true);if(device==='Desktop')await p.locator('#magicLink').click();else await p.locator('#magicLink').tap();await p.getByText('Bitte zuerst die E-Mail-Adresse eintragen.').waitFor();assert.equal((await calls(p)).filter(x=>x.op==='otp').length,0);}));
 await check('05 Password rejection message',device,()=>withPage(device,{passwordError:true},async p=>{await fill(p);await p.locator('.btn-primary').click();await p.getByText('Anmeldung nicht möglich. Bitte E-Mail und Passwort prüfen.').waitFor();assert.equal(await p.locator('#portalView').isVisible(),false);}));
 await check('06 Member login hides administration',device,()=>withPage(device,{},async p=>{await fill(p);await p.locator('.btn-primary').click();await portal(p);assert.equal(await p.locator('#adminLink').isVisible(),false);assert.equal(await p.locator('#adminLink').evaluate(e=>e.hidden&&getComputedStyle(e).display==='none'),true);assert.equal(await p.locator('#loginView').isVisible(),false);}));
 await check('07 Denied member signs out',device,()=>withPage(device,{denied:true},async p=>{await fill(p);await p.locator('.btn-primary').click();await p.getByText('Für diesen Mitgliederbereich ist keine Freigabe hinterlegt.').waitFor();assert.equal(await p.locator('#portalView').isVisible(),false);assert.ok((await calls(p)).some(x=>x.op==='signOut'));}));
 await check('08 Permission failure denies access',device,()=>withPage(device,{permissionError:true},async p=>{await fill(p);await p.locator('.btn-primary').click();await p.getByText('Für diesen Mitgliederbereich ist keine Freigabe hinterlegt.').waitFor();assert.equal(await p.locator('#portalView').isVisible(),false);}));
 await check('09 Existing member hides administration',device,()=>withPage(device,{session:true},async p=>{await portal(p);assert.equal(await p.locator('#adminLink').isVisible(),false);assert.equal(await p.locator('#adminLink').evaluate(e=>e.hidden&&getComputedStyle(e).display==='none'),true);}));
 await check('10 Existing admin sees administration',device,()=>withPage(device,{session:true,denied:true,admin:true},async p=>{await portal(p);assert.equal(await p.locator('#adminLink').isVisible(),true);assert.equal(await p.locator('#adminLink').getAttribute('href'),'./admin/');}));
 await check('11 Existing denied session signs out',device,()=>withPage(device,{session:true,denied:true},async p=>{await p.getByText('Für diesen Mitgliederbereich ist keine Freigabe hinterlegt.').waitFor();assert.equal(await p.locator('#portalView').isVisible(),false);assert.ok((await calls(p)).some(x=>x.op==='signOut'));}));
 await check('12 Email link request contract',device,()=>withPage(device,{},async p=>{await login(p);await p.locator('#email').fill('member@example.invalid');await p.locator('#magicLink').click();await p.getByText('Anmeldelink wurde versendet.').waitFor();const sent=(await calls(p)).find(x=>x.op==='otp');assert.equal(sent.options.shouldCreateUser,false);assert.equal(sent.options.emailRedirectTo,base+'/');assert.equal(await p.locator('#portalView').isVisible(),false);}));
 await check('13 Email link rejection message',device,()=>withPage(device,{otpError:true},async p=>{await login(p);await p.locator('#email').fill('member@example.invalid');await p.locator('#magicLink').click();await p.getByText('Der Anmeldelink konnte nicht versendet werden.').waitFor();assert.equal(await p.locator('#portalView').isVisible(),false);}));
 await check('14 Missing auth module: message and reload',device,()=>withPage(device,{authFailure:true},async(p,cfg)=>{await recovery(p);await p.screenshot({path:path.join(artifacts,slug(device)+'-recovery.png'),fullPage:true});cfg.authFailure=false;await Promise.all([p.waitForNavigation(),p.getByRole('button',{name:'Seite neu laden'}).click()]);await login(p);assert.equal(await p.locator('#loginRecovery').isVisible(),false);}));
 for(const [name,cfg]of [['Invalid auth exports',{invalidModule:true}],['Auth syntax error',{syntaxError:true}],['Session API error',{sessionError:true}],['Rejected session promise',{sessionThrow:true}],['Auth module timeout',{authHang:true}]]){
  await check(name,device,()=>withPage(device,cfg,async p=>{if(cfg.authHang)p.setDefaultTimeout(16000);await recovery(p);}), 'additional-regression');
 }
 // Exercise the unchanged real auth.js and admin page against a local SDK boundary.
 for(const [name,cfg,allowed]of [['Denied admin RPC',{denied:true},false],['Failed admin RPC',{permissionError:true},false],['Non-boolean RPC cannot grant access',{rpcNonBoolean:true},false],['Authorized admin RPC',{admin:true},true]]){
  await check(name,device,()=>withPage(device,{...cfg,session:true,realHelper:true},async p=>{
   if(allowed)await p.locator('#versionBox .notice').waitFor();else {await p.waitForURL(base+'/');await p.waitForTimeout(100);}
   const evidence=await p.evaluate(async()=>{const sdk=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm');return sdk.calls;});
   assert.ok(evidence.some(x=>x.op==='rpc'&&x.name==='current_user_has_permission'&&x.args.requested_key==='admin:manage'));
   if(!allowed)assert.equal(evidence.some(x=>x.op==='from'&&x.table==='countrycheck_countries'),false);
  },'/admin/'), 'authorization-boundary');
 }
}
(async()=>{
 server=http.createServer((req,res)=>{const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=path.resolve(root,'.'+relative);if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);return res.end();}try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');const bytes=fs.readFileSync(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(bytes);}catch{res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
 network=await request.newContext({proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 results.browser_version=browser.version();
 const selected=process.env.PORTAL_TEST_DEVICE?[process.env.PORTAL_TEST_DEVICE]:['Desktop','iPad (gen 7)','iPhone 13'];
 for(const device of selected){assert.ok(device==='Desktop'||devices[device],'Unknown device');await runDevice(device);}
})().catch(error=>{console.error(error);results.runner_error=error.message;process.exitCode=1;}).finally(async()=>{
 if(browser)await browser.close();if(network)await network.dispose();if(server)await new Promise(resolve=>server.close(resolve));
 results.finished_at=new Date().toISOString();results.passed=results.tests.filter(x=>x.status==='passed').length;results.failed=results.tests.filter(x=>x.status==='failed').length;
 results.tested_files=Object.fromEntries(['index.html','assets/portal.css','assets/auth.js','admin/index.html','tests/login-regression.cjs'].map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
 fs.writeFileSync(path.join(artifacts,'results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({passed:results.passed,failed:results.failed,runner_error:results.runner_error}));if(results.failed)process.exitCode=1;
});
