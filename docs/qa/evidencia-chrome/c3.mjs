import {api,tok} from './lib.mjs';
const t=tok(); const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const day=n=>{const d=new Date();d.setUTCHours(12,0,0,0);d.setUTCDate(d.getUTCDate()+n);return d.toISOString()};
const mk=(s,n)=>({serial:s,marca:'QA',modelo:'QA',tipo:'Bascula',categoriaExactitud:'Clase III',capacidadMaxima:150,capacidadMinima:1,unidadMedida:'kg',divisionEscala:0.05,evidenciasFotograficas:{fotoEquipo:png,fotoPrecinto:png,fotoUbicacion:png},codigoPrecintoSIMEL:'QA-C3-P-'+s,fechaUltimaCalibracion:'2026-01-01',fechaProximaCalibracion:day(n)});
for(const [s,n] of [['QA-C3-D30',30],['QA-C3-D15',15],['QA-C3-D5',5],['QA-C3-D31',31],['QA-C3-D16',16]]){const r=await api('POST','/instrumentos',{token:t.tecnico,body:mk(s,n)});console.log('crear',s,r.status,r.body.estado)}
const s1=await api('POST','/alertas/scan',{token:t.tecnico});
console.log('scan1',s1.status,s1.body.totalEscaneados,s1.body.alertasGeneradas);
const qa=(s1.body.alertas||[]).filter(a=>(a.serial||JSON.stringify(a)).includes('QA-C3'));
console.log(JSON.stringify(qa.map(a=>[a.serial||a.instrumento?.serial,a.nivelCriticidad,a.diasRestantes])));
console.log('todas generadas',JSON.stringify((s1.body.alertas||[]).map(a=>[a.serial||a.instrumento?.serial,a.nivelCriticidad,a.diasRestantes])));
const s2=await api('POST','/alertas/scan',{token:t.tecnico});
console.log('scan2 (inmediato)',s2.status,s2.body.totalEscaneados,'generadas',s2.body.alertasGeneradas);
const s3=await api('POST','/alertas/scan',{token:t.auditor});console.log('AUDITOR scan',s3.status);
