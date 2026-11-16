'use strict';
/* 출근길 서바이벌 — renderer: procedural sprites, floor, lighting, particles, effects, icons. */
const GFX=(function(){
const INK='#1f262b',FB='"IBM Plex Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif',FD='"Do Hyeon","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
let cv,ctx,W=1,H=1,dpr=1,zoom=1,time=0,reduce=false;
const cam={x:0,y:LANE_GAP/2,init:false};
const parts=[],nums=[],fxs=[],corpses=[],ghosts=[];
let shakeAmt=0,flash=0,hurtFlash=0,healFlash=0,lastPick=0,zf=1,wipeT=0,S_rage=0;
const SS=3;
function mk(w,h,fn,ss){ss=ss||SS;const c=document.createElement('canvas');c.width=Math.ceil(w*ss);c.height=Math.ceil(h*ss);const g=c.getContext('2d');g.scale(ss,ss);fn(g);return c;}
function rr(g,x,y,w,h,r){r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.arcTo(x+w,y,x+w,y+r,r);g.lineTo(x+w,y+h-r);g.arcTo(x+w,y+h,x+w-r,y+h,r);g.lineTo(x+r,y+h);g.arcTo(x,y+h,x,y+h-r,r);g.lineTo(x,y+r);g.arcTo(x,y,x+r,y,r);g.closePath();}
function hash(x,y){let h=(Math.imul(x|0,73856093)^Math.imul(y|0,19349663))>>>0;h=Math.imul(h^(h>>>13),1274126177)>>>0;return h;}
function srand(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}

/* =============================== characters =============================== */
function face(g,o,hx,hy){
  const t=o.face,ex1=hx+2.6,ex2=hx+7.4,ey=hy+.8;g.fillStyle=INK;g.strokeStyle=INK;g.lineWidth=1.2;
  if(t==='blank'){g.fillStyle='#fff';for(const x of[ex1,ex2]){g.beginPath();g.arc(x,ey,1.9,0,TAU);g.fill();g.stroke();}}
  else if(t==='cool'){g.fillStyle='#14181b';rr(g,hx+.2,hy-1.6,10.6,4.2,1.6);g.fill();g.fillStyle='rgba(255,255,255,.55)';g.fillRect(hx+1.6,hy-.9,2.2,1);g.strokeStyle=INK;g.beginPath();g.moveTo(hx+3.8,hy+5.6);g.lineTo(hx+7,hy+5.6);g.stroke();}
  else if(t==='drunk'){g.lineWidth=1.4;g.beginPath();g.moveTo(ex1-1.4,ey-1.7);g.lineTo(ex1+1.1,ey);g.lineTo(ex1-1.4,ey+1.7);g.moveTo(ex2+1.4,ey-1.7);g.lineTo(ex2-1.1,ey);g.lineTo(ex2+1.4,ey+1.7);g.stroke();g.fillStyle='#7a2b2b';g.beginPath();g.ellipse(hx+5.2,hy+5.8,2.2,1.5,0,0,TAU);g.fill();}
  else if(t==='shock'){for(const x of[ex1,ex2]){g.fillStyle='#fff';g.beginPath();g.arc(x,ey,2,0,TAU);g.fill();g.stroke();g.fillStyle=INK;g.beginPath();g.arc(x+.3,ey,.8,0,TAU);g.fill();}g.beginPath();g.ellipse(hx+5.2,hy+5.6,1.2,1.5,0,0,TAU);g.fill();g.fillStyle='#8fd3ff';g.beginPath();g.ellipse(hx-6.5,hy-3,1.3,2.2,.3,0,TAU);g.fill();}
  else{for(const x of[ex1,ex2]){g.beginPath();g.ellipse(x,ey,1.15,1.9,0,0,TAU);g.fill();}
    g.lineWidth=1.35;g.beginPath();g.moveTo(ex1-2,ey-4.3);g.lineTo(ex1+1.6,ey-2.9);g.moveTo(ex2+2,ey-4.3);g.lineTo(ex2-1.4,ey-2.9);g.stroke();
    g.lineWidth=1.2;g.beginPath();if(t==='det'){g.moveTo(hx+3.8,hy+5.4);g.lineTo(hx+7,hy+5.4);}else{g.moveTo(hx+3.4,hy+6);g.quadraticCurveTo(hx+5.3,hy+4.6,hx+7.2,hy+6);}g.stroke();}
  if(o.blush){g.fillStyle='rgba(236,90,90,.55)';g.beginPath();g.ellipse(hx+7.4,hy+3.8,2.6,1.6,0,0,TAU);g.fill();g.beginPath();g.ellipse(hx+.6,hy+3.8,2,1.4,0,0,TAU);g.fill();}
  if(o.mask){g.fillStyle='#f4f6f6';g.strokeStyle=INK;g.lineWidth=1;rr(g,hx+.6,hy+2.4,9.8,5.6,2.2);g.fill();g.stroke();}
  if(o.glasses){g.lineWidth=1;g.strokeStyle=o.glasses;rr(g,ex1-2.3,ey-2.1,4.4,4,1);g.stroke();rr(g,ex2-2.1,ey-2.1,4.4,4,1);g.stroke();g.fillStyle='rgba(255,255,255,.6)';g.fillRect(ex1-1.6,ey-1.5,1.4,.9);}
}
function chibi(g,o){
  const f=o.frame||0,sw=[1,0,-1,0][f],bob=(f&1)?-1.2:0,wd=o.wide||1,hx=1.5+(o.headDx||0),hy=-33+bob+(o.headDy||0);
  g.lineJoin='round';g.lineCap='round';g.lineWidth=1.5;g.strokeStyle=INK;
  const fs=c=>{g.fillStyle=c;g.fill();g.stroke();};
  if(o.back)o.back(g,sw,bob);
  if(o.hairStyle===1){g.beginPath();g.ellipse(hx-4,hy+4,9.6,10.6,0,0,TAU);fs(o.hair);}
  g.beginPath();g.ellipse(-6.6*wd,-17+bob+sw*1.5,2.7,5.2,.25,0,TAU);fs(o.body);
  const ls=o.legSpread||3.2,k=o.legSpread?.5:1;
  [[-ls+sw*2.6*k,sw>0],[ls-sw*2.6*k,sw<0]].forEach(([x,up])=>{const lift=up?-1.7:0;
    rr(g,x-2.6,-10+lift,5.2,9,2);fs(o.legs);g.beginPath();g.ellipse(x+1.2,-1+lift,3.6,2.3,0,0,TAU);fs(o.shoes||'#1a1d20');});
  rr(g,-8*wd,-25+bob,16*wd,17,6.5);g.fillStyle=o.body;g.fill();
  g.save();g.clip();g.fillStyle='rgba(0,0,0,.16)';g.fillRect(-8*wd,-14+bob,16*wd,8);g.fillStyle='rgba(255,255,255,.14)';g.fillRect(-8*wd,-25+bob,16*wd,4);
  if(o.torso)o.torso(g,bob,wd);g.restore();
  rr(g,-8*wd,-25+bob,16*wd,17,6.5);g.stroke();
  if(!o.noArm){const ax=1.2*wd-sw*2.2,ay=-17+bob-sw*1.2;g.beginPath();g.ellipse(ax,ay,2.8,5.4,-.2*sw,0,TAU);fs(o.body);g.beginPath();g.arc(ax-sw,ay+5.6,2.1,0,TAU);fs(o.skin);}
  g.beginPath();g.arc(hx,hy,10.5,0,TAU);g.fillStyle=o.skin;g.fill();
  g.save();g.beginPath();g.arc(hx,hy,11.2,0,TAU);g.clip();g.fillStyle=o.hair;g.beginPath();
  if(o.hairStyle===2){g.moveTo(hx-13,hy+7);g.lineTo(hx-13,hy-7);g.quadraticCurveTo(hx-7,hy-5.5,hx-6,hy+7);}
  else{g.moveTo(hx-13,hy+7);g.lineTo(hx-13,hy-13);g.lineTo(hx+13,hy-13);g.lineTo(hx+13,hy-4.5);g.quadraticCurveTo(hx+5,hy-1.5,hx-1,hy-5);g.quadraticCurveTo(hx-5.5,hy-2,hx-6.5,hy+7);}
  g.closePath();g.fill();
  if(o.band){g.fillStyle=o.band;g.fillRect(hx-13,hy-6.2,26,2.8);}
  if(o.cap){g.fillStyle=o.cap;g.fillRect(hx-13,hy-13,26,8.6);}
  g.restore();
  g.beginPath();g.arc(hx,hy,10.8,0,TAU);g.stroke();
  if(o.cap){rr(g,hx+3,hy-5.8,11.5,3.3,1.5);fs(o.cap);}
  face(g,o,hx,hy);
  if(o.front)o.front(g,sw,bob);
}
const SUIT=['#3d4a5c','#585460','#2c3741','#6b5a4b'],SKIN=['#f1c9a5','#e8b98f','#f5d3b3','#dba983'],HAIR=['#2a2523','#1b1a1a','#4a3527','#35302e'];
const tie=c=>(g,bob)=>{g.fillStyle='#f4f4f0';g.beginPath();g.moveTo(1,-25+bob);g.lineTo(8,-25+bob);g.lineTo(4.5,-17.5+bob);g.closePath();g.fill();g.fillStyle=c;g.beginPath();g.moveTo(3.4,-24+bob);g.lineTo(5.6,-24+bob);g.lineTo(5.9,-15+bob);g.lineTo(4.5,-13+bob);g.lineTo(3.1,-15+bob);g.closePath();g.fill();};
const lanyard=(g,bob)=>{g.strokeStyle='#00a84d';g.lineWidth=1.3;g.beginPath();g.moveTo(1,-25+bob);g.lineTo(4.4,-16.5+bob);g.lineTo(7.6,-25+bob);g.stroke();g.fillStyle='#fff';g.strokeStyle=INK;g.lineWidth=.8;rr(g,2.4,-17+bob,4,5,1);g.fill();g.stroke();};
const SPR={
  player:{w:48,h:58,ox:22,oy:52,nv:1,opt:()=>({body:'#fbfbf8',legs:'#27364a',skin:SKIN[0],hair:'#1b1a1a',hairStyle:0,face:'det',
    torso:(g,bob)=>{tie('#e5484d')(g,bob);},
    back:(g,sw,bob)=>{g.fillStyle='#8a5a33';g.strokeStyle=INK;g.lineWidth=1.5;rr(g,-15,-15+bob+sw,10,9,2);g.fill();g.stroke();g.beginPath();g.moveTo(-12.5,-15+bob+sw);g.quadraticCurveTo(-10,-19+bob+sw,-7.5,-15+bob+sw);g.stroke();}})},
  pass:{w:48,h:58,ox:22,oy:52,nv:4,opt:v=>({body:SUIT[v],legs:v===3?'#4a4038':'#262d36',skin:SKIN[v],hair:HAIR[v],hairStyle:v===1?1:v===3?2:0,face:'angry',mask:v===2,glasses:v===3?INK:null,
    torso:v===1?null:tie(['#b8323a','','#34507a','#8a6d2f'][v])})},
  zomb:{w:48,h:58,ox:22,oy:52,nv:2,opt:v=>({body:v?'#7b7391':'#6f8298',legs:'#2b3138',skin:'#d3dde2',hair:'#39424a',hairStyle:v,face:'blank',headDy:2.6,headDx:2.2,noArm:true,
    front:(g,sw,bob)=>{g.strokeStyle=INK;g.lineWidth=1.5;g.beginPath();g.ellipse(4,-18+bob,5,2.6,-.5,0,TAU);g.fillStyle=v?'#7b7391':'#6f8298';g.fill();g.stroke();g.fillStyle='#1b2227';rr(g,7.5,-24+bob,5,8.5,1.2);g.fill();g.stroke();g.fillStyle='#bff1ff';g.fillRect(8.3,-23+bob,3.4,6.4);}})},
  intern:{w:48,h:58,ox:22,oy:52,nv:2,opt:v=>({body:v?'#e9d9b8':'#a9c7e8',legs:'#3b4654',skin:SKIN[v+1],hair:HAIR[v],hairStyle:v,face:'shock',torso:lanyard,
    front:(g,sw,bob)=>{g.strokeStyle=INK;g.lineWidth=1.2;g.beginPath();g.moveTo(8,-24+bob);g.lineTo(14,-24+bob);g.lineTo(13,-14+bob);g.lineTo(9,-14+bob);g.closePath();g.fillStyle='rgba(235,245,250,.9)';g.fill();g.stroke();g.fillStyle='#6b3f22';g.beginPath();g.moveTo(8.5,-21+bob);g.lineTo(13.5,-21+bob);g.lineTo(13,-14.6+bob);g.lineTo(9,-14.6+bob);g.closePath();g.fill();g.strokeStyle='#e5484d';g.lineWidth=1.3;g.beginPath();g.moveTo(11.5,-18+bob);g.lineTo(13.5,-28+bob);g.stroke();}})},
  stud:{w:48,h:58,ox:24,oy:52,nv:4,opt:v=>({body:'#2e3f63',legs:'#3a3f48',skin:SKIN[v],hair:HAIR[(v+1)%4],hairStyle:v&1,face:'angry',
    torso:(g,bob)=>{g.fillStyle='#f4f4f0';g.beginPath();g.moveTo(.5,-25+bob);g.lineTo(8,-25+bob);g.lineTo(4.2,-19+bob);g.closePath();g.fill();},
    back:(g,sw,bob)=>{g.strokeStyle=INK;g.lineWidth=1.5;g.fillStyle=['#d6453d','#2f7fd1','#f0b429','#7c4dbe'][v];rr(g,-17,-26+bob,11,17,4);g.fill();g.stroke();g.fillStyle='rgba(0,0,0,.2)';rr(g,-15.5,-17+bob,8,6,2);g.fill();}})},
  runner:{w:52,h:60,ox:22,oy:53,nv:2,opt:v=>({body:v?'#9bcf3c':'#f08a24',legs:'#22272b',shoes:'#f4f4f0',skin:SKIN[v*2],hair:HAIR[v+1],hairStyle:0,face:'angry',band:'#fff',lean:.16,
    front:(g,sw,bob)=>{g.fillStyle='#8fd3ff';g.beginPath();g.ellipse(-9,-36+bob,1.3,2.2,.4,0,TAU);g.fill();}})},
  flyer:{w:50,h:58,ox:22,oy:52,nv:2,opt:v=>({body:v?'#2f6fd1':'#d6453d',legs:'#2a2f36',skin:SKIN[v+2],hair:HAIR[v],hairStyle:0,face:'angry',cap:v?'#2f6fd1':'#d6453d',
    torso:(g,bob)=>{g.fillStyle='#fff';g.fillRect(-8,-19+bob,16,2.2);},
    front:(g,sw,bob)=>{g.strokeStyle=INK;g.lineWidth=1;[['#ffd1dc',0],['#fff6c9',1.6],['#fff',3.2]].forEach(([c,o])=>{g.fillStyle=c;rr(g,7+o*.4,-23+bob+o,8,10,1);g.fill();g.stroke();});g.fillStyle='#e5484d';g.fillRect(9.4,-17.6+bob,5.2,1.6);}})},
  uncle:{w:58,h:58,ox:27,oy:52,nv:2,opt:v=>({body:v?'#4f6b52':'#7a5c48',legs:'#3b3632',skin:'#e3ad85',hair:'#6b6460',hairStyle:2,face:'angry',wide:1.45,legSpread:8.6,
    torso:(g,bob,wd)=>{g.fillStyle='rgba(0,0,0,.25)';g.fillRect(-8*wd,-12.5+bob,16*wd,1.8);}})},
  carrier:{w:70,h:58,ox:40,oy:52,nv:2,opt:v=>({body:v?'#9fb3a5':'#c9b28a',legs:'#39404a',skin:SKIN[v],hair:HAIR[v+2],hairStyle:1,face:'cool',
    back:(g,sw,bob)=>{g.strokeStyle=INK;g.lineWidth=1.5;g.beginPath();g.moveTo(-9,-19+bob);g.lineTo(-20,-22);g.stroke();g.fillStyle=v?'#c2418c':'#1f9a94';rr(g,-33,-22,15,20,3);g.fill();g.stroke();g.fillStyle='rgba(255,255,255,.25)';g.fillRect(-31,-18,11,1.6);g.fillRect(-31,-13,11,1.6);g.fillStyle=INK;g.beginPath();g.arc(-30,-1,2,0,TAU);g.arc(-21,-1,2,0,TAU);g.fill();}})},
  bagman:{w:132,h:136,ox:66,oy:124,sc:2.3,ss:2,nv:1,opt:()=>({body:'#d9a441',legs:'#3b4654',shoes:'#f4f4f0',skin:SKIN[1],hair:'#2a2523',hairStyle:0,face:'angry',
    torso:(g,bob)=>{g.fillStyle='rgba(0,0,0,.18)';g.fillRect(-8,-20+bob,3,12);g.fillRect(5,-20+bob,3,12);},
    back:(g,sw,bob)=>{g.strokeStyle=INK;g.lineWidth=1.5;g.fillStyle='#7d8a55';rr(g,-24,-41+bob,17,8,4);g.fill();g.stroke();g.fillStyle='#c8443c';rr(g,-27,-35+bob,21,30,7);g.fill();g.stroke();g.fillStyle='#8f2c27';rr(g,-25,-19+bob,15,11,3);g.fill();g.stroke();g.fillStyle='rgba(255,255,255,.25)';rr(g,-24.5,-32+bob,15,4,2);g.fill();g.fillStyle='#ffc928';g.beginPath();g.arc(-17,-13.5+bob,1.6,0,TAU);g.fill();},
    front:(g,sw,bob)=>{g.strokeStyle=INK;g.lineWidth=2.4;g.beginPath();g.arc(1.5,-33+bob,11.8,Math.PI*1.12,Math.PI*1.88);g.stroke();g.lineWidth=1.3;g.fillStyle='#1b2227';g.beginPath();g.ellipse(-3.5,-31.5+bob,3.6,4.6,0,0,TAU);g.fill();g.stroke();g.fillStyle='#35b7ff';g.beginPath();g.arc(-3.5,-31.5+bob,1.4,0,TAU);g.fill();}})},
  speaker:{w:132,h:144,ox:56,oy:130,sc:2.4,ss:2,nv:1,opt:()=>({body:'#2b2b33',legs:'#1d1d24',shoes:'#f4f4f0',skin:SKIN[0],hair:'#1b1a1a',hairStyle:0,face:'cool',cap:'#7b3fc4',
    torso:(g,bob)=>{g.fillStyle='#35e0c2';g.fillRect(-8,-13+bob,16,1.8);g.fillStyle='#ffc928';g.beginPath();g.arc(3.5,-19+bob,2.6,0,TAU);g.fill();g.fillStyle='#2b2b33';g.beginPath();g.arc(3.5,-19+bob,1.2,0,TAU);g.fill();},
    front:(g,sw,bob)=>{g.strokeStyle=INK;g.lineWidth=1.4;g.fillStyle='#3a3f48';rr(g,7,-41+bob,20,13,2.5);g.fill();g.stroke();g.fillStyle='#14181b';for(const x of[12.5,21.5]){g.beginPath();g.arc(x,-34.5+bob,4.3,0,TAU);g.fill();}g.strokeStyle='#35e0c2';g.lineWidth=1.1;for(const x of[12.5,21.5]){g.beginPath();g.arc(x,-34.5+bob,2.6,0,TAU);g.stroke();}g.strokeStyle=INK;g.lineWidth=1.4;g.beginPath();g.moveTo(10,-41+bob);g.quadraticCurveTo(17,-46+bob,24,-41+bob);g.stroke();
      g.beginPath();g.ellipse(7,-24+bob,3,5.6,-.9,0,TAU);g.fillStyle='#2b2b33';g.fill();g.stroke();}})}
};
const cache=new Map();
function sprite(type,v,frame,dir,fl){
  const key=type+v+frame+(dir>0?'R':'L')+(fl?'F':'');let c=cache.get(key);if(c)return c;
  const d=SPR[type];
  if(fl){const base=sprite(type,v,frame,dir,false);c=document.createElement('canvas');c.width=base.width;c.height=base.height;const g=c.getContext('2d');g.drawImage(base,0,0);g.globalCompositeOperation='source-in';g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);}
  else c=mk(d.w,d.h,g=>{if(dir<0){g.translate(d.w,0);g.scale(-1,1);}g.translate(d.ox,d.oy);if(d.sc)g.scale(d.sc,d.sc);const o=d.opt(v);o.frame=frame;if(o.lean)g.rotate(o.lean);chibi(g,o);},d.ss);
  cache.set(key,c);return c;
}
function drawChar(type,v,frame,dir,fl,x,feetY,sc){
  const d=SPR[type],c=sprite(type,v,frame,dir,fl),ox=(dir>0?d.ox:d.w-d.ox)*sc;
  ctx.drawImage(c,x-ox,feetY-d.oy*sc,d.w*sc,d.h*sc);
}

/* =============================== static sprites =============================== */
const glows={};
function glow(col){let c=glows[col];if(!c){c=glows[col]=mk(64,64,g=>{const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba('+col+',1)');gr.addColorStop(.35,'rgba('+col+',.45)');gr.addColorStop(1,'rgba('+col+',0)');g.fillStyle=gr;g.fillRect(0,0,64,64);},2);}return c;}
function drawGlow(col,x,y,r,a){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=a;ctx.drawImage(glow(col),x-r,y-r,r*2,r*2);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';}
let ST=null;
function buildStatic(){
  ST={};
  ST.shadow=mk(64,32,g=>{const gr=g.createRadialGradient(32,16,0,32,16,30);gr.addColorStop(0,'rgba(10,14,18,.42)');gr.addColorStop(.6,'rgba(10,14,18,.2)');gr.addColorStop(1,'rgba(10,14,18,0)');g.save();g.scale(1,.5);g.translate(0,16);g.fillStyle=gr;g.fillRect(0,-16,64,64);g.restore();},2);
  ST.light=mk(128,128,g=>{const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,250,235,.2)');gr.addColorStop(1,'rgba(255,250,235,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);},1);
  const bean=(rx,ry,c1,c2)=>mk(20,16,g=>{g.translate(10,8);g.rotate(-.5);g.beginPath();g.ellipse(0,0,rx,ry,0,0,TAU);const gr=g.createLinearGradient(0,-ry,0,ry);gr.addColorStop(0,c1);gr.addColorStop(1,c2);g.fillStyle=gr;g.fill();g.strokeStyle=INK;g.lineWidth=1.1;g.stroke();g.strokeStyle='rgba(0,0,0,.45)';g.beginPath();g.moveTo(-rx*.7,0);g.quadraticCurveTo(0,-ry*.5,rx*.7,0);g.stroke();g.fillStyle='rgba(255,255,255,.45)';g.beginPath();g.ellipse(-rx*.3,-ry*.45,rx*.3,ry*.18,0,0,TAU);g.fill();});
  ST.bean=[bean(4.6,3.3,'#8b5630','#56301a'),bean(5.8,4.2,'#c8854a','#8a4f22'),bean(7.2,5.2,'#ffd768','#d99a2b')];
  ST.kimbap=mk(36,36,g=>{g.translate(18,19);g.lineJoin='round';g.strokeStyle=INK;g.lineWidth=1.6;g.beginPath();g.moveTo(0,-13);g.lineTo(13,10);g.lineTo(-13,10);g.closePath();g.fillStyle='#fbfbf6';g.fill();g.stroke();g.fillStyle='#1c2a22';rr(g,-7,0,14,10,1.5);g.fill();g.stroke();g.fillStyle='rgba(255,255,255,.2)';g.fillRect(-5,2,3,6);});
  ST.pass=mk(36,36,g=>{g.translate(18,18);g.rotate(-.25);g.strokeStyle=INK;g.lineWidth=1.6;g.fillStyle='#00a84d';rr(g,-13,-8.5,26,17,3.5);g.fill();g.stroke();g.fillStyle='#fff';g.fillRect(-13,-1.5,26,4);g.fillStyle='#ffc928';rr(g,-9.5,-6,6,4,1);g.fill();});
  ST.chest=mk(44,40,g=>{g.translate(22,21);g.lineJoin='round';g.strokeStyle=INK;g.lineWidth=1.8;g.fillStyle='#fbf7ea';rr(g,-17,-11,34,23,3);g.fill();g.stroke();g.beginPath();g.moveTo(-17,-10);g.lineTo(0,4);g.lineTo(17,-10);g.stroke();g.fillStyle='#e5484d';g.beginPath();g.arc(0,4,5.5,0,TAU);g.fill();g.stroke();g.fillStyle='#fff';g.font='700 7px sans-serif';g.textAlign='center';g.fillText('₩',0,6.6);});
  ST.card=[0,1].map(e=>mk(22,16,g=>{g.translate(11,8);g.strokeStyle=INK;g.lineWidth=1.2;g.fillStyle=e?'#17191a':'#00a84d';rr(g,-9,-6,18,12,2.2);g.fill();g.stroke();g.fillStyle=e?'#ffc928':'#fff';g.fillRect(-9,-1.2,18,2.6);g.fillStyle=e?'#fff':'#ffc928';rr(g,-6.5,-4.6,4,2.6,.6);g.fill();}));
  ST.pack=[0,1].map(e=>mk(48,52,g=>{g.translate(24,28);drawPack(g,e);}));
  ST.cup=mk(20,24,g=>{g.translate(10,13);g.lineJoin='round';g.strokeStyle=INK;g.lineWidth=1.3;g.beginPath();g.moveTo(-6,-7);g.lineTo(6,-7);g.lineTo(4.6,9);g.lineTo(-4.6,9);g.closePath();g.fillStyle='#fbfbf6';g.fill();g.stroke();g.fillStyle='#8a5a33';g.fillRect(-5.4,-2,10.8,5.5);g.fillStyle='#2b2f33';rr(g,-7,-10,14,3.6,1.4);g.fill();g.stroke();});
  const orb=(c1,c2)=>mk(20,20,g=>{const gr=g.createRadialGradient(8,8,1,10,10,8);gr.addColorStop(0,c1);gr.addColorStop(1,c2);g.beginPath();g.arc(10,10,7.4,0,TAU);g.fillStyle=gr;g.fill();g.strokeStyle='#fff';g.lineWidth=1.6;g.stroke();g.strokeStyle=INK;g.lineWidth=.8;g.beginPath();g.arc(10,10,8.4,0,TAU);g.stroke();});
  const paper=(hd,stamp)=>mk(20,20,g=>{g.translate(10,10);g.strokeStyle=INK;g.lineWidth=1.1;g.fillStyle='#fff';rr(g,-6,-8,12,16,1.2);g.fill();g.stroke();g.fillStyle=hd;g.fillRect(-4.6,-6.4,9.2,3);g.fillStyle='#b6bcc0';g.fillRect(-4.6,-2,9.2,1);g.fillRect(-4.6,.6,9.2,1);g.fillRect(-4.6,3.2,6,1);if(stamp){g.strokeStyle='#e5484d';g.lineWidth=1.2;g.beginPath();g.arc(2.4,3.6,2.6,0,TAU);g.stroke();}});
  const book=mk(20,20,g=>{g.translate(10,10);g.strokeStyle=INK;g.lineWidth=1.1;g.fillStyle='#b5651d';rr(g,-7,-8,14,16,1.5);g.fill();g.stroke();g.fillStyle='#fbfaf5';g.fillRect(4,-7,2.4,14);g.fillStyle='#ffc928';g.fillRect(-5,-4,7,2);g.fillRect(-5,0,7,1.4);});
  const note=mk(20,20,g=>{g.translate(10,10);g.lineJoin='round';g.lineCap='round';g.strokeStyle='#fff';g.lineWidth=5;const dr=()=>{g.beginPath();g.moveTo(1.5,5);g.lineTo(1.5,-7);g.quadraticCurveTo(6,-6,7,-2);g.stroke();g.beginPath();g.ellipse(-1.6,5,3.6,2.8,-.4,0,TAU);g.fill();g.stroke();};g.fillStyle='#fff';dr();g.strokeStyle='#1a8f7c';g.fillStyle='#35e0c2';g.lineWidth=2.2;dr();});
  const clip=mk(24,24,g=>{g.translate(12,12);g.lineJoin='round';g.strokeStyle=INK;g.lineWidth=1.2;g.fillStyle='#8a5a33';rr(g,-8,-10,16,20,2);g.fill();g.stroke();g.fillStyle='#fbfaf5';g.fillRect(-6,-6.5,12,14.5);g.fillStyle='#9aa3a7';rr(g,-3.5,-11.5,7,4,1.2);g.fill();g.stroke();g.fillStyle='#b6bcc0';g.fillRect(-4.4,-3.6,8.8,1.1);g.fillRect(-4.4,-.8,8.8,1.1);g.strokeStyle='#e5484d';g.lineWidth=1.5;g.beginPath();g.arc(1.8,4.2,2.7,0,TAU);g.stroke();});
  const suit=mk(40,40,g=>{g.translate(20,20);g.lineJoin='round';g.lineCap='round';g.strokeStyle=INK;g.lineWidth=1.6;g.beginPath();g.moveTo(-5,-11);g.lineTo(-5,-16);g.lineTo(5,-16);g.lineTo(5,-11);g.stroke();g.fillStyle='#e0508c';rr(g,-11,-11,22,25,4);g.fill();g.stroke();g.strokeStyle='rgba(0,0,0,.28)';for(const x of[-5,0,5]){g.beginPath();g.moveTo(x,-8);g.lineTo(x,11);g.stroke();}g.fillStyle='#fff3c4';rr(g,-4,-3,8,6,1);g.fill();g.fillStyle=INK;for(const x of[-7,7]){g.beginPath();g.arc(x,15.5,2.6,0,TAU);g.fill();}});
  const shoe=mk(22,22,g=>{g.translate(11,11);g.lineJoin='round';g.strokeStyle=INK;g.lineWidth=1.2;g.fillStyle='#2b2f33';g.beginPath();g.moveTo(-8,4);g.lineTo(-7.5,-4);g.quadraticCurveTo(-3,-6,-1,-1);g.quadraticCurveTo(4,0,8,2);g.quadraticCurveTo(9.5,3.5,8.5,5.5);g.lineTo(-8,5.5);g.closePath();g.fill();g.stroke();g.fillStyle='#fff';g.fillRect(-8,4,16.5,1.6);g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=1;g.beginPath();g.moveTo(-2,-1.5);g.lineTo(1,-.2);g.stroke();});
  const sock=mk(22,22,g=>{g.translate(11,11);g.lineJoin='round';g.strokeStyle=INK;g.lineWidth=1.2;g.fillStyle='#ff9a3c';rr(g,-7,-6,14,12,2);g.fill();g.stroke();g.fillStyle='#fff';g.beginPath();g.moveTo(-7,-6);g.lineTo(0,1);g.lineTo(7,-6);g.closePath();g.fill();g.stroke();g.fillStyle='#ffc928';g.beginPath();g.arc(0,2.5,1.8,0,TAU);g.fill();});
  ST.bul=[orb('#b8f5c6','#2f9e4f'),orb('#ffc4c4','#d93036'),paper('#ff7fa0',false),paper('#d23338',true),orb('#e6c8ff','#8a3fd0'),book,note,clip,suit,shoe,sock];
  ST.stamp=mk(96,110,g=>{g.translate(48,56);g.lineJoin='round';g.strokeStyle=INK;g.lineWidth=3;g.fillStyle='#7a4a2a';rr(g,-13,-50,26,46,10);g.fill();g.stroke();g.fillStyle='#a8703f';rr(g,-9,-46,8,34,4);g.fill();g.fillStyle='#3a3f44';rr(g,-34,-8,68,26,5);g.fill();g.stroke();g.fillStyle='#d23338';rr(g,-37,16,74,12,3);g.fill();g.stroke();},1.5);
  ST.doorp=mk(64,128,g=>{g.lineJoin='round';g.strokeStyle=INK;g.lineWidth=3;g.fillStyle='#c9d2d6';rr(g,2,2,60,124,4);g.fill();g.stroke();g.fillStyle='#8fd0e8';rr(g,12,14,40,46,5);g.fill();g.stroke();g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.moveTo(16,54);g.lineTo(34,18);g.lineTo(42,18);g.lineTo(24,54);g.closePath();g.fill();g.fillStyle='#00a84d';g.fillRect(4,76,56,8);g.fillStyle='#ffc928';g.fillRect(4,112,56,6);},1.5);
  ST.table=mk(160,120,g=>{g.translate(80,60);g.lineJoin='round';g.strokeStyle=INK;g.lineWidth=2.5;for(let i=0;i<6;i++){const a=i/6*TAU;g.fillStyle='#34507a';rr(g,Math.cos(a)*62-9,Math.sin(a)*40-8,18,16,5);g.fill();g.stroke();}g.fillStyle='#b98654';g.beginPath();g.ellipse(0,0,52,32,0,0,TAU);g.fill();g.stroke();g.fillStyle='#fbfaf5';for(const q of[[-22,-6,.2],[10,6,-.3],[20,-12,.1]]){g.save();g.translate(q[0],q[1]);g.rotate(q[2]);g.fillRect(-7,-5,14,10);g.strokeRect(-7,-5,14,10);g.restore();}},1.5);
  ST.bulGlow=['255,120,90','255,70,70','255,110,160','255,90,90','255,80,200','255,150,80','255,90,200','255,100,90','255,90,150','255,140,70','255,150,70'];
  ST.tact=mk(32,22,g=>{g.fillStyle='#efbb22';g.fillRect(0,0,32,22);g.fillStyle='#c4940f';g.fillRect(0,0,32,1.4);g.fillRect(0,20.6,32,1.4);for(let i=0;i<4;i++)for(let j=0;j<2;j++){const x=4+i*8,y=6+j*10;g.fillStyle='rgba(120,84,0,.45)';g.beginPath();g.arc(x+.6,y+.9,2.7,0,TAU);g.fill();g.fillStyle='#ffdc63';g.beginPath();g.arc(x,y,2.6,0,TAU);g.fill();}},2);
  const rnd=srand(77);
  ST.track=mk(256,152,g=>{
    g.fillStyle='#32373a';g.fillRect(0,20,256,112);
    for(let i=0;i<1700;i++){const v=40+rnd()*70|0;g.fillStyle='rgb('+v+','+(v+3)+','+(v+6)+')';g.fillRect(rnd()*256,22+rnd()*108,1+rnd()*2.2,1+rnd()*1.8);}
    for(let x=0;x<256;x+=32){g.fillStyle='#5b4a3b';g.fillRect(x+10,34,13,84);g.fillStyle='rgba(0,0,0,.28)';g.fillRect(x+10,34,13,2);g.fillRect(x+21,34,2,84);g.fillStyle='rgba(255,255,255,.08)';g.fillRect(x+10,34,2,84);}
    for(const y of[46,102]){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,y+4,256,3);const gr=g.createLinearGradient(0,y,0,y+5);gr.addColorStop(0,'#eef3f5');gr.addColorStop(.4,'#aab3b8');gr.addColorStop(1,'#6f797e');g.fillStyle=gr;g.fillRect(0,y,256,5);}
    for(const [y0,dir] of[[0,1],[132,-1]]){g.fillStyle='#bdb9af';g.fillRect(0,y0,256,20);g.fillStyle='#8f8b82';g.fillRect(0,dir>0?y0+17:y0,256,3);g.fillStyle='rgba(255,255,255,.35)';g.fillRect(0,dir>0?y0:y0+18,256,2);
      const sh=g.createLinearGradient(0,dir>0?20:132,0,dir>0?34:118);sh.addColorStop(0,'rgba(0,0,0,.5)');sh.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=sh;g.fillRect(0,dir>0?20:118,256,14);}
  },2);
  const car=head=>mk(216,84,g=>{g.translate(4,3);g.lineJoin='round';
    g.fillStyle='rgba(0,0,0,.35)';rr(g,-2,6,212,74,13);g.fill();
    const gr=g.createLinearGradient(0,0,0,78);gr.addColorStop(0,'#aeb6b9');gr.addColorStop(.18,'#eef1f1');gr.addColorStop(.5,'#d3d9da');gr.addColorStop(.82,'#eef1f1');gr.addColorStop(1,'#aeb6b9');
    rr(g,0,0,208,78,head?16:9);g.fillStyle=gr;g.fill();g.strokeStyle=INK;g.lineWidth=2;g.stroke();
    g.fillStyle='#00a84d';g.fillRect(6,5,196,5);g.fillRect(6,68,196,5);
    g.fillStyle='rgba(20,28,32,.75)';g.fillRect(10,12,186,3);g.fillRect(10,63,186,3);
    for(let i=0;i<3;i++){const x=24+i*58;g.fillStyle='#8b9599';rr(g,x,24,40,30,4);g.fill();g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=1;g.stroke();g.strokeStyle='rgba(0,0,0,.25)';for(let k=1;k<6;k++){g.beginPath();g.moveTo(x+k*6.6,27);g.lineTo(x+k*6.6,51);g.stroke();}}
    g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1.2;for(const x of[18,76,134,192]){g.beginPath();g.moveTo(x,1);g.lineTo(x,11);g.moveTo(x,67);g.lineTo(x,77);g.stroke();}
    if(head){g.fillStyle='#141b1f';rr(g,188,12,15,54,6);g.fill();g.fillStyle='rgba(255,255,255,.18)';g.fillRect(191,16,3,46);g.fillStyle='#fff3b0';g.beginPath();g.arc(205,13,3.4,0,TAU);g.arc(205,65,3.4,0,TAU);g.fill();}
    else{g.fillStyle='#3a4246';rr(g,202,22,8,34,3);g.fill();}
  },2);
  ST.car=car(false);ST.cab=car(true);
  ST.litter=[
    g=>{g.rotate(.5);g.fillStyle='rgba(255,255,255,.8)';g.fillRect(-4,-7,8,14);g.fillStyle='rgba(0,0,0,.25)';for(let i=0;i<4;i++)g.fillRect(-3,-5+i*3,6,.8);},
    g=>{g.rotate(-.8);g.fillStyle='rgba(255,180,200,.85)';g.fillRect(-5,-7,10,14);g.fillStyle='rgba(229,72,77,.8)';g.fillRect(-4,-5.5,8,2.4);},
    g=>{g.fillStyle='rgba(40,45,48,.28)';g.beginPath();g.arc(0,0,3.2,0,TAU);g.arc(7,4,2,0,TAU);g.arc(-5,6,1.6,0,TAU);g.fill();},
    g=>{g.fillStyle='rgba(255,255,255,.16)';g.beginPath();g.ellipse(0,0,15,8,.3,0,TAU);g.fill();g.fillStyle='rgba(255,255,255,.22)';g.beginPath();g.ellipse(-3,-2,6,2.4,.3,0,TAU);g.fill();},
    g=>{g.fillStyle='rgba(30,34,36,.75)';rr(g,-11,-7,22,14,2);g.fill();g.fillStyle='rgba(150,158,162,.9)';for(let i=0;i<5;i++)g.fillRect(-9+i*4.2,-5,2,10);},
    g=>{g.rotate(1.1);g.fillStyle='rgba(250,250,246,.9)';g.beginPath();g.arc(0,0,4.5,0,TAU);g.fill();g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=1;g.stroke();g.fillStyle='rgba(0,0,0,.35)';g.fillRect(-.8,-2.4,1.6,1.6);},
    g=>{g.rotate(-.3);g.fillStyle='rgba(255,246,201,.85)';g.fillRect(-5,-6.5,10,13);g.fillStyle='rgba(47,111,209,.7)';g.fillRect(-4,-5,8,2);}
  ].map(fn=>mk(36,36,g=>{g.translate(18,18);fn(g);},2));
}
const floors={};
function floorTile(i){
  if(floors[i])return floors[i];
  const Z=ZONES[i],[r,gg,b]=Z.floor,rnd=srand(1234+i*99),kind=Z.kind,col=v=>'rgb('+((r+v)|0)+','+((gg+v)|0)+','+((b+v)|0)+')';
  return floors[i]=mk(512,512,g=>{
    if(kind==='street'){
      for(let row=0;row<16;row++){const off=(row%2)*32;for(let x=-64;x<512;x+=64){g.fillStyle=col((rnd()-.5)*22);g.fillRect(x+off,row*32,64,32);}}
      for(let k=0;k<2600;k++){const x=rnd()*512,y=rnd()*512,s=.6+rnd()*1.6;g.fillStyle=rnd()<.5?'rgba(255,255,255,.3)':'rgba(40,36,30,.22)';g.fillRect(x,y,s,s);}
      g.fillStyle='rgba(30,28,24,.28)';for(let row=0;row<=16;row++)g.fillRect(0,row*32-1,512,2);
      for(let row=0;row<16;row++){const off=(row%2)*32;for(let x=-64;x<512;x+=64)g.fillRect(x+off-1,row*32,2,32);}
      g.fillStyle='rgba(255,255,255,.16)';for(let row=0;row<16;row++)g.fillRect(0,row*32+1,512,1);
    }else if(kind==='gates'||kind==='office'){
      for(let ty=0;ty<4;ty++)for(let tx=0;tx<4;tx++){g.fillStyle=col((rnd()-.5)*(kind==='office'?14:8));g.fillRect(tx*128,ty*128,128,128);
        const gr=g.createLinearGradient(tx*128,ty*128,tx*128+128,ty*128+128);gr.addColorStop(0,'rgba(255,255,255,.12)');gr.addColorStop(1,'rgba(0,0,0,.05)');g.fillStyle=gr;g.fillRect(tx*128,ty*128,128,128);}
      for(let k=0;k<(kind==='office'?5200:1500);k++){const x=rnd()*512,y=rnd()*512,s=.5+rnd()*1.8,t=rnd();g.fillStyle=t<.45?'rgba(255,255,255,.35)':t<.8?'rgba(50,50,56,.22)':'rgba(120,96,70,.3)';g.fillRect(x,y,s,s);}
      for(let k=0;k<=4;k++){g.fillStyle='rgba(20,24,28,.22)';g.fillRect(k*128-1,0,2,512);g.fillRect(0,k*128-1,512,2);g.fillStyle='rgba(255,255,255,.25)';g.fillRect(k*128+1,0,1,512);g.fillRect(0,k*128+1,512,1);}
      if(kind==='office'){g.strokeStyle='rgba(90,70,50,.3)';g.lineWidth=6;g.strokeRect(3,3,506,506);}
    }else if(kind==='train'){
      g.fillStyle=col(0);g.fillRect(0,0,512,512);
      for(let k=0;k<5200;k++){const x=rnd()*512,y=rnd()*512,s=.6+rnd()*1.4,t=rnd();g.fillStyle=t<.5?'rgba(255,255,255,.4)':t<.8?'rgba(40,50,58,.25)':'rgba(0,120,80,.25)';g.fillRect(x,y,s,s);}
    }else{
      for(let ty=0;ty<8;ty++)for(let tx=0;tx<8;tx++){g.fillStyle=col((rnd()-.5)*12);g.fillRect(tx*64,ty*64,64,64);}
      for(let k=0;k<3600;k++){const x=rnd()*512,y=rnd()*512,s=.6+rnd()*1.7,t=rnd();g.fillStyle=t<.4?'rgba(255,255,255,.4)':t<.75?'rgba(50,55,60,.2)':'rgba('+(r-55)+','+(gg-50)+','+(b-40)+',.35)';g.fillRect(x,y,s,s);}
      for(let k=0;k<9;k++){const x=rnd()*512,y=rnd()*512,rad=30+rnd()*60,gr=g.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,'rgba(40,36,30,.07)');gr.addColorStop(1,'rgba(40,36,30,0)');g.fillStyle=gr;g.fillRect(x-rad,y-rad,rad*2,rad*2);}
      for(let k=0;k<=8;k++){g.fillStyle='rgba(20,24,28,.2)';g.fillRect(k*64-1,0,2,512);g.fillRect(0,k*64-1,512,2);g.fillStyle='rgba(255,255,255,.22)';g.fillRect(k*64+1,0,1,512);g.fillRect(0,k*64+1,512,1);}
    }
  },2);
}

/* =============================== icons =============================== */
/* a backpack seen from the front: grab handle, shoulder straps, zipped main compartment, front pocket; e=1 is the loaded hiking pack */
function drawPack(g,e){g.lineJoin='round';g.lineCap='round';g.strokeStyle=INK;
  const C=e?{b:'#e2711d',d:'#b9530f',p:'#c75a12',s:'#3a2a1c'}:{b:'#3f6fa3',d:'#2c5078',p:'#335f8e',s:'#1c2b3b'};
  g.lineWidth=2.6;g.beginPath();g.arc(0,-17,4.6,Math.PI*1.08,-Math.PI*.08);g.stroke();
  g.lineWidth=1.6;g.fillStyle=C.s;for(const sd of[-1,1]){g.beginPath();g.moveTo(sd*12,-12);g.quadraticCurveTo(sd*20,-4,sd*17.5,17);g.lineTo(sd*13,17);g.closePath();g.fill();g.stroke();}
  g.fillStyle=C.d;for(const sd of[-1,1]){g.beginPath();g.ellipse(sd*14.5,9,4,7,0,0,TAU);g.fill();g.stroke();}
  if(e){g.fillStyle='#35b9a6';rr(g,14,-2,6.5,13,2.5);g.fill();g.stroke();g.fillStyle='#f4f4ee';rr(g,15,-5,4.5,4,1.5);g.fill();g.stroke();}
  g.fillStyle=C.b;g.beginPath();g.moveTo(-14,-6);g.quadraticCurveTo(-14,-17,0,-17);g.quadraticCurveTo(14,-17,14,-6);g.lineTo(14,13);g.quadraticCurveTo(14,20,7,20);g.lineTo(-7,20);g.quadraticCurveTo(-14,20,-14,13);g.closePath();g.fill();g.stroke();
  g.fillStyle='rgba(0,0,0,.16)';g.beginPath();g.moveTo(-14,13);g.quadraticCurveTo(-14,20,-7,20);g.lineTo(7,20);g.quadraticCurveTo(14,20,14,13);g.lineTo(14,11);g.lineTo(-14,11);g.closePath();g.fill();
  g.fillStyle='rgba(255,255,255,.22)';g.beginPath();g.ellipse(-6,-11,5.5,2.4,-.35,0,TAU);g.fill();
  if(e){g.fillStyle=C.p;g.beginPath();g.moveTo(-13,-5);g.quadraticCurveTo(-13,-16.5,0,-16.5);g.quadraticCurveTo(13,-16.5,13,-5);g.quadraticCurveTo(0,-1,-13,-5);g.closePath();g.fill();g.stroke();
    g.strokeStyle=C.s;g.lineWidth=2.2;for(const x of[-6,6]){g.beginPath();g.moveTo(x,-3.5);g.lineTo(x,17);g.stroke();}g.strokeStyle=INK;g.lineWidth=1.3;g.fillStyle='#c9d2d8';for(const x of[-6,6]){rr(g,x-2.6,-4.5,5.2,4.4,1);g.fill();g.stroke();}
    g.lineWidth=1.6;g.fillStyle='#dfe5e8';rr(g,-15,-25,30,8.5,4.2);g.fill();g.stroke();g.strokeStyle='rgba(20,25,28,.45)';g.lineWidth=1.1;for(const sd of[-1,1]){g.beginPath();g.arc(sd*10.8,-20.7,2.2,0,TAU);g.stroke();}g.strokeStyle=C.s;g.lineWidth=1.8;for(const x of[-5,5]){g.beginPath();g.moveTo(x,-25);g.lineTo(x,-16.5);g.stroke();}g.strokeStyle=INK;}
  else{g.strokeStyle='#d5dde2';g.lineWidth=1.5;g.setLineDash([2.2,1.6]);g.beginPath();g.moveTo(-11.5,-3);g.quadraticCurveTo(0,-15,11.5,-3);g.stroke();g.setLineDash([]);g.strokeStyle=INK;g.lineWidth=1.2;g.fillStyle='#ffb300';rr(g,9.2,-5.5,3.4,5.2,1.2);g.fill();g.stroke();}
  g.lineWidth=1.6;g.fillStyle=C.p;rr(g,-9.5,3,19,13,4);g.fill();g.stroke();
  g.strokeStyle='#d5dde2';g.lineWidth=1.4;g.setLineDash([2.2,1.6]);g.beginPath();g.moveTo(-6.5,6.5);g.lineTo(6.5,6.5);g.stroke();g.setLineDash([]);g.strokeStyle=INK;g.lineWidth=1.2;g.fillStyle='#ffb300';rr(g,4.6,5,3.2,4.6,1.1);g.fill();g.stroke();
  if(!e){g.fillStyle='#f4f4ee';rr(g,-3.6,10,7.2,3.4,1);g.fill();g.stroke();}}
const ICON={
  card:g=>{g.rotate(-.35);g.fillStyle='#00a84d';rr(g,-17,-11,34,22,4);g.fill();g.stroke();g.fillStyle='#fff';g.fillRect(-17,-2,34,5);g.fillStyle='#ffc928';rr(g,-12,-8,8,5,1.2);g.fill();},
  umbrella:g=>{g.rotate(.75);g.beginPath();g.moveTo(0,-20);g.lineTo(7,8);g.lineTo(-7,8);g.closePath();g.fillStyle='#34507a';g.fill();g.stroke();g.beginPath();g.moveTo(0,-20);g.lineTo(0,8);g.stroke();g.lineWidth=3;g.beginPath();g.moveTo(0,8);g.lineTo(0,17);g.arc(-3.5,17,3.5,0,Math.PI);g.stroke();},
  backpack:g=>{g.save();g.translate(0,1);g.scale(.92,.92);drawPack(g,0);g.restore();},
  coffee:g=>{g.beginPath();g.moveTo(-11,-8);g.lineTo(11,-8);g.lineTo(8,18);g.lineTo(-8,18);g.closePath();g.fillStyle='#fbfbf6';g.fill();g.stroke();g.fillStyle='#8a5a33';g.fillRect(-10,0,20,9);g.fillStyle='#2b2f33';rr(g,-13,-13,26,6,2.5);g.fill();g.stroke();g.strokeStyle='#9aa3a7';g.lineWidth=2;g.beginPath();g.moveTo(-4,-17);g.quadraticCurveTo(-7,-20,-4,-23);g.moveTo(4,-17);g.quadraticCurveTo(1,-20,4,-23);g.stroke();},
  anc:g=>{g.lineWidth=4;g.beginPath();g.arc(0,2,14,Math.PI,0);g.stroke();g.lineWidth=2;g.fillStyle='#232b2e';rr(g,-19,0,9,17,4);g.fill();g.stroke();rr(g,10,0,9,17,4);g.fill();g.stroke();g.fillStyle='#00a84d';g.fillRect(-16.5,6,4,5);g.fillRect(12.5,6,4,5);},
  shout:g=>{g.beginPath();for(let i=0;i<16;i++){const a=i/16*TAU-Math.PI/2,r=i%2?12:20;g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.fillStyle='#ffc928';g.fill();g.stroke();g.fillStyle=INK;rr(g,-2.2,-10,4.4,12,1.5);g.fill();g.beginPath();g.arc(0,7,2.6,0,TAU);g.fill();},
  battery:g=>{g.fillStyle='#e9edee';rr(g,-11,-17,22,34,5);g.fill();g.stroke();g.fillStyle='#232b2e';rr(g,-4,-21,8,5,1.5);g.fill();g.fillStyle='#35b7ff';g.beginPath();g.moveTo(3,-11);g.lineTo(-6,2);g.lineTo(-.5,2);g.lineTo(-3,12);g.lineTo(6,-2);g.lineTo(.5,-2);g.closePath();g.fill();g.lineWidth=1.2;g.stroke();},
  hotpack:g=>{g.fillStyle='#f08a24';rr(g,-16,-13,32,26,5);g.fill();g.stroke();g.fillStyle='#fff3d6';g.beginPath();g.moveTo(0,-9);g.quadraticCurveTo(9,0,4,8);g.quadraticCurveTo(0,11,-4,8);g.quadraticCurveTo(-9,1,-3,-3);g.quadraticCurveTo(-1,-1,0,-9);g.fill();g.fillStyle='#e5484d';g.beginPath();g.arc(0,5,3,0,TAU);g.fill();},
  shoes:g=>{g.beginPath();g.moveTo(-18,8);g.lineTo(-17,-6);g.quadraticCurveTo(-10,-10,-5,-2);g.quadraticCurveTo(4,0,14,3);g.quadraticCurveTo(20,5,19,10);g.lineTo(-18,10);g.closePath();g.fillStyle='#fbfbf6';g.fill();g.stroke();g.fillStyle='#00a84d';g.fillRect(-18,8,37,4);g.strokeStyle='#e5484d';g.beginPath();g.moveTo(-6,-1);g.lineTo(-2,4);g.moveTo(-1,0);g.lineTo(3,5);g.stroke();},
  will:g=>{g.fillStyle='#fbfbf6';g.beginPath();g.arc(0,0,17,0,TAU);g.fill();g.lineWidth=3;g.strokeStyle='#e5484d';g.stroke();g.strokeStyle=INK;g.lineWidth=2.6;g.beginPath();g.moveTo(0,-11);g.lineTo(0,0);g.lineTo(0,10);g.stroke();g.fillStyle=INK;g.beginPath();g.arc(0,0,2.2,0,TAU);g.fill();},
  pods:g=>{for(const s of[-1,1]){g.save();g.translate(s*8,0);g.rotate(s*.25);g.fillStyle='#fbfbf6';g.beginPath();g.arc(0,-7,7,0,TAU);g.fill();g.stroke();rr(g,-2.4,-3,4.8,19,2.4);g.fill();g.stroke();g.fillStyle='#232b2e';g.beginPath();g.arc(-s*2,-8,2.2,0,TAU);g.fill();g.restore();}},
  tumbler:g=>{g.fillStyle='#9fb0b6';g.beginPath();g.moveTo(-10,-12);g.lineTo(10,-12);g.lineTo(7.5,19);g.lineTo(-7.5,19);g.closePath();g.fill();g.stroke();g.fillStyle='#232b2e';rr(g,-12,-18,24,7,2.5);g.fill();g.stroke();g.fillStyle='rgba(255,255,255,.5)';g.fillRect(-6,-8,3,22);g.fillStyle='#00a84d';g.fillRect(-9.4,-2,18.8,6);},
  gym:g=>{g.fillStyle='#232b2e';rr(g,-21,-10,8,20,2.5);g.fill();g.stroke();rr(g,13,-10,8,20,2.5);g.fill();g.stroke();g.fillStyle='#8b9599';rr(g,-13,-3,26,6,2);g.fill();g.stroke();g.fillStyle='#e5484d';rr(g,-15,-7,4,14,1.5);g.fill();rr(g,11,-7,4,14,1.5);g.fill();},
  badge:g=>{g.strokeStyle='#00a84d';g.lineWidth=3;g.beginPath();g.moveTo(-10,-22);g.lineTo(0,-6);g.lineTo(10,-22);g.stroke();g.strokeStyle=INK;g.lineWidth=2;g.fillStyle='#fbfbf6';rr(g,-12,-7,24,27,3.5);g.fill();g.stroke();g.fillStyle='#f1c9a5';g.beginPath();g.arc(0,3,5,0,TAU);g.fill();g.fillStyle='#232b2e';g.beginPath();g.arc(0,1.5,5.2,Math.PI,0);g.fill();g.fillStyle='#9aa3a7';g.fillRect(-7,12,14,2.6);},
  armor:g=>{g.beginPath();g.moveTo(0,-19);g.lineTo(16,-12);g.lineTo(14,6);g.quadraticCurveTo(8,16,0,20);g.quadraticCurveTo(-8,16,-14,6);g.lineTo(-16,-12);g.closePath();g.fillStyle='#8b9599';g.fill();g.stroke();g.fillStyle=INK;g.fillRect(-9,-5,6,3);g.fillRect(3,-5,6,3);g.fillRect(-5,7,10,2.2);g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.moveTo(0,-16);g.lineTo(-12,-10);g.lineTo(-11,2);g.lineTo(0,-4);g.fill();},
  payday:g=>{g.fillStyle='#fbf7ea';rr(g,-18,-12,36,25,3);g.fill();g.stroke();g.beginPath();g.moveTo(-18,-11);g.lineTo(0,4);g.lineTo(18,-11);g.stroke();g.fillStyle='#ffc928';g.beginPath();g.arc(8,9,9,0,TAU);g.fill();g.stroke();g.fillStyle=INK;g.font='700 11px sans-serif';g.textAlign='center';g.fillText('₩',8,13);},
  scooter:g=>{g.rotate(-.25);g.fillStyle='#1b2227';for(const x of[-17,15]){g.beginPath();g.arc(x,12,5,0,TAU);g.fill();}g.fillStyle='#1f9a94';rr(g,-17,6,30,5,2.5);g.fill();g.stroke();g.lineWidth=3;g.beginPath();g.moveTo(13,8);g.lineTo(9,-16);g.stroke();g.lineWidth=4;g.beginPath();g.moveTo(2,-17);g.lineTo(16,-15);g.stroke();},
  selfie:g=>{g.rotate(.7);g.lineWidth=4;g.beginPath();g.moveTo(-2,20);g.lineTo(-2,-6);g.stroke();g.strokeStyle='#c9d0d3';g.lineWidth=1.6;g.beginPath();g.moveTo(-2,19);g.lineTo(-2,-5);g.stroke();g.strokeStyle=INK;g.lineWidth=2;g.fillStyle='#1b2227';rr(g,-9,-22,14,18,3);g.fill();g.stroke();g.fillStyle='#9fe3ff';rr(g,-7,-20,10,13,1.5);g.fill();},
  handle:g=>{g.fillStyle='#7a8489';rr(g,-4,-21,8,12,2);g.fill();g.stroke();g.beginPath();g.moveTo(0,-9);g.lineTo(16,16);g.lineTo(-16,16);g.closePath();g.lineWidth=9;g.stroke();g.strokeStyle='#eef1f1';g.lineWidth=5;g.stroke();},
  alarm:g=>{g.fillStyle='#ffc928';for(const sd of[-1,1]){g.beginPath();g.arc(sd*11,-13,7,Math.PI,0);g.closePath();g.fill();g.stroke();}g.lineWidth=3;g.beginPath();g.moveTo(-9,14);g.lineTo(-13,20);g.moveTo(9,14);g.lineTo(13,20);g.stroke();g.lineWidth=2;g.fillStyle='#e5484d';g.beginPath();g.arc(0,2,16,0,TAU);g.fill();g.stroke();g.fillStyle='#fbfaf5';g.beginPath();g.arc(0,2,11.5,0,TAU);g.fill();g.stroke();g.lineWidth=2.4;g.beginPath();g.moveTo(0,2);g.lineTo(0,-6);g.moveTo(0,2);g.lineTo(6,5);g.stroke();},
  energy:g=>{g.fillStyle='#232b2e';rr(g,-10,-18,20,37,4);g.fill();g.stroke();g.fillStyle='#c9cfd2';rr(g,-8,-21,16,5,2);g.fill();g.stroke();g.fillStyle='#35e07f';g.beginPath();g.moveTo(3,-10);g.lineTo(-6,3);g.lineTo(-.5,3);g.lineTo(-3,14);g.lineTo(6,0);g.lineTo(.5,0);g.closePath();g.fill();},
  focus:g=>{g.fillStyle='#fbfaf5';g.beginPath();g.arc(0,0,17,0,TAU);g.fill();g.stroke();g.strokeStyle='#e5484d';g.lineWidth=3.4;g.beginPath();g.arc(0,0,10.5,0,TAU);g.stroke();g.fillStyle='#e5484d';g.beginPath();g.arc(0,0,4,0,TAU);g.fill();g.strokeStyle=INK;g.lineWidth=2.2;g.beginPath();g.moveTo(0,-22);g.lineTo(0,-13);g.moveTo(0,22);g.lineTo(0,13);g.moveTo(-22,0);g.lineTo(-13,0);g.moveTo(22,0);g.lineTo(13,0);g.stroke();},
  lotto:g=>{g.rotate(-.2);g.fillStyle='#fff6c9';rr(g,-19,-12,38,24,3);g.fill();g.stroke();g.fillStyle='#e5484d';g.fillRect(-19,-12,38,6);g.fillStyle=INK;for(let i=0;i<3;i++){g.beginPath();g.arc(-10+i*10,3,3.6,0,TAU);g.fill();}g.fillStyle='#ffc928';g.beginPath();g.arc(0,3,3.6,0,TAU);g.fill();},
  mask:g=>{g.strokeStyle=INK;g.lineWidth=1.6;g.beginPath();g.moveTo(-14,-5);g.quadraticCurveTo(-22,-2,-20,6);g.moveTo(14,-5);g.quadraticCurveTo(22,-2,20,6);g.stroke();g.lineWidth=2;g.fillStyle='#f4f6f6';g.beginPath();g.moveTo(-15,-9);g.quadraticCurveTo(0,-15,15,-9);g.lineTo(14,7);g.quadraticCurveTo(0,17,-14,7);g.closePath();g.fill();g.stroke();g.strokeStyle='#b6bcc0';g.lineWidth=1.4;g.beginPath();g.moveTo(-12,-3);g.quadraticCurveTo(0,-7,12,-3);g.moveTo(-12,3);g.quadraticCurveTo(0,0,12,3);g.stroke();},
  tie:g=>{g.fillStyle='#d23338';g.beginPath();g.moveTo(-6,-20);g.lineTo(6,-20);g.lineTo(4,-12);g.lineTo(-4,-12);g.closePath();g.fill();g.stroke();g.beginPath();g.moveTo(-4,-12);g.lineTo(4,-12);g.lineTo(9,12);g.lineTo(0,21);g.lineTo(-9,12);g.closePath();g.fill();g.stroke();g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=2.4;g.beginPath();g.moveTo(-5,-2);g.lineTo(4,3);g.moveTo(-6,7);g.lineTo(5,12);g.stroke();},
  laptop:g=>{g.fillStyle='#2b3236';rr(g,-16,-16,32,22,3);g.fill();g.stroke();g.fillStyle='#7cc4ff';rr(g,-13,-13,26,16,1.5);g.fill();g.fillStyle='#fff';g.fillRect(-9,-9,12,2.4);g.fillRect(-9,-4,18,2.4);g.fillStyle='#c9cfd2';g.beginPath();g.moveTo(-20,16);g.lineTo(-16,6);g.lineTo(16,6);g.lineTo(20,16);g.closePath();g.fill();g.stroke();},
  gum:g=>{g.fillStyle='#ff8fbd';g.beginPath();g.arc(2,-4,15,0,TAU);g.fill();g.stroke();g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.ellipse(-4,-10,5,3,-.6,0,TAU);g.fill();g.fillStyle='#e0508c';g.beginPath();g.moveTo(-6,9);g.quadraticCurveTo(-12,18,-16,20);g.quadraticCurveTo(-6,21,2,11);g.closePath();g.fill();g.stroke();},
  shoulder:g=>{g.fillStyle='#34507a';g.beginPath();g.moveTo(-19,16);g.quadraticCurveTo(-19,-6,-2,-8);g.quadraticCurveTo(12,-8,14,6);g.lineTo(14,16);g.closePath();g.fill();g.stroke();g.fillStyle='#f1c9a5';g.beginPath();g.arc(-9,-13,7,0,TAU);g.fill();g.stroke();g.strokeStyle='#ffb300';g.lineWidth=3;g.beginPath();g.moveTo(17,-12);g.lineTo(22,-17);g.moveTo(19,-3);g.lineTo(26,-3);g.moveTo(17,6);g.lineTo(22,11);g.stroke();},
  report:g=>{g.rotate(-.12);g.fillStyle='#fbfaf5';rr(g,-13,-19,26,38,2.5);g.fill();g.stroke();g.fillStyle=INK;g.fillRect(-8,-13,16,2.4);g.fillStyle='#9aa3a7';for(let i=0;i<3;i++)g.fillRect(-8,-6+i*5,i===2?9:16,2);g.fillStyle='#e5484d';g.fillRect(-8,11,4,-6);g.fillRect(-2,11,4,-10);g.fillRect(4,11,4,-4);},
  overtime:g=>{g.fillStyle='#1d2740';g.beginPath();g.arc(0,0,18,0,TAU);g.fill();g.stroke();g.fillStyle='#ffe27a';g.beginPath();g.arc(-3,-2,10,0,TAU);g.fill();g.fillStyle='#1d2740';g.beginPath();g.arc(2,-5,9,0,TAU);g.fill();g.fillStyle='#fff';for(const q of[[9,6],[-9,10],[11,-9]]){g.beginPath();g.arc(q[0],q[1],1.4,0,TAU);g.fill();}},
  vitamin:g=>{g.fillStyle='#fbfaf5';rr(g,-11,-9,22,28,4);g.fill();g.stroke();g.fillStyle='#f08a24';rr(g,-12,-18,24,10,3);g.fill();g.stroke();g.fillStyle='#35b25f';g.fillRect(-10.5,0,21,10);g.fillStyle='#fff';g.fillRect(-1.5,1.5,3,7);g.fillRect(-3.5,3.5,7,3);},
  snack:g=>{g.fillStyle='#b98654';rr(g,-18,-12,36,26,3);g.fill();g.stroke();g.fillStyle='#8a5a33';g.fillRect(-18,-2,36,3);g.fillStyle='#ffc928';rr(g,-5,2,10,4,2);g.fill();g.stroke();g.fillStyle='#e5484d';g.beginPath();g.arc(-8,-13,5,Math.PI,0);g.fill();g.stroke();g.fillStyle='#35b25f';g.beginPath();g.arc(6,-13,6,Math.PI,0);g.fill();g.stroke();},
  heal:g=>{g.beginPath();g.moveTo(0,-18);g.lineTo(18,14);g.lineTo(-18,14);g.closePath();g.fillStyle='#fbfbf6';g.fill();g.stroke();g.fillStyle='#1c2a22';rr(g,-10,0,20,14,2);g.fill();g.stroke();},
  heal2:g=>{g.fillStyle='#7a4a2a';rr(g,-9,-17,18,34,4);g.fill();g.stroke();g.fillStyle='#e9c14a';g.fillRect(-9,-6,18,10);g.fillStyle='#c9cfd2';rr(g,-8,-20,16,5,2);g.fill();g.stroke();}
};
const iconCache={};
Object.assign(ICON,{
  armor:g=>{g.fillStyle='#ffd23f';g.beginPath();g.moveTo(-15,20);g.lineTo(-13,-2);g.quadraticCurveTo(-12,-19,0,-19);g.quadraticCurveTo(12,-19,13,-2);g.lineTo(15,20);g.closePath();g.fill();g.stroke();g.fillStyle='#f1c9a5';g.beginPath();g.arc(0,-7,6.5,0,TAU);g.fill();g.stroke();g.beginPath();g.moveTo(0,0);g.lineTo(0,20);g.stroke();g.fillStyle='#7cc4ff';for(const q of[[-19,-12],[19,-4],[-20,6]]){g.beginPath();g.moveTo(q[0],q[1]-5);g.quadraticCurveTo(q[0]+3.5,q[1]+2,q[0],q[1]+3);g.quadraticCurveTo(q[0]-3.5,q[1]+2,q[0],q[1]-5);g.fill();}},
  pods:g=>{g.fillStyle='#fbfaf5';g.beginPath();g.moveTo(-13,-4);g.lineTo(13,-4);g.lineTo(9,16);g.lineTo(-9,16);g.closePath();g.fill();g.stroke();g.fillStyle='#4a2c17';g.beginPath();g.moveTo(-11.5,2);g.lineTo(11.5,2);g.lineTo(9,16);g.lineTo(-9,16);g.closePath();g.fill();g.fillStyle='#c98a4b';g.fillRect(-11,1,22,3);g.strokeStyle='#e5484d';g.lineWidth=3;g.beginPath();g.moveTo(0,-20);g.lineTo(0,-9);g.moveTo(-5.5,-14.5);g.lineTo(5.5,-14.5);g.stroke();},
  payday:g=>{g.fillStyle='#2b3236';rr(g,-17,-17,34,34,6);g.fill();g.stroke();g.fillStyle='#35e07f';for(let i=0;i<3;i++){rr(g,-11,-11+i*8,5,5,1.5);g.fill();}g.fillStyle='#fbfaf5';for(let i=0;i<3;i++)g.fillRect(-3,-10+i*8,i===1?10:14,3);g.fillStyle='#35e07f';g.beginPath();g.moveTo(8,7);g.lineTo(8,15);g.lineTo(15,11);g.closePath();g.fill();},
  tumbler:g=>{g.rotate(-.5);g.fillStyle='#ff8f6b';rr(g,-17,-8,34,16,8);g.fill();g.stroke();g.fillStyle='#fbfaf5';g.beginPath();g.moveTo(-17,0);g.lineTo(-23,-7);g.lineTo(-23,7);g.closePath();g.fill();g.stroke();g.beginPath();g.moveTo(17,0);g.lineTo(23,-7);g.lineTo(23,7);g.closePath();g.fill();g.stroke();g.fillStyle='rgba(255,255,255,.6)';g.beginPath();g.ellipse(-4,-3,7,2.4,0,0,TAU);g.fill();},
  focus:g=>{g.strokeStyle=INK;g.lineWidth=6;g.beginPath();g.moveTo(-16,14);g.quadraticCurveTo(-18,-8,-2,-4);g.quadraticCurveTo(10,-1,8,-12);g.stroke();g.strokeStyle='#fbfaf5';g.lineWidth=3;g.stroke();g.strokeStyle=INK;g.lineWidth=2;g.fillStyle='#c9cfd2';rr(g,2,-21,12,10,2);g.fill();g.stroke();g.fillStyle='#ffc928';g.beginPath();g.moveTo(14,-2);g.lineTo(6,8);g.lineTo(12,8);g.lineTo(8,19);g.lineTo(20,5);g.lineTo(14,5);g.closePath();g.fill();g.stroke();},
  vitamin:g=>{g.fillStyle='#e5484d';g.beginPath();g.ellipse(0,-8,15,8,0,0,TAU);g.fill();g.stroke();g.fillStyle='#e5484d';rr(g,2,-6,11,24,3);g.fill();g.stroke();g.strokeStyle='#fbfaf5';g.lineWidth=2.4;for(const x of[-8,-1,6]){g.beginPath();g.moveTo(x,-14);g.lineTo(x+3,-3);g.stroke();}g.beginPath();g.moveTo(4,3);g.lineTo(11,5);g.moveTo(4,10);g.lineTo(11,12);g.stroke();g.strokeStyle=INK;g.lineWidth=2;for(const x of[4,7.5,11]){g.beginPath();g.moveTo(x,18);g.lineTo(x,22);g.stroke();}},
  mask:g=>{g.fillStyle='#fbfaf5';g.beginPath();g.moveTo(-18,6);g.quadraticCurveTo(-18,-17,0,-17);g.quadraticCurveTo(18,-17,18,6);g.closePath();g.fill();g.stroke();g.fillStyle='#e5484d';g.beginPath();g.moveTo(-4,-17);g.quadraticCurveTo(0,-18,4,-17);g.lineTo(6,6);g.lineTo(-6,6);g.closePath();g.fill();g.fillStyle='#2b3236';rr(g,-20,5,40,5,2);g.fill();g.stroke();g.beginPath();g.moveTo(-10,10);g.quadraticCurveTo(0,22,10,10);g.stroke();},
  badge:g=>{g.fillStyle='#2b3236';rr(g,-6,-21,12,17,2.5);g.fill();g.stroke();g.fillStyle='#8fd8ff';g.fillRect(-4,-19,8,12);g.fillStyle='#9aa3a7';rr(g,-4,-5,8,6,1.5);g.fill();g.stroke();g.lineWidth=2.6;g.beginPath();g.moveTo(0,1);g.lineTo(0,19);g.moveTo(0,2);g.lineTo(-14,19);g.moveTo(0,2);g.lineTo(14,19);g.stroke();},
  energy:g=>{g.fillStyle='#00a84d';g.beginPath();g.arc(-9,-8,9,0,TAU);g.fill();g.stroke();g.fillStyle='#f08a24';g.beginPath();g.arc(9,8,9,0,TAU);g.fill();g.stroke();g.strokeStyle='#fbfaf5';g.lineWidth=3;g.beginPath();g.moveTo(-3,-4);g.lineTo(3,4);g.stroke();g.strokeStyle=INK;g.lineWidth=2;g.fillStyle='#fbfaf5';g.beginPath();g.moveTo(8,-17);g.lineTo(17,-11);g.lineTo(8,-5);g.closePath();g.fill();g.stroke();g.beginPath();g.moveTo(-8,17);g.lineTo(-17,11);g.lineTo(-8,5);g.closePath();g.fill();g.stroke();},
  overtime:g=>{g.fillStyle='#2b3236';rr(g,-11,-20,22,40,5);g.fill();g.stroke();g.fillStyle='#ffe9a8';rr(g,-8,-16,16,30,2);g.fill();g.fillStyle='#e5484d';g.beginPath();g.arc(0,-3,5.5,Math.PI,0);g.lineTo(6.5,4);g.lineTo(-6.5,4);g.closePath();g.fill();g.beginPath();g.arc(0,6,2,0,TAU);g.fill();g.strokeStyle='#ffb300';g.lineWidth=2.6;g.beginPath();g.arc(0,-2,17,-2.5,-2);g.stroke();g.beginPath();g.arc(0,-2,17,-1.14,-.64);g.stroke();},
  will:g=>{g.fillStyle='#3a4246';rr(g,-21,-11,42,24,4);g.fill();g.stroke();for(let r=0;r<3;r++)for(let c=0;c<6;c++){if(r===2&&c>0&&c<5)continue;g.fillStyle=(r+c)%4===0?'#35e07f':'#fbfaf5';rr(g,-18+c*6.2,-8+r*6.4,4.8,4.8,1);g.fill();}g.fillStyle='#fbfaf5';rr(g,-11.8,4.8,23.6,4.8,1);g.fill();},
  lotto:g=>{g.fillStyle='#e5484d';rr(g,-13,4,26,16,3);g.fill();g.stroke();g.fillStyle='#bfe8ff';g.beginPath();g.arc(0,-6,14,0,TAU);g.fill();g.stroke();const C=['#ff8fbd','#ffc928','#35b25f','#7cc4ff','#f08a24','#b9a6ff'];for(let i=0;i<6;i++){g.fillStyle=C[i];g.beginPath();g.arc([-6,2,8,-2,5,-8][i],[-2,-1,-5,-9,3,4][i]-2,3.6,0,TAU);g.fill();}g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.ellipse(-6,-13,4,2,-.6,0,TAU);g.fill();g.fillStyle='#2b3236';rr(g,-5,10,10,6,1.5);g.fill();g.fillStyle='#ffc928';g.beginPath();g.arc(9,12,2.6,0,TAU);g.fill();g.stroke();},
  snack:g=>{g.fillStyle='#e0508c';g.beginPath();g.moveTo(-17,16);g.quadraticCurveTo(-21,-2,-6,-6);g.lineTo(6,-6);g.quadraticCurveTo(21,-2,17,16);g.closePath();g.fill();g.stroke();g.fillStyle='#ff8fbd';g.beginPath();g.moveTo(-6,-6);g.quadraticCurveTo(-16,-20,-3,-17);g.quadraticCurveTo(0,-12,0,-8);g.quadraticCurveTo(0,-12,3,-17);g.quadraticCurveTo(16,-20,6,-6);g.closePath();g.fill();g.stroke();g.fillStyle='#ffe27a';g.beginPath();g.arc(0,-7,3.4,0,TAU);g.fill();g.stroke();g.fillStyle='rgba(255,255,255,.75)';for(const q of[[-8,4],[2,9],[9,2],[-2,0]]){g.beginPath();for(let i=0;i<8;i++){const a=i/8*TAU,r=i%2?1.2:3;g.lineTo(q[0]+Math.cos(a)*r,q[1]+Math.sin(a)*r);}g.closePath();g.fill();}}
});
function icon(key,evo){
  const id=key+(evo?'!':'');if(iconCache[id])return iconCache[id];
  const c=mk(48,48,g=>{g.translate(24,24);g.lineJoin='round';g.lineCap='round';g.strokeStyle=INK;g.lineWidth=2;g.save();const fz=typeof FUSIONS!=='undefined'&&FUSIONS[key];if(fz){g.fillStyle='#2a1f3d';rr(g,-22,-22,44,44,9);g.fill();g.save();g.translate(-8,-7);g.scale(.62,.62);ICON[fz.a](g);g.restore();g.strokeStyle=INK;g.lineWidth=2;g.save();g.translate(9,8);g.scale(.62,.62);ICON[fz.b](g);g.restore();g.strokeStyle='#ffc928';g.lineWidth=2.5;rr(g,-22,-22,44,44,9);g.stroke();g.strokeStyle=INK;g.lineWidth=2;}else (ICON[key]||ICON.heal)(g);g.restore();
    if(evo){g.fillStyle='#ffc928';g.strokeStyle=INK;g.lineWidth=1.5;g.beginPath();for(let i=0;i<10;i++){const a=i/10*TAU-Math.PI/2,r=i%2?4:9;g.lineTo(15+Math.cos(a)*r,-14+Math.sin(a)*r);}g.closePath();g.fill();g.stroke();}},2);
  let url='';try{url=c.toDataURL('image/png');}catch(e){}
  return iconCache[id]=url;
}

/* =============================== particles & effects =============================== */
let FX=null,zoomKick=0,stopT=0,speedT=0;
const rgba=(c,a)=>'rgba('+c+','+(a<0?0:a>1?1:a)+')';
function buildFx(){
  FX={};
  FX.flare=mk(64,64,g=>{const gr=g.createRadialGradient(32,32,0,32,32,20);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.3,'rgba(255,255,255,.5)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);
    const arm=(rx,ry,rot)=>{g.save();g.translate(32,32);g.rotate(rot);g.scale(rx,ry);const a=g.createRadialGradient(0,0,0,0,0,1);a.addColorStop(0,'rgba(255,255,255,1)');a.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=a;g.beginPath();g.arc(0,0,1,0,TAU);g.fill();g.restore();};
    arm(31,2.4,0);arm(2.4,31,0);arm(15,1.6,Math.PI/4);arm(15,1.6,-Math.PI/4);},2);
  const rnd=srand(4242);
  FX.puff=mk(64,64,g=>{for(let i=0;i<7;i++){const x=32+(rnd()-.5)*22,y=32+(rnd()-.5)*22,r=12+rnd()*10,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);}},2);
  FX.flame=mk(32,48,g=>{g.beginPath();g.moveTo(16,1);g.bezierCurveTo(24,14,31,24,29,33);g.bezierCurveTo(27,43,21,47,16,47);g.bezierCurveTo(11,47,5,43,3,33);g.bezierCurveTo(1,24,8,14,16,1);g.closePath();
    const gr=g.createRadialGradient(16,36,1,16,30,26);gr.addColorStop(0,'rgba(255,255,235,1)');gr.addColorStop(.3,'rgba(255,215,110,.95)');gr.addColorStop(.65,'rgba(255,120,40,.7)');gr.addColorStop(1,'rgba(220,40,20,0)');g.fillStyle=gr;g.fill();},2);
  FX.lap=mk(34,34,g=>{g.translate(17,17);g.scale(.72,.72);g.lineJoin='round';g.lineCap='round';g.strokeStyle=INK;g.lineWidth=2.4;ICON.laptop(g);},2);
  FX.gstab=[['#2f4a78','#f4f5f2','#d9b45a'],['#1c1f26','#d9b45a','#f4f5f2']].map(C=>mk(160,32,g=>{g.lineJoin='round';g.lineCap='round';g.strokeStyle=INK;
    g.lineWidth=5;g.beginPath();g.moveTo(26,16);g.lineTo(12,16);g.arc(12,21,5,-Math.PI/2,Math.PI/2,true);g.stroke();g.strokeStyle='#b98654';g.lineWidth=2.6;g.stroke();g.strokeStyle=INK;
    g.beginPath();g.moveTo(28,10);g.quadraticCurveTo(80,3,142,13);g.lineTo(142,19);g.quadraticCurveTo(80,29,28,22);g.closePath();g.fillStyle=C[0];g.fill();
    g.save();g.clip();g.strokeStyle=C[1];g.lineWidth=7;for(let x=22;x<150;x+=24){g.beginPath();g.moveTo(x,34);g.lineTo(x+16,-2);g.stroke();}g.fillStyle='rgba(255,255,255,.22)';g.fillRect(24,4,124,8);g.restore();
    g.strokeStyle=INK;g.lineWidth=2.2;g.beginPath();g.moveTo(28,10);g.quadraticCurveTo(80,3,142,13);g.lineTo(142,19);g.quadraticCurveTo(80,29,28,22);g.closePath();g.stroke();
    g.fillStyle=C[2];g.beginPath();g.moveTo(141,12.5);g.lineTo(158,16);g.lineTo(141,19.5);g.closePath();g.fill();g.stroke();rr(g,24,9,7,14,2);g.fill();g.stroke();},2));
  /* the evolved golf umbrella opened, seen from above: black canopy, gold bands, white tips */
  FX.gcan=mk(128,128,g=>{g.translate(64,64);g.lineJoin='round';const R=58,edge=()=>{g.beginPath();for(let k=0;k<8;k++){const a0=k/8*TAU,a1=a0+TAU/8,am=a0+TAU/16;if(!k)g.moveTo(Math.cos(a0)*R,Math.sin(a0)*R);g.quadraticCurveTo(Math.cos(am)*R*.9,Math.sin(am)*R*.9,Math.cos(a1)*R,Math.sin(a1)*R);}g.closePath();};
    edge();g.fillStyle='#1c1f26';g.fill();g.save();g.clip();g.strokeStyle='#d9b45a';g.lineWidth=7;g.beginPath();g.arc(0,0,R*.5,0,TAU);g.stroke();g.lineWidth=5;g.beginPath();g.arc(0,0,R*.8,0,TAU);g.stroke();
    const sh=g.createRadialGradient(-14,-16,4,0,0,R);sh.addColorStop(0,'rgba(255,255,255,.34)');sh.addColorStop(.45,'rgba(255,255,255,0)');sh.addColorStop(1,'rgba(0,0,0,.3)');g.fillStyle=sh;g.fillRect(-64,-64,128,128);g.restore();
    g.strokeStyle='rgba(217,180,90,.55)';g.lineWidth=1.3;for(let k=0;k<8;k++){const a0=k/8*TAU;g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(a0)*R,Math.sin(a0)*R);g.stroke();}
    g.strokeStyle=INK;g.lineWidth=3;edge();g.stroke();g.lineWidth=1.6;g.fillStyle='#f4f5f2';for(let k=0;k<8;k++){const a0=k/8*TAU;g.beginPath();g.arc(Math.cos(a0)*R,Math.sin(a0)*R,3,0,TAU);g.fill();g.stroke();}
    g.fillStyle='#d9b45a';g.beginPath();g.arc(0,0,5,0,TAU);g.fill();g.stroke();});
  FX.gumb=[['#2f4a78','#f4f5f2','#d9b45a'],['#1c1f26','#d9b45a','#f4f5f2']].map(C=>mk(128,128,g=>{g.translate(64,64);g.lineJoin='round';const R=58;
    for(let k=0;k<8;k++){const a0=k/8*TAU,a1=a0+TAU/8,am=a0+TAU/16;g.fillStyle=k%2?C[0]:C[1];g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(a0)*R,Math.sin(a0)*R);g.quadraticCurveTo(Math.cos(am)*R*.9,Math.sin(am)*R*.9,Math.cos(a1)*R,Math.sin(a1)*R);g.closePath();g.fill();}
    const sh=g.createRadialGradient(-14,-16,4,0,0,R);sh.addColorStop(0,'rgba(255,255,255,.5)');sh.addColorStop(.45,'rgba(255,255,255,0)');sh.addColorStop(1,'rgba(0,0,0,.28)');g.fillStyle=sh;g.beginPath();g.arc(0,0,R,0,TAU);g.fill();
    g.strokeStyle='rgba(20,25,28,.55)';g.lineWidth=1.5;for(let k=0;k<8;k++){const a0=k/8*TAU;g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(a0)*R,Math.sin(a0)*R);g.stroke();}
    g.strokeStyle=INK;g.lineWidth=3;g.beginPath();for(let k=0;k<8;k++){const a0=k/8*TAU,a1=a0+TAU/8,am=a0+TAU/16;if(!k)g.moveTo(Math.cos(a0)*R,Math.sin(a0)*R);g.quadraticCurveTo(Math.cos(am)*R*.9,Math.sin(am)*R*.9,Math.cos(a1)*R,Math.sin(a1)*R);}g.closePath();g.stroke();
    g.fillStyle=C[2];for(let k=0;k<8;k++){const a0=k/8*TAU;g.beginPath();g.arc(Math.cos(a0)*R,Math.sin(a0)*R,3,0,TAU);g.fill();g.stroke();}
    g.fillStyle='#fbfaf5';g.lineWidth=2.5;g.beginPath();g.arc(0,0,6,0,TAU);g.fill();g.stroke();g.fillStyle=C[2];g.beginPath();g.arc(0,0,2.4,0,TAU);g.fill();},2));
  FX.umb=mk(112,26,g=>{g.lineJoin='round';g.lineCap='round';g.strokeStyle=INK;
    g.lineWidth=4.6;g.beginPath();g.arc(8,17,5,Math.PI*.1,Math.PI*1.05);g.stroke();g.strokeStyle='#a8703f';g.lineWidth=2.6;g.beginPath();g.arc(8,17,5,Math.PI*.1,Math.PI*1.05);g.stroke();
    g.strokeStyle=INK;g.lineWidth=3;g.beginPath();g.moveTo(12,13);g.lineTo(106,13);g.stroke();g.strokeStyle='#c9d0d3';g.lineWidth=1.2;g.beginPath();g.moveTo(98,13);g.lineTo(108,13);g.stroke();
    g.beginPath();g.moveTo(26,13);g.quadraticCurveTo(42,1,96,10.5);g.lineTo(100,13);g.lineTo(96,15.5);g.quadraticCurveTo(42,25,26,13);g.closePath();
    const gr=g.createLinearGradient(0,3,0,23);gr.addColorStop(0,'#4f74b3');gr.addColorStop(.5,'#2f4b7a');gr.addColorStop(1,'#1c2e4d');g.fillStyle=gr;g.fill();g.strokeStyle=INK;g.lineWidth=1.6;g.stroke();
    g.strokeStyle='rgba(255,255,255,.28)';g.lineWidth=1;g.beginPath();g.moveTo(32,10.5);g.quadraticCurveTo(60,6.5,94,11.6);g.stroke();g.strokeStyle='rgba(0,0,0,.3)';g.beginPath();g.moveTo(32,15.5);g.quadraticCurveTo(60,19,94,14.4);g.stroke();
    g.fillStyle='#f4f4f0';g.strokeStyle=INK;g.lineWidth=1;rr(g,56,7.5,4.5,11,1.5);g.fill();g.stroke();},3);
  FX.scooter=mk(60,26,g=>{g.translate(4,13);g.lineJoin='round';g.lineCap='round';g.strokeStyle=INK;
    g.fillStyle='#1b2227';for(const x of[2,46]){rr(g,x-5,-3.2,10,6.4,3);g.fill();}
    g.lineWidth=1.6;const gr=g.createLinearGradient(0,-5,0,5);gr.addColorStop(0,'#5fe6c9');gr.addColorStop(1,'#1f9a94');g.fillStyle=gr;rr(g,3,-4.6,36,9.2,4);g.fill();g.stroke();g.fillStyle='rgba(0,0,0,.25)';rr(g,8,-2.6,24,5.2,2);g.fill();
    g.lineWidth=3.4;g.beginPath();g.moveTo(38,0);g.lineTo(46,0);g.stroke();g.lineWidth=3;g.beginPath();g.moveTo(44,-10);g.lineTo(44,10);g.stroke();g.strokeStyle='#c9d0d3';g.lineWidth=1.3;g.beginPath();g.moveTo(44,-9);g.lineTo(44,9);g.stroke();
    g.fillStyle='#fff3b0';g.beginPath();g.arc(49,0,2.4,0,TAU);g.fill();},3);
  FX.handle=mk(30,30,g=>{g.translate(15,15);g.lineJoin='round';g.strokeStyle=INK;g.lineWidth=1.6;g.fillStyle='#7a8489';rr(g,-3,-14,6,9,1.5);g.fill();g.stroke();
    g.beginPath();g.moveTo(0,-6);g.lineTo(11,10);g.lineTo(-11,10);g.closePath();g.lineWidth=6.5;g.stroke();g.strokeStyle='#eef1f1';g.lineWidth=3.6;g.stroke();g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=1.2;g.beginPath();g.moveTo(-9,10);g.lineTo(9,10);g.stroke();},3);
  /* free pass: the same strap handle in the evolved card's black and gold */
  FX.handleG=mk(30,30,g=>{g.translate(15,15);g.lineJoin='round';g.strokeStyle=INK;g.lineWidth=1.6;g.fillStyle='#17191a';rr(g,-3,-14,6,9,1.5);g.fill();g.stroke();g.fillStyle='#ffc928';g.fillRect(-3,-10.5,6,2);
    g.beginPath();g.moveTo(0,-6);g.lineTo(11,10);g.lineTo(-11,10);g.closePath();g.lineWidth=6.5;g.stroke();g.strokeStyle='#ffc928';g.lineWidth=3.6;g.stroke();g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1.1;g.beginPath();g.moveTo(-3.5,1);g.lineTo(0,-4.2);g.stroke();g.strokeStyle='rgba(0,0,0,.22)';g.lineWidth=1.2;g.beginPath();g.moveTo(-9,10);g.lineTo(9,10);g.stroke();},3);
  FX.clock=mk(34,36,g=>{g.translate(17,20);g.lineJoin='round';g.strokeStyle=INK;g.lineWidth=1.6;
    g.fillStyle='#ffc928';for(const sd of[-1,1]){g.beginPath();g.arc(sd*8,-12,5.2,Math.PI,0);g.closePath();g.fill();g.stroke();}
    g.lineWidth=2.4;g.beginPath();g.moveTo(-7,10);g.lineTo(-10,14);g.moveTo(7,10);g.lineTo(10,14);g.stroke();g.lineWidth=1.6;
    g.fillStyle='#e5484d';g.beginPath();g.arc(0,0,12.5,0,TAU);g.fill();g.stroke();g.fillStyle='#fbfaf5';g.beginPath();g.arc(0,0,9,0,TAU);g.fill();g.lineWidth=1;g.stroke();
    g.lineWidth=1.7;g.beginPath();g.moveTo(0,0);g.lineTo(0,-6);g.moveTo(0,0);g.lineTo(4.4,2);g.stroke();g.fillStyle=INK;g.beginPath();g.arc(0,0,1.4,0,TAU);g.fill();g.fillRect(-1,-17.5,2,4);},3);
  /* morning routine: a take-away cup and an alarm clock in one */
  FX.wake=mk(38,44,g=>{g.translate(19,25);g.lineJoin='round';g.lineCap='round';g.strokeStyle=INK;g.lineWidth=1.6;
    g.fillStyle='#ffc928';for(const sd of[-1,1]){g.beginPath();g.arc(sd*7.5,-17,5,Math.PI,0);g.closePath();g.fill();g.stroke();}g.beginPath();g.moveTo(0,-22.5);g.lineTo(0,-17);g.stroke();
    g.beginPath();g.moveTo(-11,-10);g.lineTo(11,-10);g.lineTo(8.4,16);g.lineTo(-8.4,16);g.closePath();g.fillStyle='#fbfbf6';g.fill();g.stroke();
    g.fillStyle='#8a5a33';g.beginPath();g.moveTo(-10.3,-3);g.lineTo(10.3,-3);g.lineTo(9.1,9);g.lineTo(-9.1,9);g.closePath();g.fill();
    g.fillStyle='#2b2f33';rr(g,-12.5,-15,25,5.5,2);g.fill();g.stroke();
    g.fillStyle='#e5484d';g.beginPath();g.arc(0,3,8.6,0,TAU);g.fill();g.stroke();g.fillStyle='#fbfaf5';g.beginPath();g.arc(0,3,6.2,0,TAU);g.fill();g.lineWidth=1;g.stroke();
    g.lineWidth=1.5;g.beginPath();g.moveTo(0,3);g.lineTo(0,-1.4);g.moveTo(0,3);g.lineTo(3.2,4.6);g.stroke();
    g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=1.6;g.beginPath();g.moveTo(-5,-25);g.quadraticCurveTo(-8,-29,-5,-32);g.moveTo(5,-25);g.quadraticCurveTo(8,-29,5,-32);g.stroke();},3);
  /* full-suit gentleman: the black and gold umbrella with the necktie knotted round it */
  FX.gstabT=mk(160,32,g=>{g.drawImage(FX.gstab[1],0,0,160,32);g.lineJoin='round';g.lineCap='round';
    const tail=(x1,y1,cx,cy,x2,y2,w)=>{g.strokeStyle=INK;g.lineWidth=w+2.4;g.beginPath();g.moveTo(x1,y1);g.quadraticCurveTo(cx,cy,x2,y2);g.stroke();g.strokeStyle='#c8323c';g.lineWidth=w;g.stroke();g.strokeStyle='#22335c';g.lineWidth=w;g.setLineDash([3,5]);g.stroke();g.setLineDash([]);};
    tail(44,8,30,1,8,5,5);tail(44,10,28,9,13,12,4);
    g.strokeStyle=INK;g.lineWidth=1.6;g.fillStyle='#c8323c';g.beginPath();g.moveTo(40,5);g.lineTo(50,6.5);g.lineTo(49,25.5);g.lineTo(40,27);g.closePath();g.fill();g.stroke();
    g.save();g.clip();g.strokeStyle='#22335c';g.lineWidth=2.6;for(let y=2;y<34;y+=7){g.beginPath();g.moveTo(38,y+4);g.lineTo(52,y-2);g.stroke();}g.restore();
    g.fillStyle='#e9c46a';g.beginPath();g.arc(45,16,2.2,0,TAU);g.fill();g.stroke();});
  FX.phone=mk(18,28,g=>{g.translate(9,14);g.strokeStyle=INK;g.lineWidth=1.5;g.fillStyle='#1b2227';rr(g,-7,-12,14,24,3);g.fill();g.stroke();const gr=g.createLinearGradient(0,-10,0,10);gr.addColorStop(0,'#bff1ff');gr.addColorStop(1,'#7fd0ff');g.fillStyle=gr;rr(g,-5.4,-9.6,10.8,18,1.6);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(0,-1,2.6,0,TAU);g.fill();},3);
  FX.golf=mk(100,100,g=>{g.translate(50,50);g.lineJoin='round';
    for(let i=0;i<8;i++){const a0=i*TAU/8,a1=(i+1)*TAU/8,am=(a0+a1)/2;g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(a0)*46,Math.sin(a0)*46);g.quadraticCurveTo(Math.cos(am)*39,Math.sin(am)*39,Math.cos(a1)*46,Math.sin(a1)*46);g.closePath();
      g.fillStyle=i%2?'#f6f6f2':'#2f6fd1';g.fill();g.strokeStyle=INK;g.lineWidth=1.6;g.stroke();
      const sh=g.createRadialGradient(0,0,6,0,0,46);sh.addColorStop(0,'rgba(255,255,255,.35)');sh.addColorStop(1,'rgba(0,0,0,.18)');g.fillStyle=sh;g.fill();}
    g.fillStyle='#17191a';g.beginPath();g.arc(0,0,4.5,0,TAU);g.fill();g.fillStyle='#c9d0d3';g.beginPath();g.arc(-1,-1,1.6,0,TAU);g.fill();},3);
}
/* a fused weapon still shows its two halves */
const REPL={backpack:1,shoulder:1,coffee:1,alarm:1,umbrella:1,tie:1};
const wl=(S,k)=>S.weapons[k]||(S.fsrc&&S.fsrc[k]&&!REPL[k]?EVO:0);let bagFling=0;
let fxLv=2,shakeOn=true,bloomOn=true,bloomAuto=true,inBloom=false,slowT=0,gcv=null,gctx=null,g2=null,g2ctx=null;const BS=4;const says={},decals=[],pk={t:0,x:0,y:0};
function P(o){if(inBloom)return;if(fxLv<2&&o.k!=='text'&&Math.random()<(fxLv?.45:.78))return;if(parts.length>(fxLv===2?700:fxLv?420:220))parts.shift();o.t=0;if(o.k==='text'){if(o.rot===undefined)o.rot=(Math.random()-.5)*.3;if(o.vr===undefined)o.vr=0;}if(o.rot===undefined)o.rot=Math.random()*TAU;if(o.vr===undefined)o.vr=(Math.random()-.5)*10;o.vx=o.vx||0;o.vy=o.vy||0;o.g=o.g||0;if(o.drag===undefined)o.drag=.06;parts.push(o);}
function sparks(x,y,n,spd,col,life,w,dir,spread){for(let i=0;i<n;i++){const a=dir===undefined?Math.random()*TAU:dir+(Math.random()-.5)*(spread||1),s=spd*(.4+Math.random()*.6);P({k:'spark',x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:life*(.6+Math.random()*.4),size:w||2.2,col});}}
function ringFx(x,y,r,col,life,w){P({k:'ring',x,y,life,size:r,col,w:w||5,drag:1});}
function flare(x,y,size,col,life){P({k:'star',x,y,life,size,col,vr:(Math.random()-.5)*5,drag:1});}
function light(x,y,r,col,life){P({k:'glow',x,y,life,size:r,col,drag:1});}
function puff(x,y,n,spd,col,life,size){for(let i=0;i<n;i++){const a=Math.random()*TAU,s=spd*Math.random();P({k:'smoke',x:x+(Math.random()-.5)*8,y:y+(Math.random()-.5)*8,vx:Math.cos(a)*s,vy:Math.sin(a)*s-14,life:life*(.7+Math.random()*.5),size:size*(.7+Math.random()*.6),col,drag:.2,vr:(Math.random()-.5)*2});}}
function shards(x,y,n,spd,col,life,size){for(let i=0;i<n;i++){const a=Math.random()*TAU,s=spd*(.4+Math.random()*.6);P({k:'shard',x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-spd*.5,g:spd*2.2,life:life*(.7+Math.random()*.4),size:size*(.6+Math.random()*.8),col,drag:.5});}}
function addNum(x,y,v,c){if(nums.length>70)nums.shift();nums.push({x:x+(Math.random()-.5)*12,y,v,c,t:0,vx:(Math.random()-.5)*46,vy:c>=2?-70:-95});}
const SRC={scooter:'120,240,255',selfie:'255,240,200',handle:'225,235,245',alarm:'255,214,90',card:'90,255,160',battery:'120,220,255',coffee:'214,150,96',hotpack:'255,170,80',umbrella:'200,225,255',backpack:'150,200,255',anc:'90,255,200',shout:'255,226,120',train:'255,226,120'};
function consume(S){
  if(!FX)buildFx();
  const p=S.p,E=S.ev;
  for(let i=0;i<E.length;i++){const e=E[i];
    switch(e.k){
      case 'num':addNum(e.x,e.y,Math.round(e.v),e.crit?1:0);if(e.crit)flare(e.x,e.y+8,22,'255,214,90',.2);break;
      case 'hit':{const c=SRC[e.src]||'255,255,255',a=Math.atan2(e.y-p.y,e.x-p.x);
        flare(e.x,e.y-8,e.src==='backpack'||e.src==='umbrella'?16:10,c,.14);sparks(e.x,e.y-8,3,230,c,.22,2,a,1.3);if(Math.random()<.4)ringFx(e.x,e.y-8,16,c,.16,3);
        if(e.src==='card')P({k:'tag',x:e.x,y:e.y-8,life:.26,size:19,col:c,rot:Math.PI/4,vr:0});break;}
      case 'kill':{const c=SRC[e.src]||'255,255,255';
        if(e.boss){flare(e.x,e.y,150,'255,236,170',.6);light(e.x,e.y,260,'255,220,140',.7);for(let k=0;k<3;k++)ringFx(e.x,e.y,150+k*90,'255,215,104',.5+k*.2,9);
          sparks(e.x,e.y,60,560,'255,226,140',.9,3);shards(e.x,e.y,22,260,'255,255,255',1,6);puff(e.x,e.y,12,120,'235,230,220',1,34);
          for(let k=0;k<26;k++){const a=Math.random()*TAU,s=120+Math.random()*320;P({k:'star',x:e.x,y:e.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.7+Math.random()*.5,size:9+Math.random()*8,col:'255,215,104',drag:.12});}
          flash=Math.max(flash,.6);stopT=Math.max(stopT,.14);zoomKick=Math.max(zoomKick,.08);}
        else{if(corpses.length>90)corpses.shift();let vx=e.vx,vy=e.vy;const m=Math.hypot(vx,vy);
          if(m<140){const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;vx=dx/d*190;vy=dy/d*190;}
          const tr=e.src==='train';
          corpses.push({type:e.type,v:e.seed%SPR[e.type].nv,sc:e.sc||1,dir:vx>=0?-1:1,x:e.x,y:e.y,vx,vy,t:0,life:tr?.7:.44,up:tr?70:24,vr:(Math.random()<.5?-1:1)*(7+Math.random()*8)});
          puff(e.x,e.y+4,2,40,'236,232,222',.38,13);ringFx(e.x,e.y-6,e.elite?70:24,'255,255,255',e.elite?.34:.2,e.elite?6:3);sparks(e.x,e.y-6,3,220,c,.24,2.2,Math.atan2(vy,vx),1.5);
          if(e.elite){flare(e.x,e.y-8,70,'255,214,90',.36);light(e.x,e.y,130,'255,200,110',.4);sparks(e.x,e.y-8,18,340,'255,214,90',.5,2.8);for(let k=0;k<8;k++){const a=Math.random()*TAU,s=80+Math.random()*160;P({k:'star',x:e.x,y:e.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.6,size:9,col:'255,215,104',drag:.1});}stopT=Math.max(stopT,.05);}
          if(tr)shards(e.x,e.y,2,200,'255,240,180',.5,4);}
        break;}
      case 'pick':if(time-lastPick>.04){lastPick=time;P({k:'star',x:p.x+(Math.random()-.5)*16,y:p.y-16-Math.random()*10,vy:-50,life:.3,size:e.v>=3?11:7,col:'255,215,104',drag:.2});}break;
      case 'heal':healFlash=.5;addNum(p.x,p.y-34,'+'+Math.round(e.v),2);ringFx(p.x,p.y,46,'110,255,170',.45,5);light(p.x,p.y-10,80,'90,255,150',.5);
        for(let k=0;k<12;k++){const a=k/12*TAU;P({k:'star',x:p.x+Math.cos(a)*20,y:p.y+Math.sin(a)*9,vx:Math.cos(a)*18,vy:-70-Math.random()*50,life:.7,size:8,col:'110,255,170',drag:.3});}break;
      case 'hurt':hurtFlash=.55;addNum(p.x,p.y-34,'-'+Math.round(e.v),3);flare(p.x,p.y-12,44,'255,90,96',.2);ringFx(p.x,p.y-8,40,'255,90,96',.26,5);sparks(p.x,p.y-12,10,260,'255,110,116',.34,2.6);stopT=Math.max(stopT,.035);break;
      case 'stab':pk.t=.14;pk.x=Math.cos(e.a)*(e.n===2?11:6);pk.y=Math.sin(e.a)*(e.n===2?8:4);fxs.push({k:'stab',a:e.a,range:e.range,n:e.n,quad:e.quad,t:0,dur:e.n===2?.5:.2});break;
      case 'swipe':pk.t=.16;pk.x=Math.cos(e.a)*7;pk.y=Math.sin(e.a)*5;fxs.push({k:'swipe',a:e.a,range:e.range,half:e.half,both:e.both,evo:e.evo,quad:e.quad,t:0,dur:e.evo?.62:.46});
        if(e.evo){for(let k=0;k<14;k++){const a=Math.random()*TAU;P({k:'spark',x:p.x+Math.cos(a)*e.range*.8,y:p.y+Math.sin(a)*e.range*.8,vx:-Math.sin(a)*300+Math.cos(a)*80,vy:Math.cos(a)*300+Math.sin(a)*80,life:.35,size:2.4,col:'200,225,255'});}zoomKick=Math.max(zoomKick,.015);}break;
      case 'lash':pk.t=.18;pk.x=Math.cos(e.as[0])*8;pk.y=Math.sin(e.as[0])*6;fxs.push({k:'lash',as:e.as,len:e.len,w:e.w,evo:e.evo,t:0,dur:e.evo?.42:.36,cr:false});break;
      case 'lashspin':pk.t=.3;pk.x=0;pk.y=-6;fxs.push({k:'lashspin',r:e.r,w:e.w,gent:e.gent,t:0,dur:.5,rot:Math.atan2(p.fy,p.fx)-.6,cr:false});break;
      case 'deflect':sparks(e.x,e.y,6,260,'210,255,230',.25,2.2);ringFx(e.x,e.y,16,'255,255,255',.16,3);break;
      case 'transfer':ringFx(e.x,e.y,22,'255,205,70',.22,4);flare(e.x,e.y,24,'255,240,190',.12);break;
      case 'laptop':light(p.x,p.y-20,90,e.evo?'180,130,255':'110,180,255',.3);pk.t=.14;pk.x=0;pk.y=3;break;
      case 'nudge':{const c=e.evo?'255,110,60':'255,180,80';if(e.bag)fxs.push({k:'bag',x:e.x+Math.cos(e.a)*14,y:e.y+Math.sin(e.a)*14,a:e.a,t:0,dur:.22});pk.t=.12;pk.x=Math.cos(e.a)*5;pk.y=Math.sin(e.a)*4;sparks(e.x,e.y-8,5,240,c,.2,2.2,e.a,1.1);ringFx(e.x,e.y-8,e.evo?24:17,c,.16,3);flare(e.x,e.y-8,e.evo?26:18,'255,240,210',.12);break;}
      case 'bump':{pk.t=.22;pk.x=Math.cos(e.a)*11;pk.y=Math.sin(e.a)*8;const c=e.evo?'255,110,60':'255,180,80',dir=p.fx>=0?1:-1;
        fxs.push({k:'bump',r:e.r,evo:e.evo,a:e.a,t:0,dur:e.evo?.46:.38,rot:Math.random()*TAU});
        for(let k=1;k<=3;k++)ghosts.push({x:p.x-Math.cos(e.a)*15*k,y:p.y-Math.sin(e.a)*12*k,t:.04*k,f:1,dir});
        sparks(p.x,p.y-6,e.evo?22:14,e.r*3.2,c,.32,2.6);light(p.x,p.y-6,e.r*.9,c,.28);puff(p.x,p.y+8,6,e.r*1.2,'235,228,215',.5,20);break;}
      case 'fcast':{if(e.t==='freepass')break;const D={remote:.7,bulldozer:.6,gentleman:.6,routine:.9,freepass:.8}[e.t]||.6;fxs.push({k:'fcast',ty:e.t,r:e.r,as:e.as,len:e.len,w:e.w,x:e.x,y:e.y,t:0,dur:D,rot:Math.random()*TAU});if(e.x===undefined){pk.t=.2;pk.x=0;pk.y=-7;zoomKick=Math.max(zoomKick,.03);}
        if(e.t==='bulldozer'){bagFling=.55;puff(p.x,p.y+6,16,e.r*1.9,'230,220,200',.8,34);shards(p.x,p.y,12,300,'150,140,125',.8,6);flare(p.x,p.y,e.r*.9,'255,190,90',.3);}
        else if(e.t==='gentleman'){for(let k=0;k<14;k++){const a=Math.random()*TAU;P({k:'star',x:p.x+Math.cos(a)*e.r*.6,y:p.y+Math.sin(a)*e.r*.5,vx:Math.cos(a)*90,vy:Math.sin(a)*90-30,life:.7,size:16,col:'255,215,110',vr:4,drag:.5});}}
        else if(e.t==='routine'){const fx0=e.x===undefined?p.x:e.x,fy0=e.y===undefined?p.y:e.y;flare(fx0,fy0-10,150,'255,220,120',.35);for(let k=0;k<6;k++)P({k:'smoke',x:fx0+(Math.random()-.5)*40,y:fy0-10,vx:(Math.random()-.5)*50,vy:-70-Math.random()*50,life:.9,size:20,col:'250,240,225',drag:.5});}
        else if(e.t==='freepass'){ringFx(p.x,p.y,90,'255,205,70',.3,6);}
        else if(e.t==='remote'){light(p.x,p.y-10,110,'150,190,255',.3);}
        break;}
      case 'beam':pk.t=.2;pk.x=-Math.cos(e.as[0])*6;pk.y=-Math.sin(e.as[0])*4;fxs.push({k:'beam',as:e.as,len:e.len,w:e.w,evo:e.evo,t:0,dur:e.evo?.36:.28});light(p.x,p.y,120,e.evo?'180,130,255':'110,180,255',.3);break;
      case 'bossin':fxs.push({k:'bossin',x:e.x,y:e.y,t:0,dur:1.3});break;
      case 'bossland':flare(e.x,e.y-20,220,'255,90,90',.5);for(let k=0;k<3;k++)ringFx(e.x,e.y,120+k*80,k%2?'255,255,255':'255,80,90',.45+k*.15,10-k*2);puff(e.x,e.y,12,150,'235,225,215',.9,36);sparks(e.x,e.y,26,460,'255,200,150',.55,3);zoomKick=Math.max(zoomKick,.05);break;
      case 'fuse':fxs.push({k:'level',t:0,dur:.9});for(let k=0;k<4;k++)ringFx(p.x,p.y,90+k*70,['255,90,120','255,200,60','90,220,160','120,150,255'][k],.6+k*.15,9);flare(p.x,p.y-10,260,'255,255,255',.5);break;
      case 'say':says[e.id]={txt:e.txt,until:time+2.8,at:time};break;
      case 'ring':pk.t=.18;pk.x=0;pk.y=-6;fxs.push({k:'ring',r:e.r,evo:e.evo,t:0,dur:e.evo?.55:.45});light(p.x,p.y,e.r*.8,e.evo?'255,130,70':'70,255,190',.25);if(e.evo)zoomKick=Math.max(zoomKick,.02);break;
      case 'shout':fxs.push({k:'shout',r:e.r,evo:e.evo,t:0,dur:.95});flash=Math.max(flash,e.evo?.45:.3);zoomKick=Math.max(zoomKick,e.evo?.06:.04);stopT=Math.max(stopT,e.evo?.08:.05);speedT=1;
        for(let k=0;k<(e.evo?10:6);k++){const a=Math.random()*TAU,s=260+Math.random()*200;P({k:'text',x:p.x,y:p.y-30,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.6,size:20+Math.random()*10,col:'255,214,90',txt:'!',drag:.03,vr:(Math.random()-.5)*8});}break;
      case 'zap':{const c=e.evo?'255,224,130':'120,220,255';fxs.push({k:'zap',pts:e.pts,evo:e.evo,t:0,dur:e.evo?.24:.18,seed:(Math.random()*1e6)|0});if(e.gold)for(let k=0;k<e.pts.length;k+=2){ringFx(e.pts[k],e.pts[k+1],26,'255,214,90',.22,4);flare(e.pts[k],e.pts[k+1],30,'255,245,190',.16);sparks(e.pts[k],e.pts[k+1],4,260,'255,225,120',.25,2.2);}
        for(let k=2;k<e.pts.length;k+=2){flare(e.pts[k],e.pts[k+1],e.evo?34:24,c,.2);light(e.pts[k],e.pts[k+1],e.evo?70:50,c,.22);sparks(e.pts[k],e.pts[k+1],3,210,c,.24,2);}break;}
      case 'splash':{const c=e.evo?'70,40,90':'150,96,54';ringFx(e.x,e.y,e.r*1.15,e.evo?'190,120,255':'255,210,160',.34,5);puff(e.x,e.y-6,5,50,'255,255,255',.9,22);
        for(let k=0;k<16;k++){const a=k/16*TAU+Math.random()*.3,s=70+Math.random()*90;P({k:'drop',x:e.x+Math.cos(a)*e.r*.35,y:e.y+Math.sin(a)*e.r*.3,vx:Math.cos(a)*s,vy:Math.sin(a)*s*.6-150-Math.random()*90,g:620,life:.5+Math.random()*.15,size:3+Math.random()*2.4,col:c,drag:.6});}break;}
      case 'dash':puff(e.x,e.y+8,5,70,'236,232,222',.4,16);ringFx(e.x,e.y+6,34,'255,255,255',.22,4);speedT=Math.max(speedT,.7);fxs.push({k:'dash',x:e.x,y:e.y,t:0,dur:.3});break;
      case 'level':fxs.push({k:'level',t:0,dur:.9});light(p.x,p.y-20,170,'255,220,120',.6);for(let k=0;k<26;k++){const a=Math.random()*TAU,d=Math.random()*26;P({k:'star',x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d*.5,vx:Math.cos(a)*40,vy:-120-Math.random()*200,life:.7+Math.random()*.4,size:7+Math.random()*7,col:'255,215,104',drag:.25});}flash=Math.max(flash,.2);zoomKick=Math.max(zoomKick,.045);break;
      case 'maceslam':fxs.push({k:'crack',x:e.x,y:e.y,r:e.r,t:0,dur:1.3,rot:Math.random()*TAU});ringFx(e.x,e.y,e.r*1.05,'255,150,70',.38,9);ringFx(e.x,e.y,e.r*.6,'255,240,210',.26,5);puff(e.x,e.y+6,14,e.r*1.7,'225,215,200',.8,30);shards(e.x,e.y,12,300,'150,140,125',.8,6);flare(e.x,e.y,e.r*.4,'255,190,110',.2);zoomKick=Math.max(zoomKick,.035);break;
      case 'macedash':{const bx=-Math.cos(e.a),by=-Math.sin(e.a);ringFx(p.x,p.y+6,58,'255,190,110',.26,5);for(let i=0;i<9;i++){const sp=(Math.random()-.5)*1.5,v=120+Math.random()*160;P({k:'smoke',x:p.x+bx*8,y:p.y+10,vx:(bx*Math.cos(sp)-by*Math.sin(sp))*v,vy:(by*Math.cos(sp)+bx*Math.sin(sp))*v*.7-20,life:.5+Math.random()*.3,size:16+Math.random()*12,col:'225,215,200',drag:2.4});}
        sparks(p.x,p.y+8,8,260,'255,200,120',.3,2.4);pk.t=.2;pk.x=Math.cos(e.a)*9;pk.y=Math.sin(e.a)*7;break;}
      case 'macehit':flare(e.x,e.y,30,'255,200,130',.14);shards(e.x,e.y,3,200,'255,170,90',.4,4);break;
      case 'parry':flare(e.x,e.y,26,'255,236,170',.16);ringFx(e.x,e.y,20,'255,220,140',.2,3);sparks(e.x,e.y,6,220,'255,230,160',.3,2.2);break;
      case 'alarmboom':flare(e.x,e.y,e.r*1.3,'255,226,120',.28);light(e.x,e.y,e.r*1.5,'255,210,90',.3);ringFx(e.x,e.y,e.r*1.1,'255,214,90',.36,7);ringFx(e.x,e.y,e.r*.6,'255,255,255',.24,4);sparks(e.x,e.y,14,300,'255,226,120',.36,2.6);
        for(let k=0;k<4;k++){const a=-Math.PI/2+(k-1.5)*.5;P({k:'text',x:e.x,y:e.y-14,vx:Math.cos(a)*90,vy:Math.sin(a)*90,life:.5,size:17,col:'255,214,90',txt:'♪',rot:(k-1.5)*.3,vr:0,drag:.1});}
        P({k:'text',x:e.x,y:e.y-e.r*.5,vy:-26,life:.55,size:e.evo?22:18,col:'229,72,77',txt:'따르릉!',rot:-.12,vr:0,drag:.3,pop:1});break;
      case 'zone':wipeT=.6;parts.length=fxs.length=corpses.length=ghosts.length=nums.length=0;cam.init=false;break;
      case 'trainhit':flare(e.x,e.y,130,'255,236,170',.4);ringFx(e.x,e.y,120,'255,226,120',.4,9);sparks(e.x,e.y,34,520,'255,226,120',.55,3);shards(e.x,e.y,10,240,'255,255,255',.7,5);flash=Math.max(flash,.5);stopT=Math.max(stopT,.1);zoomKick=Math.max(zoomKick,.05);break;
      case 'crash':ringFx(e.x,e.y,90,'255,200,120',.4,7);puff(e.x,e.y,8,90,'230,220,205',.8,30);shards(e.x,e.y,10,240,'224,80,140',.8,6);break;
      case 'boom':if(e.kind==='stamp'){decals.push({x:e.x,y:e.y,r:e.r,kind:'stamp',t:0,life:2.2,rot:(Math.random()-.5)*.5});for(let k=0;k<5;k++)P({k:'paper',x:e.x+(Math.random()-.5)*e.r,y:e.y-10,vx:(Math.random()-.5)*300,vy:-140-Math.random()*140,g:420,life:1,size:16,col:'251,250,245',drag:.5});ringFx(e.x,e.y,e.r*1.2,'230,60,66',.35,8);puff(e.x,e.y,5,70,'235,225,215',.6,24);break;}
        if(e.kind==='door'){decals.push({x:e.x,y:e.y,r:e.r,kind:'crack',t:0,life:1.6,rot:Math.random()*TAU});sparks(e.x,e.y,22,420,'255,230,150',.4,3);ringFx(e.x,e.y,e.r*1.25,'255,120,110',.35,9);puff(e.x,e.y,6,80,'225,230,232',.7,28);flare(e.x,e.y,e.r*1.3,'255,150,130',.22);break;}
        if(e.kind==='bass'){for(let k=0;k<3;k++)ringFx(e.x,e.y,e.r*(1+k*.45),k%2?'225,50,200':'255,120,215',.35+k*.12,8-k*2);flare(e.x,e.y,e.r*1.4,'255,90,190',.25);sparks(e.x,e.y,14,300,'255,180,230',.4,2.6);break;}
        if(e.kind==='nag'){for(let k=0;k<7;k++){const a=Math.random()*TAU;P({k:'text',x:e.x+Math.cos(a)*e.r*.4,y:e.y+Math.sin(a)*e.r*.3,vx:Math.cos(a)*120,vy:-90-Math.random()*90,life:.9,size:18,col:'255,170,60',txt:['!','?!','...','말이야'][k%4],drag:.4});}ringFx(e.x,e.y,e.r*1.2,'255,160,60',.35,8);flare(e.x,e.y,e.r*1.2,'255,170,80',.22);break;}
        if(e.kind==='meet'){for(let k=0;k<6;k++)P({k:'paper',x:e.x+(Math.random()-.5)*e.r,y:e.y-10,vx:(Math.random()-.5)*340,vy:-160-Math.random()*150,g:420,life:1.1,size:18,col:'251,250,245',drag:.5});shards(e.x,e.y,8,220,'185,134,84',.8,6);ringFx(e.x,e.y,e.r*1.2,'255,110,100',.35,8);break;}
        flare(e.x,e.y,e.r*1.5,'255,120,120',.3);light(e.x,e.y,e.r*1.6,'255,80,80',.35);ringFx(e.x,e.y,e.r*1.3,'255,110,116',.4,8);sparks(e.x,e.y,16,330,'255,130,130',.4,2.8);shards(e.x,e.y,8,190,'255,230,230',.7,5);puff(e.x,e.y,5,60,'240,220,220',.7,26);
        for(let k=0;k<5;k++)P({k:'paper',x:e.x+(Math.random()-.5)*e.r,y:e.y+(Math.random()-.5)*e.r,vx:(Math.random()-.5)*140,vy:-90-Math.random()*90,g:170,life:.9,size:7,col:'255,255,255',drag:.4});
        P({k:'text',x:e.x,y:e.y,vy:-20,life:.75,size:30,col:'229,72,77',txt:e.txt||'쿵',rot:-.2,vr:0,drag:.3,pop:1});break;
      case 'page':for(let k=0;k<3;k++)P({k:'paper',x:e.x+(Math.random()-.5)*40,y:e.y-20,vx:(Math.random()-.5)*380,vy:-160-Math.random()*160,g:420,life:1.3,size:24,col:'251,250,245',drag:.5});sparks(e.x,e.y,28,380,'255,255,255',.6,3);ringFx(e.x,e.y,170,'255,255,255',.5,8);flare(e.x,e.y,120,'255,255,255',.35);flash=Math.max(flash,.4);stopT=Math.max(stopT,.06);break;
    }}
  E.length=0;
}
function stepFx(dt,S){if(bagFling>0)bagFling=Math.max(0,bagFling-dt);
  for(let i=decals.length-1;i>=0;i--){decals[i].t+=dt;if(decals[i].t>=decals[i].life)decals.splice(i,1);}if(pk.t>0)pk.t-=dt;
  for(let i=parts.length-1;i>=0;i--){const q=parts[i];q.t+=dt;if(q.t>=q.life){parts.splice(i,1);continue;}q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=q.g*dt;if(q.drag<1){const dr=Math.pow(q.drag,dt);q.vx*=dr;if(!q.g)q.vy*=dr;}q.rot+=q.vr*dt;}
  for(let i=nums.length-1;i>=0;i--){const n=nums[i];n.t+=dt;n.x+=n.vx*dt;n.y+=n.vy*dt;n.vy+=190*dt;n.vx*=Math.pow(.1,dt);if(n.t>.8)nums.splice(i,1);}
  for(let i=fxs.length-1;i>=0;i--){const f=fxs[i];f.t+=dt;if(f.t>=f.dur)fxs.splice(i,1);}
  for(let i=corpses.length-1;i>=0;i--){const c=corpses[i];c.t+=dt;if(c.t>=c.life){puff(c.x,c.y,1,20,'236,232,222',.3,12);corpses.splice(i,1);continue;}c.x+=c.vx*dt;c.y+=c.vy*dt;c.vx*=Math.pow(.05,dt);c.vy*=Math.pow(.05,dt);}
  for(let i=ghosts.length-1;i>=0;i--){ghosts[i].t+=dt;if(ghosts[i].t>.3)ghosts.splice(i,1);}
  if(dt>0){
    const p=S.p,M=S.M;
    if(p.dashT>0&&ghosts.length<12)ghosts.push({x:p.x,y:p.y,f:Math.floor(p.anim*12)%4,dir:p.fx>=0?1:-1,t:0});
    for(const s of S.shots){const tr=s.tr||(s.tr=[]);tr.push(s.x,s.y);if(tr.length>16)tr.splice(0,2);}
    for(const s of S.rangs){const tr=s.tr||(s.tr=[]);tr.push(s.x,s.y);if(tr.length>20)tr.splice(0,2);}
    for(const r of S.riders)if(Math.random()<dt*50)P({k:'smoke',x:r.x-r.dx*20+(Math.random()-.5)*r.w,y:r.y-r.dy*20+(Math.random()-.5)*r.w,vx:-r.dx*60,vy:-r.dy*60,life:.4,size:11,col:'236,232,222',drag:.2});
    for(const b of S.lobs)if(b.kind!=='alarm'&&Math.random()<dt*40){const q=b.t/b.dur;P({k:'drop',x:b.x0+(b.x1-b.x0)*q,y:b.y0+(b.y1-b.y0)*q-Math.sin(q*Math.PI)*60,vx:(Math.random()-.5)*30,vy:20,g:300,life:.3,size:2.2,col:b.evo?'70,40,90':'150,96,54',drag:.6});}
    for(const u of S.puddles){if(!u.gum&&Math.random()<dt*6){const a=Math.random()*TAU,d=Math.random()*u.r*.75;P({k:'smoke',x:u.x+Math.cos(a)*d,y:u.y+Math.sin(a)*d*.8,vx:(Math.random()-.5)*14,vy:-30-Math.random()*22,life:1+Math.random()*.6,size:13+Math.random()*9,col:u.evo?'200,170,255':'255,255,255',drag:.5,soft:1});}}
    let l=wl(S,'hotpack');
    if(l){const r=WEAPONS.hotpack.stat(l).r*M.area;if(Math.random()<dt*(l>=EVO?34:18)){const a=Math.random()*TAU,d=Math.sqrt(Math.random())*r;P({k:'spark',x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d,vx:(Math.random()-.5)*20,vy:-60-Math.random()*70,life:.55,size:2,col:l>=EVO?'255,120,70':'255,180,90',drag:.4});}}
    l=wl(S,'backpack');
    if(l>=EVO&&Math.random()<dt*30){const s=WEAPONS.backpack.stat(l),a=S.orbA+((Math.random()*s.n)|0)*TAU/s.n,rad=s.radius*M.area;P({k:'spark',x:p.x+Math.cos(a)*rad,y:p.y+Math.sin(a)*rad,vx:(Math.random()-.5)*60,vy:-40-Math.random()*50,life:.4,size:2.2,col:'255,150,70',drag:.3});}
    if(S.train&&S.train.on&&S.train.kind!=='bus'){const T=S.train;for(let k=0;k<4;k++)P({k:'spark',x:T.x-T.dir*Math.random()*TRAIN_LEN,y:T.y+(Math.random()<.5?-44:44),vx:-T.dir*(200+Math.random()*300),vy:(Math.random()-.5)*140,life:.3,size:2.6,col:'255,226,120'});
      if(Math.random()<dt*30)puff(T.x-T.dir*Math.random()*TRAIN_LEN,T.y+(Math.random()<.5?-58:58),1,30,'236,232,222',.5,20);}
    for(const e of S.enemies)if(e.elite&&!e.dead&&Math.random()<dt*9)P({k:'flame',x:e.x+(Math.random()-.5)*e.r*1.6,y:e.y+e.r*.7,vy:-46-Math.random()*30,life:.5,size:15+Math.random()*8,col:'255,90,110',drag:.6,vr:0,rot:0});
  }
  const rdt=dt||.016;
  shakeAmt*=Math.pow(.015,rdt);flash=Math.max(0,flash-rdt*2.2);hurtFlash=Math.max(0,hurtFlash-rdt*1.6);healFlash=Math.max(0,healFlash-rdt*1.6);
}
function drawParts(pass){
  for(const q of parts){const a=1-q.t/q.life,k=q.k;
    if(pass===0){
      if(k==='smoke'){ctx.globalAlpha=(q.soft?.2:.42)*a;const s=q.size*(1.9-a);if(q.col!=='255,255,255'&&q.soft){ctx.globalCompositeOperation='lighter';ctx.drawImage(glow(q.col),q.x-s,q.y-s,s*2,s*2);ctx.globalCompositeOperation='source-over';}else ctx.drawImage(FX.puff,q.x-s,q.y-s,s*2,s*2);}
      else if(k==='dot'){ctx.globalAlpha=a;ctx.fillStyle=rgba(q.col,1);ctx.beginPath();ctx.arc(q.x,q.y,q.size*(.5+a*.5),0,TAU);ctx.fill();}
      else if(k==='drop'){ctx.globalAlpha=Math.min(1,a*3);ctx.fillStyle=rgba(q.col,1);ctx.beginPath();ctx.arc(q.x,q.y,q.size,0,TAU);ctx.fill();ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.arc(q.x-q.size*.3,q.y-q.size*.3,q.size*.35,0,TAU);ctx.fill();}
      else if(k==='paper'){ctx.globalAlpha=Math.min(1,a*2);ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.rot);ctx.scale(1,Math.cos(q.rot*1.7)*.6+.4);ctx.fillStyle=rgba(q.col,1);ctx.fillRect(-q.size*.6,-q.size*.8,q.size*1.2,q.size*1.6);ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=1;ctx.strokeRect(-q.size*.6,-q.size*.8,q.size*1.2,q.size*1.6);ctx.restore();}
      else if(k==='shard'){ctx.globalAlpha=Math.min(1,a*2.5);ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.rot);ctx.fillStyle=rgba(q.col,1);ctx.beginPath();ctx.moveTo(0,-q.size);ctx.lineTo(q.size*.7,q.size*.6);ctx.lineTo(-q.size*.6,q.size*.4);ctx.closePath();ctx.fill();ctx.restore();}
      else if(k==='text'){ctx.globalAlpha=Math.min(1,a*2.2);ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.rot);const s=q.pop?1+(1-a)*.35:1;ctx.scale(s,s);ctx.font=q.size+'px '+FD;ctx.textAlign='center';ctx.lineJoin='round';ctx.lineWidth=5;ctx.strokeStyle=q.pop?'#fff':INK;ctx.strokeText(q.txt,0,q.size*.3);ctx.fillStyle=rgba(q.col,1);ctx.fillText(q.txt,0,q.size*.3);ctx.restore();}
    }else{
      if(k==='spark'){const sp=Math.hypot(q.vx,q.vy),len=Math.max(3,sp*.045),ux=sp?q.vx/sp:1,uy=sp?q.vy/sp:0;const w=q.size*(.5+a*.7),L=len*1.5,nx=-uy*w,ny=ux*w;ctx.globalAlpha=a;ctx.fillStyle=rgba(q.col,1);ctx.beginPath();ctx.moveTo(q.x+nx,q.y+ny);ctx.lineTo(q.x+ux*w*1.4,q.y+uy*w*1.4);ctx.lineTo(q.x-nx,q.y-ny);ctx.lineTo(q.x-ux*L,q.y-uy*L);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.arc(q.x,q.y,w*.55,0,TAU);ctx.fill();}
      else if(k==='glow'){ctx.globalAlpha=a*a*.8;const s=q.size*(1.15-a*.15);ctx.drawImage(glow(q.col),q.x-s,q.y-s,s*2,s*2);}
      else if(k==='ring'){const r=q.size*(1-a*a*a);ctx.globalAlpha=a*.35;ctx.strokeStyle=rgba(q.col,1);ctx.lineWidth=q.w*2.6;ctx.beginPath();ctx.arc(q.x,q.y,r,0,TAU);ctx.stroke();ctx.globalAlpha=a;ctx.lineWidth=q.w*a+1;ctx.beginPath();ctx.arc(q.x,q.y,r,0,TAU);ctx.stroke();}
      else if(k==='star'){const s=q.size*(.35+a*.65);ctx.globalAlpha=Math.min(1,a*1.6);ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.rot);ctx.drawImage(glow(q.col),-s*.8,-s*.8,s*1.6,s*1.6);ctx.drawImage(FX.flare,-s,-s,s*2,s*2);ctx.restore();}
      else if(k==='flame'){const s=q.size*(.4+a*.6);ctx.globalAlpha=a*.85;ctx.drawImage(FX.flame,q.x-s*.5,q.y-s*1.4,s,s*1.5);}
      else if(k==='tag'){const s=q.size*(1-a*a);ctx.globalAlpha=a;ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.rot);ctx.strokeStyle=rgba(q.col,1);ctx.lineWidth=3*a+1;rr(ctx,-s,-s,s*2,s*2,s*.3);ctx.stroke();ctx.restore();}
    }
  }
  ctx.globalAlpha=1;
}

