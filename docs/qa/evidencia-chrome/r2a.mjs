import {api,tok} from './lib.mjs'; import fs from 'fs';
const t=tok(); const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const show=(n,r)=>console.log('##',n,'=>',r.status,JSON.stringify(r.body).slice(0,350));
const mk=(serial,extra={})=>({serial,marca:'QA-Marca',modelo:'QA-R2',tipo:'Bascula',categoriaExactitud:'Clase III',capacidadMaxima:150,capacidadMinima:1,unidadMedida:'kg',divisionEscala:0.05,evidenciasFotograficas:{fotoEquipo:png,fotoPrecinto:png,fotoUbicacion:png},codigoPrecintoSIMEL:'QA-R2-P-'+serial,propietario:{nombreRazonSocial:'QA Propietario',nitRut:'900111222-3',direccion:'QA Calle',ciudad:'Bogota',departamento:'Cundinamarca'},ubicacionFisica:'QA ubic',fechaUltimaCalibracion:'2026-10-01',fechaProximaCalibracion:'2027-10-01',...extra});
const ids={};
for(const s of ['QA-R2-OK','QA-R2-NC','QA-R2-UI']){const r=await api('POST','/instrumentos',{token:t.tecnico,body:mk(s)});console.log('crear',s,r.status);ids[s]=r.body.id}
fs.writeFileSync('r2ids.json',JSON.stringify(ids));
// F1
const u=await api('GET','/instrumentos?limit=100');
const keys=new Set();u.body.data.forEach(x=>Object.keys(x).forEach(k=>keys.add(k)));console.log('F1 sin token claves:',[...keys].join(','));
const a=await api('GET','/instrumentos?limit=100&search=QA-R2-OK',{token:t.tecnico});const x=a.body.data.find(i=>i.serial==='QA-R2-OK');console.log('F1 con TECNICO claves:',Object.keys(x).join(','),'| propietario=',JSON.stringify(x.propietario),'creadoPor=',!!x.creadoPor);
const one=await api('GET','/instrumentos/'+ids['QA-R2-OK']);console.log('F1 :id sin token',Object.keys(one.body).join(','));
// F3 audit
const au=await api('GET','/audit',{token:t.auditor});console.log('F3 /audit AUDITOR',au.status,JSON.stringify(au.body).slice(0,150));
const ad=await api('GET','/audit?limit=5&actionType=AUTH_FAILURE',{token:t.admin});console.log('F3 /audit ADMIN filtros',ad.status,(ad.body.items||[]).length,JSON.stringify(ad.body.total));
const af=await api('GET','/audit?entityAffected=Calibracion&page=1&limit=3',{token:t.admin});console.log('F3 /audit entityAffected',af.status,JSON.stringify(af.body).slice(0,120));
const at=await api('GET','/audit',{token:t.tecnico});console.log('F3 /audit TECNICO',at.status);
// F2 No conforme
const cal=(id,num,res,ok,extra={})=>({instrumentoId:id,laboratorioAcreditado:'QA Lab',numeroCertificado:num,fechaCalibracion:'2026-10-24',fechaProximaCalibracion:'2027-10-24',resultado:res,patronesUtilizados:[{codigoPatron:'QA-P1',descripcion:'Pesa patron',certificadoTrazabilidad:'QA-TR-1',fechaVencimientoPatron:'2027-06-01'}],erroresMaximosPermitidos:[{cargaNominal:50,errorEncontrado:ok?0.02:0.5,errorMaximoPermitido:0.05,cumple:ok}],...extra});
const nc=await api('POST','/calibraciones',{token:t.tecnico,body:cal(ids['QA-R2-NC'],'QA-R2-CERT-NC','No Conforme',false)});
console.log('F2 NC emite',nc.status,'anulado=',nc.body.anulado,'estadoInstr=',nc.body.instrumento?.estado,'motivo=',nc.body.motivoAnulacion);
const pv=await api('GET','/instrumentos/public/verificar/QA-R2-NC');console.log('F2 publico NC',JSON.stringify({est:pv.body.estadoMetrologico,vig:pv.body.esVigente,anul:pv.body.certificadoAnulado,nc:pv.body.certificadoNoConforme,msg:pv.body.mensajeVerificacion,uc:pv.body.ultimoCertificado}));
const sc=await api('POST','/alertas/scan',{token:t.tecnico});console.log('scan',sc.status,sc.body.alertasGeneradas);
const l=await api('GET','/instrumentos?limit=100&search=QA-R2',{token:t.tecnico});console.log('F2 tras scan estado',l.body.data.filter(i=>/QA-R2/.test(i.serial)).map(i=>i.serial+'='+i.estado).join(', '));
const pv2=await api('GET','/instrumentos/public/verificar/QA-R2-NC');console.log('F2 publico tras scan',pv2.body.estadoMetrologico,pv2.body.esVigente);
const ok=await api('POST','/calibraciones',{token:t.tecnico,body:cal(ids['QA-R2-NC'],'QA-R2-CERT-NC-OK','Conforme',true,{fechaCalibracion:'2026-10-24'})});
console.log('F2 Conforme posterior',ok.status,'estado=',ok.body.instrumento?.estado);
const pv3=await api('GET','/instrumentos/public/verificar/QA-R2-NC');console.log('F2 publico tras conforme',pv3.body.estadoMetrologico,pv3.body.esVigente,pv3.body.certificadoAnulado,JSON.stringify(pv3.body.ultimoCertificado));
fs.writeFileSync('r2nc.json',JSON.stringify({nc:nc.body.id,ok:ok.body.id}));
