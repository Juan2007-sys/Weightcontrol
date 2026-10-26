import {api,tok} from './lib.mjs'; import fs from 'fs';
const t=tok();
const u=await api('POST','/usuarios',{token:t.admin,body:{nombre:'QA R2 Tecnico',email:'qa-r2-tecnico@example.com',password:'QaPass123456!',rol:'TECNICO'}});console.log('crear user',u.status,u.body.id);fs.writeFileSync('r2user.json',JSON.stringify({id:u.body.id}));
const ev=async()=>(await api('GET','/audit/security-events?limit=1000',{token:t.auditor})).body.length;
const e0=await ev();
const seq=[];
for(let i=0;i<3;i++){const r=await api('POST','/auth/login',{body:{email:'qa-r2-tecnico@example.com',password:'QaPass123456!'}});seq.push('ok:'+r.status)}
for(let i=0;i<6;i++){const r=await api('POST','/auth/login',{body:{email:'qa-r2-tecnico@example.com',password:'Mala123456!'}});seq.push('bad:'+r.status)}
console.log(seq.join(' '));const e1=await ev();console.log('AUTH_FAILURE',e0,'->',e1);
const a=await api('GET','/audit?actionType=AUTH_FAILURE&limit=4',{token:t.auditor});console.log(a.body.items.map(x=>x.descripcion.slice(0,110)).join('\n'));