/* =============================== world =============================== */
function drawPlatform(S,cx,cy,vw,vh){
  const x0=cx-vw/2,x1=cx+vw/2,y0=cy-vh/2,y1=cy+vh/2,st={name:ZONES[S.zone].station||''},ft=floorTile(S.zone);
  for(let x=Math.floor(x0/512)*512;x<x1;x+=512)for(let y=Math.floor(y0/512)*512;y<y1;y+=512)ctx.drawImage(ft,x,y,512.6,512.6);
  // light pools
  for(let x=Math.floor((x0-130)/340)*340;x<x1+130;x+=340)for(let y=Math.floor((y0-130)/300)*300;y<y1+130;y+=300)ctx.drawImage(ST.light,x+60,y+40,240,240);
  // litter
  for(let gx=Math.floor(x0/170);gx<=Math.floor(x1/170);gx++)for(let gy=Math.floor(y0/170);gy<=Math.floor(y1/170);gy++){
    const h=hash(gx,gy);if(h%100>=30)continue;const lx=gx*170+(h>>>8)%130+20,ly=gy*170+(h>>>16)%130+20;
    const dl=Math.abs(ly-Math.round(ly/LANE_GAP)*LANE_GAP);if(dl<115)continue;
    ctx.drawImage(ST.litter[(h>>>3)%ST.litter.length],lx-18,ly-18,36,36);}
  // platforms: guide line, names, door marks
  ctx.textBaseline='alphabetic';
  for(let k=Math.floor((y0-LANE_GAP)/LANE_GAP);k<=Math.floor(y1/LANE_GAP);k++){
    const my=k*LANE_GAP+LANE_GAP/2;
    if(my>y0-20&&my<y1+20){ctx.fillStyle='rgba(0,168,77,.78)';ctx.fillRect(x0,my-5,vw,10);ctx.fillStyle='rgba(255,255,255,.5)';ctx.fillRect(x0,my-8,vw,1.5);ctx.fillRect(x0,my+6.5,vw,1.5);}
    for(let x=Math.floor((x0-500)/1100)*1100;x<x1+200;x+=1100){
      if(my+60<y1+90&&my+170>y0){ctx.fillStyle='rgba(27,33,36,.16)';ctx.font='92px '+FD;ctx.textAlign='left';ctx.fillText(st.name+'역',x+90,my+150);}
      if(my-70>y0-70&&my-170<y1){ctx.fillStyle='rgba(27,33,36,.13)';ctx.beginPath();const ax=x+640,ay=my-120;ctx.moveTo(ax+90,ay);ctx.lineTo(ax+10,ay-42);ctx.lineTo(ax+10,ay-15);ctx.lineTo(ax-80,ay-15);ctx.lineTo(ax-80,ay+15);ctx.lineTo(ax+10,ay+15);ctx.lineTo(ax+10,ay+42);ctx.closePath();ctx.fill();}}
    for(const ey of[k*LANE_GAP+122,(k+1)*LANE_GAP-122]){if(ey<y0-20||ey>y1+20)continue;const up=ey<my;
      ctx.font='700 12px '+FB;ctx.textAlign='center';
      for(let x=Math.floor(x0/216)*216;x<x1+216;x+=216){const n=((Math.floor(x/216)%40)+40)%40;ctx.fillStyle='rgba(27,33,36,.3)';
        ctx.fillText((1+Math.floor(n/4))+'-'+(1+n%4),x+108,ey+(up?16:-8));
        for(const o of[-26,26]){ctx.beginPath();ctx.moveTo(x+108+o,ey+(up?-14:14));ctx.lineTo(x+108+o-7,ey+(up?-2:2));ctx.lineTo(x+108+o+7,ey+(up?-2:2));ctx.closePath();ctx.fill();}}}
  }
  // track lanes
  const T=S.train;
  for(let k=Math.floor((y0-110)/LANE_GAP);k<=Math.ceil((y1+110)/LANE_GAP);k++){
    const ly=k*LANE_GAP;if(ly+100<y0||ly-100>y1)continue;
    for(let x=Math.floor(x0/256)*256;x<x1;x+=256)ctx.drawImage(ST.track,x,ly-76,256.5,152);
    for(let x=Math.floor(x0/32)*32;x<x1;x+=32){ctx.drawImage(ST.tact,x,ly-98,32.3,22);ctx.drawImage(ST.tact,x,ly+76,32.3,22);}
    const warn=T&&T.y===ly&&!T.on,live=T&&T.y===ly;
    const blink=warn?(Math.sin(time*22)>0?1:.25):0;
    ctx.fillStyle=warn?'rgba(255,60,60,'+blink+')':live?'rgba(255,60,60,.9)':'rgba(90,255,150,.55)';
    for(let x=Math.floor(x0/48)*48;x<x1;x+=48){ctx.fillRect(x+20,ly-61,8,3);ctx.fillRect(x+20,ly+58,8,3);}
    if(warn){
      ctx.fillStyle='rgba(229,40,45,'+(.16+.12*Math.sin(time*18))+')';ctx.fillRect(x0,ly-56,vw,112);
      ctx.fillStyle='rgba(255,220,90,.75)';const off=(time*520*T.dir)%140;
      for(let x=Math.floor(x0/140)*140-140;x<x1+140;x+=140){const ax=x+off;ctx.beginPath();ctx.moveTo(ax+T.dir*26,ly);ctx.lineTo(ax-T.dir*4,ly-30);ctx.lineTo(ax-T.dir*20,ly-30);ctx.lineTo(ax+T.dir*10,ly);ctx.lineTo(ax-T.dir*20,ly+30);ctx.lineTo(ax-T.dir*4,ly+30);ctx.closePath();ctx.fill();}
    }
  }
}
/* ---- per-place set pieces ---- */
let WS=null,trainV=900,trainScroll=0,platA=0,doorA=0;
function buildWorld(){
  WS={};const rnd=srand(909);
  WS.road=mk(256,152,g=>{g.fillStyle='#3d4144';g.fillRect(0,0,256,152);
    for(let i=0;i<2200;i++){const v=44+rnd()*50|0;g.fillStyle='rgb('+v+','+v+','+(v+4)+')';g.fillRect(rnd()*256,rnd()*152,1+rnd()*2,1+rnd()*1.6);}
    g.fillStyle='rgba(255,255,255,.8)';for(let x=0;x<256;x+=64)g.fillRect(x+10,74,38,4);g.fillStyle='rgba(255,255,255,.7)';g.fillRect(0,20,256,2.5);g.fillRect(0,129.5,256,2.5);
    for(const [y0,d] of[[0,1],[140,-1]]){g.fillStyle='#b9b5ab';g.fillRect(0,y0,256,12);g.fillStyle='#8a867d';g.fillRect(0,d>0?y0+9:y0,256,3);g.fillStyle='rgba(255,255,255,.3)';g.fillRect(0,d>0?y0:y0+10,256,2);for(let x=0;x<256;x+=42){g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x,y0,1.5,12);}
      const sh=g.createLinearGradient(0,d>0?12:140,0,d>0?24:128);sh.addColorStop(0,'rgba(0,0,0,.4)');sh.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=sh;g.fillRect(0,d>0?12:128,256,12);}
  },2);
  WS.bus=mk(256,92,g=>{g.translate(4,4);g.lineJoin='round';g.fillStyle='rgba(0,0,0,.35)';rr(g,-2,6,250,80,15);g.fill();
    const gr=g.createLinearGradient(0,0,0,82);gr.addColorStop(0,'#1c4a94');gr.addColorStop(.2,'#3b7fe0');gr.addColorStop(.5,'#2f6fd1');gr.addColorStop(.8,'#3b7fe0');gr.addColorStop(1,'#1c4a94');
    rr(g,0,0,246,82,13);g.fillStyle=gr;g.fill();g.strokeStyle=INK;g.lineWidth=2;g.stroke();
    g.fillStyle='rgba(15,22,28,.8)';g.fillRect(14,6,200,4);g.fillRect(14,72,200,4);g.fillStyle='#fff';g.fillRect(8,14,214,2.5);g.fillRect(8,65.5,214,2.5);
    g.fillStyle='#e9edee';rr(g,60,24,70,34,6);g.fill();g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1;g.stroke();for(let k=1;k<8;k++){g.beginPath();g.moveTo(60+k*8.75,27);g.lineTo(60+k*8.75,55);g.stroke();}
    g.fillStyle='#c9d0d3';rr(g,150,30,26,22,4);g.fill();g.stroke();rr(g,20,30,26,22,4);g.fill();g.stroke();
    g.fillStyle='#10171b';rr(g,222,9,18,64,8);g.fill();g.fillStyle='rgba(255,255,255,.2)';g.fillRect(226,14,3,54);
    g.fillStyle='#0a0d0f';rr(g,196,28,20,26,3);g.fill();g.fillStyle='#ffb300';g.font='9px '+FD;g.textAlign='center';g.save();g.translate(206,41);g.rotate(Math.PI/2);g.fillText('출근',0,3);g.restore();
    g.fillStyle='#fff3b0';g.beginPath();g.arc(243,12,3.6,0,TAU);g.arc(243,70,3.6,0,TAU);g.fill();g.fillStyle='#e5484d';g.fillRect(0,10,3,8);g.fillRect(0,64,3,8);},2);
  WS.gate=mk(82,48,g=>{g.translate(4,4);g.lineJoin='round';g.fillStyle='rgba(0,0,0,.3)';rr(g,1,6,74,38,7);g.fill();
    const gr=g.createLinearGradient(0,0,0,32);gr.addColorStop(0,'#eef1f1');gr.addColorStop(.5,'#c9cfd1');gr.addColorStop(1,'#a2abaf');rr(g,0,0,74,32,7);g.fillStyle=gr;g.fill();g.strokeStyle=INK;g.lineWidth=2;g.stroke();
    g.fillStyle='#7d878b';rr(g,6,6,62,20,4);g.fill();g.fillStyle='#ffc928';g.beginPath();g.arc(19,16,7,0,TAU);g.fill();g.strokeStyle=INK;g.lineWidth=1.2;g.stroke();g.strokeStyle='#fff';g.lineWidth=1.4;for(const rr2 of[2.5,4.6]){g.beginPath();g.arc(19,16,rr2,-.9,.9);g.stroke();}
    g.fillStyle='#0c1012';rr(g,32,10,18,12,2);g.fill();g.fillStyle='#35e07f';g.beginPath();g.moveTo(64,16);g.lineTo(56,10.5);g.lineTo(56,13.6);g.lineTo(53,13.6);g.lineTo(53,18.4);g.lineTo(56,18.4);g.lineTo(56,21.5);g.closePath();g.fill();
    g.fillStyle='#35e07f';g.font='700 7px sans-serif';g.textAlign='center';g.fillText('GO',41,18.6);},2);
  WS.esc=mk(220,26,g=>{g.fillStyle='#34393e';g.fillRect(0,0,220,26);g.fillStyle='#59626a';g.fillRect(16,3,188,20);g.fillStyle='rgba(30,34,38,.55)';for(let x=18;x<204;x+=4)g.fillRect(x,3,1.4,20);
    g.fillStyle='#e9c11a';g.fillRect(16,2,188,2.4);g.fillRect(16,3,2.6,20);g.fillRect(201.4,3,2.6,20);g.fillStyle='rgba(0,0,0,.4)';g.fillRect(16,23,188,3);
    for(const x of[0,206]){g.fillStyle='#121416';g.fillRect(x,0,14,26);g.fillStyle='rgba(255,255,255,.14)';g.fillRect(x+3,0,2.5,26);}},2);
  WS.stair=mk(220,30,g=>{g.fillStyle='#bdb9af';g.fillRect(0,0,220,30);for(let i=0;i<260;i++){g.fillStyle=rnd()<.5?'rgba(255,255,255,.3)':'rgba(40,40,44,.2)';g.fillRect(rnd()*220,rnd()*30,1.4,1.4);}
    const sh=g.createLinearGradient(0,0,0,9);sh.addColorStop(0,'rgba(0,0,0,.45)');sh.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=sh;g.fillRect(0,0,220,9);g.fillStyle='#d2ad1c';g.fillRect(0,26,220,3.2);g.fillStyle='rgba(120,90,0,.5)';for(let x=3;x<220;x+=7)g.fillRect(x,27,3,1.4);
    g.fillStyle='#7f898e';g.fillRect(107,0,6,30);g.fillStyle='rgba(255,255,255,.4)';g.fillRect(108.5,0,1.5,30);g.fillStyle='#2b3035';g.fillRect(0,0,5,30);g.fillRect(215,0,5,30);},2);
  const bench=c=>mk(230,40,g=>{g.lineJoin='round';g.fillStyle='rgba(0,0,0,.2)';rr(g,2,6,226,34,6);g.fill();g.fillStyle=c[0];rr(g,0,0,230,36,6);g.fill();g.strokeStyle=INK;g.lineWidth=1.6;g.stroke();
    g.fillStyle=c[1];rr(g,2,2,226,11,4);g.fill();for(let s=0;s<7;s++){g.fillStyle='rgba(255,255,255,.13)';rr(g,5+s*32,15,28,18,5);g.fill();g.fillStyle='rgba(0,0,0,.25)';g.fillRect(3+s*32,14,1.4,20);}},2);
  WS.bench=[bench(['#3f8794','#2c626d']),bench(['#e58aa6','#b65f7a'])];
  WS.planter=mk(72,72,g=>{g.translate(36,38);g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(3,6,31,27,0,0,TAU);g.fill();g.fillStyle='#bdb9af';g.beginPath();g.arc(0,0,30,0,TAU);g.fill();g.strokeStyle=INK;g.lineWidth=2;g.stroke();g.fillStyle='#5b4a3b';g.beginPath();g.arc(0,0,24,0,TAU);g.fill();
    for(let i=0;i<11;i++){const a=rnd()*TAU,d=rnd()*14,rad=8+rnd()*7;g.fillStyle=['#3f8f4f','#2f7a44','#56a85f'][i%3];g.beginPath();g.arc(Math.cos(a)*d,Math.sin(a)*d,rad,0,TAU);g.fill();}
    g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.arc(-6,-7,7,0,TAU);g.fill();},2);
  WS.leaf=[0,1,2].map(i=>mk(16,16,g=>{g.translate(8,8);g.rotate(i*2.1+.4);g.fillStyle=i===2?'#d99a2b':'#f0c53a';g.beginPath();g.moveTo(0,6);g.lineTo(-1,1);g.bezierCurveTo(-8,0,-8,-7,-2,-6);g.lineTo(0,-3);g.lineTo(2,-6);g.bezierCurveTo(8,-7,8,0,1,1);g.closePath();g.fill();g.strokeStyle='rgba(120,80,0,.5)';g.lineWidth=.6;g.stroke();},2));
  WS.manhole=mk(44,44,g=>{g.translate(22,22);g.fillStyle='#5a5f63';g.beginPath();g.arc(0,0,19,0,TAU);g.fill();g.strokeStyle='#2b2f33';g.lineWidth=2.5;g.stroke();g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1.5;for(let i=-3;i<=3;i++){g.beginPath();g.moveTo(i*5,-Math.sqrt(324-i*i*25));g.lineTo(i*5,Math.sqrt(324-i*i*25));g.stroke();}g.beginPath();g.arc(0,0,11,0,TAU);g.stroke();},2);
  WS.pit=mk(70,70,g=>{g.fillStyle='#4a4038';g.fillRect(5,5,60,60);g.strokeStyle='#2b2623';g.lineWidth=2;g.strokeRect(5,5,60,60);g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1.4;for(let k=1;k<6;k++){g.beginPath();g.moveTo(5+k*10,5);g.lineTo(5+k*10,65);g.moveTo(5,5+k*10);g.lineTo(65,5+k*10);g.stroke();}
    g.fillStyle='#6b4a33';g.beginPath();g.arc(35,35,8,0,TAU);g.fill();g.strokeStyle=INK;g.lineWidth=1.6;g.stroke();},2);
  WS.canopy=mk(200,200,g=>{for(let i=0;i<16;i++){const x=100+(rnd()-.5)*110,y=100+(rnd()-.5)*110,rad=28+rnd()*30,gr=g.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,'rgba(60,50,10,.2)');gr.addColorStop(1,'rgba(60,50,10,0)');g.fillStyle=gr;g.fillRect(0,0,200,200);}},1);
}
function hazardLane(S,ly,x0,x1,vw,led){
  const T=S.train,warn=T&&T.y===ly&&!T.on,live=T&&T.y===ly;
  if(led){const blink=warn?(Math.sin(time*22)>0?1:.25):0;ctx.fillStyle=warn?'rgba(255,60,60,'+blink+')':live?'rgba(255,60,60,.9)':'rgba(90,255,150,.55)';
    for(let x=Math.floor(x0/48)*48;x<x1;x+=48){ctx.fillRect(x+20,ly-61,8,3);ctx.fillRect(x+20,ly+58,8,3);}}
  if(warn){ctx.fillStyle='rgba(229,40,45,'+(.16+.12*Math.sin(time*18))+')';ctx.fillRect(x0,ly-56,vw,112);
    ctx.fillStyle='rgba(255,220,90,.75)';const off=(time*520*T.dir)%140;
    for(let x=Math.floor(x0/140)*140-140;x<x1+140;x+=140){const ax=x+off;ctx.beginPath();ctx.moveTo(ax+T.dir*26,ly);ctx.lineTo(ax-T.dir*4,ly-30);ctx.lineTo(ax-T.dir*20,ly-30);ctx.lineTo(ax+T.dir*10,ly);ctx.lineTo(ax-T.dir*20,ly+30);ctx.lineTo(ax-T.dir*4,ly+30);ctx.closePath();ctx.fill();}}
}
function tiles(i,x0,x1,y0,y1){const ft=floorTile(i);for(let x=Math.floor(x0/512)*512;x<x1;x+=512)for(let y=Math.floor(y0/512)*512;y<y1;y+=512)ctx.drawImage(ft,x,y,512.6,512.6);}
function pools(x0,x1,y0,y1,a){ctx.globalAlpha=a;for(let x=Math.floor((x0-130)/340)*340;x<x1+130;x+=340)for(let y=Math.floor((y0-130)/300)*300;y<y1+130;y+=300)ctx.drawImage(ST.light,x+60,y+40,240,240);ctx.globalAlpha=1;}
function drawStreet(S,cx,cy,vw,vh){
  const x0=cx-vw/2,x1=cx+vw/2,y0=cy-vh/2,y1=cy+vh/2;tiles(S.zone,x0,x1,y0,y1);
  ctx.textBaseline='alphabetic';
  for(let k=Math.floor((y0-LANE_GAP)/LANE_GAP);k<=Math.floor(y1/LANE_GAP);k++){const my=k*LANE_GAP+LANE_GAP/2;
    if(my>y0-20&&my<y1+20)for(let x=Math.floor(x0/32)*32;x<x1;x+=32)ctx.drawImage(ST.tact,x,my-11,32.3,22);
    for(let x=Math.floor((x0-600)/1200)*1200;x<x1+200;x+=1200){
      if(my+40<y1+90&&my+190>y0){ctx.fillStyle='rgba(27,33,36,.16)';ctx.font='74px '+FD;ctx.textAlign='left';ctx.fillText('역삼역 2번 출구',x+60,my+150);ctx.beginPath();const ax=x+640,ay=my+124;ctx.moveTo(ax+70,ay);ctx.lineTo(ax+10,ay-32);ctx.lineTo(ax+10,ay-11);ctx.lineTo(ax-50,ay-11);ctx.lineTo(ax-50,ay+11);ctx.lineTo(ax+10,ay+11);ctx.lineTo(ax+10,ay+32);ctx.closePath();ctx.fill();}}
    for(const ty of[k*LANE_GAP+170,(k+1)*LANE_GAP-170]){if(ty<y0-110||ty>y1+110)continue;
      for(let x=Math.floor((x0-120)/460)*460;x<x1+120;x+=460){const h=hash(x/460|0,ty|0),px=x+150+(h%60);ctx.drawImage(WS.canopy,px-120,ty-120,240,240);ctx.drawImage(WS.pit,px-35,ty-35,70,70);}}
  }
  for(let gx=Math.floor(x0/120);gx<=Math.floor(x1/120);gx++)for(let gy=Math.floor(y0/120);gy<=Math.floor(y1/120);gy++){
    const h=hash(gx,gy+7),lx=gx*120+(h>>>8)%100+10,ly=gy*120+(h>>>16)%100+10,dl=Math.abs(ly-Math.round(ly/LANE_GAP)*LANE_GAP);if(dl<90)continue;
    if(h%100<46)ctx.drawImage(WS.leaf[h%3],lx-8,ly-8,16,16);else if(h%100<49)ctx.drawImage(WS.manhole,lx-22,ly-22,44,44);else if(h%100<56)ctx.drawImage(ST.litter[(h>>>3)%ST.litter.length],lx-18,ly-18,36,36);}
  for(let k=Math.floor((y0-110)/LANE_GAP);k<=Math.ceil((y1+110)/LANE_GAP);k++){const ly=k*LANE_GAP;if(ly+100<y0||ly-100>y1)continue;
    for(let x=Math.floor(x0/256)*256;x<x1;x+=256)ctx.drawImage(WS.road,x,ly-76,256.5,152);
    ctx.fillStyle='rgba(255,255,255,.85)';for(let x=Math.floor((x0-300)/1100)*1100;x<x1+100;x+=1100)for(let j=0;j<9;j++)ctx.fillRect(x+300+j*26,ly-58,13,116);
    hazardLane(S,ly,x0,x1,vw,false);}
}
function drawGates(S,cx,cy,vw,vh){
  const x0=cx-vw/2,x1=cx+vw/2,y0=cy-vh/2,y1=cy+vh/2;tiles(S.zone,x0,x1,y0,y1);pools(x0,x1,y0,y1,1);
  ctx.textBaseline='alphabetic';
  for(let gx=Math.floor(x0/170);gx<=Math.floor(x1/170);gx++)for(let gy=Math.floor(y0/170);gy<=Math.floor(y1/170);gy++){const h=hash(gx,gy);if(h%100>=18)continue;const lx=gx*170+(h>>>8)%130+20,ly=gy*170+(h>>>16)%130+20;if(Math.abs(ly-Math.round(ly/GATE_GAP)*GATE_GAP)<60)continue;ctx.drawImage(ST.litter[(h>>>3)%ST.litter.length],lx-18,ly-18,36,36);}
  for(let k=Math.floor((y0-GATE_GAP)/GATE_GAP);k<=Math.ceil(y1/GATE_GAP);k++){const ry=k*GATE_GAP,my=ry+GATE_GAP/2;
    if(my>y0-60&&my<y1+60)for(let x=Math.floor((x0-500)/1040)*1040;x<x1+200;x+=1040){ctx.fillStyle='rgba(27,33,36,.15)';ctx.font='70px '+FD;ctx.textAlign='left';ctx.fillText(k%2?'나가는 곳':'타는 곳',x+120,my+26);}
    if(ry<y0-60||ry>y1+60)continue;
    ctx.fillStyle='rgba(255,201,40,.85)';ctx.fillRect(x0,ry-34,vw,4);ctx.fillRect(x0,ry+30,vw,4);
    for(let gx=Math.floor((x0-130)/GATE_PER)*GATE_PER;gx<x1+130;gx+=GATE_PER){
      ctx.fillStyle='rgba(0,168,77,.5)';for(const sd of[-1,1]){const ay=ry+sd*52;ctx.beginPath();ctx.moveTo(gx,ay-sd*10);ctx.lineTo(gx-9,ay+sd*4);ctx.lineTo(gx+9,ay+sd*4);ctx.closePath();ctx.fill();}
      ctx.strokeStyle='rgba(120,230,200,.75)';ctx.lineWidth=3;ctx.lineCap='round';const fl=.5+.2*Math.sin(time*3+gx);for(const sd of[-1,1]){ctx.beginPath();ctx.moveTo(gx+sd*GATE_HALF,ry);ctx.lineTo(gx+sd*(GATE_HALF-10),ry-14*fl);ctx.stroke();}
      ctx.drawImage(WS.gate,gx+GATE_PER/2-41,ry-20,82,48);}
  }
}
function drawEsc(S,cx,cy,vw,vh){
  const x0=cx-vw/2,x1=cx+vw/2,y0=cy-vh/2,y1=cy+vh/2;
  for(let c=Math.floor(x0/ESC_W);c*ESC_W<x1;c++){const m=((c%3)+3)%3,x=c*ESC_W;
    if(m===1){for(let y=Math.floor(y0/30)*30;y<y1;y+=30)ctx.drawImage(WS.stair,x,y,ESC_W,30.4);}
    else{const dir=m===0?-1:1,off=((time*ESC_PUSH*dir)%26+26)%26;for(let y=Math.floor(y0/26)*26-26+off;y<y1;y+=26)ctx.drawImage(WS.esc,x,y,ESC_W,26.4);
      ctx.fillStyle='rgba(255,255,255,.16)';for(let y=Math.floor((y0-200)/300)*300+((time*ESC_PUSH*dir)%300+300)%300;y<y1+100;y+=300){ctx.beginPath();ctx.moveTo(x+110,y+dir*46);ctx.lineTo(x+62,y-dir*10);ctx.lineTo(x+92,y-dir*10);ctx.lineTo(x+92,y-dir*46);ctx.lineTo(x+128,y-dir*46);ctx.lineTo(x+128,y-dir*10);ctx.lineTo(x+158,y-dir*10);ctx.closePath();ctx.fill();}
      ctx.fillStyle='rgba(255,255,255,.22)';for(let y=Math.floor(y0/60)*60+((time*ESC_PUSH*dir)%60+60)%60-60;y<y1;y+=60){ctx.fillRect(x+5,y,3,24);ctx.fillRect(x+212,y,3,24);}}
  }
  pools(x0,x1,y0,y1,.7);
}
function drawOffice(S,cx,cy,vw,vh){
  const x0=cx-vw/2,x1=cx+vw/2,y0=cy-vh/2,y1=cy+vh/2;tiles(S.zone,x0,x1,y0,y1);
  ctx.fillStyle='rgba(60,44,20,.07)';for(let d=Math.floor((x0+y0-900)/1100)*1100;d<x1+y1+900;d+=1100){ctx.beginPath();ctx.moveTo(d-y0,y0);ctx.lineTo(d-y0+340,y0);ctx.lineTo(d-y1+340,y1);ctx.lineTo(d-y1,y1);ctx.closePath();ctx.fill();}
  ctx.textBaseline='alphabetic';
  for(let gy=Math.floor((y0-300)/760);gy<=Math.floor(y1/760);gy++)for(let gx=Math.floor((x0-700)/1300);gx<=Math.floor(x1/1300);gx++){const x=gx*1300+(gy%2?650:0),y=gy*760;
    ctx.fillStyle='rgba(60,44,20,.2)';ctx.font='64px '+FD;ctx.textAlign='left';ctx.fillText(gy%2?'출근 9:00':'구로구',x+80,y+250);}
  for(let gx=Math.floor(x0/120);gx<=Math.floor(x1/120);gx++)for(let gy=Math.floor(y0/120);gy<=Math.floor(y1/120);gy++){const h=hash(gx+3,gy),lx=gx*120+(h>>>8)%100+10,ly=gy*120+(h>>>16)%100+10;if(h%100<22)ctx.drawImage(WS.leaf[h%3],lx-8,ly-8,16,16);}
  for(let gx=Math.floor((x0-80)/520);gx<=Math.floor((x1+80)/520);gx++)for(let gy=Math.floor((y0-80)/460);gy<=Math.floor((y1+80)/460);gy++){const h=hash(gx,gy+11);if(h%10<6)ctx.drawImage(WS.planter,gx*520+120+(h>>>8)%220-36,gy*460+110+(h>>>16)%180-38,72,72);}
}
function trainBenches(fn){ /* bench centres sit between doors; none where two cars join */ return fn; }
function drawTrainIn(S,cx,cy,vw,vh,dt){
  const x0=cx-vw/2,x1=cx+vw/2,y0=cy-vh/2,y1=cy+vh/2,open=S.doorT>0,WALL=118,OUT=132;
  trainV+=((open?0:900)-trainV)*Math.min(1,dt*2.4);trainScroll+=trainV*dt;platA+=((open?1:0)-platA)*Math.min(1,dt*3.2);doorA+=((open?1:0)-doorA)*Math.min(1,dt*5);
  ctx.fillStyle='#0b0f12';ctx.fillRect(x0-2,y0-2,vw+4,vh+4);
  ctx.fillStyle='#1a2025';for(const yy of[-150,-162,150,162])ctx.fillRect(x0,yy,vw,2.5);
  ctx.globalCompositeOperation='lighter';const len=18+trainV*.14;
  for(let x=Math.floor((x0+trainScroll)/380)*380-trainScroll-380;x<x1+len;x+=380)for(const sd of[-1,1]){const yy=sd*186;ctx.fillStyle='rgba(255,240,190,.55)';ctx.fillRect(x,yy-2.5,len,5);ctx.globalAlpha=.4;ctx.drawImage(glow('255,236,180'),x-34,yy-44,len+68,88);ctx.globalAlpha=1;}
  ctx.globalCompositeOperation='source-over';
  if(platA>.02){ctx.globalAlpha=platA;const nm=S.stopIdx>0?STOPS[S.stopIdx-1].name:'';
    for(const sd of[-1,1]){const ya=sd>0?OUT:-OUT-230;ctx.fillStyle='#cdc9be';ctx.fillRect(x0,ya,vw,230);for(let x=Math.floor(x0/32)*32;x<x1;x+=32)ctx.drawImage(ST.tact,x,sd>0?OUT+6:-OUT-28,32.3,22);
      ctx.textAlign='center';ctx.textBaseline='middle';for(let x=Math.floor((x0-300)/560)*560;x<x1+300;x+=560){const sy=sd*212;ctx.fillStyle='#fbfaf5';rr(ctx,x+60,sy-22,180,44,8);ctx.fill();ctx.fillStyle='#00a84d';ctx.fillRect(x+60,sy+12,180,6);ctx.fillStyle=INK;ctx.font='24px '+FD;ctx.fillText(nm,x+150,sy-4);}}
    ctx.textBaseline='alphabetic';
    /* the queue on the platform: it thins out as people board */
    const left=open?Math.max(0,S.doorT/DOOR_OPEN):0,nq=Math.ceil(left*11);
    for(let b=Math.floor((x0-120)/DOOR_PER);b*DOOR_PER<x1+280;b++){const dx=b*DOOR_PER+160;
      for(const sd of[-1,1])for(let j=0;j<nq;j++){const h=hash(b*7+(sd>0?3:0),j+S.stopIdx*13),col=(j%3)-1,row=(j/3)|0;
        drawChar('pass',h%4,Math.floor(time*6+h)%4,sd>0?-1:1,false,dx+col*24+((h>>6)%9-4),(sd>0?OUT+46+row*28:-OUT-8-row*28)+Math.sin(time*7+h)*1.5,.92);}}
    ctx.globalAlpha=1;}
  ctx.save();ctx.beginPath();ctx.rect(x0-2,-OUT,vw+4,OUT*2);ctx.clip();tiles(S.zone,x0,x1,-OUT,OUT);
  if(doorA>.05){ctx.globalCompositeOperation='lighter';for(let b=Math.floor((x0-120)/DOOR_PER);b*DOOR_PER<x1+280;b++){const dx=b*DOOR_PER+160;for(const sd of[-1,1]){const g=ctx.createLinearGradient(0,sd*OUT,0,sd*(AISLE-70));g.addColorStop(0,'rgba(255,236,170,'+(.5*doorA)+')');g.addColorStop(1,'rgba(255,236,170,0)');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(dx-34,sd*OUT);ctx.lineTo(dx+34,sd*OUT);ctx.lineTo(dx+78,sd*(AISLE-70));ctx.lineTo(dx-78,sd*(AISLE-70));ctx.closePath();ctx.fill();}}ctx.globalCompositeOperation='source-over';}
  ctx.fillStyle='rgba(40,56,64,.1)';ctx.fillRect(x0,-AISLE,vw,3);ctx.fillRect(x0,AISLE-3,vw,3);
  for(let x=Math.floor((x0-40)/2560)*2560;x<x1+40;x+=2560){ctx.fillStyle='#4b5359';ctx.fillRect(x-24,-OUT,48,OUT*2);ctx.fillStyle='rgba(0,0,0,.28)';for(let j=-20;j<=20;j+=8)ctx.fillRect(x+j,-OUT,2,OUT*2);ctx.fillStyle='#262c31';ctx.fillRect(x-24,-OUT,48,OUT-AISLE);ctx.fillRect(x-24,AISLE,48,OUT-AISLE);}
  for(let b=Math.floor((x0-120)/DOOR_PER);b*DOOR_PER<x1+120;b++){const bx=b*DOOR_PER;if(((b%8)+8)%8===0)continue;const pri=(((b%8)+8)%8===1||((b%8)+8)%8===7)?1:0;
    ctx.drawImage(WS.bench[pri],bx-115,-WALL,230,40);
    for(let s=0;s<7;s++){const h=hash(b,s);if(h%10<7)drawChar('pass',h%4,0,(h>>4)%2?1:-1,false,bx-96+s*32,-84,.9);}
    ctx.save();ctx.translate(bx,WALL);ctx.scale(1,-1);ctx.drawImage(WS.bench[pri],-115,0,230,40);ctx.restore();}
  ctx.restore();
  for(const sd of[-1,1]){const wy=sd>0?WALL:-OUT;
    ctx.fillStyle='#d4d9da';ctx.fillRect(x0,wy,vw,OUT-WALL);ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(x0,sd>0?OUT-2:-OUT,vw,2);ctx.fillStyle='rgba(255,255,255,.5)';ctx.fillRect(x0,sd>0?WALL:-WALL-2,vw,2);
    for(let b=Math.floor((x0-120)/DOOR_PER);b*DOOR_PER<x1+280;b++){const bx=b*DOOR_PER,dx=bx+160;
      if(((b%8)+8)%8!==0){ctx.fillStyle=platA>.5?'rgba(215,225,226,.55)':'rgba(16,26,36,.85)';rr(ctx,bx-104,wy+2.5,208,OUT-WALL-5,3);ctx.fill();ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(bx-98,wy+4,60,2);}
      const g2=31*doorA;ctx.fillStyle=platA>.3?'#f2efe6':'#0b0f12';ctx.fillRect(dx-35,wy,70,OUT-WALL);
      for(const hs of[-1,1]){const px=hs<0?dx-35-g2:dx+g2;ctx.fillStyle='#e6eaeb';ctx.fillRect(px,wy,35,OUT-WALL);ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=1;ctx.strokeRect(px+.5,wy+.5,34,OUT-WALL-1);ctx.fillStyle='rgba(16,26,36,.85)';ctx.fillRect(px+7,wy+3,21,OUT-WALL-6);}
      ctx.fillStyle='#e9c11a';ctx.fillRect(dx-36,sd>0?WALL-7:-WALL,72,7);ctx.fillStyle='rgba(120,90,0,.5)';for(let j=-32;j<32;j+=8)ctx.fillRect(dx+j,sd>0?WALL-5:-WALL+2,4,3);
      ctx.fillStyle='#0a0d0f';rr(ctx,dx-34,sd>0?WALL-21:-WALL+9,68,12,2);ctx.fill();ctx.fillStyle='#ffb300';ctx.font='10px '+FD;ctx.textAlign='center';ctx.fillText((open?'이번 역 ':'다음 역 ')+(S.stopIdx<STOPS.length?(open?STOPS[S.stopIdx-1].name:STOPS[S.stopIdx].name):(open&&S.stopIdx>0?STOPS[S.stopIdx-1].name:LAST_STOP)),dx,sd>0?WALL-11.5:-WALL+18.5);}
  }
}
function drawTrainOver(S,cx,cy,vw,vh){
  const x0=cx-vw/2,x1=cx+vw/2,WALL=118;
  for(let b=Math.floor((x0-120)/DOOR_PER);b*DOOR_PER<x1+280;b++){const bx=b*DOOR_PER,dx=bx+160;
    if(((b%8)+8)%8!==0)for(let s=0;s<7;s++){const h=hash(b+5,s);if(h%10<7)drawChar('pass',h%4,0,(h>>4)%2?1:-1,false,bx-96+s*32,WALL-6,.9);}
    for(const sd of[-1,1])for(const hs of[-1,1]){const px=dx+hs*44,py=sd*(AISLE-6);ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.arc(px+2,py+3,6,0,TAU);ctx.fill();ctx.fillStyle='#c9d0d3';ctx.beginPath();ctx.arc(px,py,5,0,TAU);ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=1.4;ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px-1.5,py-1.5,1.6,0,TAU);ctx.fill();}}
  const sway=(trainV-900)/900*10;ctx.lineCap='round';
  for(const yy of[-46,46]){ctx.strokeStyle='rgba(205,212,216,.5)';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(x0,yy);ctx.lineTo(x1,yy);ctx.stroke();
    for(let x=Math.floor(x0/38)*38;x<x1+38;x+=38){if(Math.abs(((x%DOOR_PER)+DOOR_PER)%DOOR_PER-160)<46)continue;const sx=x+Math.sin(time*2.6+x*.07)*1.6-sway;
      ctx.strokeStyle='rgba(120,130,136,.55)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,yy);ctx.lineTo(sx,yy+9);ctx.stroke();
      ctx.strokeStyle='rgba(250,250,246,.7)';ctx.lineWidth=2.4;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(sx,yy+9);ctx.lineTo(sx-5.5,yy+18);ctx.lineTo(sx+5.5,yy+18);ctx.closePath();ctx.stroke();}}
}
function drawBus(T){
  ctx.save();ctx.translate(T.x,T.y);ctx.scale(T.dir,1);
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.4;ctx.drawImage(glow('255,240,170'),-40,-100,360,200);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  for(let i=1;i>=0;i--)ctx.drawImage(WS.bus,-256-i*290,-46,256,92);
  ctx.restore();
}
function drawWorld(S,cx,cy,vw,vh,dt){
  if(!WS)buildWorld();
  const k=S.zk;
  if(k==='street')drawStreet(S,cx,cy,vw,vh);else if(k==='gates')drawGates(S,cx,cy,vw,vh);else if(k==='train')drawTrainIn(S,cx,cy,vw,vh,dt);
  else if(k==='esc')drawEsc(S,cx,cy,vw,vh);else if(k==='office')drawOffice(S,cx,cy,vw,vh);else drawPlatform(S,cx,cy,vw,vh);
}

