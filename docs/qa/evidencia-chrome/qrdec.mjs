import fs from 'fs'; import zlib from 'zlib'; import jsQR from 'jsqr'; import {PDFDocument,PDFName,PDFRawStream} from 'pdf-lib';
const f=process.argv[2];
const doc=await PDFDocument.load(fs.readFileSync(f));
let found=null;
for(const [ref,obj] of doc.context.enumerateIndirectObjects()){
  if(!(obj instanceof PDFRawStream)) continue;
  const d=obj.dict; if(d.get(PDFName.of('Subtype'))?.toString()!=='/Image') continue;
  const w=d.get(PDFName.of('Width')).asNumber(), h=d.get(PDFName.of('Height')).asNumber();
  const filt=d.get(PDFName.of('Filter'))?.toString(); const cs=d.get(PDFName.of('ColorSpace'))?.toString(); const bpc=d.get(PDFName.of('BitsPerComponent'))?.asNumber();
  console.error('img',w,h,filt,cs,bpc);
  if(filt!=='/FlateDecode') continue;
  const raw=zlib.inflateSync(Buffer.from(obj.contents));
  // try gray/rgb 
  const comps=raw.length/(w*h); 
  const rgba=new Uint8ClampedArray(w*h*4);
  for(let i=0;i<w*h;i++){ if(comps>=3){rgba[i*4]=raw[i*comps];rgba[i*4+1]=raw[i*comps+1];rgba[i*4+2]=raw[i*comps+2]}else{rgba[i*4]=rgba[i*4+1]=rgba[i*4+2]=raw[i]} rgba[i*4+3]=255}
  const r=jsQR(rgba,w,h); if(r){found=r.data;break}
}
console.log(found);
