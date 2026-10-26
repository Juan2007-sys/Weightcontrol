import {api,tok} from './lib.mjs';
const t=tok();
const ev=async()=>{const a=await api('GET','/audit/security-events?limit=1000',{token:t.auditor});return a.body};
const e0=await ev();
const res=[];
const t0=Date.now();
for(let i=1;i<=6;i++){const r=await api('POST','/auth/login',{body:{email:'qa-noexiste@example.com',password:'Wrong123456!'}});res.push(r.status);console.log('intento',i,r.status,Date.now()-t0+'ms',JSON.stringify(r.body).slice(0,120))}
const e1=await ev();
console.log('status seq',res.join(','),'| AUTH_FAILURE antes',e0.length,'despues',e1.length);
const ids=new Set(e0.map(x=>x._id||x.id));
console.log(JSON.stringify(e1.filter(x=>!ids.has(x._id||x.id)).map(x=>(x.descripcion||'').slice(0,160))));
