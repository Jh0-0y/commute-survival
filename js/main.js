'use strict';
/* 출근길 서바이벌 — host: UI, input, main loop. */
(function(){
const $=id=>document.getElementById(id);
const cv=$('cv');
GFX.init(cv);
window.addEventListener('resize',GFX.resize);

let testRun=false,lastBoss='',lastZone=-1,setFromMenu=false;let sim=null,mode='menu',paused=false,bannerT=0,luOpenAt=0,lastBuild=-1,lastClock='',lastStn=-1,lastHp='',lastLv=-1,lastKills=-1;
const host={
  sfx(n,x,arg){if(mode!=='play')return;let pan=0;if(x!==undefined&&sim){pan=Math.max(-.8,Math.min(.8,(x-sim.S.p.x)/480));}AudioSys.sfx(n,pan,arg);},
  banner(a,b,kind){if(mode!=='play')return;$('b0').textContent={station:'안내',warn:'주의',good:'보상',boss:'등장',heal:'회복',pass:'통과'}[kind]||'안내';$('b1').textContent=a;$('b2').textContent=b||'';const bn=$('banner');bn.className='';void bn.offsetWidth;bn.className='on'+(kind?' '+kind:'');bannerT=kind==='boss'?3.2:2.6;},
  shake(a){if(mode==='play')GFX.shake(a);},
  levelUp(ch,pm){showLevelUp(ch,pm);},
  end(won){if(mode==='play')showEnd(won);}
};
/* ---- settings (kept on this device only) ---- */
const SET={music:80,sfx:80,fx:2,shake:1,hand:0,bloom:1};
try{const o=JSON.parse(localStorage.getItem('commute-set')||'null');if(o)for(const k in SET)if(typeof o[k]==='number')SET[k]=o[k];}catch(e){}
function applySet(save){
  AudioSys.vol(SET.music/100,SET.sfx/100);GFX.opts({fx:SET.fx,shake:SET.shake,bloom:SET.bloom});
  for(let i=0;i<2;i++)$('bloom'+i).setAttribute('aria-pressed',SET.bloom===i?'true':'false');
  $('setMusic').value=SET.music;$('setSfx').value=SET.sfx;
  for(let i=0;i<3;i++)$('fx'+i).setAttribute('aria-pressed',SET.fx===i?'true':'false');
  for(let i=0;i<2;i++)$('shake'+i).setAttribute('aria-pressed',SET.shake===i?'true':'false');
  for(let i=0;i<2;i++)$('hand'+i).setAttribute('aria-pressed',SET.hand===i?'true':'false');app.classList.toggle('lefty',SET.hand===1);
  if(save)try{localStorage.setItem('commute-set',JSON.stringify(SET));}catch(e){}
}
/* ---- first-run guidance: each line shows once, at the moment it matters ---- */
let seen={};try{seen=JSON.parse(localStorage.getItem('commute-tut')||'{}')||{};}catch(e){}
let hintT=0,hintGap=0;
const HINTS=[
  ['move',S=>S.t>1.2,'WASD나 방향키, 또는 화면을 끌어서 움직입니다. 교통카드는 알아서 날아갑니다'],
  ['xp',S=>S.t>7&&S.beans.length>2,'떨어진 조각을 주우면 경험치가 찹니다. 다 차면 무기나 장비를 고릅니다'],
  ['dash',S=>S.t>14&&S.p.dashCd<=0&&S.enemies.length>14,'둘러싸이면 Space 또는 대시 버튼. 터치라면 다른 손가락으로 화면을 톡 쳐도 됩니다'],
  ['lane',S=>S.train&&!S.train.on,'빨간 경고가 뜬 길에서 물러나세요. 지나가는 차는 인파도 쓸어 갑니다'],
  ['boss',S=>S.gate&&!S.gate.dead,'이곳의 진상입니다. 밀어내야 다음 장소로 넘어가고, 오래 끌면 폭주합니다'],
  ['gates',S=>S.zk==='gates'&&S.zt>1.5,'개찰구는 사이 틈으로만 지나갈 수 있습니다. 인파도 틈으로 몰립니다'],
  ['evo',S=>Object.keys(S.weapons).some(k=>S.weapons[k]>=4&&S.weapons[k]<=WMAX),'무기를 6레벨까지 올리고 짝 장비를 갖추면 진화합니다. 짝은 카드 아래에 적혀 있습니다'],
  ['train',S=>S.zk==='train'&&S.zt>1.5,'열차 안에서는 도착할 때까지 버티면 됩니다. 좁은 통로라 앞뒤만 보면 됩니다'],
  ['doors',S=>S.zk==='train'&&S.doorT>0,'문이 열렸습니다. 문 앞에 서 있으면 밀려납니다. 닫힐 때까지 통로 가운데서 버티세요'],
  ['esc',S=>S.zk==='esc'&&S.zt>1.5,'에스컬레이터는 서 있기만 해도 떠밀립니다. 가운데 계단은 멈춰 있습니다']];
function tutorial(dt){
  const S=sim.S;if(S.diff!==0&&hintT<=0)return;if(hintT>0){hintT-=dt;if(hintT<=0){$('hint').className='';hintGap=1.5;}return;}
  if(hintGap>0){hintGap-=dt;return;}
  for(const h of HINTS)if(!seen[h[0]]&&h[1](S)){seen[h[0]]=1;try{localStorage.setItem('commute-tut',JSON.stringify(seen));}catch(e){}
    $('hintTxt').textContent=h[2];$('hint').className='on';hintT=5.5;AudioSys.sfx('hover');break;}
}
let diff=1;try{const d=parseInt(localStorage.getItem('commute-diff'),10);if(d>=0&&d<=3)diff=d;}catch(e){}
function startDemo(){GFX.reset();sim=createSim(host,{demo:true,diff:1,build:{weapons:{card:3,backpack:2,battery:2,coffee:1},passives:{}}});sim.S.t=18;sim.S.nextRow=24;mode='menu';}
function startGame(restore){
  AudioSys.init();GFX.reset();if(!restore)AudioSys.sfx('start');
  sim=createSim(host,restore?{restore}:{diff});testRun=!!window.COMMUTE_ADMIN;mode='play';paused=false;lastBuild=-1;lastClock='';lastStn=-1;lastHp='';lastLv=-1;lastKills=-1;
  $('menu').hidden=true;$('end').hidden=true;$('pause').hidden=true;$('levelup').hidden=true;$('hud').hidden=false;$('bossbar').hidden=true;$('banner').className='';$('hint').className='';hintT=0;hintGap=0;lastZone=-1;
  if(restore)setPaused(true,'이어서 출근하기');
}
function toMenu(){
  $('end').hidden=true;$('pause').hidden=true;$('levelup').hidden=true;$('hud').hidden=true;$('menu').hidden=false;$('banner').className='';
  showBest();startDemo();
}
function setPaused(v,title){
  if(mode!=='play'||sim.S.state==='over'||sim.S.state==='won')return;
  if(paused!==v)AudioSys.sfx(v?'pause':'resume');paused=v;
  if(sim.S.state==='levelup'){$('pause').hidden=true;return;}
  $('pause').hidden=!v;setFromMenu=false;$('btnQuit').hidden=false;$('btnResume').textContent='계속 출근하기';
  if(v){$('pauseTitle').firstChild.nodeValue=title||'일시정지';$('pauseSub').textContent='열차가 잠시 정차 중입니다';}
}

function menuSettings(v){setFromMenu=v;$('pause').hidden=!v;if(v){$('pauseTitle').firstChild.nodeValue='설정';$('pauseSub').textContent='소리와 화면을 기기에 맞게 조절하세요';$('btnQuit').hidden=true;$('btnResume').textContent='닫기';}}
/* ---- level-up UI ---- */
const LU={start:['오늘의 출근템','시작 무기를 하나 고르세요'],chest:['환승 보너스','진상을 밀어낸 보상입니다. 하나를 더 챙기세요'],level:['레벨 업','하나를 골라 챙기세요']};
function showLevelUp(ch,pm){
  luOpenAt=performance.now();
  const t=LU[pm]||LU.level;$('luTitle').firstChild.nodeValue=t[0];$('luSub').textContent=t[1];
  const box=$('cards');box.textContent='';
  ch.forEach((c,i)=>{
    const b=document.createElement('button');b.type='button';b.id='card'+(i+1);
    b.className='card'+(c.kind==='passive'?' pv':c.kind==='evo'?' evo':c.kind==='fuse'?' evo fuse':c.kind==='heal'?' heal':'');
    const tag=document.createElement('div');tag.className='tag';const ts=document.createElement('span');ts.textContent=c.tag;const k=document.createElement('kbd');k.textContent=i+1;tag.append(ts,k);
    const head=document.createElement('div');head.className='head';
    const im=document.createElement('img');im.alt='';im.src=GFX.icon(c.key,c.kind==='evo'||c.kind==='fuse');
    const hw=document.createElement('div');const h=document.createElement('h3');h.textContent=c.name;
    const lv=document.createElement('div');lv.className='lv';
    const mx=c.kind==='weapon'?WMAX:PMAX;
    if(c.kind==='weapon'||c.kind==='passive'){const pp=document.createElement('span');pp.className='pips';for(let j=1;j<=mx;j++){const d=document.createElement('i');if(j<c.to)d.className='on';else if(j===c.to)d.className='new';pp.appendChild(d);}lv.appendChild(pp);}
    lv.appendChild(document.createTextNode(c.kind==='fuse'?'숨겨진 조합 발견':c.kind==='evo'?'최종 진화':c.kind==='heal'?'즉시 사용':c.to===1?'새로 얻기':'Lv '+c.to+(c.to===mx?' (최대)':'')));
    hw.append(h,lv);head.append(im,hw);
    const d=document.createElement('p');d.textContent=c.desc;
    const hint=document.createElement('div');hint.className='hint';hint.textContent=c.hint||'';
    const mid=document.createElement('div');mid.className='mid';mid.append(head,d);b.append(tag,mid,hint);b.addEventListener('click',()=>pick(i));b.addEventListener('pointerenter',()=>AudioSys.sfx('hover'));box.appendChild(b);
  });
  const rb=$('btnReroll'),S=sim.S;rb.hidden=pm==='start';rb.disabled=S.rerolls<=0;
  rb.textContent='다시 뽑기 '+S.rerolls+'회 남음';const kb=document.createElement('kbd');kb.textContent='R';rb.appendChild(kb);
  $('pause').hidden=true;$('levelup').hidden=false;keys.clear();joy.active=false;
}
function pick(i){
  if(mode!=='play'||sim.S.state!=='levelup')return;
  if(performance.now()-luOpenAt<350)return;
  AudioSys.sfx(sim.S.choices&&sim.S.choices[i]&&sim.S.choices[i].kind==='evo'?'evo':'select');$('levelup').hidden=true;sim.choose(i);
  if(sim.S.state==='run'&&paused)$('pause').hidden=false;
}
function reroll(){if(mode==='play'&&sim.S.state==='levelup'&&sim.reroll())AudioSys.sfx('reroll');}

/* ---- end UI ---- */
const BEST='commute-best-v4-';
function loadBest(d){try{return JSON.parse(localStorage.getItem(BEST+d)||'null');}catch(e){return null;}}
function saveBest(d,b){if(testRun)return;try{localStorage.setItem(BEST+d,JSON.stringify(b));}catch(e){}}
function showBest(){
  const b=loadBest(diff);
  for(let i=0;i<4;i++){const el=$('diff'+i);el.setAttribute('aria-pressed',i===diff?'true':'false');}
  $('diffBlurb').textContent=DIFFS[diff].blurb;
  $('best').textContent=b?DIFFS[diff].name+' 최고 기록  '+(b.won?clockText(b.t)+(b.t>GAME_LEN?' 지각 출근':' 출근'):ZONES[b.zone||0].name+'까지 ('+clockText(b.t)+')')+' · 레벨 '+b.level+' · '+b.kills+'명':DIFFS[diff].name+' 난이도 기록이 아직 없습니다';
}
function showEnd(won){
  const S=sim.S;AudioSys.sfx(won?'win':'lose');if(won)GFX.celebrate();
  const late=won&&S.t>GAME_LEN,h=$('endTitle');h.textContent='';$('eChip').className='chip d'+S.diff;$('eChip').textContent='혼잡도 '+DIFFS[S.diff].name+(testRun?' · 실험실':'');h.append(won?clockText(S.t)+(late?' 지각 출근':' 정시 출근'):'멘탈이 무너졌습니다');
  const st=$('stamp');st.className='stamp '+(won?(late?'late':'ok'):'out');st.textContent=won?(late?'지각':'정시 출근'):'반차';const ss=document.createElement('small');ss.textContent=clockText(S.t);st.appendChild(ss);
  st.style.animation='none';void st.offsetWidth;st.style.animation='';
  const er=$('eRoute');er.textContent='';['역 앞','개찰구','승강장','열차 안','승강장','에스컬','회사 앞'].forEach((n,i)=>{const li=document.createElement('li');li.textContent=n;li.className=won||i<S.zone?'done':i===S.zone?'stop':'';er.appendChild(li);});
  const sm=document.createElement('small');
  sm.textContent=won?(late?'도착은 했습니다. 팀장님 눈을 피해 자리에 앉습니다':'사원증을 찍었습니다. 이제 진짜 하루가 시작됩니다'):ZONES[S.zone].name+'에서 멈췄습니다. 오늘은 반차를 씁니다';
  h.appendChild(sm);
  $('eTime').textContent=clockText(S.t);$('eKills').textContent=S.kills.toLocaleString('ko-KR');$('eLv').textContent=S.p.level;$('eTaken').textContent=Math.round(S.taken).toLocaleString('ko-KR');
  const box=$('eDmg');box.textContent='';
  const rows=Object.keys(S.dmg).map(k=>[k,S.dmg[k]]).sort((a,b)=>b[1]-a[1]);const mx=rows.length?rows[0][1]:1;
  rows.forEach(([k,v])=>{const r=document.createElement('div'),n=document.createElement('span');
    n.textContent=k==='train'?'열차':FUSIONS[k]?FUSIONS[k].name:!WEAPONS[k]?k:(S.weapons[k]>WMAX||S.fsrc[k]?WEAPONS[k].evoName:WEAPONS[k].name);
    const bw=document.createElement('span'),bar=document.createElement('i');bar.style.width=Math.max(2,v/mx*100)+'%';if(k==='train')bar.style.background='#8b9599';bw.appendChild(bar);
    const val=document.createElement('span');val.textContent=Math.round(v).toLocaleString('ko-KR');r.append(n,bw,val);box.appendChild(r);});
  const prev=loadBest(S.diff),cur={t:S.t,kills:S.kills,level:S.p.level,won,zone:S.zone};
  const better=!prev||(cur.won&&!prev.won)||(cur.won&&prev.won&&cur.t<prev.t)||(!cur.won&&!prev.won&&((cur.zone||0)>(prev.zone||0)||((cur.zone||0)===(prev.zone||0)&&cur.t>prev.t)));if(better)saveBest(S.diff,cur);
  $('levelup').hidden=true;$('pause').hidden=true;$('end').hidden=false;
}

/* ---- input ---- */
const keys=new Set();const joy={active:false,id:null,ox:0,oy:0,x:0,y:0};
const KEYMAP={ArrowUp:'u',KeyW:'u',ArrowDown:'d',KeyS:'d',ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r'};
function tryDash(){if(mode==='play'&&!paused&&sim.S.state==='run'){sim.S.input=readInput();sim.dash();}}
window.addEventListener('keydown',e=>{
  if(mode==='play'&&sim.S.state==='levelup'){
    const n={Digit1:0,Digit2:1,Digit3:2,Numpad1:0,Numpad2:1,Numpad3:2}[e.code];
    if(n!==undefined){if(!e.repeat)pick(n);e.preventDefault();return;}
    if(e.code==='KeyR'){if(!e.repeat)reroll();e.preventDefault();return;}
  }
  if(e.code==='Space'||e.code==='ShiftLeft'||e.code==='ShiftRight'){
    if(mode==='play'){if(!e.repeat)tryDash();e.preventDefault();return;}
    if(mode==='menu'&&e.code==='Space'&&document.activeElement===document.body){startGame();e.preventDefault();return;}
  }
  if(e.repeat)return;
  if(e.code==='KeyP'||e.code==='Escape'){if(mode==='play'&&sim.S.state==='run'){setPaused(!paused);e.preventDefault();}return;}
  if(e.code==='Enter'&&mode==='menu'&&document.activeElement===document.body){startGame();e.preventDefault();return;}
  const k=KEYMAP[e.code];if(k){keys.add(k);e.preventDefault();}
});
window.addEventListener('keyup',e=>{const k=KEYMAP[e.code];if(k)keys.delete(k);});
window.addEventListener('blur',()=>{keys.clear();joy.active=false;});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='play'&&sim.S.state==='run'&&!paused)setPaused(true);});
cv.addEventListener('pointerdown',e=>{if(mode!=='play')return;if(joy.active&&e.pointerId!==joy.id){tryDash();e.preventDefault();return;}joy.active=true;joy.id=e.pointerId;joy.ox=joy.x=e.clientX;joy.oy=joy.y=e.clientY;try{cv.setPointerCapture(e.pointerId);}catch(_){}e.preventDefault();});
cv.addEventListener('pointermove',e=>{if(joy.active&&e.pointerId===joy.id){joy.x=e.clientX;joy.y=e.clientY;}});
const joyEnd=e=>{if(e.pointerId===joy.id)joy.active=false;};
cv.addEventListener('pointerup',joyEnd);cv.addEventListener('pointercancel',joyEnd);
cv.addEventListener('contextmenu',e=>e.preventDefault());
function readInput(){
  let x=(keys.has('r')?1:0)-(keys.has('l')?1:0),y=(keys.has('d')?1:0)-(keys.has('u')?1:0);
  if(joy.active){const dx=joy.x-joy.ox,dy=joy.y-joy.oy,d=Math.hypot(dx,dy);if(d>8){const m=Math.min(1,d/52);x=dx/d*m;y=dy/d*m;}}
  const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}
  return{x,y};
}
$('btnStart').addEventListener('click',()=>startGame());
for(let i=0;i<4;i++)$('diff'+i).addEventListener('click',()=>{diff=i;try{localStorage.setItem('commute-diff',String(i));}catch(e){}AudioSys.sfx('click');showBest();});
$('btnRetry').addEventListener('click',()=>startGame());
$('btnHome').addEventListener('click',toMenu);
for(const b of document.querySelectorAll('.go,.hudbtns button'))b.addEventListener('click',()=>AudioSys.sfx('click'));
const wake=()=>{AudioSys.init();AudioSys.vol(SET.music/100,SET.sfx/100);};window.addEventListener('pointerdown',wake,{passive:true});window.addEventListener('keydown',wake);
$('btnQuit').addEventListener('click',toMenu);
$('btnResume').addEventListener('click',()=>{if(setFromMenu)menuSettings(false);else setPaused(false);});
$('btnPause').addEventListener('click',()=>{if(sim.S.state==='run')setPaused(!paused);});
$('btnReroll').addEventListener('click',reroll);
$('btnDash').addEventListener('pointerdown',e=>{e.preventDefault();tryDash();});
$('btnSet').addEventListener('click',()=>{if(sim.S.state==='run')setPaused(true,'설정');});
$('btnSetMenu').addEventListener('click',()=>menuSettings(true));
$('btnHow').addEventListener('click',()=>{const h=$('how');h.hidden=!h.hidden;$('btnHow').setAttribute('aria-expanded',String(!h.hidden));});
$('setMusic').addEventListener('input',e=>{SET.music=+e.target.value;applySet(true);});
$('setSfx').addEventListener('input',e=>{SET.sfx=+e.target.value;applySet(true);});
$('setSfx').addEventListener('change',()=>AudioSys.sfx('select'));
for(let i=0;i<3;i++)$('fx'+i).addEventListener('click',()=>{SET.fx=i;applySet(true);AudioSys.sfx('click');});
for(let i=0;i<2;i++)$('bloom'+i).addEventListener('click',()=>{SET.bloom=i;applySet(true);AudioSys.sfx('click');});
for(let i=0;i<2;i++)$('hand'+i).addEventListener('click',()=>{SET.hand=i;applySet(true);AudioSys.sfx('click');});
for(let i=0;i<2;i++)$('shake'+i).addEventListener('click',()=>{SET.shake=i;applySet(true);AudioSys.sfx('click');if(i)GFX.shake(8);});
$('btnTut').addEventListener('click',()=>{seen={};try{localStorage.removeItem('commute-tut');}catch(e){}$('btnTut').textContent='다음 판부터 다시 나옵니다';AudioSys.sfx('click');});

