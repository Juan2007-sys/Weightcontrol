import {api,tok} from './lib.mjs'; import fs from 'fs';
const t=tok(); const ids=JSON.parse(fs.readFileSync('r2ids.json'));
const cal=(id,num,ok=true,extra={})=>({instrumentoId:id,laboratorioAcreditado:'QA Lab',numeroCertificado:num,fechaCalibracion:'2026-10-24',fechaProximaCalibracion:'2027-10-24',resultado:'Conforme',patronesUtilizados:[{codigoPatron:'QA-P1',descripcion:'Pesa patron',certificadoTrazabilidad:'QA-TR-1',fechaVencimientoPatron:'2027-06-01'}],erroresMaximosPermitidos:[{cargaNominal:50,errorEncontrado:0.02,errorMaximoPermitido:0.05,cumple:true}],...extra});
const c=await api('POST','/calibraciones',{token:t.tecnico,body:cal(ids['QA-R2-OK'],'QA-R2-CERT-OK')});console.log('emite',c.status);
const co=await api('POST','/calibraciones/'+c.body.id+'/corregir',{token:t.tecnico,body:{motivo:'QA ronda 2: correccion de lecturas transcritas',nuevaCalibracion:cal(ids['QA-R2-OK'],'QA-R2-CERT-OK-B')}});console.log('corregir',co.status,co.body.numeroCertificado);
fs.writeFileSync('r2c.json',JSON.stringify({orig:c.body.id,rep:co.body.id}));
for(const [n,id] of [['orig',c.body.id],['rep',co.body.id]]){const r=await fetch('http://localhost:3000/api/calibraciones/'+id+'/pdf');fs.writeFileSync('r2-'+n+'.pdf',Buffer.from(await r.arrayBuffer()));console.log(n,r.status)}
const pv=await api('GET','/instrumentos/public/verificar/QA-R2-OK?cert=QA-R2-CERT-OK&sig=x');console.log('pub orig sig mala',pv.status);
const o=await api('GET','/calibraciones/'+c.body.id,{token:t.tecnico});console.log('orig anulado',o.body.anulado,o.body.certificadoReemplazadoPor===co.body.id);
