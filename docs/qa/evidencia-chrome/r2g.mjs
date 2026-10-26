import {api,tok} from './lib.mjs'; import fs from 'fs';
const t=tok(); const ids=JSON.parse(fs.readFileSync('r2ids.json')); const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const b=(o={})=>({serial:'QA-R2-X',marca:'QA',modelo:'QA',tipo:'Bascula',categoriaExactitud:'Clase III',capacidadMaxima:150,capacidadMinima:1,unidadMedida:'kg',divisionEscala:0.05,evidenciasFotograficas:{fotoEquipo:png,fotoPrecinto:png,fotoUbicacion:png},codigoPrecintoSIMEL:'QA-R2-P-X',fechaUltimaCalibracion:'2026-10-01',fechaProximaCalibracion:'2027-10-01',...o});
const p=async(n,body,tk=t.tecnico)=>{const r=await api('POST','/instrumentos',{token:tk,body});console.log(n,r.status,(r.body.fieldErrors||[]).map(f=>f.campo).join(',')||(r.body.message||'').toString().slice(0,80))};
await p('dup serial',b({serial:'QA-R2-OK',codigoPrecintoSIMEL:'QA-R2-P-Z'}));
await p('dup precinto',b({codigoPrecintoSIMEL:'QA-R2-P-QA-R2-OK'}));
await p('min>=max',b({capacidadMinima:150}));
await p('bascula e',b({divisionEscala:0.5}));
await p('pesa d>max',b({tipo:'Pesa',capacidadMaxima:10,capacidadMinima:0,divisionEscala:20}));
await p('dinam n<100',b({tipo:'Dinamometro',unidadMedida:'kN',capacidadMaxima:10,capacidadMinima:0,divisionEscala:1}));
await p('C1 ClaseI g',b({categoriaExactitud:'Clase I',unidadMedida:'g',capacidadMaxima:150000,divisionEscala:10}));
await p('C1 ClaseII lb exceso',b({categoriaExactitud:'Clase II',unidadMedida:'lb',capacidadMaxima:300,divisionEscala:0.000001}));
await p('C1 ClaseIIII t',b({categoriaExactitud:'Clase IIII',unidadMedida:'t',capacidadMaxima:30,divisionEscala:0.001}));
await p('AUDITOR crea',b(),t.auditor);
const au0=(await api('GET','/audit/security-events?limit=1000',{token:t.auditor})).body.length;
for(const [m,pa,tk,bd] of [['POST','/instrumentos',t.auditor,{}],['POST','/calibraciones/'+ids['QA-R2-OK']+'/corregir',t.auditor,{}],['GET','/usuarios',t.tecnico],['POST','/usuarios',t.tecnico,{}]]){const r=await api(m,pa,{token:tk,body:bd});console.log('S1',m,pa.slice(0,30),r.status)}
console.log('S1 audit',au0,'->',(await api('GET','/audit/security-events?limit=1000',{token:t.auditor})).body.length);
const s3=await api('GET','/instrumentos/serial/QA-FALSO-9');console.log('S3',s3.status,JSON.stringify(s3.body));
const s3b=await api('GET','/instrumentos/public/verificar/QA-FALSO-9?cert=X&sig=Y');console.log('S3b',s3b.status);
const q='?cert=QA-R2-CERT-OK-B&sig=cjC0IYfz5c7DwXFyJSvwH0RNqe3RLUZL9kqNSNAJ3Ys';
const v=(s,c,g)=>api('GET',`/instrumentos/public/verificar/${s}?cert=${c}&sig=${g}`);
console.log('QR ok',(await v('QA-R2-OK','QA-R2-CERT-OK-B','cjC0IYfz5c7DwXFyJSvwH0RNqe3RLUZL9kqNSNAJ3Ys')).status,'| alterada',(await v('QA-R2-OK','QA-R2-CERT-OK-B','cjC0IYfz5c7DwXFyJSvwH0RNqe3RLUZL9kqNSNAJ3Yx')).status,'| otro serial',(await v('QA-R2-NC','QA-R2-CERT-OK-B','cjC0IYfz5c7DwXFyJSvwH0RNqe3RLUZL9kqNSNAJ3Ys')).status);
// HU-04 inmutable
const c=JSON.parse(fs.readFileSync('r2c.json'));
console.log('PUT',(await api('PUT','/calibraciones/'+c.rep,{token:t.tecnico,body:{observaciones:'x'}})).status,'DELETE',(await api('DELETE','/calibraciones/'+c.rep,{token:t.admin})).status);
console.log('calib equipo inexistente',(await api('POST','/calibraciones',{token:t.tecnico,body:{instrumentoId:'000000000000000000000000'}})).status);
// HU-03 inactivo
const us=JSON.parse(fs.readFileSync('r2user.json'));
const lg=await api('POST','/auth/login',{body:{email:'qa-r2-tecnico@example.com',password:'QaPass123456!'}});
await api('PUT','/usuarios/'+us.id,{token:t.admin,body:{nombre:'QA R2 Tecnico Editado',rol:'AUDITOR'}});
const pr=await api('GET','/auth/profile',{token:lg.body.accessToken});console.log('HU03 profile rol tras editar',pr.status,pr.body.rol);
await api('PUT','/usuarios/'+us.id,{token:t.admin,body:{rol:'TECNICO'}});
const st=await api('PATCH',`/usuarios/${us.id}/status`,{token:t.admin,body:{activo:false}});console.log('inactivar',st.status);
console.log('token previo profile',(await api('GET','/auth/profile',{token:lg.body.accessToken})).status,'POST calib',(await api('POST','/calibraciones',{token:lg.body.accessToken,body:{}})).status,'login',(await api('POST','/auth/login',{body:{email:'qa-r2-tecnico@example.com',password:'QaPass123456!'}})).status);