function drawTrain(T){
  ctx.save();ctx.translate(T.x,T.y);ctx.scale(T.dir,1);
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.55;ctx.drawImage(glow('255,240,170'),-40,-110,420,220);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  for(let i=4;i>=0;i--)ctx.drawImage(i===0?ST.cab:ST.car,-216*(i+1)+2,-42,216,84);
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.9;ctx.drawImage(glow('255,240,170'),-22,-52,46,46);ctx.drawImage(glow('255,240,170'),-22,6,46,46);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  ctx.restore();
}
const DAYCOL=['#e5484d','#e2711d','#d6453d','#b8323a','#b03bd6'],NOTE_POS=[[-25,20,'#ffe27a',-.2],[23,24,'#9fe3ff',.25],[-27,-2,'#ffb3c7',.15],[26,-4,'#b8f5c6',-.3]];
function drawMonday(e){
  const day=e.day||0,fy=Math.sin(e.anim*3)*4-16,sh=e.st===1?(Math.random()-.5)*4:0,x=e.x+sh,y=e.y+fy;
  ctx.drawImage(ST.shadow,e.x-46,e.y+26,92,40);
  if(e.st===2||e.st===1){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=e.st===2?.5:.25;ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(e.dy,e.dx));ctx.drawImage(glow('255,120,120'),0,-80,300,160);ctx.restore();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';}
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(e.anim*2.2)*.05);ctx.lineJoin='round';ctx.strokeStyle=INK;ctx.lineWidth=2.5;
  for(let k=2;k>=1;k--){ctx.fillStyle=k%2?'#e2ded2':'#eeeae0';rr(ctx,-36+k*3,-44+k*3,72,86,6);ctx.fill();ctx.stroke();}
  ctx.fillStyle='#fbfaf5';rr(ctx,-36,-44,72,86,6);ctx.fill();ctx.stroke();
  ctx.save();rr(ctx,-36,-44,72,86,6);ctx.clip();ctx.fillStyle=DAYCOL[day];ctx.fillRect(-36,-44,72,21);ctx.fillStyle='rgba(0,0,0,.07)';ctx.beginPath();ctx.moveTo(36,42);ctx.lineTo(36,22);ctx.lineTo(16,42);ctx.closePath();ctx.fill();ctx.restore();
  ctx.fillStyle='#fff';ctx.font='15px '+FD;ctx.textAlign='center';ctx.fillText('MON',0,-28);
  ctx.fillStyle=INK;for(let k=-2;k<=2;k++){rr(ctx,k*13-2.2,-50,4.4,11,2.2);ctx.fill();}
  ctx.fillStyle=DAYCOL[day];ctx.font='44px '+FD;ctx.fillText('월',0,34);
  ctx.fillStyle=INK;for(const sd of[-1,1]){ctx.beginPath();ctx.ellipse(sd*13,-9,3.4,5,0,0,TAU);ctx.fill();}
  ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-22,-19);ctx.lineTo(-7,-14);ctx.moveTo(22,-19);ctx.lineTo(7,-14);ctx.stroke();
  for(let k=0;k<day&&k<4;k++){const n=NOTE_POS[k];ctx.save();ctx.translate(n[0],n[1]);ctx.rotate(n[3]);ctx.fillStyle=n[2];ctx.strokeStyle=INK;ctx.lineWidth=1.5;ctx.fillRect(-9,-9,18,18);ctx.strokeRect(-9,-9,18,18);ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(-6,-4,12,1.6);ctx.fillRect(-6,0,12,1.6);ctx.fillRect(-6,4,8,1.6);ctx.restore();}
  if(e.flash>0){ctx.globalAlpha=.75;ctx.fillStyle='#fff';rr(ctx,-36,-50,72,92,6);ctx.fill();ctx.globalAlpha=1;}
  ctx.restore();
  if(day>=4)drawGlow('200,90,255',x,y,80+Math.sin(time*8)*6,.35);
}
const CROWD=[[-24,-16,0],[0,-22,1],[24,-16,2],[-34,0,3],[-12,-4,1],[12,-4,0],[34,0,2],[-22,14,2],[0,12,3],[22,14,1],[-8,26,0],[10,27,3]];
function drawCrowd(e,px){
  const fl=e.flash>0,dir=px>=e.x?1:-1;
  ctx.fillStyle='rgba(15,20,24,.4)';ctx.beginPath();ctx.ellipse(e.x,e.y+22,e.r*1.25,e.r*.62,0,0,TAU);ctx.fill();
  for(let i=0;i<CROWD.length;i++){const m=CROWD[i],fr=Math.floor(e.anim*7+i*1.7)%4;drawChar('pass',m[2],fr,dir,fl,e.x+m[0],e.y+m[1]+22,1.12);}
  const sy=e.y-58+Math.sin(e.anim*5)*2;ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(e.x,sy+16);ctx.lineTo(e.x,sy+34);ctx.stroke();
  ctx.fillStyle='#00a84d';rr(ctx,e.x-30,sy-8,60,26,5);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.font='17px '+FD;ctx.textAlign='center';ctx.fillText('출구',e.x-9,sy+11);
  ctx.beginPath();ctx.moveTo(e.x+10,sy+5);ctx.lineTo(e.x+22,sy+5);ctx.moveTo(e.x+17,sy);ctx.lineTo(e.x+22,sy+5);ctx.lineTo(e.x+17,sy+10);ctx.strokeStyle='#fff';ctx.stroke();
}
function drawEnemy(e,p){
  const x=e.x,y=e.y,fl=e.flash>0,sc=e.def.sc||e.sc||1,stype=e.def.spr||e.type;
  if(e.type==='crowd'){drawCrowd(e,p.x);return;}
  const d=SPR[stype],bs=d.sc||1;let feet=y+e.r*.85;
  let dir=e.type==='zomb'?(e.vx>=0?1:-1):(p.x>=x?1:-1);if(e.type==='runner'&&e.st===2)dir=e.dx>=0?1:-1;if(e.type==='bagman'&&e.st===4)dir=Math.floor(e.anim*12)%2?1:-1;
  const fr=e.mv?Math.floor(e.anim*(e.type==='runner'&&e.st===2?16:8))%4:0;
  if(e.elite){drawGlow('255,70,90',x,y,e.r*2.6+Math.sin(time*6)*3,.5);}
  const sw=e.r*(e.boss?1.6:1.25);ctx.drawImage(ST.shadow,x-sw,feet-sw*.5,sw*2,sw);
  if(e.type==='runner'&&e.st===2){ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=2.5;ctx.lineCap='round';for(let k=-1;k<=1;k++){ctx.beginPath();ctx.moveTo(x-e.dx*14-e.dy*k*7,y-10-e.dy*14+e.dx*k*7);ctx.lineTo(x-e.dx*40-e.dy*k*7,y-10-e.dy*40+e.dx*k*7);ctx.stroke();}}
  if(e.boss&&S_rage>0)drawGlow('255,60,70',x,y-10,e.r*3.2+Math.sin(time*9)*5,.3+.1*Math.min(3,S_rage));
  let bsc=sc,bx=x;if(e.intro>0){const u=e.intro/1.3;feet-=u*u*520;ctx.globalAlpha=Math.min(1,(1-u)*3);}
  if(e.boss){const sy=says[e.id],ct=sy?time-sy.at:9;if(ct<.35)bsc=sc*(1+.13*Math.sin(ct/.35*Math.PI));
    if(e.st===1&&(e.type==='lead'||e.type==='bagman'||e.type==='carrierboss')){bx=x+(Math.random()-.5)*5;bsc=sc*(.94+.04*Math.sin(time*40));}
    if(e.st===2&&(e.type==='lead'||e.type==='bagman'||e.type==='carrierboss')){for(let k=3;k>=1;k--){ctx.globalAlpha=.16*(4-k)/1.6;drawChar(stype,e.seed%d.nv,(fr+k)%4,dir,true,x-e.dx*k*26,feet-e.dy*k*26,sc);}ctx.globalAlpha=1;
      if(Math.random()<.6)P({k:'smoke',x:x-e.dx*20+(Math.random()-.5)*14,y:feet-4,vx:-e.dx*60,vy:-20,life:.5,size:16,col:'230,225,215',drag:.4});}}
  drawChar(stype,e.seed%d.nv,fr,dir,fl,bx,feet,bsc);if(e.intro>0){ctx.globalAlpha=1;return;}
  const top=feet-(d.oy-4)*sc*1;
  if(e.type==='zomb')drawGlow('150,230,255',x+dir*10*sc,feet-22*sc,13,.55);
  if(e.type==='runner'&&e.st===1){ctx.fillStyle='#e5484d';ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.font='22px '+FD;ctx.textAlign='center';ctx.strokeText('!',x,top-2);ctx.fillText('!',x,top-2);}
  if(e.stun>0&&!e.boss){ctx.fillStyle='#ffd768';for(let k=0;k<3;k++){const a=time*7+k*TAU/3;ctx.beginPath();ctx.arc(x+Math.cos(a)*9,top+2+Math.sin(a)*3.5,2.2,0,TAU);ctx.fill();}}
  if(e.elite){
    const bw=34;ctx.fillStyle='rgba(20,24,28,.8)';rr(ctx,x-bw/2-1,top-9,bw+2,6,3);ctx.fill();ctx.fillStyle='#ff4d6a';rr(ctx,x-bw/2,top-8,Math.max(2,bw*e.hp/e.maxhp),4,2);ctx.fill();
    ctx.strokeStyle='#e5484d';ctx.lineWidth=2.4;ctx.lineCap='round';const mx=x+dir*-12*sc,my=top+4;
    ctx.beginPath();ctx.moveTo(mx-5,my-2);ctx.quadraticCurveTo(mx-1.5,my-1.5,mx-2,my-5);ctx.moveTo(mx+5,my-2);ctx.quadraticCurveTo(mx+1.5,my-1.5,mx+2,my-5);ctx.moveTo(mx-5,my+2);ctx.quadraticCurveTo(mx-1.5,my+1.5,mx-2,my+5);ctx.moveTo(mx+5,my+2);ctx.quadraticCurveTo(mx+1.5,my+1.5,mx+2,my+5);ctx.stroke();}
  if(e.type==='lead'){const day=e.day||0,mid=top+(feet-top)*.56;
    if(e.st===1||e.st===2){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=e.st===2?.5:.25;ctx.save();ctx.translate(x,y-20);ctx.rotate(Math.atan2(e.dy,e.dx));ctx.drawImage(glow('255,120,120'),0,-80,300,160);ctx.restore();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';}
    if(day>=4)drawGlow('255,70,70',x,y-30,86+Math.sin(time*8)*6,.3);
    ctx.lineJoin='round';ctx.strokeStyle=INK;ctx.lineWidth=2;
    ctx.fillStyle='#d23338';ctx.beginPath();ctx.moveTo(x-4,mid-14);ctx.lineTo(x+4,mid-14);ctx.lineTo(x+6,mid+10);ctx.lineTo(x,mid+18);ctx.lineTo(x-6,mid+10);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.save();ctx.translate(x+dir*30,mid+6+Math.sin(e.anim*6)*2);ctx.rotate(dir*.18);ctx.fillStyle='#8a5a33';rr(ctx,-13,-17,26,34,3);ctx.fill();ctx.stroke();ctx.fillStyle='#fbfaf5';ctx.fillRect(-10,-12,20,26);ctx.fillStyle='#9aa3a7';rr(ctx,-6,-20,12,6,2);ctx.fill();ctx.stroke();ctx.fillStyle='rgba(0,0,0,.4)';for(let k=0;k<4;k++)ctx.fillRect(-7,-8+k*6,k===3?9:14,1.8);ctx.restore();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+dir*5-7,top+25,6.5,0,TAU);ctx.arc(x+dir*5+7,top+25,6.5,0,TAU);ctx.globalAlpha=.35+.25*Math.sin(time*3);ctx.fill();ctx.globalAlpha=1;
    ctx.font='14px '+FD;ctx.textAlign='center';const lw=42;ctx.fillStyle=day>=4?'#d23338':INK;rr(ctx,x-lw/2,top-22,lw,19,6);ctx.fill();ctx.fillStyle='#fff';ctx.fillText('팀장',x,top-8);
    if(day>=2){ctx.strokeStyle='#e5484d';ctx.lineWidth=2.6;ctx.lineCap='round';const mx=x-dir*24,my=top+12;ctx.beginPath();ctx.moveTo(mx-6,my-2);ctx.quadraticCurveTo(mx-2,my-2,mx-2,my-6);ctx.moveTo(mx+6,my-2);ctx.quadraticCurveTo(mx+2,my-2,mx+2,my-6);ctx.moveTo(mx-6,my+2);ctx.quadraticCurveTo(mx-2,my+2,mx-2,my+6);ctx.moveTo(mx+6,my+2);ctx.quadraticCurveTo(mx+2,my+2,mx+2,my+6);ctx.stroke();}}
  if(e.type==='speaker'){const rage=e.hp<e.maxhp*.5;if(rage)drawGlow('160,80,255',x,y-20,74+Math.sin(time*10)*8,.2);
    ctx.lineCap='round';const bx=x+dir*34,by=feet-84;for(let k=0;k<(rage?4:3);k++){const q=(time*2.2+k/3)%1;ctx.strokeStyle='rgba(53,224,194,'+(1-q)*.9+')';ctx.lineWidth=3.5-q*2;ctx.beginPath();ctx.arc(bx,by,10+q*(rage?46:32),dir>0?-.8:Math.PI-.8,dir>0?.8:Math.PI+.8);ctx.stroke();}}
  if(e.type==='bagman'&&e.st===4){const a=e.anim*15;ctx.lineCap='round';for(let t=0;t<4;t++){ctx.strokeStyle='rgba(255,120,100,'+(.5-t*.11)+')';ctx.lineWidth=26-t*5;ctx.beginPath();ctx.arc(x,y,SPIN_R-18,a-t*.3-.35,a-t*.3);ctx.stroke();}
    ctx.save();ctx.translate(x+Math.cos(a)*(SPIN_R-18),y+Math.sin(a)*(SPIN_R-18));ctx.rotate(a+1.6);ctx.drawImage(ST.pack[1],-27,-30,54,59);ctx.restore();}
}
function drawPlayer(S){
  const p=S.p,feet=p.y+p.r*.85,dir=p.fx>=0?1:-1,fr=(p.moving||p.dashT>0)?Math.floor(p.anim*11)%4:0;
  for(const g of ghosts){const ga=1-g.t/.3;ctx.globalAlpha=.5*ga;drawChar('player',0,g.f,g.dir,true,g.x,g.y+p.r*.85,1);drawGlow('120,255,200',g.x,g.y-10,26,.35*ga);}ctx.globalAlpha=1;
  ctx.drawImage(ST.shadow,p.x-15,feet-8,30,15);
  ctx.lineWidth=2.6;ctx.strokeStyle='rgba(0,168,77,.35)';ctx.beginPath();ctx.ellipse(p.x,feet-1,17,7.5,0,0,TAU);ctx.stroke();
  const rdy=p.dashCd<=0?1:1-p.dashCd/S.M.dashCd;ctx.strokeStyle=rdy>=1?'#35e07f':'rgba(255,255,255,.85)';ctx.beginPath();ctx.ellipse(p.x,feet-1,17,7.5,0,-Math.PI/2,-Math.PI/2+TAU*rdy);ctx.stroke();
  if(p.slow>0){ctx.fillStyle='rgba(120,200,255,.9)';ctx.font='700 11px '+FB;ctx.textAlign='center';ctx.fillText('미끌!',p.x,p.y-48);}
  if(p.inv>0&&p.dashT<=0&&Math.floor(time*24)%2===0)ctx.globalAlpha=.45;
  const kq=pk.t>0?Math.sin(Math.min(1,pk.t/.18)*Math.PI):0;
  drawChar('player',0,kq>.3?1:fr,dir,hurtFlash>.42,p.x+pk.x*kq,feet+pk.y*kq,1+kq*.06);ctx.globalAlpha=1;
}

