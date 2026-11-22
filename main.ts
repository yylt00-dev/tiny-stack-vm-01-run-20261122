// Tiny stack VM: a faithful interpreter of make.fun's tiny stack ISA v1
// (kit program/generator/subject/ISA.md; reference VM vm.mjs beside it).
// One run answers every instance of a set: /input/<id>/program.bin +
// /input/<id>/input.bin -> /output/<id>/stdout.bin + /output/<id>/exit.txt.
// Every rule below follows vm.mjs in its order, including the traps the
// house baseline skips: exact 32-bit MUL, unsigned DIVU/MODU/LTU, shift
// counts masked to 5 bits, PUSH8 sign extension, EXIT's low byte, and all
// ten trap codes with the step (1,000,000) and output (65,536) limits.
import {mkdirSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

function run(p:Uint8Array,inp:Uint8Array):{o:Uint8Array;e:number}{
  const n=p.length,D=new Int32Array(256),C=new Int32Array(64),M=new Int32Array(256),o=new Uint8Array(65536);
  let sp=0,cp=0,ol=0,ip=0,pc=0,st=0;
  const end=(e:number)=>({o:o.slice(0,ol),e});
  for(;;){
    if(st===1e6)return end(10);
    if(pc<0||pc>=n)return end(9);
    const b=p[pc];
    if(!(b<8||(b>15&&b<31)||(b>31&&b<35)||(b>47&&b<53)||b===64||b===65||(b>79&&b<84)))return end(5);
    const im=b===1?1:b===2?4:b>=48&&b<=51?2:0;
    if(pc+im>=n)return end(9);
    st++;
    const nx=pc+1+im;
    let po=0,pu=0;
    if(b===3||b===4||b===23||b===27||b===49||b===50||b===64||b===80||b===81||b===83)po=1;
    else if(b===5||b===6||b===65)po=2;
    else if(b===7)po=3;
    else if((b>=16&&b<=22)||(b>=24&&b<=26)||(b>=28&&b<=30)||(b>=32&&b<=34))po=2;
    if(b===1||b===2||b===23||b===27||b===64||b===82)pu=1;
    else if(b===4||b===5)pu=2;
    else if(b===6||b===7)pu=3;
    else if((b>=16&&b<=22)||(b>=24&&b<=26)||(b>=28&&b<=30)||(b>=32&&b<=34))pu=1;
    if(sp<po)return end(2);
    if(sp-po+pu>256)return end(3);
    pc=nx;
    switch(b){
      case 0x00:return end(0);
      case 0x01:D[sp++]=(p[nx-1]<<24)>>24;break;
      case 0x02:D[sp++]=p[nx-4]|(p[nx-3]<<8)|(p[nx-2]<<16)|(p[nx-1]<<24);break;
      case 0x03:sp--;break;
      case 0x04:D[sp]=D[sp-1];sp++;break;
      case 0x05:{const t=D[sp-1];D[sp-1]=D[sp-2];D[sp-2]=t;break;}
      case 0x06:D[sp]=D[sp-2];sp++;break;
      case 0x07:{const a=D[sp-3];D[sp-3]=D[sp-2];D[sp-2]=D[sp-1];D[sp-1]=a;break;}
      case 0x17:D[sp-1]=-D[sp-1]|0;break;
      case 0x1b:D[sp-1]=~D[sp-1];break;
      case 0x30:case 0x31:case 0x32:{
        const rel=((p[nx-2]|(p[nx-1]<<8))<<16)>>16;
        let take=true;
        if(b!==0x30){const v=D[--sp];take=b===0x31?v===0:v!==0;}
        if(take)pc=nx+rel;
        break;}
      case 0x33:
        if(cp===64)return end(7);
        C[cp++]=nx;pc=p[nx-2]|(p[nx-1]<<8);break;
      case 0x34:
        if(cp===0)return end(8);
        pc=C[--cp];break;
      case 0x40:{
        const a=D[sp-1];
        if(a<0||a>=256)return end(6);
        D[sp-1]=M[a];break;}
      case 0x41:{
        const a=D[sp-1],v=D[sp-2];
        if(a<0||a>=256)return end(6);
        sp-=2;M[a]=v;break;}
      case 0x50:{
        const s=String(D[sp-1]);
        if(ol+s.length>65536)return end(11);
        sp--;
        for(let i=0;i<s.length;i++)o[ol++]=s.charCodeAt(i);
        break;}
      case 0x51:
        if(ol+1>65536)return end(11);
        o[ol++]=D[--sp]&255;break;
      case 0x52:D[sp++]=ip<inp.length?inp[ip++]:-1;break;
      case 0x53:return end(D[--sp]&255);
      default:{
        const y=D[sp-1],x=D[sp-2];
        let r=0;
        if(b===0x10)r=(x+y)|0;
        else if(b===0x11)r=(x-y)|0;
        else if(b===0x12)r=Math.imul(x,y);
        else if(b===0x13){if(y===0)return end(4);r=x===-2147483648&&y===-1?x:(x/y)|0;}
        else if(b===0x14){if(y===0)return end(4);r=y===-1?0:(x%y)|0;}
        else if(b===0x15){if(y===0)return end(4);r=Math.floor((x>>>0)/(y>>>0))|0;}
        else if(b===0x16){if(y===0)return end(4);r=((x>>>0)%(y>>>0))|0;}
        else if(b===0x18)r=x&y;
        else if(b===0x19)r=x|y;
        else if(b===0x1a)r=x^y;
        else if(b===0x1c)r=x<<(y&31);
        else if(b===0x1d)r=x>>(y&31);
        else if(b===0x1e)r=(x>>>(y&31))|0;
        else if(b===0x20)r=x===y?1:0;
        else if(b===0x21)r=x<y?1:0;
        else r=(x>>>0)<(y>>>0)?1:0;
        sp-=2;D[sp++]=r;break;}
    }
  }
}

const I=process.env.MAKEFUN_INPUT_DIR??'/input',O=process.env.MAKEFUN_OUTPUT_DIR??'/output';
for(const id of readdirSync(I).sort()){
  let inp:Uint8Array;
  try{inp=new Uint8Array(readFileSync(join(I,id,'input.bin')))}catch{inp=new Uint8Array(0)}
  const r=run(new Uint8Array(readFileSync(join(I,id,'program.bin'))),inp);
  mkdirSync(join(O,id),{recursive:true});
  writeFileSync(join(O,id,'stdout.bin'),r.o);
  writeFileSync(join(O,id,'exit.txt'),r.e+'\n');
}
