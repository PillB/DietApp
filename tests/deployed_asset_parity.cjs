'use strict';
/** Strict post-deployment verification: compare served GitHub Pages bytes with checked-out main. */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const SHA=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
const BASE=process.env.PAGES_URL||'https://pillb.github.io/DietApp/';
const ASSETS=['index.html','assets/js/app.js','assets/js/i18n.js','assets/js/shopping-ui.js','assets/js/data.js','data/canonical/docx-diet-recipes-canon.v1.json'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function checkFile(file){
  const expected=fs.readFileSync(path.join(ROOT,file));
  const url=new URL(file,BASE);url.searchParams.set('release-audit',SHA.slice(0,12));
  const response=await fetch(url,{headers:{'cache-control':'no-cache'}});
  if(!response.ok)return {file,ok:false,status:response.status};
  const got=Buffer.from(await response.arrayBuffer());
  return {file,ok:sha(expected)===sha(got),status:response.status,expectedHash:sha(expected),servedHash:sha(got),expectedBytes:expected.length,servedBytes:got.length};
}
async function main(){
 const audit={base:BASE,checkoutSha:SHA,attempts:[],verified:false,at:new Date().toISOString()};
 for(let n=0;n<5;n++){
  const rows=await Promise.all(ASSETS.map(async x=>{try{return await checkFile(x)}catch(e){return {file:x,ok:false,error:String(e)}}}));
  audit.attempts.push({attempt:n+1,rows});
  if(rows.every(x=>x.ok)){audit.verified=true;break}
  if(n<4)await sleep(5000);
 }
 fs.writeFileSync(path.join(ROOT,'tests/deployed_asset_parity_report.json'),JSON.stringify(audit,null,2));
 console.log(JSON.stringify({sha:SHA,verified:audit.verified,files:ASSETS.length,attempts:audit.attempts.length,last:audit.attempts.at(-1).rows},null,2));
 if(!audit.verified)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});