/* ---- HUD ---- */
function slotEl(cls,key,lvl,max,evo){
  const s=document.createElement('div');s.className='slot '+cls+(key?' on':'')+(evo?' evo':'');
  if(key){const im=document.createElement('img');im.alt='';im.src=GFX.icon(key,evo);s.appendChild(im);const em=document.createElement('em');em.textContent=evo?'★':lvl>=max?'M':lvl;s.appendChild(em);
    s.title=FUSIONS[key]?FUSIONS[key].name:(evo?WEAPONS[key].evoName:(WEAPONS[key]||PASSIVES[key]).name);if(FUSIONS[key])em.textContent='◆';}
  return s;
}
function updateHud(){
  const S=sim.S,p=S.p;
  const hp=Math.ceil(p.hp)+'/'+p.maxhp;
  if(hp!==lastHp){lastHp=hp;$('hpfill').style.width=Math.max(0,p.hp/p.maxhp*100)+'%';$('hptxt').textContent='멘탈 '+Math.ceil(p.hp)+' / '+p.maxhp;}
  $('xpfill').style.width=Math.min(100,p.xp/xpNeed(p.level)*100)+'%';
  if(p.level!==lastLv){lastLv=p.level;$('lv').textContent=p.level;}
  if(S.kills!==lastKills){lastKills=S.kills;$('kills').textContent=S.kills.toLocaleString('ko-KR');}
  const c=clockText(S.t);if(c!==lastClock){lastClock=c;$('clock').textContent=c;$('clock').classList.toggle('late',S.t>GAME_LEN);}
  const inT=S.zk==='train',nm=inT?(S.doorT>0&&S.stopIdx>0?STOPS[S.stopIdx-1].name:S.stopIdx<STOPS.length?STOPS[S.stopIdx].name:LAST_STOP):ZONES[S.zone].short,key=(inT?(S.doorT>0?'이번 역':'다음 역'):'지금 여기')+'|'+nm;
  if(key!==lastStn){lastStn=key;$('stnLabel').textContent=key.split('|')[0];$('stn').textContent=nm;}
  if(S.zone!==lastZone){lastZone=S.zone;const m=$('mini');m.textContent='';for(let i=0;i<ZONES.length;i++){if(i){const u=document.createElement('u');if(i<=S.zone)u.className='done';m.appendChild(u);}const d=document.createElement('i');d.className=i<S.zone?'done':i===S.zone?'now':'';m.appendChild(d);}}
  const bb=$('bossbar');
  const G=GATE[ZONES[S.zone].key],mmss=v=>{v=Math.max(0,Math.ceil(v));return Math.floor(v/60)+':'+(v%60<10?'0':'')+v%60;};let bl='',bw=0,bc='';
  if(S.gate&&!S.gate.dead){bl=(S.gate.label||S.gate.def.name)+(S.rage>0?' · 폭주 '+S.rage+'단계':' · 폭주까지 '+mmss(S.rageT));bw=S.gate.hp/S.gate.maxhp;bc=S.rage>0?'rage':'';}
  else if(S.phase==='ride'&&S.doorT>0&&S.stopIdx>0&&!(S.boss&&!S.boss.dead)){bl=STOPS[S.stopIdx-1].name+'역 정차 · 문 닫힘까지 '+mmss(S.doorT);bw=S.doorT/DOOR_OPEN;bc='rage';}
  else if(S.phase==='ride'){bl=(S.boss&&!S.boss.dead?S.boss.def.name+' · ':'')+LAST_STOP+' 도착까지 '+mmss(G.ride-S.zt);bw=S.boss&&!S.boss.dead?S.boss.hp/S.boss.maxhp:S.zt/G.ride;bc=S.boss&&!S.boss.dead?'':'wait';}
  if(bl){bb.hidden=false;if(bl!==lastBoss){lastBoss=bl;$('bossname').textContent=bl;}bb.className=bc;$('bossfill').style.width=Math.max(0,Math.min(1,bw))*100+'%';}else bb.hidden=true;
  const db=$('btnDash'),rd=p.dashCd<=0;db.style.setProperty('--cd',rd?1:1-p.dashCd/S.M.dashCd);db.classList.toggle('ready',rd);
  if(S.buildVer!==lastBuild){lastBuild=S.buildVer;
    const w=$('slotsW'),q=$('slotsP');w.textContent='';q.textContent='';
    const wk=Object.keys(S.fus).concat(Object.keys(S.weapons)),pk=Object.keys(S.passives);
    for(let i=0;i<MAX_W;i++){const k=wk[i];w.appendChild(slotEl(k==='card'||k==='freepass'?'base':'',k,k&&(S.fus[k]?EVO:S.weapons[k]),WMAX,k&&(S.fus[k]||S.weapons[k]>WMAX)));}
    for(let i=0;i<MAX_P;i++){const k=pk[i];q.appendChild(slotEl(k==='shoes'?'pv base':'pv',k,k&&S.passives[k],PMAX,false));}
  }
}

