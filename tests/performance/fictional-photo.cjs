// Deterministic synthetic pixels, approximately the observed production photo byte size.
// No production image/content is read or copied.
const {deflateSync,crc32}=require('node:zlib');
function chunk(type,data){const name=Buffer.from(type),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);name.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([name,data])),out.length-4);return out;}
module.exports=()=>{
 const width=400,height=400,raw=Buffer.alloc(height*(width*3+1));let seed=123456789;
 for(let y=0;y<height;y++)for(let x=1;x<=width*3;x++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;raw[y*(width*3+1)+x]=seed&255;}
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=2;
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
};