/* =============================== frame =============================== */
function jag(x0,y0,x1,y1,rnd,amp){ctx.moveTo(x0,y0);const n=5;for(let i=1;i<n;i++){const t=i/n;ctx.lineTo(x0+(x1-x0)*t+(rnd()-.5)*amp,y0+(y1-y0)*t+(rnd()-.5)*amp);}ctx.lineTo(x1,y1);}
function edgeArrow(tx,ty,cx,cy,vw,vh,col){
  const dx=tx-cx,dy=ty-cy;if(Math.abs(dx)<vw/2-20&&Math.abs(dy)<vh/2-20)return;
  const a=Math.atan2(dy,dx),m=36,k=Math.min((vw/2-m)/Math.abs(Math.cos(a)||1e-6),(vh/2-m)/Math.abs(Math.sin(a)||1e-6)),x=cx+Math.cos(a)*k,y=cy+Math.sin(a)*k;
  ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=col;ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(-8,-11);ctx.lineTo(-3,0);ctx.lineTo(-8,11);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
}
/* one failed draw call must not leave the canvas half-drawn with a stale transform for the frames after it */
let renderErr=0;
function safeRender(S,o){try{render(S,o);}catch(e){ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.setLineDash([]);ctx.filter='none';inBloom=false;if(renderErr++<3)console.error(e);}}
function render(S,o){
  if(!ST)buildStatic();
  const p=S.p,dt=o.dt||0,adt=(o.running||o.fx)?dt:0;time+=dt;
  S_rage=S.rage||0;consume(S);stepFx(adt,S);
  zf=S.zk==='train'&&W<H?.88:1;const zm=zoom*zf,inTrain=S.zk==='train';
  const vw=W/zm,vh=H/zm,tx=p.x+(o.offX||0)*vw+p.fx*18*(o.mode==='play'?1:0),ty=inTrain?0:p.y+(o.offY||0)*vh+p.fy*18*(o.mode==='play'?1:0);
  if(!cam.init||Math.hypot(tx-cam.x,ty-cam.y)>500){cam.x=tx;cam.y=ty;cam.init=true;}
  else{const f=Math.min(1,dt*9);cam.x+=(tx-cam.x)*f;cam.y+=(ty-cam.y)*f;}
  let sx=0,sy=0;if(shakeAmt>.4&&!reduce&&shakeOn){sx=(Math.random()-.5)*shakeAmt;sy=(Math.random()-.5)*shakeAmt;}
  zoomKick*=Math.pow(.004,dt);speedT=Math.max(0,speedT-dt*3.2);stopT=Math.max(0,stopT-dt);
  const cx=cam.x+sx,cy=cam.y+sy,k=dpr*zm*(reduce?1:1+zoomKick);
  ctx.setTransform(k,0,0,k,Math.round(cv.width/2-cx*k),Math.round(cv.height/2-cy*k));
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  const inView=(x,y,m)=>Math.abs(x-cx)<vw/2+m&&Math.abs(y-cy)<vh/2+m;
  drawWorld(S,cx,cy,vw,vh,adt);

  /* ground layer */
  for(const s of S.slicks){if(!inView(s.x,s.y,s.r))continue;const a=Math.min(1,s.life/.6);const h0=(s.x*13+s.y*7)|0;ctx.fillStyle='rgba(255,176,32,'+(.42*a)+')';ctx.beginPath();for(let k=0;k<=10;k++){const an=k/10*TAU,rr2=s.r*(.82+.18*Math.sin(an*3+h0)+.06*Math.sin(time*3+k));if(k)ctx.lineTo(s.x+Math.cos(an)*rr2,s.y+Math.sin(an)*rr2*.8);else ctx.moveTo(s.x+Math.cos(an)*rr2,s.y+Math.sin(an)*rr2*.8);}ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(150,70,0,'+(.8*a)+')';ctx.lineWidth=2.5;ctx.setLineDash([7,5]);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='rgba(255,245,200,'+(.75*a)+')';ctx.beginPath();ctx.ellipse(s.x-s.r*.3,s.y-s.r*.28,s.r*.2,s.r*.08,-.4,0,TAU);ctx.fill();for(let k=0;k<3;k++){const bt=(((time*.9+k*.37+h0*.01)%1)+1)%1;ctx.globalAlpha=a*(1-bt);ctx.strokeStyle='rgba(255,250,220,.9)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(s.x+Math.cos(k*2.1+h0)*s.r*.45,s.y+Math.sin(k*2.1+h0)*s.r*.3-bt*8,2+bt*4,0,TAU);ctx.stroke();}ctx.globalAlpha=1;
    ctx.fillStyle='rgba(255,255,255,'+(.75*a)+')';for(let k2=0;k2<4;k2++){const an=k2*1.7+s.x,rx=s.x+Math.cos(an)*s.r*.45,ry=s.y+Math.sin(an)*s.r*.35;rr(ctx,rx-4,ry-4,8,8,2);ctx.fill();}}
  for(const u of S.puddles){if(!inView(u.x,u.y,u.r))continue;
    const age=u.dur-u.life,grow=Math.min(1,age/.18),ease=1-Math.pow(1-grow,3)+Math.sin(grow*Math.PI)*.12,a=Math.min(1,u.life/.5),R=u.r*ease;
    ctx.save();ctx.translate(u.x,u.y);ctx.scale(1,.84);ctx.globalAlpha=a;
    ctx.beginPath();for(let j=0;j<7;j++){const an=u.ph+j*TAU/7,d=R*(.4+.08*Math.sin(u.ph*3+j*2.1)),rr2=R*(.5+.06*Math.sin(time*2+j+u.ph));ctx.moveTo(Math.cos(an)*d+rr2,Math.sin(an)*d);ctx.arc(Math.cos(an)*d,Math.sin(an)*d,rr2,0,TAU);}ctx.moveTo(R*.6,0);ctx.arc(0,0,R*.6,0,TAU);
    ctx.fillStyle=u.gum?(u.evo?'rgba(226,70,160,.5)':'rgba(250,130,180,.46)'):u.evo?'rgba(34,16,44,.5)':'rgba(84,46,20,.46)';ctx.fill();
    const gr=ctx.createRadialGradient(-R*.15,-R*.2,R*.05,0,0,R*.9);gr.addColorStop(0,u.gum?'rgba(255,200,225,.4)':u.evo?'rgba(150,90,210,.4)':'rgba(200,130,66,.45)');gr.addColorStop(.6,u.gum?'rgba(255,120,180,.25)':u.evo?'rgba(70,36,104,.2)':'rgba(130,76,34,.2)');gr.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(0,0,R*.9,0,TAU);ctx.fill();
    if(u.gum){const cyc=(time*.8+u.ph)%1,br=R*(u.evo?.5:.38)*Math.pow(cyc,.6);ctx.fillStyle=u.evo?'rgba(255,90,170,.55)':'rgba(255,150,195,.5)';ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(R*.08,-R*.05-br*.5,br,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle='rgba(255,255,255,.75)';ctx.beginPath();ctx.ellipse(R*.08-br*.35,-R*.05-br*.85,br*.28,br*.14,-.6,0,TAU);ctx.fill();
      if(cyc>.94&&Math.random()<.35)for(let m=0;m<5;m++){const an=Math.random()*TAU;P({k:'dot',x:u.x+R*.08+Math.cos(an)*br,y:u.y-br*.5+Math.sin(an)*br,vx:Math.cos(an)*80,vy:Math.sin(an)*80,life:.3,size:4,col:'255,170,210',drag:.4});}
      ctx.strokeStyle='rgba(255,230,242,.7)';ctx.lineWidth=2.4;ctx.lineCap='round';for(let m=0;m<5;m++){const an=u.ph+m*1.26,r1=R*(.78+.1*Math.sin(time*3+m));ctx.beginPath();ctx.moveTo(Math.cos(an)*R*.45,Math.sin(an)*R*.45);ctx.quadraticCurveTo(Math.cos(an+.25)*R*.62,Math.sin(an+.25)*R*.62,Math.cos(an)*r1,Math.sin(an)*r1);ctx.stroke();}}
    ctx.strokeStyle=u.gum?'rgba(255,240,248,.75)':u.evo?'rgba(220,180,255,.5)':'rgba(255,236,200,.5)';ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();ctx.arc(-R*.1,-R*.1,R*.62,Math.PI*1.05,Math.PI*1.5);ctx.stroke();ctx.beginPath();ctx.arc(R*.1,R*.12,R*.5,Math.PI*.1,Math.PI*.35);ctx.stroke();
    for(let j=0;j<5;j++){const cyc=(time*.9+j*.37+u.ph)%1,an=u.ph*2+j*2.4,d=R*(.2+.5*((j*37%10)/10)),bx=Math.cos(an)*d,by=Math.sin(an)*d,br=1.5+cyc*4.5;
      ctx.strokeStyle=u.evo?'rgba(200,150,255,'+(1-cyc)+')':'rgba(255,225,190,'+(1-cyc)+')';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(bx,by,br,0,TAU);ctx.stroke();if(cyc<.6){ctx.fillStyle='rgba(255,255,255,.5)';ctx.beginPath();ctx.arc(bx-br*.3,by-br*.3,br*.25,0,TAU);ctx.fill();}}
    ctx.restore();ctx.globalAlpha=1;
    drawGlow(u.evo?'150,90,220':'255,150,70',u.x,u.y,R*1.2,.1*a);}
  for(const m of S.mines){if(!inView(m.x,m.y,m.r))continue;const q=1-m.fuse/m.dur;
    if(m.tb){const pop=m.again?1:Math.min(1,q*6),late=m.again?1:q>.7?(q-.7)/.3:0;
      ctx.fillStyle=rgba('150,96,54',.07+.07*q);ctx.beginPath();ctx.arc(m.x,m.y,m.r,0,TAU);ctx.fill();
      ctx.strokeStyle=rgba('120,70,36',.7);ctx.lineWidth=2.2;ctx.setLineDash([9,7]);ctx.beginPath();ctx.arc(m.x,m.y,m.r,0,TAU);ctx.stroke();ctx.setLineDash([]);
      /* the countdown: the rim fills clockwise like a clock hand's sweep */
      ctx.strokeStyle=rgba('255,200,60',.9);ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.arc(m.x,m.y,m.r,-Math.PI/2,-Math.PI/2+TAU*q);ctx.stroke();
      ctx.drawImage(ST.shadow,m.x-17,m.y+9,34,15);
      ctx.save();ctx.translate(m.x+Math.sin(time*80)*2.2*late,m.y-6);ctx.rotate(Math.sin(time*60)*.12*late);ctx.scale(pop*(1+late*.18),pop*(1+late*.18));
      ctx.lineJoin='round';ctx.strokeStyle=INK;ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(-13,-14);ctx.lineTo(13,-14);ctx.lineTo(10,17);ctx.lineTo(-10,17);ctx.closePath();ctx.fillStyle='#fbfbf6';ctx.fill();ctx.stroke();
      ctx.fillStyle='#8a5a33';ctx.beginPath();ctx.moveTo(-12.3,-6);ctx.lineTo(12.3,-6);ctx.lineTo(10.9,9);ctx.lineTo(-10.9,9);ctx.closePath();ctx.fill();
      ctx.fillStyle='#2b2f33';rr(ctx,-15,-19,30,6.5,2.2);ctx.fill();ctx.stroke();
      ctx.fillStyle=late&&Math.sin(time*40)>0?'#ff7a6e':'#e5484d';ctx.beginPath();ctx.arc(0,2,9.6,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle='#fbfaf5';ctx.beginPath();ctx.arc(0,2,7,0,TAU);ctx.fill();
      ctx.lineWidth=1.8;ctx.lineCap='round';const ha=-Math.PI/2+TAU*q;ctx.beginPath();ctx.moveTo(0,2);ctx.lineTo(Math.cos(ha)*5.6,2+Math.sin(ha)*5.6);ctx.stroke();ctx.fillStyle=INK;ctx.beginPath();ctx.arc(0,2,1.4,0,TAU);ctx.fill();
      ctx.restore();
      ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=1.8;for(const sd of[-1,1]){const sy=m.y-30-((time*22+sd*5)%10);ctx.beginPath();ctx.moveTo(m.x+sd*5,sy);ctx.quadraticCurveTo(m.x+sd*8,sy-4,m.x+sd*5,sy-8);ctx.stroke();}
      continue;}
    ctx.fillStyle=rgba('255,214,90',.1+.08*q);ctx.beginPath();ctx.arc(m.x,m.y,m.r,0,TAU);ctx.fill();ctx.fillStyle=rgba('255,214,90',.16);ctx.beginPath();ctx.arc(m.x,m.y,m.r*q,0,TAU);ctx.fill();
    ctx.strokeStyle=rgba('255,200,60',.85);ctx.lineWidth=2.5;ctx.setLineDash([9,7]);ctx.lineDashOffset=-time*50;ctx.beginPath();ctx.arc(m.x,m.y,m.r,0,TAU);ctx.stroke();ctx.setLineDash([]);
    ctx.drawImage(ST.shadow,m.x-15,m.y+6,30,14);const sh=Math.sin(time*70)*(.08+.3*q);ctx.save();ctx.translate(m.x+Math.sin(time*90)*2*q,m.y-4);ctx.rotate(sh);const cs=1+q*.25;ctx.drawImage(FX.clock,-17*cs,-20*cs,34*cs,36*cs);ctx.restore();
    ctx.globalCompositeOperation='lighter';ctx.strokeStyle=rgba('255,226,120',.5+.4*Math.sin(time*40));ctx.lineWidth=2;ctx.lineCap='round';for(const sd of[-1,1]){ctx.beginPath();ctx.arc(m.x+sd*8,m.y-18,9+q*5,sd>0?-1.3:Math.PI+.5,sd>0?-.5:Math.PI+1.3);ctx.stroke();}ctx.globalCompositeOperation='source-over';}
  let l=wl(S,'hotpack');
  if(l){const s=WEAPONS.hotpack.stat(l),ev=l>=EVO,r=s.r*S.M.area*(1+Math.sin(time*7)*.025),gr=ctx.createRadialGradient(p.x,p.y,r*.25,p.x,p.y,r);
    gr.addColorStop(0,'rgba(255,150,60,0)');gr.addColorStop(.7,ev?'rgba(255,80,40,.2)':'rgba(255,150,60,.15)');gr.addColorStop(.96,ev?'rgba(255,90,40,.32)':'rgba(255,170,70,.26)');gr.addColorStop(1,'rgba(255,120,40,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.fill();
    ctx.globalCompositeOperation='lighter';
    for(let j=0;j<2;j++){const q=(time*.9+j*.5)%1;ctx.strokeStyle=rgba(ev?'255,110,60':'255,180,90',(1-q)*.35);ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,r*(.3+.7*q),0,TAU);ctx.stroke();}
    const n=Math.max(10,Math.floor(TAU*r/(ev?24:28)));
    for(let j=0;j<n;j++){const an=j/n*TAU+time*.35,fl=.75+.35*Math.sin(time*11+j*2.3)+.2*Math.sin(time*17+j*5.1),sz=(ev?26:19)*fl,x=p.x+Math.cos(an)*r*.96,y=p.y+Math.sin(an)*r*.96;
      ctx.globalAlpha=.7;ctx.drawImage(FX.flame,x-sz*.5,y-sz*1.25,sz,sz*1.5);}
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';}
  for(const d of decals){const a=Math.min(1,(d.life-d.t)/.6);ctx.save();ctx.translate(d.x,d.y);ctx.scale(1,.86);ctx.rotate(d.rot);ctx.globalAlpha=a*.75;
    if(d.kind==='stamp'){ctx.strokeStyle='#d23338';ctx.lineWidth=5;rr(ctx,-d.r*.78,-d.r*.5,d.r*1.56,d.r,8);ctx.stroke();ctx.lineWidth=2;rr(ctx,-d.r*.68,-d.r*.4,d.r*1.36,d.r*.8,5);ctx.stroke();ctx.fillStyle='#d23338';ctx.font=(d.r*.62)+'px '+FD;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('결재',0,2);ctx.textBaseline='alphabetic';}
    else{ctx.strokeStyle='rgba(40,30,30,.5)';ctx.lineWidth=2.5;ctx.lineCap='round';for(let k=0;k<7;k++){const an=k*.9+d.rot;ctx.beginPath();ctx.moveTo(Math.cos(an)*d.r*.12,Math.sin(an)*d.r*.12);ctx.lineTo(Math.cos(an+.12)*d.r*(.45+.3*((k*7)%5)/5),Math.sin(an+.12)*d.r*(.45+.3*((k*7)%5)/5));ctx.stroke();}}
    ctx.restore();ctx.globalAlpha=1;}
  for(const z of S.zones){const q=1-z.warn/z.dur,K=z.kind,pulse=.25+.25*Math.sin(time*24);
    const col=K==='bass'?'255,50,170':K==='nag'?'255,130,30':'235,50,60';
    ctx.fillStyle=rgba(col,.15);ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,TAU);ctx.fill();ctx.fillStyle=rgba(col,.3);ctx.beginPath();ctx.arc(z.x,z.y,z.r*q,0,TAU);ctx.fill();
    ctx.strokeStyle=rgba(col,.95);ctx.lineWidth=3;ctx.setLineDash([12,8]);ctx.lineDashOffset=time*60;ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,TAU);ctx.stroke();ctx.setLineDash([]);
    ctx.globalCompositeOperation='lighter';ctx.strokeStyle=rgba(col,pulse);ctx.lineWidth=10;ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,TAU);ctx.stroke();ctx.globalCompositeOperation='source-over';
    if(K==='stamp'){const h=(1-q*q)*150,sc=z.r/46;ctx.globalAlpha=.25+.3*q;ctx.drawImage(ST.shadow,z.x-z.r*(.5+q*.4),z.y-z.r*.2*(.5+q*.4),z.r*(1+q*.8),z.r*.5*(1+q*.8));ctx.globalAlpha=Math.min(1,q*3);ctx.drawImage(ST.stamp,z.x-48*sc,z.y-84*sc-h,96*sc,110*sc);ctx.globalAlpha=1;}
    else if(K==='door'){ctx.save();ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,TAU);ctx.clip();const w=z.r*.62,hh=z.r*1.5,off=(1-q*q)*z.r*1.1;ctx.globalAlpha=.55+.4*q;for(const sd of[-1,1]){ctx.drawImage(ST.doorp,z.x+sd*off+(sd<0?-w:0),z.y-hh/2,w,hh);}ctx.restore();ctx.globalAlpha=1;
      ctx.fillStyle=rgba('255,201,40',.6+.4*Math.sin(time*20));ctx.font='16px '+FD;ctx.textAlign='center';ctx.fillText('출입문 닫습니다',z.x,z.y-z.r-8);}
    else if(K==='bass'){ctx.lineWidth=4;for(let k=0;k<3;k++){const rr2=z.r*(((time*2.4+k/3)%1));ctx.strokeStyle=rgba('255,150,210',(1-rr2/z.r)*.9);ctx.beginPath();ctx.arc(z.x,z.y,rr2,0,TAU);ctx.stroke();}ctx.fillStyle='#232b2e';ctx.strokeStyle='#ff5fb8';ctx.lineWidth=3;const b=1+.18*Math.sin(time*30);ctx.beginPath();ctx.arc(z.x,z.y,z.r*.22*b,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle='#ff5fb8';ctx.beginPath();ctx.arc(z.x,z.y,z.r*.08*b,0,TAU);ctx.fill();}
    else if(K==='nag'){ctx.fillStyle=rgba('255,255,255',.85);ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.font='15px '+FD;ctx.textAlign='center';const W=['말이야','라떼는','자네','요즘','...','근데'];
      for(let k=0;k<6;k++){const an=k/6*TAU+time*.8,d=z.r*(.3+.5*((k*37%10)/10))*(.5+.5*q),bx=z.x+Math.cos(an)*d,by=z.y+Math.sin(an)*d*.8-((time*30+k*17)%22);ctx.globalAlpha=.5+.5*q;rr(ctx,bx-27,by-13,54,22,9);ctx.fill();ctx.stroke();ctx.fillStyle=INK;ctx.fillText(W[k],bx,by+3);ctx.fillStyle=rgba('255,255,255',.85);}ctx.globalAlpha=1;}
    else if(K==='meet'){const sc=z.r/70*(.6+.4*q);ctx.globalAlpha=.45+.5*q;ctx.drawImage(ST.table,z.x-80*sc,z.y-60*sc,160*sc,120*sc);ctx.globalAlpha=1;}
    else if(K==='swat'){const a=-2.4+q*3.2;ctx.save();ctx.translate(z.x+Math.cos(a)*z.r*.6,z.y+Math.sin(a)*z.r*.6);ctx.rotate(a+1.6);ctx.globalAlpha=.6+.4*q;ctx.drawImage(ST.pack[0],-27,-30,54,59);ctx.restore();ctx.globalAlpha=1;ctx.strokeStyle=rgba('255,120,100',.5);ctx.lineWidth=14;ctx.lineCap='round';ctx.beginPath();ctx.arc(z.x,z.y,z.r*.6,a-.7,a);ctx.stroke();}
    if(K!=='nag'&&K!=='door'){ctx.fillStyle=rgba(col,.75);ctx.font=(24+q*8)+'px '+FD;ctx.textAlign='center';ctx.fillText(z.txt||'쿵',z.x,z.y+(K==='stamp'||K==='meet'||K==='bass'?z.r*.78:10));}}
  for(const w of S.waves){const a=Math.min(1,(w.max-w.r)/120),g0=w.gap+w.gw,g1=w.gap-w.gw+TAU,K=w.kind,c1=K==='nag'?'255,110,30':K==='push'?'235,50,60':'225,50,200',c2=K==='nag'?'255,180,60':K==='push'?'255,130,120':'255,120,215';ctx.lineCap='round';
    ctx.strokeStyle=rgba(c1,.22*a);ctx.lineWidth=20;ctx.beginPath();ctx.arc(w.x,w.y,w.r,g0,g1);ctx.stroke();
    ctx.strokeStyle=rgba(c2,.95*a);ctx.lineWidth=6;ctx.beginPath();ctx.arc(w.x,w.y,w.r,g0,g1);ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,'+(.9*a)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(w.x,w.y,w.r,g0,g1);ctx.stroke();
    ctx.strokeStyle=rgba(c2,.35*a);ctx.lineWidth=3;ctx.beginPath();ctx.arc(w.x,w.y,Math.max(1,w.r-16),g0,g1);ctx.stroke();
    if(K==='nag'&&w.r>60){ctx.font='17px '+FD;ctx.textAlign='center';ctx.fillStyle=rgba('255,255,255',a);ctx.strokeStyle=rgba('120,50,0',a);ctx.lineWidth=3;const T2=['잔','소','리','!'],step=34/w.r;let k=0;for(let an=g0+step;an<g1-step;an+=step,k++){const tx=w.x+Math.cos(an)*(w.r+16),ty=w.y+Math.sin(an)*(w.r+16);if(!inView(tx,ty,20))continue;ctx.strokeText(T2[k%4],tx,ty+6);ctx.fillText(T2[k%4],tx,ty+6);}}
    if(K==='push'&&w.r>40){ctx.fillStyle=rgba('255,255,255',.8*a);const step=44/w.r;for(let an=g0+step;an<g1-step;an+=step){const tx=w.x+Math.cos(an)*(w.r+10),ty=w.y+Math.sin(an)*(w.r+10);if(!inView(tx,ty,20))continue;ctx.save();ctx.translate(tx,ty);ctx.rotate(an);ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(-3,-6);ctx.lineTo(-3,6);ctx.closePath();ctx.fill();ctx.restore();}}
    ctx.fillStyle='rgba(109,255,165,'+(.9*a)+')';for(const ga of[g0,g1]){ctx.beginPath();ctx.arc(w.x+Math.cos(ga)*w.r,w.y+Math.sin(ga)*w.r,6,0,TAU);ctx.fill();}}
  for(const e of S.bosses){if(e.dead)continue;
    if(e.type==='bagman'&&(e.st===3||e.st===4)){const q=e.st===3?1-e.tm/.75:1;ctx.fillStyle='rgba(229,60,66,'+(e.st===3?.14+.1*Math.sin(time*26):.12)+')';ctx.beginPath();ctx.arc(e.x,e.y,SPIN_R,0,TAU);ctx.fill();ctx.fillStyle='rgba(229,60,66,.25)';ctx.beginPath();ctx.arc(e.x,e.y,SPIN_R*q,0,TAU);ctx.fill();ctx.strokeStyle='rgba(255,90,96,.95)';ctx.lineWidth=3;ctx.setLineDash([12,8]);ctx.lineDashOffset=time*60;ctx.beginPath();ctx.arc(e.x,e.y,SPIN_R,0,TAU);ctx.stroke();ctx.setLineDash([]);}
    if((e.type==='lead'||e.type==='bagman'||e.type==='carrierboss')&&e.st===1){const len=e.type==='lead'?480:380;ctx.save();ctx.globalAlpha=.3+.2*Math.sin(time*30);ctx.strokeStyle='#e5484d';ctx.lineWidth=e.r*2;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+e.dx*len,e.y+e.dy*len);ctx.stroke();ctx.restore();}}
  for(const f of fxs){const q=f.t/f.dur;
    if(f.k==='level'){ctx.globalCompositeOperation='lighter';
      for(let j=0;j<2;j++){const qq=Math.max(0,Math.min(1,q*1.3-j*.18));ctx.strokeStyle=rgba('255,215,104',(1-qq)*.9);ctx.lineWidth=10*(1-qq)+1.5;ctx.beginPath();ctx.ellipse(p.x,p.y+8,190*qq,84*qq,0,0,TAU);ctx.stroke();}
      ctx.save();ctx.translate(p.x,p.y+8);ctx.scale(1,.45);ctx.rotate(time*1.6);ctx.fillStyle=rgba('255,215,104',(1-q)*.22);for(let j=0;j<8;j++){ctx.rotate(TAU/8);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-14,-150);ctx.lineTo(14,-150);ctx.closePath();ctx.fill();}ctx.restore();
      ctx.globalCompositeOperation='source-over';}
    else if(f.k==='dash'){const dx=p.x-f.x,dy=p.y-f.y;ctx.globalCompositeOperation='lighter';const gr=ctx.createLinearGradient(f.x,f.y,p.x,p.y);gr.addColorStop(0,'rgba(120,255,200,0)');gr.addColorStop(1,rgba('160,255,220',(1-q)*.75));ctx.strokeStyle=gr;ctx.lineCap='round';ctx.lineWidth=22*(1-q);ctx.beginPath();ctx.moveTo(f.x,f.y-10);ctx.lineTo(f.x+dx,f.y+dy-10);ctx.stroke();ctx.lineWidth=5*(1-q);ctx.strokeStyle=rgba('255,255,255',(1-q)*.9);ctx.beginPath();ctx.moveTo(f.x+dx*.3,f.y+dy*.3-10);ctx.lineTo(p.x,p.y-10);ctx.stroke();ctx.globalCompositeOperation='source-over';}}

  /* pickups */
  for(const b of S.beans){if(!inView(b.x,b.y,12))continue;const ti=b.v>=8?2:b.v>=3?1:0,by=b.y+Math.sin(time*4+b.ph)*1.6;
    if(ti)drawGlow(ti===2?'255,215,104':'230,160,90',b.x,by,ti===2?15:10,.55);ctx.drawImage(ST.bean[ti],b.x-10,by-8,20,16);}
  for(const it of S.items){if(!inView(it.x,it.y,60))continue;const by=it.y+Math.sin(it.t*4)*3;
    ctx.drawImage(ST.shadow,it.x-14,it.y+8,28,12);
    if(it.kind==='chest'){ctx.save();ctx.translate(it.x,by);ctx.rotate(it.t*.8);ctx.globalCompositeOperation='lighter';ctx.fillStyle='rgba(255,215,104,.22)';for(let k2=0;k2<6;k2++){ctx.rotate(TAU/6);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-9,-62);ctx.lineTo(9,-62);ctx.closePath();ctx.fill();}ctx.restore();ctx.globalCompositeOperation='source-over';
      ctx.globalCompositeOperation='lighter';const pg=ctx.createLinearGradient(0,by-190,0,by);pg.addColorStop(0,'rgba(255,215,104,0)');pg.addColorStop(1,'rgba(255,225,140,'+(.3+.1*Math.sin(it.t*5))+')');ctx.fillStyle=pg;ctx.fillRect(it.x-20,by-190,40,190);ctx.globalCompositeOperation='source-over';
      drawGlow('255,215,104',it.x,by,38,.7);ctx.drawImage(ST.chest,it.x-22,by-21,44,40);}
    else{drawGlow(it.kind==='pass'?'90,255,160':'255,255,255',it.x,by,24,.5);ctx.drawImage(it.kind==='pass'?ST.pass:ST.kimbap,it.x-18,by-18,36,36);}}

  /* characters, y-sorted */
  const E=S.enemies;E.sort((a,b)=>a.y-b.y);let drawn=false;
  for(let i=0;i<E.length;i++){const e=E[i];if(e.dead)continue;
    if(!drawn&&e.y>p.y){drawPlayer(S);drawn=true;}
    if(inView(e.x,e.y,e.boss?140:70))drawEnemy(e,p);}
  if(!drawn)drawPlayer(S);
  for(const c of corpses){const q=c.t/c.life,d=SPR[c.type];if(!d)continue;ctx.save();ctx.translate(c.x,c.y-14-Math.sin(q*Math.PI)*(c.up||22));ctx.rotate(c.vr*c.t);ctx.globalAlpha=1-q*q;const s=c.sc*(1-q*.25);
    ctx.drawImage(sprite(c.type,c.v,0,c.dir,q<.25),-(c.dir>0?d.ox:d.w-d.ox)*s,-(d.oy-16)*s,d.w*s,d.h*s);ctx.restore();}
  ctx.globalAlpha=1;
  if(inTrain)drawTrainOver(S,cx,cy,vw,vh);
  /* what the bosses are saying */
  for(const e of S.bosses){const sy=says[e.id];if(e.dead||!sy||sy.until<time)continue;const left=sy.until-time,al=Math.min(1,left*4,(2.8-left)*8),sc=e.def.sc||1;
    ctx.font='15px '+FD;const tw=ctx.measureText(sy.txt).width,bw=tw+20,bh=27,bx=Math.max(cx-vw/2+6,Math.min(cx+vw/2-bw-6,e.x-bw/2)),by=e.y-e.r-42*sc-bh-(e.type==='crowd'?40:0)+Math.sin(time*5)*1.5;
    ctx.globalAlpha=al;ctx.fillStyle='#fbfaf5';ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.lineJoin='round';rr(ctx,bx,by,bw,bh,9);ctx.fill();ctx.stroke();
    const tx=Math.max(bx+12,Math.min(bx+bw-12,e.x));ctx.beginPath();ctx.moveTo(tx-6,by+bh-1);ctx.lineTo(tx,by+bh+8);ctx.lineTo(tx+6,by+bh-1);ctx.fill();ctx.beginPath();ctx.moveTo(tx-6,by+bh);ctx.lineTo(tx,by+bh+8);ctx.lineTo(tx+6,by+bh);ctx.stroke();
    ctx.fillStyle=INK;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(sy.txt,bx+10,by+bh/2+1);ctx.textBaseline='alphabetic';ctx.globalAlpha=1;}
  if(S.train&&S.train.on){if(S.train.kind==='bus')drawBus(S.train);else drawTrain(S.train);}

  /* a touch of dusk under the lights, so glow reads against pale floors */
  if(bloomOn&&bloomAuto&&!reduce){ctx.fillStyle='rgba(10,14,34,.1)';ctx.fillRect(cx-vw/2-20,cy-vh/2-20,vw+40,vh+40);}
  /* weapons and effects: drawn once to the screen and once more, small, into the glow layer */
  const fxLayer=()=>{
  if(S.fus&&S.fus.bulldozer&&S.mace){const F=S.mace,z=78,slam=F.sl>0;let mx=F.x,my=F.y,lift=0,sc=1;
    if(slam){const u=1-F.sl/F.sd;mx=F.x0+(F.x-F.x0)*u;my=F.y0+(F.y-F.y0)*u;lift=Math.sin(u*Math.PI)*70+(1-u)*10;sc=1+.35*Math.sin(u*Math.PI);
      ctx.fillStyle=rgba('20,24,28',.12+.2*u);ctx.beginPath();ctx.ellipse(F.x,F.y+10,60*(.5+.5*u),26*(.5+.5*u),0,0,TAU);ctx.fill();}
    else{ctx.globalCompositeOperation='lighter';ctx.lineCap='butt';const R=Math.hypot(F.x-p.x,F.y-p.y);for(let t=0;t<8;t++){ctx.strokeStyle=rgba('255,150,70',.16*(1-t/8));ctx.lineWidth=z*.62*(1-t/9);ctx.beginPath();ctx.arc(p.x,p.y,R,F.a-.11*(t+1)-.14,F.a-.11*t-.14);ctx.stroke();}ctx.globalCompositeOperation='source-over';
      ctx.drawImage(ST.shadow,mx-z*.55,my+z*.36,z*1.1,z*.42);}
    /* the strap, taut from the hand to the pack */
    const hx=p.x+Math.cos(F.a)*10,hy=p.y-8+Math.sin(F.a)*6;ctx.lineCap='round';ctx.strokeStyle='rgba(16,22,24,.95)';ctx.lineWidth=6.5;ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(mx,my-lift);ctx.stroke();
    ctx.strokeStyle='#3a2a1c';ctx.lineWidth=3.6;ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(mx,my-lift);ctx.stroke();ctx.strokeStyle='#e9c46a';ctx.lineWidth=3.6;ctx.setLineDash([3,13]);ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(mx,my-lift);ctx.stroke();ctx.setLineDash([]);
    drawGlow('255,150,70',mx,my-lift,z*.8,.3);ctx.save();ctx.translate(mx,my-lift);ctx.rotate(slam?Math.atan2(F.y-F.y0,F.x-F.x0)+Math.PI/2:F.a+Math.PI/2);ctx.scale(sc,sc);ctx.drawImage(ST.pack[1],-z*.5,-z*.55,z,z*1.09);ctx.restore();}
  if(S.fus&&S.fus.gentleman&&S.gent){const G=S.gent,R=59,fl=Math.max(0,G.fl)/.18,cx=p.x+Math.cos(G.a)*(R-12+fl*5),cy=p.y-6+Math.sin(G.a)*(R-12+fl*5);
    /* shaft and crook handle, then the open canopy seen edge-on */
    ctx.lineCap='round';ctx.strokeStyle=INK;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(p.x+Math.cos(G.a)*8,p.y-6+Math.sin(G.a)*8);ctx.lineTo(cx,cy);ctx.stroke();ctx.strokeStyle='#b98654';ctx.lineWidth=2.6;ctx.stroke();
    ctx.drawImage(ST.shadow,cx-37,cy+33,74,24);
    ctx.save();ctx.translate(cx,cy);ctx.rotate(G.a);ctx.scale(.4,1);ctx.drawImage(FX.gcan,-57,-57,114,114);ctx.restore();
    ctx.save();ctx.translate(p.x,p.y-6);ctx.rotate(G.a);ctx.fillStyle='#d9b45a';ctx.strokeStyle=INK;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(R+6+fl*5,-3.2);ctx.lineTo(R+20+fl*5,0);ctx.lineTo(R+6+fl*5,3.2);ctx.closePath();ctx.fill();ctx.stroke();
    if(fl>0){ctx.globalCompositeOperation='lighter';ctx.strokeStyle=rgba('255,236,170',.85*fl);ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,R+10,-1.05,1.05);ctx.stroke();ctx.globalCompositeOperation='source-over';}
    ctx.restore();}
  l=wl(S,'backpack');
  if(l){const bull=S.fus&&S.fus.bulldozer,fl=bagFling>0?Math.sin((1-bagFling/.55)*Math.PI):0,s=WEAPONS.backpack.stat(l),rad=s.radius*S.M.area*(1+(bull?1.25:0)*fl),ev=l>=EVO?1:0,z=s.size*1.8*(bull?1.3+.35*fl:1),c=bull?'255,201,40':ev?'255,150,70':'130,195,255';
    if(bull){const A=S.bullA===undefined?Math.atan2(p.fy,p.fx):S.bullA,R0=s.radius*S.M.area*.8*(1+.45*fl),half=(s.n-1)/2*.44+.3,Rb=R0+z*.42;
      /* the blade: a hazard-striped bar that the packs are strapped to */
      ctx.lineCap='round';ctx.strokeStyle='rgba(16,22,24,.95)';ctx.lineWidth=13;ctx.beginPath();ctx.arc(p.x,p.y,Rb,A-half,A+half);ctx.stroke();
      ctx.strokeStyle='#ffc928';ctx.lineWidth=9;ctx.beginPath();ctx.arc(p.x,p.y,Rb,A-half,A+half);ctx.stroke();
      ctx.lineCap='butt';ctx.strokeStyle='#17191a';ctx.lineWidth=9;ctx.setLineDash([7,9]);ctx.beginPath();ctx.arc(p.x,p.y,Rb,A-half+.04,A+half-.04);ctx.stroke();ctx.setLineDash([]);
      ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(p.x,p.y,Rb+3.2,A-half+.05,A+half-.05);ctx.stroke();
      if(fl>0){ctx.globalCompositeOperation='lighter';ctx.strokeStyle=rgba('255,201,40',.5*fl);ctx.lineWidth=20;ctx.beginPath();ctx.arc(p.x,p.y,Rb+8,A-half,A+half);ctx.stroke();ctx.globalCompositeOperation='source-over';}
      for(let i=0;i<s.n;i++){const a=A+(i-(s.n-1)/2)*.44,ox=p.x+Math.cos(a)*R0,oy=p.y+Math.sin(a)*R0;
        ctx.drawImage(ST.shadow,ox-z*.6,oy+z*.5,z*1.2,z*.5);
        ctx.strokeStyle='rgba(28,32,36,.9)';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x+Math.cos(a)*16,p.y-6+Math.sin(a)*12);ctx.lineTo(ox-Math.cos(a)*z*.3,oy-Math.sin(a)*z*.3);ctx.stroke();
        ctx.save();ctx.translate(ox,oy);ctx.rotate(a+Math.PI/2);ctx.drawImage(ST.pack[1],-z*.5,-z*.55,z,z*1.09);ctx.restore();}}
    else{
    ctx.globalCompositeOperation='lighter';ctx.lineCap='butt';
    for(let i=0;i<s.n;i++){const a=S.orbA+i*TAU/s.n;for(let t=0;t<7;t++){ctx.strokeStyle=rgba(c,.2*(1-t/7));ctx.lineWidth=z*.9*(1-t/8);ctx.beginPath();ctx.arc(p.x,p.y,rad,a-.13*(t+1)-.02,a-.13*t);ctx.stroke();}}
    ctx.globalCompositeOperation='source-over';
    for(let i=0;i<s.n;i++){const a=S.orbA+i*TAU/s.n,ox=p.x+Math.cos(a)*rad,oy=p.y+Math.sin(a)*rad;
      ctx.drawImage(ST.shadow,ox-z*.6,oy+z*.5,z*1.2,z*.5);drawGlow(c,ox,oy,z*1.1,.45);
      ctx.save();ctx.translate(ox,oy);ctx.rotate(a+Math.PI/2+Math.sin(time*9+i)*.15);ctx.drawImage(ST.pack[ev],-z*.5,-z*.55,z,z*1.09);ctx.restore();}}}
  l=wl(S,'selfie');
  if(l){const s=WEAPONS.selfie.stat(l),len=s.len*S.M.area,ev=l>=EVO,c=ev?'255,170,220':'255,240,200';
    for(let i=0;i<s.n;i++){const a=S.selfA+i*TAU/s.n;
      ctx.globalCompositeOperation='lighter';
      for(let t=0;t<7;t++){ctx.fillStyle=rgba(c,.13*(1-t/7));ctx.beginPath();ctx.moveTo(p.x+Math.cos(a-.1*t)*22,p.y+Math.sin(a-.1*t)*22);ctx.arc(p.x,p.y,len,a-.1*(t+1),a-.1*t);ctx.closePath();ctx.fill();}
      ctx.globalCompositeOperation='source-over';
      const ex=p.x+Math.cos(a)*len,ey=p.y+Math.sin(a)*len;
      ctx.lineCap='round';ctx.strokeStyle=INK;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(p.x+Math.cos(a)*14,p.y-6+Math.sin(a)*14);ctx.lineTo(ex,ey);ctx.stroke();
      ctx.strokeStyle='#d7dde0';ctx.lineWidth=2.6;ctx.stroke();ctx.strokeStyle='#8b9599';ctx.lineWidth=2.6;ctx.beginPath();ctx.moveTo(p.x+Math.cos(a)*14,p.y-6+Math.sin(a)*14);ctx.lineTo(p.x+Math.cos(a)*len*.45,p.y-3+Math.sin(a)*len*.45);ctx.stroke();
      drawGlow(ev?'255,150,220':'190,240,255',ex,ey,ev?30:22,.6);
      if(ev){ctx.globalCompositeOperation='lighter';ctx.strokeStyle=rgba('255,255,255',.7+.3*Math.sin(time*20+i));ctx.lineWidth=3;ctx.beginPath();ctx.arc(ex,ey,17,0,TAU);ctx.stroke();ctx.globalCompositeOperation='source-over';}
      ctx.save();ctx.translate(ex,ey);ctx.rotate(a+Math.PI/2);ctx.drawImage(FX.phone,-9,-14,18,28);ctx.restore();}}
  for(const r of S.riders){const a=Math.atan2(r.dy,r.dx),c=r.evo?'255,170,80':'120,240,255',tl=Math.min(150,r.dist);
    ctx.globalCompositeOperation='lighter';ctx.lineCap='round';const gr=ctx.createLinearGradient(r.x,r.y,r.x-r.dx*tl,r.y-r.dy*tl);gr.addColorStop(0,rgba(c,.7));gr.addColorStop(1,rgba(c,0));
    ctx.strokeStyle=gr;ctx.lineWidth=r.w*1.5;ctx.beginPath();ctx.moveTo(r.x,r.y);ctx.lineTo(r.x-r.dx*tl,r.y-r.dy*tl);ctx.stroke();
    ctx.strokeStyle=rgba('255,255,255',.8);ctx.lineWidth=2;for(const o of[-.45,.45]){ctx.beginPath();ctx.moveTo(r.x-r.dy*r.w*o,r.y+r.dx*r.w*o);ctx.lineTo(r.x-r.dy*r.w*o-r.dx*tl*.7,r.y+r.dx*r.w*o-r.dy*tl*.7);ctx.stroke();}
    ctx.drawImage(glow('255,240,170'),r.x+r.dx*26-26,r.y+r.dy*26-26,52,52);ctx.globalCompositeOperation='source-over';
    const sc=r.w/22*1.25;ctx.save();ctx.translate(r.x,r.y);ctx.rotate(a);ctx.drawImage(ST.shadow,-24*sc,2,48*sc,16*sc);ctx.drawImage(FX.scooter,-26*sc,-13*sc,60*sc,26*sc);ctx.restore();}
  for(const b of S.rangs){const fp=S.fus&&S.fus.freepass,c=fp?'255,205,70':b.evo?'255,214,110':'200,225,255',tr=b.tr,z=b.size*2.6*(fp?1.55:1);
    if(tr&&tr.length>=4){ctx.globalCompositeOperation='lighter';ctx.lineCap='round';const n=tr.length/2;for(let i=1;i<n;i++){const f=i/n;ctx.strokeStyle=rgba(c,f*.5);ctx.lineWidth=z*.55*f;ctx.beginPath();ctx.moveTo(tr[i*2-2],tr[i*2-1]);ctx.lineTo(tr[i*2],tr[i*2+1]);ctx.stroke();}ctx.globalCompositeOperation='source-over';}
    drawGlow(c,b.x,b.y,z*.8,.5);ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.t*18);ctx.drawImage(fp?FX.handleG:FX.handle,-z/2,-z/2,z,z);ctx.restore();
    if(fp){
      for(let k=0;k<4;k++){const a=-b.t*13+k*TAU/4;ctx.save();ctx.translate(b.x+Math.cos(a)*z*.62,b.y+Math.sin(a)*z*.62);ctx.rotate(a+Math.PI/2);ctx.drawImage(ST.card[1],-11,-8,22,16);ctx.restore();}}}
  for(const b of S.lobs){const q=b.t/b.dur,x=b.x0+(b.x1-b.x0)*q,y=b.y0+(b.y1-b.y0)*q-Math.sin(q*Math.PI)*60;
    ctx.fillStyle='rgba(20,24,28,'+(.25*q)+')';ctx.beginPath();ctx.ellipse(b.x1,b.y1,b.r*.5*q,b.r*.4*q,0,0,TAU);ctx.fill();
    ctx.save();ctx.translate(x,y);ctx.rotate(q*11);const sc=1+Math.sin(q*Math.PI)*.35;if(S.fus&&S.fus.routine){ctx.rotate(-q*11+Math.sin(q*14)*.35);ctx.drawImage(FX.wake,-16*sc,-21*sc,32*sc,37*sc);}else if(b.kind==='alarm')ctx.drawImage(FX.clock,-13*sc,-15*sc,26*sc,28*sc);else ctx.drawImage(ST.cup,-10*sc,-12*sc,20*sc,24*sc);ctx.restore();}
  for(const s of S.shots){const fp=S.fus&&S.fus.freepass,c=fp?'255,205,70':s.evo?'255,210,90':'90,255,160',tr=s.tr;
    if(tr&&tr.length>=4){ctx.globalCompositeOperation='lighter';ctx.lineCap='round';const n=tr.length/2;
      for(let i=1;i<n;i++){const f=i/n;ctx.strokeStyle=rgba(c,f*.6);ctx.lineWidth=11*f;ctx.beginPath();ctx.moveTo(tr[i*2-2],tr[i*2-1]);ctx.lineTo(tr[i*2],tr[i*2+1]);ctx.stroke();}
      ctx.strokeStyle=rgba('255,255,255',.8);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(tr[tr.length-6]||tr[0],tr[tr.length-5]||tr[1]);ctx.lineTo(s.x,s.y);ctx.stroke();ctx.globalCompositeOperation='source-over';}
    drawGlow(c,s.x,s.y,19,.7);ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.a);ctx.scale(1,.55+.45*Math.abs(Math.cos(s.a*.7)));ctx.drawImage(ST.card[s.evo?1:0],-12,-9,24,18);ctx.restore();}
  for(const b of S.bullets){if(!inView(b.x,b.y,24))continue;drawGlow(ST.bulGlow[b.kind],b.x,b.y,b.r*2.6,.75);
    if(b.kind===2||b.kind===3||b.kind===5){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);ctx.drawImage(ST.bul[b.kind],-10,-10,20,20);ctx.restore();}
    else if(b.kind===6){ctx.drawImage(ST.bul[6],b.x-12,b.y-12+Math.sin(b.a*2)*2,24,24);}
    else if(b.kind===8){const s=b.r*3.1,hop=Math.abs(Math.sin(b.a*1.6))*3;ctx.drawImage(ST.shadow,b.x-s*.45,b.y+s*.22,s*.9,s*.4);ctx.save();ctx.translate(b.x,b.y-hop);ctx.rotate(Math.sin(b.a*1.6)*.16);ctx.drawImage(ST.bul[8],-s/2,-s/2,s,s);ctx.restore();if(Math.random()<.25)P({k:'smoke',x:b.x-b.vx*.05,y:b.y+s*.3,vx:-b.vx*.1,vy:-12,life:.5,size:10,col:'220,215,205',drag:.4});}
    else if(b.kind>=7){const s=b.kind===7?26:22;ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.kind===9?Math.atan2(b.vy,b.vx)+Math.sin(b.a*2)*.3:b.a);ctx.drawImage(ST.bul[b.kind],-s/2,-s/2,s,s);ctx.restore();}
    else{const s=b.r*2.7;ctx.drawImage(ST.bul[b.kind],b.x-s/2,b.y-s/2,s,s);}}

  /* effects */
  drawParts(0);
  for(const b of S.beams){const c=b.perm?'255,205,50':b.evo?'170,125,255':'90,175,255',al=Math.min(1,b.life/.14,(b.dur-b.life)/.05+.2)*(b.perm?.5:1),cx=Math.cos(b.a),cy=Math.sin(b.a),ox=p.x+cx*28,oy=p.y-24+cy*18+Math.sin(time*9+b.j)*2,ex=ox+cx*b.len,ey=oy+cy*b.len,nx=-cy,ny=cx;
    ctx.globalCompositeOperation='lighter';ctx.lineCap='butt';
    let g=ctx.createLinearGradient(ox,oy,ex,ey);g.addColorStop(0,rgba(c,.2*al));g.addColorStop(.8,rgba(c,.15*al));g.addColorStop(1,rgba(c,0));ctx.strokeStyle=g;ctx.lineWidth=b.w*(b.evo?2:2.8);ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(ex,ey);ctx.stroke();
    g=ctx.createLinearGradient(ox,oy,ex,ey);g.addColorStop(0,rgba(c,.75*al));g.addColorStop(.85,rgba(c,.55*al));g.addColorStop(1,rgba(c,0));ctx.strokeStyle=g;ctx.lineWidth=b.w*(b.evo?.9:1.3);ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(ex,ey);ctx.stroke();
    g=ctx.createLinearGradient(ox,oy,ex,ey);g.addColorStop(0,rgba('255,255,255',al));g.addColorStop(.9,rgba('255,255,255',.8*al));g.addColorStop(1,'rgba(255,255,255,0)');ctx.strokeStyle=g;ctx.lineWidth=Math.max(2.5,b.w*(b.evo?.26:.4));ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(ex,ey);ctx.stroke();
    ctx.strokeStyle=rgba('255,255,255',.55*al);ctx.lineWidth=2;ctx.setLineDash([12,18]);ctx.lineDashOffset=-time*700;for(const sd of[-1,1]){ctx.beginPath();ctx.moveTo(ox+nx*b.w*.7*sd,oy+ny*b.w*.7*sd);ctx.lineTo(ex+nx*b.w*.7*sd,ey+ny*b.w*.7*sd);ctx.stroke();}ctx.setLineDash([]);
    drawGlow(c,ox,oy,b.w*1.2+18,al*.8);ctx.globalCompositeOperation='source-over';
    ctx.save();ctx.translate(ox-cx*10,oy-cy*8);ctx.scale(cx<0?-1:1,1);ctx.rotate((cx<0?-1:1)*Math.asin(Math.max(-.6,Math.min(.6,cy)))*.6);ctx.drawImage(FX.lap,-17,-17,34,34);ctx.restore();
    if(Math.random()<.5){const u=.1+Math.random()*.85;P({k:'text',x:ox+cx*b.len*u+nx*(Math.random()-.5)*b.w*2.4,y:oy+cy*b.len*u+ny*(Math.random()-.5)*b.w*2.4,vx:cx*120,vy:cy*120-20,life:.35,size:12,col:b.perm?'255,235,150':b.evo?'215,195,255':'190,225,255',txt:Math.random()<.5?'0':'1',drag:.3});}}
  for(const f of fxs){const q=f.t/f.dur;
    if(f.k==='crack'){const al=q<.6?1:1-(q-.6)/.4,g=Math.min(1,q*9);ctx.save();ctx.translate(f.x,f.y+8);ctx.scale(1,.62);ctx.lineCap='round';
      ctx.fillStyle=rgba('20,24,28',.2*al);ctx.beginPath();ctx.arc(0,0,f.r*.34,0,TAU);ctx.fill();
      for(let k=0;k<9;k++){const a=f.rot+k/9*TAU+Math.sin(k*5.3)*.2,L=f.r*(.5+.4*Math.abs(Math.sin(k*3.7)))*g,mx=Math.cos(a+.16)*L*.55,my=Math.sin(a+.16)*L*.55;
        ctx.strokeStyle=rgba('24,28,32',.6*al);ctx.lineWidth=3.2;ctx.beginPath();ctx.moveTo(Math.cos(a)*10,Math.sin(a)*10);ctx.lineTo(mx,my);ctx.lineTo(Math.cos(a)*L,Math.sin(a)*L);ctx.stroke();
        ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(mx,my);ctx.lineTo(mx+Math.cos(a+.9)*L*.24,my+Math.sin(a+.9)*L*.24);ctx.stroke();}
      ctx.restore();continue;}
    if(f.k==='route'){const g=Math.min(1,q*5),al=q<.5?1:1-(q-.5)/.5,ex=f.x0+(f.x1-f.x0)*g,ey=f.y0+(f.y1-f.y0)*g;ctx.lineCap='round';
      ctx.strokeStyle=rgba('16,22,24',al*.85);ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(f.x0,f.y0-6);ctx.lineTo(ex,ey-6);ctx.stroke();
      ctx.strokeStyle=rgba('255,201,40',al);ctx.lineWidth=6.5;ctx.beginPath();ctx.moveTo(f.x0,f.y0-6);ctx.lineTo(ex,ey-6);ctx.stroke();
      ctx.strokeStyle=rgba('255,246,210',al*.9);ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(f.x0,f.y0-6);ctx.lineTo(ex,ey-6);ctx.stroke();
      for(const d of[[f.x0,f.y0],[ex,ey]]){ctx.fillStyle=rgba('255,201,40',al);ctx.strokeStyle=rgba('16,22,24',al);ctx.lineWidth=2;ctx.beginPath();ctx.arc(d[0],d[1]-6,6.5,0,TAU);ctx.fill();ctx.stroke();ctx.strokeStyle=rgba('23,25,26',al);ctx.lineWidth=2.4;ctx.beginPath();ctx.arc(d[0],d[1]-6,3.6,0,TAU);ctx.stroke();}}
    else if(f.k==='lashspin'){const e3=1-Math.pow(1-Math.min(1,q/.75),3),th=f.rot+e3*TAU*1.12,al=q<.7?1:Math.max(0,1-(q-.7)/.3),R=f.r,A='#ffb81f',B='#ff5a3c',G='255,190,70';
      ctx.save();ctx.translate(p.x,p.y-12);ctx.scale(1,.8);ctx.globalCompositeOperation='lighter';ctx.lineCap='butt';
      for(let k=0;k<9;k++){ctx.strokeStyle=rgba(G,al*.2*(1-k/9));ctx.lineWidth=R*.5;ctx.beginPath();ctx.arc(0,0,R*.72,th-.22*(k+1),th-.22*k);ctx.stroke();}
      ctx.strokeStyle=rgba('255,255,255',al*.8);ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,R,th-1.5,th);ctx.stroke();ctx.globalCompositeOperation='source-over';
      ctx.rotate(th);ctx.globalAlpha=al;const N=12,X=[],Y=[],H=[];for(let k=0;k<=N;k++){const t=k/N;X.push(10+t*(R-10));Y.push(-Math.sin(t*2.2)*f.w*.9*(1-q));H.push(t<.84?f.w*(.12+.42*t)*.8:f.w*.38*(1-(t-.84)/.16));}
      ctx.beginPath();ctx.moveTo(X[0],Y[0]-H[0]);for(let k=1;k<=N;k++)ctx.lineTo(X[k],Y[k]-H[k]);for(let k=N;k>=0;k--)ctx.lineTo(X[k],Y[k]+H[k]);ctx.closePath();ctx.fillStyle=A;ctx.fill();
      ctx.save();ctx.clip();ctx.strokeStyle=B;ctx.lineWidth=5;for(let x=-f.w;x<R+f.w;x+=16){ctx.beginPath();ctx.moveTo(x,-f.w*2);ctx.lineTo(x+f.w*1.3,f.w*2);ctx.stroke();}ctx.restore();
      ctx.beginPath();ctx.moveTo(X[0],Y[0]-H[0]);for(let k=1;k<=N;k++)ctx.lineTo(X[k],Y[k]-H[k]);for(let k=N;k>=0;k--)ctx.lineTo(X[k],Y[k]+H[k]);ctx.closePath();ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.lineJoin='round';ctx.stroke();ctx.restore();ctx.globalAlpha=1;
      if(Math.random()<.7){const cc=['255,90,120','90,220,160','120,170,255','255,220,90'][(Math.random()*4)|0];shards(p.x+Math.cos(th)*R,p.y-12+Math.sin(th)*R*.8,1,160,f.gent?'255,215,110':cc,.5,5);}
      if(!f.cr&&q>.72){f.cr=true;ringFx(p.x,p.y,R*1.15,G,.3,7);}}
    else if(f.k==='bag'){const sc=1.5-.5*q,z=44*sc;ctx.save();ctx.translate(f.x,f.y-8);ctx.rotate(f.a+Math.PI/2+(1-q)*.5);ctx.globalAlpha=Math.min(1,(1-q)*2.5);drawGlow('255,201,40',0,0,z*.9,.5*(1-q));ctx.globalCompositeOperation='source-over';ctx.globalAlpha=Math.min(1,(1-q)*2.5);ctx.drawImage(ST.pack[1],-z*.5,-z*.55,z,z*1.09);ctx.restore();ctx.globalAlpha=1;}
    else if(f.k==='bump'){const e3=1-Math.pow(1-q,3),al=1-q,c=f.evo?'255,110,60':'255,180,80',R=f.r*(.3+.74*e3);
      ctx.save();ctx.translate(p.x,p.y+4);ctx.scale(1,.72);ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
      ctx.fillStyle=rgba(c,.2*al*al);ctx.beginPath();ctx.arc(0,0,R,0,TAU);ctx.fill();
      ctx.strokeStyle=rgba(c,al*.5);ctx.lineWidth=4*al+1;ctx.beginPath();ctx.arc(0,0,R*.6,0,TAU);ctx.stroke();
      ctx.strokeStyle=rgba(c,al*.85);ctx.lineWidth=9*al+2;ctx.beginPath();ctx.arc(0,0,R,0,TAU);ctx.stroke();
      ctx.strokeStyle=rgba('255,255,255',al);ctx.lineWidth=2.5*al+1;ctx.beginPath();ctx.arc(0,0,R,0,TAU);ctx.stroke();
      /* the bow wave pushed ahead of the shoulder */
      ctx.strokeStyle=rgba(c,al*.55);ctx.lineWidth=30*al+2;ctx.beginPath();ctx.arc(0,0,R*1.08,f.a-.7,f.a+.7);ctx.stroke();
      ctx.strokeStyle=rgba('255,255,255',al*.95);ctx.lineWidth=12*al+2;ctx.beginPath();ctx.arc(0,0,R*1.04,f.a-.62,f.a+.62);ctx.stroke();
      ctx.strokeStyle=rgba(c,al*.9);ctx.lineWidth=5*al+1;for(let k=0;k<10;k++){const an=f.rot+k/10*TAU,r2=R*(1.16+.3*e3);ctx.beginPath();ctx.arc(0,0,r2,an-.08,an+.08);ctx.stroke();}
      if(f.evo){ctx.strokeStyle=rgba('255,220,120',al*.8);ctx.lineWidth=4*al+1;ctx.beginPath();ctx.arc(0,0,R*.82,-f.rot+q*6,-f.rot+q*6+1.5);ctx.stroke();ctx.beginPath();ctx.arc(0,0,R*.82,-f.rot+q*6+Math.PI,-f.rot+q*6+Math.PI+1.5);ctx.stroke();}
      ctx.restore();
      ctx.strokeStyle=rgba('255,255,255',al*.7);ctx.lineWidth=2.5;for(let k=-2;k<=2;k++){const an=f.a+Math.PI+k*.2,r0=22+q*26,r1=r0+44*(1-q);ctx.beginPath();ctx.moveTo(p.x+Math.cos(an)*r0,p.y-8+Math.sin(an)*r0*.8);ctx.lineTo(p.x+Math.cos(an)*r1,p.y-8+Math.sin(an)*r1*.8);ctx.stroke();}
      ctx.globalCompositeOperation='source-over';}
    else if(f.k==='fcast'){const e3=1-Math.pow(1-q,3),al=1-q,T=f.ty;ctx.lineCap='round';ctx.lineJoin='round';
      if(T==='remote'){ctx.globalCompositeOperation='lighter';
        for(let k=0;k<f.as.length;k++){const a=f.as[k],ox=p.x+Math.cos(a)*56,oy=p.y-12+Math.sin(a)*42,ex=p.x+Math.cos(a)*f.len,ey=p.y-12+Math.sin(a)*f.len,g=ctx.createLinearGradient(ox,oy,ex,ey),c=k%2?'150,110,255':'90,200,255',w=f.w*(1-q*.7);
          g.addColorStop(0,rgba(c,al*.6));g.addColorStop(1,rgba(c,0));ctx.strokeStyle=g;ctx.lineWidth=w*1.3;ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(ex,ey);ctx.stroke();
          const g2=ctx.createLinearGradient(ox,oy,ex,ey);g2.addColorStop(0,rgba('255,255,255',al));g2.addColorStop(1,'rgba(255,255,255,0)');ctx.strokeStyle=g2;ctx.lineWidth=Math.max(2,w*.3);ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(ex,ey);ctx.stroke();
          const b=f.as[(k+1)%f.as.length],bx=p.x+Math.cos(b)*56,by=p.y-12+Math.sin(b)*42;ctx.strokeStyle=rgba('255,235,120',al*.9);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ox,oy);for(let m=1;m<4;m++)ctx.lineTo(ox+(bx-ox)*m/4+(Math.random()-.5)*12,oy+(by-oy)*m/4+(Math.random()-.5)*12);ctx.lineTo(bx,by);ctx.stroke();}
        ctx.globalCompositeOperation='source-over';ctx.globalAlpha=Math.min(1,al*2);
        for(let k=0;k<f.as.length;k++){const a=f.as[k],ox=p.x+Math.cos(a)*56,oy=p.y-12+Math.sin(a)*42,sc=Math.min(1,q*6);ctx.save();ctx.translate(ox,oy);ctx.scale(sc,sc);ctx.fillStyle='#20262b';ctx.strokeStyle=INK;ctx.lineWidth=2;rr(ctx,-15,-11,30,22,4);ctx.fill();ctx.stroke();ctx.fillStyle=k%2?'#b9a6ff':'#8fd8ff';rr(ctx,-12,-8,24,16,2);ctx.fill();ctx.fillStyle='#20262b';ctx.beginPath();ctx.arc(0,-2,3.4,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(0,8,6.5,Math.PI,0);ctx.fill();ctx.fillStyle='#ff5a5f';ctx.beginPath();ctx.arc(9,-5,1.8,0,TAU);ctx.fill();ctx.restore();}
        ctx.globalAlpha=1;}
      else if(T==='bulldozer'){const R=f.r*e3,th=18*al+3;ctx.save();ctx.translate(p.x,p.y);ctx.scale(1,.8);
        ctx.strokeStyle=rgba('60,50,40',al*.7);ctx.lineWidth=3;for(let k=0;k<11;k++){const an=f.rot+k/11*TAU;ctx.beginPath();ctx.moveTo(Math.cos(an)*18,Math.sin(an)*18);ctx.lineTo(Math.cos(an+.09)*R*.5,Math.sin(an+.09)*R*.5);ctx.lineTo(Math.cos(an-.05)*R*.92,Math.sin(an-.05)*R*.92);ctx.stroke();}
        for(let k=0;k<28;k++){ctx.strokeStyle=k%2?rgba('30,30,30',al*.9):rgba('255,201,40',al);ctx.lineWidth=th;ctx.lineCap='butt';ctx.beginPath();ctx.arc(0,0,R,f.rot+k/28*TAU,f.rot+(k+1)/28*TAU+.01);ctx.stroke();}
        ctx.globalCompositeOperation='lighter';ctx.strokeStyle=rgba('255,255,255',al*.8);ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,R+th/2+2,0,TAU);ctx.stroke();ctx.fillStyle=rgba('255,170,60',al*.18);ctx.beginPath();ctx.arc(0,0,R,0,TAU);ctx.fill();ctx.globalCompositeOperation='source-over';ctx.restore();}
      else if(T==='gentleman'){const R=f.r*e3;ctx.save();ctx.translate(p.x,p.y-6);ctx.scale(1,.82);
        for(let k=0;k<2;k++){ctx.beginPath();for(let m=0;m<=40;m++){const u=m/40,an=f.rot+k*Math.PI+u*4.6+q*5,rr2=16+(R-16)*u;if(m)ctx.lineTo(Math.cos(an)*rr2,Math.sin(an)*rr2);else ctx.moveTo(Math.cos(an)*rr2,Math.sin(an)*rr2);}
          ctx.strokeStyle=rgba('20,25,28',al*.9);ctx.lineWidth=17*al+3;ctx.stroke();ctx.strokeStyle=k?rgba('210,51,56',al):rgba('60,110,200',al);ctx.lineWidth=13*al+1;ctx.stroke();ctx.setLineDash([9,13]);ctx.strokeStyle=rgba('255,255,255',al*.55);ctx.lineWidth=13*al+1;ctx.stroke();ctx.setLineDash([]);}
        ctx.globalCompositeOperation='lighter';ctx.strokeStyle=rgba('255,225,140',al);ctx.lineWidth=5*al+1;ctx.beginPath();ctx.arc(0,0,R,0,TAU);ctx.stroke();ctx.strokeStyle=rgba('255,255,255',al*.5);ctx.lineWidth=16*al;ctx.beginPath();ctx.arc(0,0,R*.96,f.rot+q*9,f.rot+q*9+2.2);ctx.stroke();ctx.globalCompositeOperation='source-over';ctx.restore();}
      else if(T==='routine'){ctx.save();ctx.translate(f.x===undefined?p.x:f.x,(f.y===undefined?p.y:f.y)-10);ctx.globalCompositeOperation='lighter';const R=f.r*1.5*e3;
        for(let k=0;k<12;k++){const an=f.rot+k/12*TAU+q*.8;ctx.fillStyle=rgba(k%2?'255,200,90':'255,235,170',al*.3);ctx.beginPath();ctx.moveTo(Math.cos(an-.09)*26,Math.sin(an-.09)*26);ctx.lineTo(Math.cos(an-.13)*R,Math.sin(an-.13)*R);ctx.lineTo(Math.cos(an+.13)*R,Math.sin(an+.13)*R);ctx.lineTo(Math.cos(an+.09)*26,Math.sin(an+.09)*26);ctx.closePath();ctx.fill();}
        ctx.globalCompositeOperation='source-over';ctx.strokeStyle=rgba('120,70,30',al*.8);ctx.lineWidth=5*al+1;ctx.beginPath();ctx.arc(0,10,f.r*e3,0,TAU);ctx.stroke();
        ctx.strokeStyle=rgba('255,255,255',al);ctx.lineWidth=3;for(let k=0;k<12;k++){const an=k/12*TAU,r0=f.r*.52*e3,r1=r0+(k%3?7:13);ctx.beginPath();ctx.moveTo(Math.cos(an)*r0,10+Math.sin(an)*r0);ctx.lineTo(Math.cos(an)*r1,10+Math.sin(an)*r1);ctx.stroke();}
        const ha=-Math.PI/2+q*TAU;ctx.strokeStyle=rgba('229,72,77',al);ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,10);ctx.lineTo(Math.cos(ha)*f.r*.42*e3,10+Math.sin(ha)*f.r*.42*e3);ctx.stroke();ctx.restore();}
      else if(T==='freepass'){ctx.save();ctx.translate(p.x,p.y);ctx.scale(1,.8);const R=f.r*(.4+.9*e3);ctx.globalCompositeOperation='lighter';
        ctx.strokeStyle=rgba('255,205,70',al*.9);ctx.lineWidth=7*al+1;ctx.beginPath();ctx.arc(0,0,R,0,TAU);ctx.stroke();ctx.strokeStyle=rgba('255,205,70',al*.35);ctx.lineWidth=22*al;ctx.beginPath();ctx.arc(0,0,R*.9,0,TAU);ctx.stroke();ctx.globalCompositeOperation='source-over';
        for(let k=0;k<6;k++){const an=f.rot+k/6*TAU+q*3,hx=Math.cos(an)*R*.8,hy=Math.sin(an)*R*.8;ctx.strokeStyle=rgba('20,25,28',al);ctx.lineWidth=6;ctx.beginPath();ctx.arc(hx,hy,10,0,TAU);ctx.stroke();ctx.strokeStyle=rgba('255,201,40',al);ctx.lineWidth=3.5;ctx.beginPath();ctx.arc(hx,hy,10,0,TAU);ctx.stroke();}
        ctx.restore();}}
    else if(f.k==='bossin'){const rr2=70+10*Math.sin(time*20);ctx.fillStyle=rgba('235,50,60',.16+.2*q);ctx.beginPath();ctx.ellipse(f.x,f.y,rr2*(.4+.6*q),rr2*(.4+.6*q)*.7,0,0,TAU);ctx.fill();
      ctx.strokeStyle=rgba('255,70,80',.95);ctx.lineWidth=4;ctx.setLineDash([14,9]);ctx.lineDashOffset=-time*90;ctx.beginPath();ctx.ellipse(f.x,f.y,rr2,rr2*.7,0,0,TAU);ctx.stroke();ctx.setLineDash([]);
      ctx.globalCompositeOperation='lighter';const g=ctx.createLinearGradient(0,f.y-520,0,f.y);g.addColorStop(0,'rgba(255,60,70,0)');g.addColorStop(1,'rgba(255,90,90,'+(.5*q)+')');ctx.fillStyle=g;ctx.fillRect(f.x-34-20*(1-q),f.y-520,68+40*(1-q),520);ctx.globalCompositeOperation='source-over';
      ctx.fillStyle=rgba('255,255,255',.6+.4*Math.sin(time*26));ctx.font='30px '+FD;ctx.textAlign='center';ctx.fillText('!',f.x,f.y+10);}
    else if(f.k==='lash'){const ext=q<.3?1-Math.pow(1-q/.3,3):1,al=q<.62?1:Math.max(0,1-(q-.62)/.38),amp=f.w*1.25*Math.max(0,1-q/.42),N=16,L=f.len*ext;
      const A=f.evo?'#ffb81f':'#d23338',B=f.evo?'#ff5a3c':'#ff8f96',G=f.evo?'255,190,70':'255,90,110';
      for(const a of f.as){ctx.save();ctx.translate(p.x,p.y-10);ctx.rotate(a);const X=[],Y=[],H=[];
        for(let k=0;k<=N;k++){const t=k/N;X.push(12+t*L);Y.push(Math.sin(t*6.2-q*17)*amp*t);H.push(t<.86?f.w*(.1+.4*t)*.8:f.w*.36*(1-(t-.86)/.14)*1.05);}
        const path=g=>{ctx.beginPath();ctx.moveTo(X[0],Y[0]-H[0]);for(let k=1;k<=N;k++)ctx.lineTo(X[k],Y[k]-H[k]);for(let k=N;k>=0;k--)ctx.lineTo(X[k],Y[k]+H[k]);ctx.closePath();};
        /* the air it cuts through */
        ctx.globalCompositeOperation='lighter';ctx.globalAlpha=al*.35*(1-q);ctx.strokeStyle=rgba(G,1);ctx.lineWidth=f.w*1.5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(X[0],Y[0]);for(let k=1;k<=N;k++)ctx.lineTo(X[k],Y[k]*1.6);ctx.stroke();ctx.globalCompositeOperation='source-over';
        ctx.globalAlpha=al;path();ctx.fillStyle=A;ctx.fill();ctx.save();ctx.clip();ctx.strokeStyle=B;ctx.lineWidth=5;for(let x=-f.w;x<L+f.w;x+=17){ctx.beginPath();ctx.moveTo(12+x,-f.w*1.6);ctx.lineTo(12+x+f.w*1.3,f.w*1.6);ctx.stroke();}
        ctx.fillStyle='rgba(255,255,255,.28)';ctx.beginPath();ctx.moveTo(X[0],Y[0]-H[0]);for(let k=1;k<=N;k++)ctx.lineTo(X[k],Y[k]-H[k]);for(let k=N;k>=0;k--)ctx.lineTo(X[k],Y[k]-H[k]*.35);ctx.closePath();ctx.fill();ctx.restore();
        path();ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.lineJoin='round';ctx.stroke();
        ctx.fillStyle=A;ctx.strokeStyle=INK;rr(ctx,6,-5,10,10,2.5);ctx.fill();ctx.stroke();ctx.globalAlpha=1;ctx.restore();
        if(!f.cr&&q>=.3){const tx=p.x+Math.cos(a)*(12+L),ty=p.y-10+Math.sin(a)*(12+L);flare(tx,ty,f.evo?34:30,'255,255,255',.16);ringFx(tx,ty,f.w*1.3,G,.22,4);sparks(tx,ty,f.evo?16:9,300,f.evo?'255,220,120':'255,200,200',.3,2.4);
          if(f.evo)for(const c of['255,90,120','90,220,160','120,170,255','255,220,90'])shards(tx,ty,3,240,c,.7,5);}}
      if(q>=.3)f.cr=true;}
    else if(f.k==='beam'){const al=1-q*q,c=f.evo?'180,120,255':'90,170,255';ctx.globalCompositeOperation='lighter';ctx.lineCap='butt';
      for(const a of f.as){const ex=p.x+Math.cos(a)*f.len,ey=p.y-8+Math.sin(a)*f.len;
        ctx.strokeStyle=rgba(c,al*.28);ctx.lineWidth=f.w*3.4*(1-q*.6);ctx.beginPath();ctx.moveTo(p.x,p.y-8);ctx.lineTo(ex,ey);ctx.stroke();
        ctx.strokeStyle=rgba(c,al*.75);ctx.lineWidth=f.w*1.6*(1-q*.7);ctx.beginPath();ctx.moveTo(p.x,p.y-8);ctx.lineTo(ex,ey);ctx.stroke();
        ctx.strokeStyle=rgba('255,255,255',al);ctx.lineWidth=Math.max(2,f.w*.5*(1-q));ctx.beginPath();ctx.moveTo(p.x,p.y-8);ctx.lineTo(ex,ey);ctx.stroke();}
      drawGlow(c,p.x,p.y-8,f.w*3+16,al);ctx.globalCompositeOperation='source-over';}
    else if(f.k==='ring'){const c=f.evo?'255,140,70':'70,255,200',c2=f.evo?'255,80,170':'150,220,255';ctx.globalCompositeOperation='lighter';ctx.lineJoin='round';
      if(q<.3){ctx.fillStyle=rgba(c,(1-q/.3)*.16);ctx.beginPath();ctx.arc(p.x,p.y,f.r*.9,0,TAU);ctx.fill();}
      for(let j=0;j<3;j++){const qq=Math.max(0,Math.min(1,(q-j*.11)/(1-j*.11)));if(qq<=0)continue;const R=f.r*(1-Math.pow(1-qq,3)),amp=(f.evo?9:6)*(1-qq),al=1-qq;
        ctx.beginPath();for(let k2=0;k2<=56;k2++){const an=k2/56*TAU,rr2=R+Math.sin(an*(f.evo?10:14)+time*26+j*2)*amp;const x=p.x+Math.cos(an)*rr2,y=p.y+Math.sin(an)*rr2;if(k2)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.closePath();
        ctx.strokeStyle=rgba(j===1?c2:c,al*.3);ctx.lineWidth=14*al+3;ctx.stroke();ctx.strokeStyle=rgba(j===1?c2:c,al*.9);ctx.lineWidth=3.5*al+1;ctx.stroke();ctx.strokeStyle=rgba('255,255,255',al*.8);ctx.lineWidth=1.2;ctx.stroke();}
      if(f.evo){const R=f.r*(1-Math.pow(1-q,3));ctx.lineCap='round';ctx.lineWidth=5;for(let k2=0;k2<28;k2++){const an=k2/28*TAU,h=(10+26*Math.abs(Math.sin(k2*1.9+time*34)))*(1-q);ctx.strokeStyle=rgba(k2%2?c:c2,(1-q)*.8);ctx.beginPath();ctx.moveTo(p.x+Math.cos(an)*(R+6),p.y+Math.sin(an)*(R+6));ctx.lineTo(p.x+Math.cos(an)*(R+6+h),p.y+Math.sin(an)*(R+6+h));ctx.stroke();}}
      ctx.globalCompositeOperation='source-over';}
    else if(f.k==='stab'){const fin=f.n===2,im=S.fus&&S.fus.gentleman?FX.gstabT:FX.gstab[f.quad?1:0],L=fin?196:150,Hh=fin?34:30,wc=f.quad?'255,220,140':'215,232,255';
      const out=fin?1-Math.pow(1-Math.min(1,q/.22),3):Math.sin(Math.min(1,q/.75)*Math.PI),al=fin?(q<.7?1:Math.max(0,(1-q)/.3)):Math.min(1,(1-q)*3.5),jit=fin?0:(f.n?-.13:.13);
      const side=a=>{ctx.save();ctx.translate(p.x,p.y-8);ctx.rotate(a+jit);const tip=18+(f.range-18)*(fin?out:.35+.65*out),x0=fin?Math.min(tip-L,16+(tip-L-16)*.35):tip-L,LL=tip-x0;
        if(fin){const sl=Math.max(0,1-q/.5);ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.strokeStyle=rgba(wc,.5*sl);ctx.lineWidth=Hh*.7;ctx.beginPath();ctx.moveTo(20,0);ctx.lineTo(tip-10,0);ctx.stroke();ctx.strokeStyle=rgba('255,255,255',.85*sl);ctx.lineWidth=2;for(const o of[-12,12]){ctx.beginPath();ctx.moveTo(26,o);ctx.lineTo(tip-30,o*.5);ctx.stroke();}ctx.globalCompositeOperation='source-over';}
        ctx.globalAlpha=al*.3;ctx.drawImage(im,x0-(fin?30:22),-Hh/2,LL,Hh);ctx.globalAlpha=al;ctx.drawImage(im,x0,-Hh/2,LL,Hh);ctx.globalAlpha=1;
        if(q<.3){ctx.globalCompositeOperation='lighter';const fs=(fin?24:13)*(1-q/.3);ctx.drawImage(FX.flare,tip-fs,-fs,fs*2,fs*2);ctx.globalCompositeOperation='source-over';}
        ctx.restore();};
      side(f.a);side(f.a+Math.PI);if(f.quad){side(f.a+Math.PI/2);side(f.a-Math.PI/2);}}
    else if(f.k==='swipe'){const al=1-q;
      if(false){}
      else{const lunge=1-Math.pow(1-Math.min(1,q/.2),3),reach=f.range,hold=q<.72?1:Math.max(0,(1-q)/.28);
        const side=a=>{ctx.save();ctx.translate(p.x,p.y-8);ctx.rotate(a);
          ctx.globalCompositeOperation='lighter';
          const sl=Math.min(1,q/.2),sa=al*Math.min(1,q*8);
          ctx.lineWidth=1.6;ctx.lineCap='round';for(const o of[-9,0,9]){ctx.strokeStyle=rgba('255,255,255',sa*.45*Math.max(0,1-q*2.2));ctx.beginPath();ctx.moveTo(reach*.2*lunge,o);ctx.lineTo(reach*(.55+.3*lunge),o*.4);ctx.stroke();}
          ctx.globalCompositeOperation='source-over';
          const ux=reach-104,pos=14+ux*lunge+(q>.2?-(q-.2)*14:0),gh=Math.max(0,1-q/.3);
          ctx.globalAlpha=hold*.22*gh;ctx.drawImage(FX.umb,pos-34,-13,112,26);ctx.globalAlpha=hold*.45*gh;ctx.drawImage(FX.umb,pos-16,-13,112,26);
          ctx.globalAlpha=hold;ctx.drawImage(FX.umb,pos,-13,112,26);ctx.globalAlpha=1;
          if(q<.22){ctx.globalCompositeOperation='lighter';const fs=18*(1-q/.22);ctx.drawImage(FX.flare,pos+108-fs,-fs,fs*2,fs*2);ctx.globalCompositeOperation='source-over';}
          ctx.restore();};
        side(f.a);if(f.both)side(f.a+Math.PI);}}
    else if(f.k==='shout'){ctx.globalCompositeOperation='lighter';const R=f.r*(1-Math.pow(1-Math.min(1,q*1.5),3));
      ctx.strokeStyle=rgba('255,215,104',(1-q)*.3);ctx.lineWidth=46*(1-q)+4;ctx.beginPath();ctx.arc(p.x,p.y,R,0,TAU);ctx.stroke();
      ctx.strokeStyle=rgba('255,236,170',(1-q)*.9);ctx.lineWidth=10*(1-q)+2;ctx.beginPath();ctx.arc(p.x,p.y,R,0,TAU);ctx.stroke();
      ctx.strokeStyle=rgba('255,255,255',(1-q)*.7);ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,R*.8,0,TAU);ctx.stroke();
      ctx.lineCap='round';for(let j=0;j<22;j++){const a=j/22*TAU+.2,r0=50+q*320+(j%3)*26,r1=r0+60+(j%2)*50;ctx.strokeStyle=rgba('255,255,255',(1-q)*.55);ctx.lineWidth=j%2?2:4;ctx.beginPath();ctx.moveTo(p.x+Math.cos(a)*r0,p.y+Math.sin(a)*r0);ctx.lineTo(p.x+Math.cos(a)*r1,p.y+Math.sin(a)*r1);ctx.stroke();}
      ctx.globalCompositeOperation='source-over';
      const txt=f.evo?'저 내려요!!!':'내릴게요!';ctx.font=(f.evo?30:26)+'px '+FD;const tw=ctx.measureText(txt).width/2+26,pop=Math.min(1,q*8),sc=(.4+.6*pop)*(1+(q<.25?Math.sin(q*40)*.07:0));
      ctx.save();ctx.translate(p.x,p.y-80);ctx.rotate(Math.sin(q*50)*.04*(1-q)-.05);ctx.scale(sc,sc);ctx.globalAlpha=Math.min(1,(1-q)*3.5);
      const burst=(k,ox,oy)=>{ctx.beginPath();const n=20;for(let j=0;j<n*2;j++){const a=j/(n*2)*TAU,rx=tw*(j%2?1:1.26)*k,ry=24*(j%2?1:1.5)*k;ctx.lineTo(ox+Math.cos(a)*rx,oy+Math.sin(a)*ry);}ctx.closePath();};
      burst(1,5,6);ctx.fillStyle='rgba(20,24,28,.45)';ctx.fill();
      burst(1,0,0);ctx.fillStyle=f.evo?'#ffc928':'#fff';ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=3.5;ctx.lineJoin='round';ctx.stroke();
      burst(.8,0,0);ctx.strokeStyle=f.evo?'rgba(229,72,77,.6)':'rgba(255,201,40,.8)';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle=INK;ctx.textAlign='center';ctx.fillText(txt,0,f.evo?10:9);ctx.restore();ctx.globalAlpha=1;}
    else if(f.k==='level'){ctx.globalCompositeOperation='lighter';const h=300,w=64*(1-q*.5),gr=ctx.createLinearGradient(0,p.y-h,0,p.y+10);gr.addColorStop(0,'rgba(255,215,104,0)');gr.addColorStop(.7,rgba('255,225,140',(1-q)*.5));gr.addColorStop(1,rgba('255,255,230',(1-q)*.75));ctx.fillStyle=gr;ctx.fillRect(p.x-w/2,p.y-h,w,h+10);ctx.fillStyle=rgba('255,255,255',(1-q)*.5);ctx.fillRect(p.x-w*.16,p.y-h,w*.32,h+10);ctx.globalCompositeOperation='source-over';}
    else if(f.k==='zap'){const P_=f.pts,c=f.evo?'255,214,110':'90,200,255',fr=Math.floor(f.t/.045),al=1-q*q;
      ctx.lineJoin='round';ctx.lineCap='round';ctx.globalCompositeOperation='lighter';
      const rnd=srand(f.seed+fr*977),path=[];
      for(let j=0;j+3<P_.length;j+=2){const x0=P_[j],y0=P_[j+1],x1=P_[j+2],y1=P_[j+3],len=Math.hypot(x1-x0,y1-y0),nx=-(y1-y0)/(len||1),ny=(x1-x0)/(len||1),seg=Math.max(3,Math.min(9,Math.round(len/16)));
        const pts=[x0,y0];for(let s2=1;s2<seg;s2++){const t=s2/seg,o=(rnd()-.5)*len*.26*Math.sin(t*Math.PI)+(rnd()-.5)*8;pts.push(x0+(x1-x0)*t+nx*o,y0+(y1-y0)*t+ny*o);}pts.push(x1,y1);path.push(pts);
        if(rnd()<(f.evo?.9:.55)){const m=2*(1+((rnd()*(seg-1))|0)),bx=pts[m],by=pts[m+1],ba=Math.atan2(y1-y0,x1-x0)+(rnd()<.5?1:-1)*(.5+rnd()*.7),bl=22+rnd()*(f.evo?50:32);path.push([bx,by,bx+Math.cos(ba)*bl*.5+(rnd()-.5)*10,by+Math.sin(ba)*bl*.5+(rnd()-.5)*10,bx+Math.cos(ba)*bl,by+Math.sin(ba)*bl]);}}
      const stroke=(w,col,a)=>{ctx.strokeStyle=rgba(col,a);ctx.lineWidth=w;ctx.beginPath();for(const pts of path){ctx.moveTo(pts[0],pts[1]);for(let k2=2;k2<pts.length;k2+=2)ctx.lineTo(pts[k2],pts[k2+1]);}ctx.stroke();};
      stroke(f.evo?22:16,c,al*.18);stroke(f.evo?9:7,c,al*.55);stroke(f.evo?3.4:2.6,'255,255,255',al);
      ctx.globalCompositeOperation='source-over';}
  }
  drawParts(1);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  };
  fxLayer();
  if(dt>0){slowT=dt>.034?slowT+dt:Math.max(0,slowT-dt*.5);if(slowT>2.5)bloomAuto=false;}
  if(bloomOn&&bloomAuto&&!reduce){const main=ctx,bw=Math.ceil(cv.width/BS),bh=Math.ceil(cv.height/BS);
    if(!gcv){gcv=document.createElement('canvas');gctx=gcv.getContext('2d');g2=document.createElement('canvas');g2ctx=g2.getContext('2d');}
    if(gcv.width!==bw||gcv.height!==bh){gcv.width=bw;gcv.height=bh;g2.width=bw;g2.height=bh;}
    const T=main.getTransform();gctx.setTransform(1,0,0,1,0,0);gctx.globalAlpha=1;gctx.globalCompositeOperation='source-over';gctx.clearRect(0,0,bw,bh);gctx.setTransform(T.a/BS,0,0,T.d/BS,T.e/BS,T.f/BS);
    ctx=gctx;inBloom=true;try{fxLayer();}finally{inBloom=false;ctx=main;}
    g2ctx.setTransform(1,0,0,1,0,0);g2ctx.clearRect(0,0,bw,bh);const hf=typeof g2ctx.filter==='string';if(hf)g2ctx.filter='blur('+Math.max(2,Math.round(3.2*dpr))+'px)';g2ctx.drawImage(gcv,0,0);if(hf)g2ctx.filter='none';
    main.save();main.setTransform(1,0,0,1,0,0);main.globalCompositeOperation='lighter';main.imageSmoothingEnabled=true;main.globalAlpha=.58;main.drawImage(g2,0,0,cv.width,cv.height);
    if(!hf){main.globalAlpha=.3;main.drawImage(g2,-BS*2,-BS*2,cv.width+BS*4,cv.height+BS*4);}
    main.restore();}
  ctx.textAlign='center';ctx.lineJoin='round';
  for(const n of nums){if(!inView(n.x,n.y,30))continue;const pop=1+.8*Math.max(0,1-n.t/.1),sz=(n.c===1?21:n.c>=2?18:13.5)*pop;
    ctx.globalAlpha=1-Math.max(0,n.t-.55)/.25;ctx.font=(n.c?'':'700 ')+sz+'px '+(n.c?FD:FB);ctx.lineWidth=n.c?4.5:3;ctx.strokeStyle='rgba(16,20,24,.92)';ctx.strokeText(n.v,n.x,n.y);
    ctx.fillStyle=n.c===1?'#ffd23f':n.c===2?'#6dffa5':n.c===3?'#ff6b6f':'#fff';ctx.fillText(n.v,n.x,n.y);}
  ctx.globalAlpha=1;

  /* indicators (world space) */
  if(o.mode==='play'){
    for(const e of S.bosses)if(!e.dead)edgeArrow(e.x,e.y,cx,cy,vw,vh,'#b03bd6');
    for(const it of S.items)if(it.kind==='chest')edgeArrow(it.x,it.y,cx,cy,vw,vh,'#ffc928');
    const T=S.train;
    if(T&&!T.on){const yy=Math.max(cy-vh/2+60,Math.min(cy+vh/2-60,T.y)),xx=cx-T.dir*(vw/2-46),b=Math.sin(time*22)>0;
      ctx.save();ctx.translate(xx,yy);ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(0,-26);ctx.lineTo(26,20);ctx.lineTo(-26,20);ctx.closePath();ctx.fillStyle=b?'#ffc928':'#e5484d';ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=3;ctx.stroke();ctx.fillStyle=INK;ctx.font='26px '+FD;ctx.textAlign='center';ctx.fillText('!',0,14);
      ctx.font='14px '+FD;ctx.lineWidth=4;ctx.strokeStyle='#fff';const wt=T.kind==='bus'?'버스 진입':'열차 진입';ctx.strokeText(wt,0,40);ctx.fillText(wt,0,40);ctx.restore();}
  }

  /* screen space: lighting, flashes, joystick */
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const st=ZONES[S.zone],g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.22,W/2,H/2,Math.hypot(W,H)*.62);
  g.addColorStop(0,'rgba('+st.tint+',0)');g.addColorStop(1,'rgba('+st.tint+','+st.amb+')');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if(wipeT>0){wipeT=Math.max(0,wipeT-dt);const a=Math.min(1,wipeT/.45);ctx.fillStyle='rgba(8,11,13,'+a+')';ctx.fillRect(0,0,W,H);}
  if(S.rage>0&&o.mode==='play'){ctx.fillStyle='rgba(229,40,45,'+(.04+.02*Math.min(3,S.rage)+.03*Math.sin(time*3))+')';ctx.fillRect(0,0,W,H);}
  if(o.mode==='play'){
    const low=p.hp/p.maxhp<.3?(.22+.12*Math.sin(time*7)):0,a=Math.max(low,hurtFlash*.8);
    if(a>0){const g2=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.hypot(W,H)*.6);g2.addColorStop(0,'rgba(229,40,45,0)');g2.addColorStop(1,'rgba(229,40,45,'+a+')');ctx.fillStyle=g2;ctx.fillRect(0,0,W,H);}
    if(healFlash>0){const g3=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.hypot(W,H)*.6);g3.addColorStop(0,'rgba(60,230,130,0)');g3.addColorStop(1,'rgba(60,230,130,'+healFlash*.5+')');ctx.fillStyle=g3;ctx.fillRect(0,0,W,H);}
    if(flash>0&&!reduce){ctx.fillStyle='rgba(255,255,255,'+Math.min(.6,flash)+')';ctx.fillRect(0,0,W,H);}
    if(speedT>0&&!reduce){ctx.globalCompositeOperation='lighter';ctx.lineCap='round';const R=Math.hypot(W,H)/2,rs=srand(9);for(let i=0;i<26;i++){const a=rs()*TAU,r0=R*(.5+rs()*.25),r1=r0+R*(.12+rs()*.2)*speedT;ctx.strokeStyle='rgba(255,255,255,'+(.4*speedT)+')';ctx.lineWidth=1.5+rs()*3;ctx.beginPath();ctx.moveTo(W/2+Math.cos(a)*r0,H/2+Math.sin(a)*r0);ctx.lineTo(W/2+Math.cos(a)*r1,H/2+Math.sin(a)*r1);ctx.stroke();}ctx.globalCompositeOperation='source-over';}
    const j=o.joy;if(j&&j.active){ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(j.ox,j.oy,52,0,TAU);ctx.stroke();ctx.fillStyle='rgba(20,26,30,.25)';ctx.fill();
      const dx=j.x-j.ox,dy=j.y-j.oy,d=Math.hypot(dx,dy)||1,m=Math.min(52,d);ctx.fillStyle='rgba(255,255,255,.75)';ctx.beginPath();ctx.arc(j.ox+dx/d*m,j.oy+dy/d*m,21,0,TAU);ctx.fill();}
  }
}
function resize(){
  const r=cv.getBoundingClientRect();W=Math.max(1,r.width);H=Math.max(1,r.height);
  dpr=Math.min(window.devicePixelRatio||1,2);cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
  zoom=Math.max(.82,Math.min(1.5,Math.min(W,H)/520));
}
return{
  init(canvas){cv=canvas;ctx=cv.getContext('2d');reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);resize();},
  resize,render:safeRender,icon,
  view(){return{w:W/(zoom*zf),h:H/(zoom*zf)};},
  shake(a){shakeAmt=Math.max(shakeAmt,a);},
  opts(o){if(o.fx!==undefined)fxLv=o.fx;if(o.shake!==undefined)shakeOn=!!o.shake;if(o.bloom!==undefined){bloomOn=!!o.bloom;if(bloomOn){bloomAuto=true;slowT=0;}}},
  frozen(){return stopT>0&&!reduce;},
  celebrate(){const cols=['0,168,77','255,201,40','229,72,77','255,255,255','53,183,255'],vw=W/zoom,vh=H/zoom;for(let i=0;i<150;i++)P({k:'paper',x:cam.x+(Math.random()-.5)*vw,y:cam.y-vh/2-Math.random()*vh*.6,vx:(Math.random()-.5)*160,vy:120+Math.random()*220,g:60,life:2.6+Math.random()*1.6,size:6+Math.random()*4,col:cols[i%5],drag:.5});},
  reset(){parts.length=nums.length=fxs.length=corpses.length=ghosts.length=decals.length=0;shakeAmt=flash=hurtFlash=healFlash=zoomKick=stopT=speedT=wipeT=0;trainV=900;platA=doorA=0;cam.init=false;},
  size(){return{W,H};}
};
})();
