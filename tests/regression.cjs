const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.PORTAL_TEST_URL || 'http://127.0.0.1:8000';
const results = { browser: [], profiles: 0, details: 0, expectedCases: 0, status: 0, emulation: [] };
const countries = ['HR','AT','IT','FR'].map(iso_code => ({iso_code,publish_status:'draft',content_revision:1}));
function authSource(config) {
 return `const cfg=${JSON.stringify(config)};
 const session=cfg.anonymous?null:{user:{email:'test@example.invalid'}};
 export async function getSession(){if(cfg.sessionError)throw Error('offline');return session;}
 export async function hasPermission(key){if(cfg.permissionError)throw Error('offline');return cfg.denied?false:(key==='admin:manage'?!!cfg.admin:true);}
 const response=table=>table==='countrycheck_settings'?{data:cfg.emptySettings?null:{online_version:'V65',development_version:'recovery',release_notes:'test'},error:cfg.settingsError?{message:'offline'}:null}:table==='countrycheck_countries'?{data:cfg.emptyCountries?[]:${JSON.stringify(countries)},error:cfg.countriesError?{}:null}:{data:[{slug:'countrycheck',name:'Maut & Länderinfo',path:'/maut-laenderinfo',status:'live'}],error:cfg.modulesError?{}:null};
 export const supabase={auth:{getSession:async()=>({data:{session},error:cfg.sessionError?{}:null}),signOut:async()=>({error:null}),signInWithPassword:async()=>({data:{session},error:{message:'invalid'}}),signInWithOtp:async()=>({error:null})},from(table){const q=new Proxy({}, {get(_,key){if(key==='then')return (resolve)=>Promise.resolve(response(table)).then(resolve);return ()=>q;}});return q;}};`;
}
let browser;
async function pageFor(config={},device) {
 const context=await browser.newContext(device?devices[device]:{viewport:{width:1440,height:1000}});
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin!==base)return route.abort();
  if(url.pathname==='/assets/auth.js'&&!config.realAuth) {
   if(config.authFailure)return route.abort();
   return route.fulfill({contentType:'application/javascript',body:authSource(config)});
  }
  return route.continue();
 });
 return {context,page:await context.newPage()};
}
async function test(name,fn){await fn();results.browser.push(name);console.log('PASS',name);}
async function withPage(config,path,fn,device){const {context,page}=await pageFor(config,device);try{await page.goto(base+path);await fn(page);}finally{await context.close();}}
async function visible(page,selector){await page.locator(selector).waitFor({state:'visible'});}
async function select(page,country,vehicle,values={}){await visible(page,'#country');await page.locator('#readinessNotice').waitFor({state:'hidden'});await page.selectOption('#country',country);await page.selectOption('#vehicle',vehicle);for(const [id,v]of Object.entries(values))await page.selectOption('#'+id,v);await page.waitForFunction(()=>document.querySelector('#tollResult').textContent.trim() && document.querySelector('#tollResult').textContent!=='—');}
(async()=>{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 await test('01 Anonymous login',()=>withPage({anonymous:true},'/',p=>visible(p,'#loginView')));
 await test('02 CDN failure on portal',()=>withPage({realAuth:true},'/',p=>p.getByRole('alert').filter({hasText:'konnte nicht geladen'}).waitFor()));
 await test('03 CDN failure on admin',()=>withPage({realAuth:true},'/admin/',p=>p.getByRole('alert').filter({hasText:'konnte nicht geladen'}).waitFor()));
 await test('04 CDN failure on countrycheck',()=>withPage({realAuth:true},'/maut-laenderinfo/',p=>p.getByRole('alert').filter({hasText:'konnte nicht geladen'}).waitFor()));
 await test('05 Session API failure',()=>withPage({sessionError:true},'/',p=>p.getByRole('alert').filter({hasText:'konnte nicht geladen'}).waitFor()));
 await test('06 denied=1 explanation',()=>withPage({anonymous:true},'/?denied=1',p=>p.getByText(/Für diesen Bereich fehlt/).waitFor()));
 await test('07 Missing admin settings',()=>withPage({admin:true,emptySettings:true},'/admin/',p=>p.getByRole('alert').filter({hasText:'konnte nicht geladen'}).waitFor()));
 await test('08 Failed admin settings',()=>withPage({admin:true,settingsError:true},'/admin/',p=>p.getByRole('alert').filter({hasText:'konnte nicht geladen'}).waitFor()));
 await test('09 Empty country records',()=>withPage({admin:true,emptyCountries:true},'/admin/',p=>p.getByText(/Keine Länderstatusdaten/).waitFor()));
 await test('10 Online module does not approve countries',()=>withPage({},'/',async p=>{await p.getByText(/bestätigt keine vollständige Länderfreigabe/).waitFor();await p.locator('#moduleGrid a').waitFor();await p.locator('#moduleGrid a').click();await visible(p,'#country');}));
 await test('11 Country permission redirects',()=>withPage({denied:true},'/maut-laenderinfo/',async p=>{await p.waitForURL('**/?denied=1');await p.getByText(/Für diesen Bereich fehlt/).waitFor();}));
 await test('12 Nine accessible select labels',()=>withPage({},'/maut-laenderinfo/',async p=>{await visible(p,'#country');assert.equal(await p.locator('select').count(),9);assert.equal(await p.locator('select').evaluateAll(s=>s.filter(x=>x.labels?.length && x.labels[0].textContent.trim()).length),9);}));
 await test('13 Hidden trailer brake cannot change heavy profile',()=>withPage({},'/maut-laenderinfo/',async p=>{await select(p,'HR','carTrailer',{brake:'unbraked'});await p.selectOption('#vehicle','mHeavyTrailer');await p.locator('[data-tab="speed"]').click();const a=await p.locator('#detailText').innerText();await p.evaluate(()=>{brake.value='braked';render();});assert.equal(await p.locator('#detailText').innerText(),a);}));
 await test('14 Hidden length cannot affect solo Italian car',()=>withPage({},'/maut-laenderinfo/',async p=>{await select(p,'IT','m35',{length:'long'});await p.selectOption('#vehicle','car');await p.locator('[data-tab="special"]').click();const a=await p.locator('#detailText').innerText();await p.evaluate(()=>{lengthSel.value='short';render();});assert.equal(await p.locator('#detailText').innerText(),a);}));
 await test('15 Keyboard detail navigation',()=>withPage({},'/maut-laenderinfo/',async p=>{await select(p,'AT','car');const card=p.locator('[data-tab="toll"]');await card.focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.querySelector('#detailTitle').textContent.includes('Maut Österreich'));assert.match(await p.locator('#detailTitle').innerText(),/Maut Österreich/);}));
 await test('16 Logout navigation',()=>withPage({},'/maut-laenderinfo/',async p=>{await visible(p,'#country');await p.locator('#clubLogout').click();await p.waitForURL(base+'/');}));
 await test('17 Failed module list is visible',()=>withPage({modulesError:true},'/',p=>p.getByText('Die Module konnten nicht geladen werden.').waitFor()));
 await test('18 JavaScript disabled notices on all pages',async()=>{const c=await browser.newContext({javaScriptEnabled:false});try{for(const path of ['/','/admin/','/maut-laenderinfo/']){const p=await c.newPage();await p.goto(base+path);await p.getByText(/JavaScript erforderlich/).waitFor();await p.close();}}finally{await c.close();}});
 // Enumerate every combination of visible, applicable supplemental controls.
 await withPage({},'/maut-laenderinfo/',async p=>{
  await visible(p,'#country');
  const matrix=await p.evaluate(()=>{
   const profiles=[];const controls=[brake,motorhomeAxles,weightBand,heightBand,comboWeight,trailerAxles,lengthSel];
   for(const c of ['HR','AT','IT','FR'])for(const v of ['car','carTrailer','m35','m2','m3','m4','m35Trailer','mHeavyTrailer']){
    country.value=c;vehicle.value=v;render();
    const active=controls.filter(x=>subcontrols.classList.contains('show')&&x.closest('.field-card').style.display!=='none');
    function visit(i){if(i<active.length){const field=active[i];for(const option of [...field.options]){field.value=option.value;visit(i+1);}return;}
     render();const d=current();if(!d||!d.toll||!d.speed||tollResult.textContent!==d.toll||speedResult.textContent!==d.speed)throw Error('Invalid summary '+c+v);
     const texts=[];for(const tab of ['toll','speed','overtake','box','special','sources','abbr']){activeTab=tab;renderDetail();const text=detailText.textContent+detailGrid.textContent;if(!text.trim()||/undefined|NaN/.test(text))throw Error('Invalid detail '+c+v+tab);texts.push(text);}
     profiles.push({country:c,vehicle:v,values:Object.fromEntries(active.map(x=>[x.id,x.value])),toll:d.toll,speed:d.speed,details:texts.length});
    }visit(0);
   }return profiles;
  });
  results.profiles=matrix.length;results.details=matrix.reduce((n,x)=>n+x.details,0);results.profileMatrix=matrix;
  console.log('MATRIX',results.profiles,'profiles',results.details,'details');assert.equal(results.profiles,126);assert.equal(results.details,882);
 });
 const cases=[
 ['HR','car',{},'Klasse I*','50 · 90 · 110 · 130 km/h'],
 ['HR','m35',{},'Klasse II','50 · 90 · 110 · 130 km/h'],
 ['HR','carTrailer',{brake:'unbraked'},'Klasse II','50 · 80 · 80 · 90 km/h'],
 ['HR','mHeavyTrailer',{motorhomeAxles:'2',trailerAxles:'1'},'Klasse III','50 · 80 · 80 · 90 km/h'],
 ['HR','mHeavyTrailer',{motorhomeAxles:'3',trailerAxles:'1'},'Klasse IV','50 · 80 · 80 · 90 km/h'],
 ['AT','car',{},'Vignette','50 · 100 · 100 · 130 km/h'],
 ['AT','carTrailer',{brake:'atBE'},'Vignette','50 · 70 · 80 · 80 km/h'],
 ['AT','mHeavyTrailer',{motorhomeAxles:'3'},'GO-Maut · Kat. 3','50 · 70 · 80 · 80 km/h'],
 ['IT','car',{},'Klasse A*','50 · 90 · 110 · 130 km/h'],
 ['IT','m4',{motorhomeAxles:'5',weightBand:'over12'},'Klasse 5','50 · 70 · 70 · 80 km/h'],
 ['IT','carTrailer',{trailerAxles:'2'},'Klasse 4','50 · 70 · 70 · 80 km/h'],
 ['FR','m35',{heightBand:'ge3'},'Klasse 3','50 · 80/90 · 110 · 130 km/h'],
 ['FR','carTrailer',{heightBand:'ge3',comboWeight:'gt12'},'Klasse 4','50 · 60–80 · 80 · 90 km/h'],
 ['FR','m2',{weightBand:'over12'},'Klasse 3','50 · 80 · 80 · 90 km/h']
 ];
 await withPage({},'/maut-laenderinfo/',async p=>{for(const[c,v,values,toll,speed]of cases){await select(p,c,v,values);assert.equal(await p.locator('#tollResult').innerText(),toll,JSON.stringify([c,v,values]));assert.equal(await p.locator('#speedResult').innerText(),speed,JSON.stringify([c,v,values]));results.expectedCases++;}});
 results.expectedFixtures=cases;
 await withPage({},'/',async p=>{results.status=await p.evaluate(async()=>{const {countryPublication:f}=await import('/assets/publication.js');const rows=['HR','AT','IT','FR'].map(iso_code=>({iso_code,publish_status:'published'}));const checks=[f('live',null,true)==='Länderfreigabe nicht verfügbar',f('live',[])==='Länderfreigabe unvollständig',f('live',rows).includes('nicht bestätigt'),f('draft',rows).includes('nicht bestätigt')];if(checks.some(x=>!x))throw Error('status');return checks.length;});});
 for(const device of [null,'iPad (gen 7)','iPhone 13'])await withPage({},'/maut-laenderinfo/',async p=>{await select(p,'FR','m35',{heightBand:'ge3'});await p.locator('[data-tab="toll"]').click();assert.match(await p.locator('#detailTitle').innerText(),/Frankreich/);assert.equal(await p.locator('#country').isVisible(),true);results.emulation.push(device||'Desktop');},device);
 fs.writeFileSync(__dirname+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify({...results,profileMatrix:undefined,expectedFixtures:undefined},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
