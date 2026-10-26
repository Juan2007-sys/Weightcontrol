import puppeteer from 'puppeteer-core';
import fs from 'fs';
const axeSrc = fs.readFileSync('./node_modules/axe-core/axe.min.js','utf8');
const base = 'http://localhost:5199/';
const browser = await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',args:['--no-sandbox']});
const out = {};
async function audit(name, setup){
  const page = await browser.newPage();
  await page.setViewport({width:1366,height:900});
  await page.setRequestInterception(true);
  page.on('request', r=>{
    const u=r.url();
    if(u.includes('localhost:3000/api')){
      const j=(o,s=200)=>r.respond({status:s,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(o)});
      if(u.includes('/auth/profile')||u.includes('/auth/me')) return j({id:'1',nombre:'QA Admin',email:'qa@x.co',rol:'ADMIN',activo:true});
      if(u.includes('/instrumentos/verificar')||u.includes('/publico')) return j({message:'certificado no verificable'},404);
      return j({items:[],total:0,page:1,limit:100,totalPages:0,data:[]});
    }
    r.continue();
  });
  await setup(page);
  await page.evaluate(axeSrc);
  const res = await page.evaluate(async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']}}));
  out[name]={url:page.url(),violations:res.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.map(n=>n.target.join(' ')+' :: '+(n.failureSummary||'').split('\n').slice(1,3).join(' ').slice(0,200))})),passes:res.passes.length};
  await page.close();
}
await audit('login', async p=>{await p.goto(base,{waitUntil:'networkidle0'});});
await audit('consulta-publica', async p=>{await p.goto(base+'?serial=QA-NOEXISTE',{waitUntil:'networkidle0'});});
await audit('registro', async p=>{
  await p.evaluateOnNewDocument(()=>{localStorage.setItem('wc_auth_token','x');localStorage.setItem('wc_auth_user',JSON.stringify({id:'1',nombre:'QA Admin',email:'qa@x.co',rol:'ADMIN',activo:true}));});
  await p.goto(base,{waitUntil:'networkidle0'});
  const [b]=await p.$$('xpath/.//button[contains(., "Radicar Inspección")]');
  if(!b) throw new Error('no btn registro: '+(await p.evaluate(()=>document.body.innerText.slice(0,300))));
  await b.click(); await new Promise(r=>setTimeout(r,1500));
});
fs.writeFileSync(process.argv[2],JSON.stringify(out,null,2));
for(const [k,v] of Object.entries(out)){console.log(k,v.url,'violaciones:',v.violations.length,'pasadas:',v.passes);v.violations.forEach(x=>console.log('  -',x.id,x.impact,x.nodes.length,'nodos',x.nodes.slice(0,3)))}
await browser.close();
