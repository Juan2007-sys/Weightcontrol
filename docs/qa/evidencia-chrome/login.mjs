import {api} from './lib.mjs'; import fs from 'fs';
const us={admin:['admin@weightcontrol.gov.co','Admin123456!'],tecnico:['tecnico@oec-onac.org','Tecnico123456!'],auditor:['inspector@sic.gov.co','Inspector123456!'],onac:['acreditacion@onac.org.co','Onac123456!'],inactivo:['inactivo@weightcontrol.gov.co','Inactivo123456!']};
const t={};
for(const [k,[email,password]] of Object.entries(us)){const r=await api('POST','/auth/login',{body:{email,password}});console.log(k,r.status,JSON.stringify(r.body).slice(0,300));t[k]=r.body.accessToken||r.body.access_token||r.body.token;t[k+'_user']=r.body.user}
fs.writeFileSync('./tokens.json',JSON.stringify(t));
