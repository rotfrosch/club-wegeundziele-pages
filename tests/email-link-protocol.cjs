// Original browser SDK, but every backend call is intercepted locally. No mail is sent.
const {chromium,devices,request}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const http=require('node:http');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'login-artifacts');fs.mkdirSync(out,{recursive:true});
let server,browser,network,base;
const results={started_at:new Date().toISOString(),real_auth_requests:0,email_sent:false,cases:[]};
(async()=>{
 server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 network=await request.newContext({proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 for(const device of ['Desktop','iPad (gen 7)','iPhone 13'])for(const code of ['otp_disabled','email_provider_disabled','success']){
  const ctx=await browser.newContext(device==='Desktop'?{viewport:{width:1440,height:1000}}:devices[device]);const captured=[],unexpected=[];
  try{
   await ctx.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.origin===base)return route.continue();
    if(url.hostname==='tsbqqffrjxmekdqjwdso.supabase.co'){
     const headers={'access-control-allow-origin':base,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info','access-control-allow-methods':'POST,OPTIONS'};
     if(req.method()==='OPTIONS')return route.fulfill({status:200,headers,body:''});
     if(url.pathname==='/auth/v1/otp'&&req.method()==='POST'){
      const body=req.postDataJSON();captured.push({create_user:body.create_user,redirect_to:url.searchParams.get('redirect_to'),email_matches_fixture:body.email==='member@example.invalid'});
      return route.fulfill({status:code==='success'?200:422,headers,contentType:'application/json',body:JSON.stringify(code==='success'?{}:{code,msg:code==='otp_disabled'?'Signups not allowed for otp':'Login with magic link is disabled'})});
     }
     unexpected.push({path:url.pathname,method:req.method()});return route.abort();
    }
    if(req.method()==='GET'&&['cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)){
     try{const r=await network.get(url.href);return route.fulfill({response:r});}catch{return route.abort();}
    }
    unexpected.push({host:url.hostname,method:req.method()});return route.abort();
   });
   const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base,{waitUntil:'networkidle'});await page.locator('#loginView').waitFor({state:'visible'});
   await page.locator('#email').fill('member@example.invalid');if(device==='Desktop')await page.locator('#magicLink').click();else await page.locator('#magicLink').tap();
   const message=code==='success'?'Anmeldelink wurde versendet.':'Der Anmeldelink konnte nicht versendet werden.';
   await page.getByText(message,{exact:true}).waitFor();assert.equal(captured.length,1);assert.equal(captured[0].create_user,false);assert.equal(captured[0].email_matches_fixture,true);assert.equal(captured[0].redirect_to,base+'/');assert.deepEqual(unexpected,[]);assert.deepEqual(errors,[]);assert.equal(await page.locator('#portalView').isVisible(),false);
   results.cases.push({device,response:code,http_status:code==='success'?200:422,status:'passed',create_user:false,redirect_matches_current_origin:true});console.log('PASS',device,code);
  }catch(e){results.cases.push({device,response:code,status:'failed',error:e.message});console.error('FAIL',device,code,e.message);}finally{await ctx.close();}
 }
})().catch(e=>{results.runner_error=e.message;console.error(e);process.exitCode=1;}).finally(async()=>{
 if(browser)await browser.close();if(network)await network.dispose();if(server)await new Promise(r=>server.close(r));results.finished_at=new Date().toISOString();results.passed=results.cases.filter(x=>x.status==='passed').length;results.failed=results.cases.filter(x=>x.status==='failed').length;fs.writeFileSync(path.join(out,'email-link-protocol.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({passed:results.passed,failed:results.failed}));if(results.failed)process.exitCode=1;
});
