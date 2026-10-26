import {api,tok} from './lib.mjs';
const t=tok();const ev=async()=>(await api('GET','/audit/security-events?limit=1000',{token:t.auditor})).body.length;
const e0=await ev();const seq=[];const t0=Date.now();
for(let i=1;i<=6;i++){const r=await api('POST','/auth/login',{body:{email:'qa-r5-noexiste@example.com',password:'Mala123456!'}});seq.push(r.status)}
const e1=await ev();console.log('S2 estados',seq.join(','),'en',Date.now()-t0,'ms | AUTH_FAILURE',e0,'->',e1,'delta',e1-e0);
const a=await api('GET','/audit?actionType=AUTH_FAILURE&limit=6',{token:t.auditor});console.log(a.body.items.map(x=>x.descripcion.slice(0,95)).join('\n'));
