import {api,tok} from './lib.mjs';
const t=tok(); const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
let k=0;
const mk=(cls,u,max,e,extra={})=>({serial:`QA-C1-${++k}`,marca:'QA',modelo:'QA',tipo:'Bascula',categoriaExactitud:cls,capacidadMaxima:max,capacidadMinima:0,unidadMedida:u,divisionEscala:e,evidenciasFotograficas:{fotoEquipo:png,fotoPrecinto:png,fotoUbicacion:png},codigoPrecintoSIMEL:`QA-C1-P${k}`,fechaUltimaCalibracion:'2026-10-01',fechaProximaCalibracion:'2027-10-01',...extra});
const cases=[ // [clase, unidad, max, e, esperadoValido]
['Clase I','kg',150,0.01,false],['Clase I','g',150000,10,false],['Clase I','lb',300,0.01,false],['Clase I','t',3,0.00005,true],
['Clase II','kg',150,3,false],['Clase II','g',150000,1500,false],['Clase II','lb',300,0.000001,false],['Clase II','t',3,0.1,false],
['Clase III','kg',150,0.5,false],['Clase III','g',150000,500,false],['Clase III','lb',300,0.005,false],['Clase III','t',30,0.001,false],
['Clase IIII','kg',150,0.5,false],['Clase IIII','g',150000,10,false],['Clase IIII','lb',300,0.1,false],['Clase IIII','t',30,0.001,false],
['Clase III','g',150000,100,true],['Clase III','lb',300,0.1,true],
];
let ok=0;
for(const [c,u,m,e,v] of cases){const r=await api('POST','/instrumentos',{token:t.tecnico,body:mk(c,u,m,e)});
 const got=r.status===201; const fe=(r.body.fieldErrors||[]).map(x=>x.campo).join(',');
 const pass=got===v; if(pass)ok++;
 console.log(`${pass?'OK  ':'FAIL'} ${c} ${u} Max=${m} e=${e} n=${Math.round(m/e)} esperado=${v?'valido':'rechazo'} => ${r.status} campo=${fe} ${(r.body.errors||[r.body.message]).join('|').slice(0,110)}`)}
console.log('coinciden',ok,'/',cases.length);
