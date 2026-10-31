'use strict';
/* True locally served Chromium route + visible-text inventory. No mocked DOM. */
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'tests/screenshots/candidate-20261031');
const ROUTES = ['#dashboard','#calendar','#week/1','#recipes','#shopping/1','#compliance','#nutrition','#knowledge',
  '#shopengine','#planner','#cookmode','#flavoratlas','#weighin'];
const ENGINES = ['shopengine','planner','cookmode','flavoratlas','weighin'];
const report = {source:'served PR candidate (not github.io)', routes:[], controls:[], untranslated:[], interactions:[], errors:[]};
fs.mkdirSync(OUT,{recursive:true});
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server = http.createServer((req,res)=>{
  try {
    const url = new URL(req.url,'http://localhost');
    const name = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    if (name.includes('..') || /^\/(data\/private|context\/private)(\/|$)/.test(name)) {res.writeHead(403);return res.end('forbidden');}
    const file = path.resolve(ROOT,'.'+name);
    if (!file.startsWith(ROOT+path.sep)) {res.writeHead(403);return res.end('forbidden');}
    if (!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end('not found');}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
    res.end(fs.readFileSync(file));
  } catch(e) {res.writeHead(400);res.end(String(e));}
});
function visibleControls(){return Array.from(document.querySelectorAll('a,button,input,select,textarea')).filter(el=>{
 const box=el.getBoundingClientRect();
 return box.width>0&&box.height>0&&getComputedStyle(el).visibility!=='hidden';
}).map(el=>({tag:el.tagName.toLowerCase(),id:el.id||'',type:el.type||'',name:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,90),
 options:el.tagName==='SELECT'?[...el.options].map(x=>({value:x.value,text:x.text})):undefined}));}
async function openNav(page, width){
  if(width>900) return;
  const toggle=page.locator('#mobile-nav-toggle');
  if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
}
async function inspectRoute(page,width,hash){
 const view=hash.substring(1).split('/')[0];
 await openNav(page,width);
 const link=page.locator(`#primary-nav a[href="${hash}"]`);
 if(await link.count()!==1)throw Error('Missing nav link '+hash);
 await link.click();
 await page.waitForTimeout(420);
 const panel=ENGINES.includes(view)?page.locator('#'+view):page.locator(`section[x-show="view === '${view}'"]`);
 const visible=await panel.isVisible();
 const bounds=visible?await panel.boundingBox():null;
 const inViewport=Boolean(bounds&&bounds.y<page.viewportSize().height&&bounds.y+bounds.height>0);
 const urlMatches=new URL(page.url()).hash===hash;
 const otherEngineVisible=await Promise.all(ENGINES.filter(e=>e!==view).map(e=>page.locator('#'+e).isVisible()));
 const ok=visible&&inViewport&&urlMatches&&!otherEngineVisible.some(Boolean);
 const name=String(width)+'-'+view;
 await page.screenshot({path:path.join(OUT,name+'.png'),animations:'disabled',fullPage:false});
 const controls=await page.evaluate(visibleControls);
 report.routes.push({width,hash,ok,visible,inViewport,urlMatches,otherEngineVisible:otherEngineVisible.filter(Boolean).length,screenshot:'tests/screenshots/candidate-20261031/'+name+'.png'});
 report.controls.push({width,hash,controls});
 if(!ok)report.errors.push({width,hash,type:'route-not-visible'});
}
async function exercise(page,width){
  await openNav(page,width);
  await page.locator('#primary-nav a[href="#shopengine"]').click();
  const form=page.locator('#engine-plan-form');
  await page.locator('#engine-recipe').selectOption('nikkei-salmon-bowl');
  await page.locator('#engine-date').fill('2026-11-03');
  await page.locator('#engine-portions').fill('4');
  await form.locator('button[type="submit"]').click();
  const status=(await page.locator('#engine-status').innerText()).trim();
  const rows=await page.locator('#engine-groups li').count();
  report.interactions.push({width,action:'add planned meal to shopping',status,rows,ok:status.includes('Agregado')&&rows>0});
  const line=(await page.locator('#engine-groups').innerText()).slice(0,1800);
  if(/\b(?:need |buy |package decision pending|pantry covers)\b/i.test(line))report.errors.push({width,type:'english-shopping-output',sample:line.slice(0,180)});
  await page.screenshot({path:path.join(OUT,width+'-shopping-added.png'),animations:'disabled'});
  await page.locator('#engine-portions').fill('0');
  const canSubmit=await page.locator('#engine-portions').evaluate(el=>el.checkValidity());
  report.interactions.push({width,action:'zero-portions blocked',ok:!canSubmit});
  if(width<900)await openNav(page,width);
  await page.locator('#primary-nav a[href="#cookmode"]').click();
  const count=await page.locator('#cook-recipe option').count();
  for(let i=0;i<count;i++){
    await page.locator('#cook-recipe').selectOption({index:i});
    const steps=await page.locator('#cook-steps li').count();
    report.interactions.push({width,action:'cook recipe selection',index:i,steps,ok:steps>0});
  }
  await page.screenshot({path:path.join(OUT,width+'-cooking-last.png'),animations:'disabled'});
}
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch();
 try{
   for(const width of [390,1360]){
     const ctx=await browser.newContext({viewport:{width,height:width===390?844:900},locale:'es-PE'});
     const page=await ctx.newPage(); page.on('pageerror',e=>report.errors.push({width,type:'pageerror',message:e.message}));
     try{
       const r=await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load',timeout:25000});
       if(!r||r.status()!==200)throw Error('candidate page not loaded');
       await page.waitForTimeout(1800);
       for(const hash of ROUTES)await inspectRoute(page,width,hash);
       await exercise(page,width);
     }catch(e){report.errors.push({width,type:'fatal-flow',message:String(e)});}
     await ctx.close();
   }
 }finally{await browser.close();server.close();}
 fs.writeFileSync(path.join(ROOT,'tests/candidate_route_audit_report.json'),JSON.stringify(report,null,2));
 const bad=report.errors.length+report.interactions.filter(x=>!x.ok).length;
 console.log(JSON.stringify({routes:report.routes.length,controls:report.controls.length,interactions:report.interactions.length,bad,errors:report.errors.slice(0,9)},null,2));
 if(bad)process.exitCode=1;
}
main().catch(e=>{server.close();console.error(e);process.exitCode=1;});
