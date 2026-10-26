import {api,tok} from './lib.mjs';
const t=tok(); const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const ev=async()=>(await api('GET','/audit/security-events?limit=1000',{token:t.auditor})).body.length;
// S1
const cid='6add6cc2d35f2364606655d0';
const a0=await ev();
const att=[['POST','/instrumentos',t.auditor,{}],['POST','/calibraciones/'+cid+'/corregir',t.auditor,{}],['GET','/usuarios',t.tecnico],['POST','/usuarios',t.tecnico,{}],['GET','/usuarios',t.auditor]];
const st=[];for(const [m,p,tk,b] of att){st.push((await api(m,p,{token:tk,body:b})).status)}
const a1=await ev();console.log('S1 estados',st.join(','),'| AUTH_FAILURE',a0,'->',a1,'delta',a1-a0);
// S3
const s3=await api('GET','/instrumentos/serial/QA-FALSO-R5');console.log('S3 serial',s3.status,JSON.stringify(s3.body));
const s3b=await api('GET','/instrumentos/public/verificar/QA-FALSO-R5?cert=X&sig=Y');console.log('S3 verificar',s3b.status,JSON.stringify(s3b.body));
// C1
const b=(o={})=>({serial:'QA-R5-X',marca:'QA',modelo:'QA',tipo:'Bascula',categoriaExactitud:'Clase III',capacidadMaxima:150,capacidadMinima:1,unidadMedida:'kg',divisionEscala:0.05,evidenciasFotograficas:{fotoEquipo:png,fotoPrecinto:png,fotoUbicacion:png},codigoPrecintoSIMEL:'QA-R5-P-X',fechaUltimaCalibracion:'2026-10-01',fechaProximaCalibracion:'2027-10-01',...o});
const cases=[['Clase I kg e=0.01 (n=15000)',{categoriaExactitud:'Clase I',divisionEscala:0.01}],['Clase II g exceso',{categoriaExactitud:'Clase II',unidadMedida:'g',capacidadMaxima:150000,divisionEscala:0.001}],['Clase III lb (n=60000)',{unidadMedida:'lb',capacidadMaxima:300,divisionEscala:0.005}],['Clase IIII t (n=30000)',{categoriaExactitud:'Clase IIII',unidadMedida:'t',capacidadMaxima:30,divisionEscala:0.001}],['Pesa d>max',{tipo:'Pesa',capacidadMaxima:10,capacidadMinima:0,divisionEscala:20}],['Dinamometro n=10',{tipo:'Dinamometro',unidadMedida:'kN',capacidadMaxima:10,capacidadMinima:0,divisionEscala:1}]];
for(const [n,o] of cases){const r=await api('POST','/instrumentos',{token:t.tecnico,body:b(o)});console.log('C1',n,'=>',r.status,(r.body.fieldErrors||[]).map(f=>f.campo+': '+f.mensaje.slice(0,90)).join(' | ')||r.body.message)}
