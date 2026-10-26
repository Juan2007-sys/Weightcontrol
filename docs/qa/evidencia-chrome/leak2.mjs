import {api} from './lib.mjs';
const l=await api('GET','/instrumentos?limit=100');
console.log('UNAUTH list',l.status,Object.keys(l.body),'n=',l.body.data?.length);
if(l.body.data?.[0]) {console.log('keys',Object.keys(l.body.data[0])); console.log(JSON.stringify(l.body.data[0]).slice(0,1200));}
const l2=await api('GET','/calibraciones/instrumento/6add3f09a9e1dd12e6d611bf');console.log('unauth calib by instr',l2.status);
const l3=await api('GET','/calibraciones/6add3f09a9e1dd12e6d611bf');console.log('unauth calib id',l3.status);