const NOTI=[['알람','알람','08:00입니다. 5분만 더는 없습니다'],['팀장','김 팀장','9시 주간 회의입니다. 늦지 마세요'],['동기','입사 동기','오늘 2호선 지옥이래. 살아서 보자'],['엄마','엄마','아침은 먹고 가니? 우산 챙겨라'],['날씨','오늘 날씨','월요일, 출근길 인파 매우 많음'],['회사','사내 공지','지각 3회 시 반차 1회 차감됩니다']];
let notiI=-1;function nextNoti(){notiI=(notiI+1)%NOTI.length;const n=NOTI[notiI];$('notiIc').textContent=n[0];$('notiFrom').textContent=n[1];$('notiTxt').textContent=n[2];const el=document.querySelector('.noti');el.classList.remove('in');void el.offsetWidth;el.classList.add('in');}
/* ---- loop ---- */
let last=0;
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(.1,(now-last)/1000||0);last=now;
  if(!sim)return;
  const running=mode==='menu'||(mode==='play'&&!paused&&sim.S.state==='run');
  $('app').classList.toggle('modal',mode==='play'&&!running);
  if(running&&!GFX.frozen()){
    if(bannerT>0){bannerT-=dt;if(bannerT<=0)$('banner').className='';}
    const n=Math.max(1,Math.ceil(dt/(1/60))),h=dt/n,v=GFX.view();
    if(mode==='play')tutorial(dt);
    for(let i=0;i<n&&sim.S.state==='run';i++){
      if(mode==='menu'){const b=sim.bot();sim.S.input=b;if(b.dash)sim.dash();}else sim.S.input=readInput();
      sim.update(h,v);}
    if(mode==='menu'&&sim.S.t>75)startDemo();
  }
  const wide=GFX.size().W>=980;
  GFX.render(sim.S,{mode,dt,running,fx:mode==='play'&&(sim.S.state==='won'||sim.S.state==='over'),joy,offX:mode==='menu'&&wide?-.2:0,offY:0});
  const S=sim.S,ended=S.state==='over'||S.state==='won';
  if(mode==='play'){updateHud();AudioSys.music({scene:ended?'off':'play',station:S.song,boss:!!S.boss,muffled:!running,late:S.rage>0,lowhp:S.p.hp/S.p.maxhp<.3,crowd:S.enemies.length});}
  else AudioSys.music({scene:'menu'});
}

/* ---- boot (keeps a run alive across a republish) ---- */
function boot(data){
  GFX.resize();applySet(false);showBest();nextNoti();setInterval(()=>{if(mode==='menu')nextNoti();},4200);
  if(data&&data.weapons&&data.t>0&&Object.keys(data.weapons).length)startGame(data);else startDemo();
  requestAnimationFrame(t=>{last=t;requestAnimationFrame(frame);});
}
if(location.hash==='#dbg')window.__dbg={sim:()=>sim,GFX};
if(window.COMMUTE_ADMIN)window.__lab={sim:()=>sim,mode:()=>mode};
try{window.claude&&window.claude.hot&&window.claude.hot.snapshot&&window.claude.hot.snapshot(()=>(mode==='play'&&sim&&sim.S.state!=='over'&&sim.S.state!=='won'&&Object.keys(sim.S.weapons).length)?JSON.parse(JSON.stringify(sim.serialize())):{});}catch(e){}
if(window.claude&&window.claude.hot&&window.claude.hot.ready)window.claude.hot.ready(boot);else boot((window.claude&&window.claude.hot&&window.claude.hot.data)||{});
})();
