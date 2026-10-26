import {api,tok} from './lib.mjs'; import fs from 'fs';
const t=tok(); const show=(n,r)=>console.log('\n##',n,'=>',r.status,JSON.stringify(r.body).slice(0,400));
const cnt=async(label)=>{const a=await api('GET','/audit/security-events?limit=1000',{token:t.auditor});console.log(label,a.status,'AUTH_FAILURE events:',a.body.length);return {data:a.body,meta:{total:a.body.length}}};
// S1 antes
const A0=await cnt('S1 antes');
const total0=A0.meta?.total;
// 4 intentos fuera de rol
const attempts=[
 ['AUDITOR POST /instrumentos','POST','/instrumentos',t.auditor,{}],
 ['AUDITOR POST /calibraciones/:id/corregir','POST',`/calibraciones/${JSON.parse(fs.readFileSync('ids.json')).c1}/corregir`,t.auditor,{}],
 ['TECNICO GET /usuarios','GET','/usuarios',t.tecnico],
 ['TECNICO POST /usuarios','POST','/usuarios',t.tecnico,{}],
 ['AUDITOR GET /usuarios','GET','/usuarios',t.auditor],
];
for(const [n,m,p,tk,b] of attempts){const r=await api(m,p,{token:tk,body:b});console.log(n,r.status)}
const A1=await cnt('S1 despues'); console.log('delta total',(A1.meta?.total)-total0,'esperado',attempts.length);
console.log(JSON.stringify(A1.data.slice(0,6).map(e=>[e.actionType,e.identifier||e.descripcion,(e.descripcion||'').slice(0,100)])));
// HU-03
const mkU=(n,rol)=>({nombre:'QA '+n,email:`qa-${n}@example.com`.toLowerCase(),password:'QaPass123456!',rol});
const made={};
for(const rol of ['TECNICO','AUDITOR','INSTITUCION_ACREDITACION','SIC','CIUDADANO','ADMIN']){const r=await api('POST','/usuarios',{token:t.admin,body:mkU(rol.toLowerCase().replace(/_/g,'-'),rol)});console.log('crear',rol,r.status,r.body.id||JSON.stringify(r.body).slice(0,200));made[rol]=r.body.id}
show('crear duplicado',await api('POST','/usuarios',{token:t.admin,body:mkU('tecnico','TECNICO')}));
show('crear rol invalido',await api('POST','/usuarios',{token:t.admin,body:{...mkU('x','TECNICO'),rol:'SUPERMAN'}}));
show('editar nombre+rol',await api('PUT','/usuarios/'+made.TECNICO,{token:t.admin,body:{nombre:'QA Tecnico Editado',rol:'AUDITOR'}}));
show('volver a TECNICO',await api('PUT','/usuarios/'+made.TECNICO,{token:t.admin,body:{rol:'TECNICO'}}));
fs.writeFileSync('qausers.json',JSON.stringify(made));
