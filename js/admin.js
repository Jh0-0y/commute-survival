/* Lab build only: a panel that sets weapons, gear and hidden combinations directly, on top of the unmodified game. */
(function(){
  const lab=()=>window.__lab.sim();
  const A={inv:true,noxp:false,nopick:true,hold:true,rate:1,w:{card:1},p:{},f:{},dirty:true};
  const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e;};
  const btn=(t,fn,cls)=>{const b=el('button',cls||'',t);b.type='button';b.addEventListener('click',fn);return b;};
  const panel=el('aside');panel.id='adm';
  /* header: title, one reset for the whole build, collapse */
  const head=el('div','adm-h');const tog=btn('접기',()=>{panel.classList.toggle('min');tog.textContent=panel.classList.contains('min')?'펴기':'접기';},'adm-t');
  const hb=el('div','adm-hb');hb.append(btn('초기화',()=>resetAll(),'adm-reset'),tog);head.append(el('b','','실험실'),hb);panel.append(head);
  const body=el('div','adm-b');panel.append(body);
  const sec=(t,open)=>{const d=document.createElement('details');d.open=open!==false;const s=el('summary','',t);d.append(s);const c=el('div','adm-s');d.append(c);body.append(d);return c;};

  /* ---- damage meter ---- */
  const dm=sec('피해량 · 초당, 최근 5초');const dmTot=el('div','adm-dt','무기를 올리면 여기에 나옵니다');const dmList=el('div','adm-dl');
  let hist=[],lastSample=0;
  const clearMeter=()=>{const sm=window.__lab&&lab();if(sm)sm.S.dmg={};hist=[];dmList.textContent='';dmTot.textContent='다시 재는 중…';};
  const dmRow=el('div','adm-r');dmRow.append(btn('측정만 다시',clearMeter));dm.append(dmTot,dmList,dmRow);
  const srcName=(S,k)=>k==='train'?'열차·버스':FUSIONS[k]?FUSIONS[k].name:WEAPONS[k]?((S.weapons[k]>=EVO||S.fsrc[k])?WEAPONS[k].evoName:WEAPONS[k].name):k;
  function meter(S){const now=performance.now();if(now-lastSample<250)return;lastSample=now;hist.push({t:now,d:Object.assign({},S.dmg)});while(hist.length>2&&now-hist[0].t>5000)hist.shift();
    const a=hist[0],b=hist[hist.length-1],dt=(b.t-a.t)/1000;if(dt<.4)return;const rows=[];let tot=0,cum=0;
    for(const k in b.d){const v=Math.max(0,(b.d[k]-(a.d[k]||0))/dt);cum+=b.d[k];if(b.d[k]>0){rows.push([k,v,b.d[k]]);tot+=v;}}
    if(!rows.length)return;rows.sort((x,y)=>y[1]-x[1]||y[2]-x[2]);dmTot.textContent='합계 초당 '+Math.round(tot)+' · 누적 '+Math.round(cum).toLocaleString();dmList.textContent='';
    const mx=Math.max(1,rows[0][1]);
    for(const r of rows.slice(0,10)){const row=el('div','adm-d');const bar=el('i');bar.style.width=Math.round(r[1]/mx*100)+'%';const bx=el('span','adm-bar');bx.append(bar);
      row.append(el('span','adm-n',srcName(S,r[0])),bx,el('b','',String(Math.round(r[1]))),el('small','',tot>0?Math.round(r[1]/tot*100)+'%':'—'));row.title='누적 '+Math.round(r[2]).toLocaleString();dmList.append(row);}}

  /* ---- build: weapons / gear / hidden combinations, in tabs ---- */
  const bd=sec('구성');const sum=el('div','adm-sum');const tabs=el('div','adm-tabs');const pages={};let cur='w';
  const showTab=k=>{cur=k;for(const t in pages){pages[t].page.hidden=t!==k;pages[t].tab.setAttribute('aria-pressed',t===k?'true':'false');}};
  for(const [k,t] of [['w','무기'],['p','장비'],['f','히든 조합']]){const tab=btn(t,()=>showTab(k));const page=el('div','adm-page');pages[k]={tab,page};tabs.append(tab);}
  bd.append(sum,tabs);for(const k in pages)bd.append(pages[k].page);
  const rows={};
  /* level picker: click a pip to set that level, click the current one again to switch the item off */
  function pips(n,get,set,star){const box=el('span','adm-pips');const list=[];
    for(let i=1;i<=n;i++){const b=btn('',()=>set(get()===i?0:i),'adm-pip');b.title=i+'레벨';b.setAttribute('aria-label',i+'레벨');list.push(b);box.append(b);}
    let sb=null;if(star){sb=btn('★',()=>set(get()>=EVO?0:EVO),'adm-star');sb.title='진화';sb.setAttribute('aria-label','진화');box.append(sb);}
    return{box,paint(){const v=get();list.forEach((b,i)=>b.classList.toggle('on',i<Math.min(v,n)));if(sb)sb.classList.toggle('on',v>=EVO);}};}
  const tools=(page,items)=>{const r=el('div','adm-r adm-tools');for(const [t,fn] of items)r.append(btn(t,fn));page.append(r);};
  tools(pages.w.page,[['전부 진화',()=>{for(const k in WEAPONS)A.w[k]=EVO;A.f={};touch();}],['무기 비우기',()=>{A.w={};A.f={};touch();}]]);
  for(const k in WEAPONS){const w=WEAPONS[k],r=el('div','adm-w');const nm=el('span','adm-n',w.name);nm.title=w.name+' → '+w.evoName+'\n짝 장비: '+PASSIVES[w.pair].name;
    const pp=pips(WMAX,()=>A.w[k]||0,n=>{if(n>0)A.w[k]=n;else delete A.w[k];for(const f in FUSIONS)if((FUSIONS[f].a===k||FUSIONS[f].b===k)&&A.f[f]&&n<EVO)delete A.f[f];touch();},true);
    r.append(nm,pp.box);pages.w.page.append(r);rows['w'+k]={r,pp,nm,w};}
  tools(pages.p.page,[['전부 최대',()=>{for(const k in PASSIVES)A.p[k]=PMAX;touch();}],['장비 비우기',()=>{A.p={};touch();}]]);
  for(const k in PASSIVES){const q=PASSIVES[k],r=el('div','adm-w');const box=el('div','adm-f');box.append(el('span','adm-n',q.name),el('small','',q.desc));
    const pp=pips(PMAX,()=>A.p[k]||0,n=>{if(n>0)A.p[k]=n;else delete A.p[k];touch();},false);r.append(box,pp.box);pages.p.page.append(r);rows['p'+k]={r,pp};}
  for(const k in FUSIONS){const f=FUSIONS[k],r=el('div','adm-w');const box=el('div','adm-f');box.append(el('span','adm-n',f.name),el('small','',WEAPONS[f.a].name+' + '+WEAPONS[f.b].name));r.title=f.desc;
    const b=btn('켜기',()=>{if(A.f[k])delete A.f[k];else{A.f[k]=1;A.w[f.a]=EVO;A.w[f.b]=EVO;}touch();},'adm-on');r.append(box,b);pages.f.page.append(r);rows['f'+k]={r,b};}
  pages.f.page.append(el('p','adm-note','켜면 재료 무기 둘이 진화 상태로 합쳐집니다. 끄면 두 무기가 진화 상태로 남습니다.'));

  /* ---- arena: place, targets, bosses (never touched by 초기화) ---- */
  const ar=sec('장소와 적');
  const zr=el('div','adm-r');const zs=document.createElement('select');zs.setAttribute('aria-label','장소');ZONES.forEach((z,i)=>{const o=el('option','',(i+1)+'. '+z.name);o.value=i;zs.append(o);});
  zr.append(zs,btn('이동',()=>{const S=lab().S;S.zone=+zs.value;lab().dbg.enterZone(S.zone);}));ar.append(zr);
  const dr=el('div','adm-r');dr.append(el('span','adm-lb','혼잡도'));const dseg=el('span','adm-seg');const paintDiff=()=>{const L=window.__lab,sm=L&&L.sim();if(!sm)return;[...dseg.children].forEach((o,i)=>o.setAttribute('aria-pressed',i===sm.S.diff?'true':'false'));};
  DIFFS.forEach((d,i)=>dseg.append(btn(d.name,()=>{lab().dbg.setDiff(i);paintDiff();})));dr.append(dseg);ar.append(dr);
  ar.append(el('p','adm-note','혼잡도를 바꾸면 그 뒤에 나오는 적과 보스부터 해당 난이도의 체력·공격력이 적용됩니다. 이미 나와 있는 적과 허수아비는 그대로입니다.'));
  const tr=el('div','adm-r');tr.append(btn('허수아비 12',()=>{const S=lab().S,p=S.p;for(let i=0;i<12;i++){const a=i/12*Math.PI*2,e=lab().dbg.spawn('pass',p.x+Math.cos(a)*170,p.y+Math.sin(a)*(S.zk==='train'?40:130));e.spd=0;e.hp=e.maxhp=4e5;e.dmg=0;e.dummy=true;}}),
    btn('적 치우기',()=>{for(const e of lab().S.enemies.slice())if(!e.dead)lab().dbg.kill(e,'train');}));ar.append(tr);
  const rr=el('div','adm-r');rr.append(el('span','adm-lb','적 생성'));const seg=el('span','adm-seg');for(const [t,v] of [['없음',0],['보통',1],['많이',3]]){const b=btn(t,()=>{A.rate=v;for(const o of seg.children)o.setAttribute('aria-pressed',o===b?'true':'false');});b.setAttribute('aria-pressed',v===1?'true':'false');seg.append(b);}rr.append(seg);ar.append(rr);
  const br=el('div','adm-r');const bs=document.createElement('select');bs.setAttribute('aria-label','보스');for(const k in ENEMIES)if(ENEMIES[k].boss){const o=el('option','',ENEMIES[k].name);o.value=k;bs.append(o);}
  br.append(bs,btn('소환',()=>{lab().dbg.boss(bs.value);}),btn('폭주 +1',()=>{lab().S.rage++;}));ar.append(br);

  /* ---- rules ---- */
  const sw=sec('조건');
  const chk=(label,key)=>{const l=el('label','adm-c');const i=document.createElement('input');i.type='checkbox';i.checked=!!A[key];i.addEventListener('change',()=>{A[key]=i.checked;});l.append(i,document.createTextNode(label));sw.append(l);};
  chk('무적','inv');chk('경험치 끄기 (레벨이 안 오름)','noxp');chk('레벨업 창 끄기 (레벨은 오름)','nopick');chk('진행 멈춤 (보스·장소 이동 안 함)','hold');
  body.append(el('p','adm-note','칸 제한 없이 넣을 수 있고, 기록은 저장되지 않습니다. 초기화는 무기·장비·히든 조합과 피해량을 비우며, 장소와 허수아비는 그대로 둡니다.'));

  function resetAll(){A.w={card:1};A.p={};A.f={};touch();clearMeter();dmTot.textContent='무기를 올리면 여기에 나옵니다';}
  function touch(){A.dirty=true;sync();}
  function sync(){let nw=0,ne=0,np=0,nf=0;
    for(const k in WEAPONS){const o=rows['w'+k],n=A.w[k]||0;o.pp.paint();o.r.classList.toggle('on',n>0);o.r.classList.toggle('evo',n>=EVO);o.nm.textContent=n>=EVO?o.w.evoName:o.w.name;if(n){nw++;if(n>=EVO)ne++;}}
    for(const k in PASSIVES){const o=rows['p'+k],n=A.p[k]||0;o.pp.paint();o.r.classList.toggle('on',n>0);if(n)np++;}
    for(const k in FUSIONS){const o=rows['f'+k],on=!!A.f[k];o.b.textContent=on?'끄기':'켜기';o.b.setAttribute('aria-pressed',on?'true':'false');o.r.classList.toggle('evo',on);if(on)nf++;}
    sum.textContent='무기 '+nw+(ne?' (진화 '+ne+')':'')+' · 장비 '+np+' · 히든 '+nf;
    pages.w.tab.textContent='무기'+(nw?' '+nw:'');pages.p.tab.textContent='장비'+(np?' '+np:'');pages.f.tab.textContent='히든 조합'+(nf?' '+nf:'');}
  showTab('w');sync();document.getElementById('app').append(panel);
  function tick(){requestAnimationFrame(tick);const L=window.__lab,sim=L&&L.sim(),mode=L?L.mode():'';
    if(!sim||mode!=='play'){panel.hidden=true;return;}panel.hidden=false;
    const S=sim.S,p=S.p;if(S.state!=='run'&&S.state!=='levelup')return;
    if(S!==tick.S){tick.S=S;A.dirty=true;hist=[];paintDiff();}
    if(A.dirty){A.dirty=false;const w={},fsrc={},fus={};for(const k in A.f){fus[k]=1;fsrc[FUSIONS[k].a]=1;fsrc[FUSIONS[k].b]=1;}
      for(const k in A.w)if(!fsrc[k])w[k]=A.w[k];S.weapons=w;S.passives=Object.assign({},A.p);S.fus=fus;S.fsrc=fsrc;S.beams.length=0;S.umbQ=null;sim.dbg.recalc();}
    if(A.inv)p.hp=p.maxhp;
    if(A.noxp)p.xp=0;
    S.admNoPick=!!A.nopick;
    if(A.hold&&(S.phase==='crowd'||S.phase==='ride')&&S.zt>6)S.zt=6;
    S.admRate=A.rate;meter(S);}
  requestAnimationFrame(tick);
})();
