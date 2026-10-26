import fs from 'fs';
export const B='http://localhost:3000/api';
export async function api(method,path,{token,body}={}){
  const t0=Date.now();
  const r=await fetch(B+path,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
  let txt=await r.text(); let j; try{j=JSON.parse(txt)}catch{j=txt}
  return {status:r.status,body:j,ms:Date.now()-t0,headers:r.headers};
}
export const tok=()=>JSON.parse(fs.readFileSync('./tokens.json','utf8'));
