'use strict';
/* 출근길 서바이벌 — sound engine.
   Everything is synthesized: a step sequencer with one song per station (plus a title theme and
   boss / last-stretch layers), and layered, positional sound effects. */
const AudioSys=(function(){
  let AC=null,mode=0,mv=1,sv=1; // 0 everything, 1 effects only, 2 off
  let master,musicIn,musicLP,musicGain,sfxGain,dly,dlySend,mVerbSend,sVerbSend,ambGain,ambSrc,noiseBuf,brownBuf;
  const last={};
  const hz=m=>440*Math.pow(2,(m-69)/12),rnd=(a,b)=>a+Math.random()*(b-a);

  /* ---------------- graph ---------------- */
  function impulse(sec,decay){const n=Math.floor(AC.sampleRate*sec),b=AC.createBuffer(2,n,AC.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,decay);}return b;}
  function build(ctx){
    AC=ctx;
    master=AC.createGain();master.gain.value=.72;
    const comp=AC.createDynamicsCompressor();comp.threshold.value=-16;comp.knee.value=12;comp.ratio.value=5;comp.attack.value=.004;comp.release.value=.16;
    const lim=AC.createDynamicsCompressor();lim.threshold.value=-4;lim.knee.value=0;lim.ratio.value=20;lim.attack.value=.001;lim.release.value=.08;const outG=AC.createGain();outG.gain.value=.84;
    master.connect(comp);comp.connect(lim);lim.connect(outG);outG.connect(AC.destination);
    musicGain=AC.createGain();musicGain.connect(master);
    musicLP=AC.createBiquadFilter();musicLP.type='lowpass';musicLP.frequency.value=19000;musicLP.Q.value=.3;musicLP.connect(musicGain);
    musicIn=AC.createGain();musicIn.connect(musicLP);
    sfxGain=AC.createGain();sfxGain.connect(master);
    // tempo delay for leads and arps
    dly=AC.createDelay(1);dly.delayTime.value=.3;const fb=AC.createGain();fb.gain.value=.32;const df=AC.createBiquadFilter();df.type='lowpass';df.frequency.value=2600;
    dlySend=AC.createGain();dlySend.connect(dly);dly.connect(df);df.connect(fb);fb.connect(dly);df.connect(musicLP);
    // two small rooms: one for music, one for effects
    const mv=AC.createConvolver();mv.buffer=impulse(1.7,2.6);const mvo=AC.createGain();mvo.gain.value=.5;mVerbSend=AC.createGain();mVerbSend.connect(mv);mv.connect(mvo);mvo.connect(musicLP);
    const sv=AC.createConvolver();sv.buffer=impulse(1.2,3);const svo=AC.createGain();svo.gain.value=.45;sVerbSend=AC.createGain();sVerbSend.connect(sv);sv.connect(svo);svo.connect(sfxGain);
    // noise sources
    const len=AC.sampleRate;noiseBuf=AC.createBuffer(1,len,AC.sampleRate);brownBuf=AC.createBuffer(1,len,AC.sampleRate);
    const w=noiseBuf.getChannelData(0),br=brownBuf.getChannelData(0);let lastV=0;
    for(let i=0;i<len;i++){const x=Math.random()*2-1;w[i]=x;lastV=(lastV+.02*x)/1.02;br[i]=lastV*3.5;}
    // platform murmur, driven by how crowded the screen is
    ambGain=AC.createGain();ambGain.gain.value=0;const af=AC.createBiquadFilter();af.type='bandpass';af.frequency.value=420;af.Q.value=.6;
    try{ambSrc=AC.createBufferSource();ambSrc.buffer=brownBuf;ambSrc.loop=true;ambSrc.connect(af);af.connect(ambGain);ambGain.connect(sfxGain);ambSrc.start();}catch(e){}
    applyMode();
  }
  function init(){
    try{if(!AC)build(new (window.AudioContext||window.webkitAudioContext)());if(AC.state==='suspended')AC.resume();}catch(e){AC=null;}
  }
  function applyMode(){if(!AC)return;try{const t=AC.currentTime;sfxGain.gain.setTargetAtTime(mode===2?0:1.5*sv,t,.03);musicGain.gain.setTargetAtTime(mode===0?.45*mv:0,t,.03);}catch(e){}}

  /* ---------------- building blocks ---------------- */
  function envGain(t,a,pk,d,dest){const g=AC.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(pk,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+d);g.connect(dest);return g;}
  function osc(type,f0,f1,t,dur,dest,det){const o=AC.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1&&f1!==f0)o.frequency.exponentialRampToValueAtTime(Math.max(18,f1),t+dur);if(det)o.detune.value=det;o.connect(dest);o.start(t);o.stop(t+dur+.06);return o;}
  function T(dest,t,type,f0,f1,dur,vol,att){osc(type,f0,f1,t,dur,envGain(t,att||.004,vol,dur,dest));}
  function N(dest,t,dur,vol,ftype,f0,f1,q,brown,att){
    const s=AC.createBufferSource();s.buffer=brown?brownBuf:noiseBuf;s.loop=true;
    const f=AC.createBiquadFilter();f.type=ftype||'highpass';f.frequency.setValueAtTime(f0,t);if(f1&&f1!==f0)f.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);f.Q.value=q||.7;
    s.connect(f);f.connect(envGain(t,att||.003,vol,dur,dest));s.start(t,Math.random()*.8);s.stop(t+dur+.06);
  }
  function bell(dest,t,m,dur,vol){const f=hz(m);T(dest,t,'sine',f,f,dur,vol,.002);T(dest,t,'sine',f*2.76,f*2.76,dur*.45,vol*.35,.002);T(dest,t,'sine',f*5.4,f*5.4,dur*.18,vol*.15,.001);}
  function panTo(p,dest){if(!p||!AC.createStereoPanner)return dest;const n=AC.createStereoPanner();n.pan.value=Math.max(-1,Math.min(1,p));n.connect(dest);return n;}
  function wet(dest,amt){const g=AC.createGain();g.gain.value=1;g.connect(dest);const s=AC.createGain();s.gain.value=amt;g.connect(s);s.connect(sVerbSend);return g;}

  /* ---------------- instruments (music) ---------------- */
  const I={
    kick(t,v){T(musicIn,t,'sine',165,44,.2,v,.001);N(musicIn,t,.012,v*.35,'highpass',2000);},
    snare(t,v){N(musicIn,t,.15,v,'bandpass',1900,1500,.8);T(musicIn,t,'triangle',210,130,.09,v*.5,.001);},
    clap(t,v){for(let i=0;i<3;i++)N(musicIn,t+i*.011,.05,v*.7,'bandpass',1300,1300,1.2);N(mVerbSend,t,.12,v*.5,'bandpass',1300,1300,1);},
    hat(t,v,open,p){N(panTo(p,musicIn),t,open?.2:.035,v,'highpass',open?6000:7500);},
    crash(t,v){N(musicIn,t,1.4,v,'highpass',4200);N(mVerbSend,t,.9,v*.6,'highpass',3000);},
    bass(t,m,dur,v){const f=AC.createBiquadFilter();f.type='lowpass';f.Q.value=5;f.frequency.setValueAtTime(260,t);f.frequency.linearRampToValueAtTime(1100,t+.02);f.frequency.exponentialRampToValueAtTime(260,t+dur);
      const g=envGain(t,.004,v,dur,musicIn);f.connect(g);osc('sawtooth',hz(m),0,t,dur,f);osc('square',hz(m-12),0,t,dur,f);},
    lead(t,m,dur,v,p){const out=panTo(p,musicIn),g=AC.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.012);g.gain.setValueAtTime(v*.8,t+dur*.7);g.gain.exponentialRampToValueAtTime(.0001,t+dur+.08);
      const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=3400;f.connect(g);g.connect(out);const s=AC.createGain();s.gain.value=.3;g.connect(s);s.connect(dlySend);
      const o=osc('square',hz(m),0,t,dur+.1,f),o2=osc('sawtooth',hz(m),0,t,dur+.1,f,9);
      if(dur>.22){const l=AC.createOscillator(),lg=AC.createGain();l.frequency.value=5.6;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(hz(m)*.012,t+dur*.6);l.connect(lg);lg.connect(o.frequency);lg.connect(o2.frequency);l.start(t);l.stop(t+dur+.16);}},
    pluck(t,m,dur,v,p){const g=envGain(t,.002,v,dur,panTo(p,musicIn));const s=AC.createGain();s.gain.value=.4;g.connect(s);s.connect(dlySend);osc('triangle',hz(m),0,t,dur,g);osc('square',hz(m),0,t,dur*.4,envGain(t,.002,v*.4,dur*.4,g));},
    pad(t,ms,dur,v){const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(500,t);f.frequency.linearRampToValueAtTime(1300,t+dur*.5);f.frequency.linearRampToValueAtTime(600,t+dur);
      const g=AC.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+dur*.25);g.gain.setValueAtTime(v,t+dur*.8);g.gain.linearRampToValueAtTime(.0001,t+dur+.15);
      f.connect(g);g.connect(musicIn);const s=AC.createGain();s.gain.value=.5;g.connect(s);s.connect(mVerbSend);
      for(const m of ms){osc('sawtooth',hz(m),0,t,dur+.2,f,-8);osc('sawtooth',hz(m),0,t,dur+.2,f,8);}},
    bell(t,m,dur,v,p){const d=panTo(p,musicIn);bell(d,t,m,dur,v);const s=AC.createGain();s.gain.value=.5;s.connect(mVerbSend);bell(s,t,m,dur*.6,v*.5);},
    drone(t,m,dur,v){const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=420;f.Q.value=4;const g=AC.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.08);g.gain.linearRampToValueAtTime(.0001,t+dur);
      f.connect(g);g.connect(musicIn);osc('sawtooth',hz(m),0,t,dur,f,-14);osc('sawtooth',hz(m),0,t,dur,f,14);osc('sawtooth',hz(m+6),0,t,dur,f);}
  };

  /* ---------------- songs ----------------
     Degrees are semitones above the song root. Melodies: [step, degree, length] on a 32-step (two-bar) grid. */
  const CH={i:[0,3,7],VI:[8,12,15],III:[3,7,10],VII:[10,14,17],iv:[5,8,12],V:[7,11,14]};
  const SONGS=[
    {name:'신도림',bpm:112,root:69,prog:['i','VI','III','VII'],drum:'four',bassP:'oct',
      A:[[0,0,2],[2,3,2],[4,7,3],[7,5,1],[8,7,2],[10,10,2],[12,7,4],[16,5,2],[18,3,2],[20,5,3],[23,3,1],[24,0,2],[26,-2,2],[28,0,4]],
      B:[[0,3,2],[2,7,2],[4,10,3],[7,12,1],[8,10,2],[10,7,2],[12,10,4],[16,7,2],[18,5,2],[20,7,2],[22,10,2],[24,12,3],[27,10,1],[28,7,4]]},
    {name:'사당',bpm:120,root:62,prog:['i','i','VI','VII'],drum:'break',bassP:'off',
      A:[[0,7,1],[1,7,1],[3,10,2],[6,7,2],[8,5,2],[11,3,1],[12,5,4],[16,7,1],[17,7,1],[19,10,2],[22,12,2],[24,10,2],[27,7,1],[28,5,4]],
      B:[[0,12,2],[2,10,2],[4,8,3],[7,10,1],[8,12,4],[12,15,4],[16,14,2],[18,12,2],[20,10,3],[23,12,1],[24,14,4],[28,10,4]]},
    {name:'교대',bpm:126,root:64,prog:['i','iv','VII','III'],drum:'funk',bassP:'synco',
      A:[[0,0,2],[3,0,1],[4,3,2],[6,5,2],[8,7,3],[11,5,1],[12,3,2],[14,0,2],[16,5,2],[19,5,1],[20,8,2],[22,7,2],[24,5,3],[27,3,1],[28,5,4]],
      B:[[0,10,2],[2,7,2],[4,5,2],[6,7,2],[8,10,4],[12,14,4],[16,15,2],[18,14,2],[20,10,2],[22,7,2],[24,10,3],[27,12,1],[28,10,4]]},
    {name:'강남',bpm:132,root:60,prog:['i','VI','iv','V'],drum:'drive',bassP:'run',
      A:[[0,12,1],[2,12,1],[4,10,2],[6,8,2],[8,7,4],[12,3,2],[14,7,2],[16,8,1],[18,8,1],[20,7,2],[22,5,2],[24,3,4],[28,5,2],[30,7,2]],
      B:[[0,5,2],[2,8,2],[4,12,3],[7,10,1],[8,8,2],[10,5,2],[12,8,4],[16,7,2],[18,11,2],[20,14,3],[23,11,1],[24,7,2],[26,11,2],[28,14,4]]},
    {name:'역삼',bpm:140,root:57,prog:['i','VII','VI','V'],drum:'drive',bassP:'run',
      A:[[0,12,1],[1,12,1],[2,15,2],[4,12,1],[5,12,1],[6,10,2],[8,12,1],[9,12,1],[10,15,2],[12,19,4],[16,10,1],[17,10,1],[18,14,2],[20,10,1],[21,10,1],[22,7,2],[24,10,2],[26,14,2],[28,17,4]],
      B:[[0,8,1],[1,8,1],[2,12,2],[4,15,2],[6,12,2],[8,17,4],[12,15,4],[16,7,1],[17,7,1],[18,11,2],[20,14,2],[22,14,2],[24,19,4],[28,14,2],[30,11,2]]}
  ];
  const MENU={name:'menu',bpm:92,root:69,prog:['i','VI','III','VII'],drum:'soft',bassP:'long',menu:true,
    A:[[0,7,4],[4,10,4],[8,12,6],[16,10,4],[20,7,4],[24,5,8]],B:[[0,3,4],[4,7,4],[8,10,6],[16,7,4],[20,5,4],[24,7,8]]};
  [MENU].concat(SONGS).forEach(s=>{s.mA={};s.mB={};s.A.forEach(n=>s.mA[n[0]]=n);s.B.forEach(n=>s.mB[n[0]]=n);});
  const BASS={oct:[0,null,12,null,0,null,12,null,0,null,12,null,0,12,7,12],off:[0,null,0,null,null,0,null,0,0,null,0,null,null,0,7,10],
    synco:[0,null,null,0,null,null,12,null,0,null,null,0,null,7,10,12],run:[0,0,12,0,0,0,12,0,0,0,12,0,7,7,10,12],long:[0,null,null,null,null,null,null,null,0,null,null,null,7,null,null,null]};
  const DRUM={
    four:{k:[0,4,8,12],s:[4,12],h:[2,6,10,14]},
    break:{k:[0,6,10],s:[4,12],h:[0,2,4,6,8,10,12,14]},
    funk:{k:[0,3,8,10],s:[4,12],h:[0,2,4,6,8,10,12,14],c:[15]},
    drive:{k:[0,4,8,12,14],s:[4,12],h:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]},
    soft:{k:[0,8],s:[],h:[4,12]}
  };
  function playStep(song,i,t,fl){
    const s=i%16,bar=Math.floor(i/16),pb=bar%4,ph=Math.floor(bar/4),d=60/song.bpm/4*(fl.late?1/1.08:1),ch=CH[song.prog[pb]],root=song.root,D=DRUM[song.drum];
    const bassRoot=root-24<36?root-12:root-24,fill=pb===3&&s>=12&&!song.menu;
    // drums
    if(D.k.indexOf(s)>=0&&!(fill&&s>12))I.kick(t,song.menu?.5:.95);
    if(fl.boss&&(s===2||s===10))I.kick(t,.6);
    if(D.s.indexOf(s)>=0)(ph%2&&s===12?I.clap:I.snare)(t,.5);
    if(fill)I.snare(t,.28+(s-12)*.08);
    if(fl.late&&s%4===0&&D.s.indexOf(s)<0)I.snare(t,.3);
    if(D.h.indexOf(s)>=0)I.hat(t,(s%4===2?.16:.09)*(song.menu?.6:1),s===14&&pb%2===1,s%2?.3:-.3);
    if(D.c&&D.c.indexOf(s)>=0)I.clap(t,.3);
    if(i%64===0&&!song.menu&&i>0)I.crash(t,.22);
    // bass
    const bn=BASS[song.bassP][s];
    if(bn!==null&&bn!==undefined)I.bass(t,bassRoot+ch[0]+bn,d*(song.bassP==='long'?7:song.bassP==='run'?1:1.8),song.menu?.3:.42);
    // pad
    if(s===0)I.pad(t,[root-12+ch[0],root-12+ch[1],root-12+ch[2]+(song.menu?12:0)],d*16,song.menu?.05:.034);
    // arpeggio
    if(song.menu){if(s%2===0){const k=(s/2)%4,n=[ch[0],ch[1],ch[2],ch[1]+12][k];I.bell(t,root+n,.5,.07,k%2?.5:-.5);}}
    else if(ph>=2||fl.boss){const k=s%6,n=[ch[0],ch[1],ch[2],ch[0]+12,ch[2],ch[1]][k];I.pluck(t,root+n+(ph>=4?12:0),d*1.4,.075,s%2?.6:-.6);}
    // lead
    if(song.menu||ph>=1){const ev=(pb<2?song.mA:song.mB)[(pb%2)*16+s];
      if(ev){if(song.menu)I.bell(t,root+ev[1],d*ev[2]*1.6,.11,0);else{I.lead(t,root+ev[1],d*ev[2]*.92,.11,.12);if(ph>=3||fl.boss)I.lead(t,root+ev[1]+12,d*ev[2]*.8,.045,-.25);}}}
    // boss layer: low tritone drone and a two-note alarm
    if(fl.boss){if(s===0)I.drone(t,bassRoot+ch[0],d*15,.11);if(s===0||s===8)I.pluck(t,root+(s?13:12),d*3,.09,0);}
    return d;
  }
  let song=null,stepIdx=0,nextT=0,beatT=0;
  function music(st){
    if(!AC)return;
    const now=AC.currentTime;
    try{musicLP.frequency.setTargetAtTime(st.muffled?520:19000,now,.12);
      ambGain.gain.setTargetAtTime(st.scene==='play'&&!st.muffled?Math.min(.05,(st.crowd||0)/8000):0,now,.4);}catch(e){}
    const want=mode!==0?null:st.scene==='menu'?MENU:st.scene==='play'?SONGS[st.station||0]:null;
    if(want!==song){const first=!song;song=want;stepIdx=0;if(song){nextT=Math.max(nextT,now+.08);if(!first&&!song.menu)I.crash(nextT,.3);}}
    if(song){if(nextT<now-.3)nextT=now+.06;let g=0;while(nextT<now+.16&&g++<12)nextT+=playStep(song,stepIdx++,nextT,st);}
    if(st.scene==='play'&&st.lowhp&&!st.muffled&&mode!==2&&now>beatT){beatT=now+.78;T(sfxGain,now,'sine',70,42,.13,.5,.004);T(sfxGain,now+.2,'sine',62,40,.12,.36,.004);}
  }

  /* ---------------- sound effects ----------------  [minimum gap, fn(t, dest, arg)] */
  const PENTA=[0,2,4,7,9,12,14,16,19,21,24,26,28];let streak=0,lastPick=-9;
  const HIT={
    card:(t,d)=>{T(d,t,'triangle',rnd(900,1100),420,.05,.05);N(d,t,.03,.04,'highpass',3000);},
    umbrella:(t,d)=>{T(d,t,'sine',rnd(190,230),90,.08,.11);N(d,t,.04,.05,'bandpass',900,900,1);},
    backpack:(t,d)=>{T(d,t,'sine',rnd(130,160),70,.1,.13);N(d,t,.05,.04,'lowpass',700,300);},
    coffee:(t,d)=>{N(d,t,.09,.035,'highpass',rnd(4500,6000));},
    hotpack:(t,d)=>{N(d,t,.07,.1,'bandpass',rnd(3200,4200),2200,2);},
    anc:(t,d)=>{T(d,t,'sine',rnd(300,340),160,.07,.06);},
    battery:(t,d)=>{N(d,t,.04,.035,'highpass',5000);T(d,t,'square',rnd(1500,1900),700,.035,.018);},
    shout:(t,d)=>{T(d,t,'sine',rnd(240,280),120,.07,.05);},
    scooter:(t,d)=>{T(d,t,'sine',rnd(150,180),70,.09,.13);N(d,t,.05,.07,'bandpass',1400,700,1.2);},
    selfie:(t,d)=>{T(d,t,'triangle',rnd(700,820),380,.05,.05);N(d,t,.03,.04,'highpass',3500);},
    handle:(t,d)=>{T(d,t,'triangle',rnd(420,500),240,.06,.08);N(d,t,.03,.04,'bandpass',2200,1200,2);},
    alarm:(t,d)=>{T(d,t,'sine',rnd(200,240),100,.08,.08);},
    tie:(t,d)=>{N(d,t,.05,.08,'bandpass',rnd(2400,3200),1200,2);T(d,t,'triangle',rnd(520,600),260,.05,.05);},
    laptop:(t,d)=>{T(d,t,'square',rnd(1200,1400),600,.04,.02);N(d,t,.04,.03,'highpass',4200);},
    gum:(t,d)=>{T(d,t,'sine',rnd(260,320),520,.06,.05);},
    shoulder:(t,d)=>{T(d,t,'sine',rnd(110,140),60,.1,.15);N(d,t,.05,.06,'lowpass',600,250);}
  };
  /* each boss has a voice: a few syllables of babble at its own pitch and timbre */
  const VOICE={flyboss:['triangle',420,1.25,.07,4],bagman:['sine',210,1.06,.1,3],doorman:['sawtooth',120,1.1,.12,3],speaker:['square',180,1.5,.08,5],crowd:['sawtooth',150,1.3,.06,6],carrierboss:['triangle',340,1.4,.09,4],lead:['sawtooth',135,1.18,.11,4]};
  const SFX={
    hit:[.045,(t,d,src)=>(HIT[src]||HIT.card)(t,d)],
    crit:[.06,(t,d)=>{bell(d,t,96,.16,.06);T(d,t,'square',1900,2600,.05,.025);}],
    kill:[.04,(t,d)=>{const f=rnd(300,460);T(d,t,'triangle',f,f*.42,.08,.09);N(d,t,.05,.045,'bandpass',rnd(1800,2600),900,1.2);}],
    elitedie:[.2,(t,d)=>{N(d,t,.35,.2,'lowpass',2400,200,1,true);T(d,t,'sawtooth',260,60,.3,.1);[76,81,88].forEach((m,i)=>bell(wet(d,.5),t+.05+i*.06,m,.3,.07));}],
    trainkill:[.05,(t,d)=>{const f=rnd(500,900);T(d,t,'square',f,f*.3,.07,.05);N(d,t,.08,.07,'bandpass',rnd(1200,3000),600,1.5);}],
    pick:[.03,(t,d,v)=>{streak=t-lastPick<.4?Math.min(streak+1,12):0;lastPick=t;const m=79+PENTA[streak];T(d,t,'sine',hz(m),hz(m),.09,.05,.002);T(d,t,'triangle',hz(m+12),hz(m+12),.05,.02,.002);if(v>=3)T(d,t+.05,'sine',hz(m+7),hz(m+7),.1,.045,.002);}],
    card:[.09,(t,d,evo)=>{N(d,t,.05,.045,'bandpass',2600,5200,2);T(d,t,'triangle',evo?520:760,evo?980:430,.06,.04);if(evo){bell(d,t+.02,91,.2,.035);bell(d,t+.07,98,.25,.035);}}],
    swing:[.09,(t,d,evo)=>{N(d,t,evo?.3:.16,evo?.2:.22,'bandpass',evo?500:700,evo?2600:2200,1.4,false,.03);if(evo)T(d,t,'sine',150,90,.25,.08);}],
    throw:[.18,(t,d)=>{T(d,t,'sine',330,620,.22,.04,.02);N(d,t,.2,.03,'bandpass',900,2000,2,false,.05);}],
    splash:[.12,(t,d,evo)=>{N(d,t,.2,.16,'lowpass',evo?1400:2000,300,1,true);T(d,t,'sine',170,70,.14,.09);N(d,t+.05,evo?.7:.45,.03,'highpass',5200,7000,.7,false,.05);}],
    pulse:[.18,(t,d,evo)=>{T(d,t,'sine',evo?110:140,evo?34:48,evo?.4:.26,evo?.28:.2);N(d,t,evo?.4:.26,.07,'bandpass',300,evo?3000:1800,3,false,.02);if(evo){T(d,t,'sawtooth',220,55,.3,.06);}}],
    zap:[.08,(t,d,evo)=>{N(d,t,evo?.16:.1,.1,'highpass',3200);T(d,t,'sawtooth',rnd(1500,2100),260,evo?.14:.09,.05);T(d,t+.02,'square',rnd(2400,3200),900,.05,.025);if(evo){T(d,t,'sawtooth',180,60,.2,.07);N(d,t+.06,.1,.06,'highpass',4000);}}],
    shout:[.3,(t,d,evo)=>{const w=wet(d,.6),dur=evo?.6:.4,f0=evo?230:290;
      [[820,7],[1250,9],[2500,6]].forEach(([fr,q],i)=>{const f=AC.createBiquadFilter();f.type='bandpass';f.frequency.setValueAtTime(fr,t);f.frequency.linearRampToValueAtTime(fr*.82,t+dur);f.Q.value=q;f.connect(envGain(t,.02,i===2?.18:.42,dur,w));osc('sawtooth',f0,f0*.72,t,dur,f);osc('sawtooth',f0*1.5,f0*1.07,t,dur,f,12);});
      N(w,t,dur*.8,.1,'bandpass',1500,900,.8);T(d,t,'sine',120,40,.3,.25);if(evo){N(w,t,.7,.1,'highpass',2500);T(d,t,'sawtooth',90,40,.5,.12);}}],
    dash:[.1,(t,d)=>{N(d,t,.2,.14,'bandpass',500,3400,1.6,false,.02);T(d,t,'sine',420,880,.13,.04,.01);}],
    dashready:[.5,(t,d)=>{T(d,t,'sine',1320,1320,.06,.03);T(d,t+.06,'sine',1760,1760,.08,.03);}],
    hurt:[.12,(t,d)=>{T(d,t,'sawtooth',190,55,.24,.18);T(d,t,'sine',95,45,.2,.3);N(d,t,.12,.14,'lowpass',1400,300,1,true);}],
    slip:[1,(t,d)=>{T(d,t,'sine',900,280,.28,.07,.01);}],
    heal:[.1,(t,d)=>{const w=wet(d,.6);[76,81,84,88].forEach((m,i)=>bell(w,t+i*.06,m,.3,.07));}],
    level:[.2,(t,d)=>{const w=wet(d,.5);[72,76,79,84].forEach((m,i)=>{T(w,t+i*.07,'square',hz(m),hz(m),.14,.06);bell(w,t+i*.07,m+12,.25,.05);});T(w,t+.28,'sawtooth',hz(84),hz(84),.3,.035,.02);N(w,t+.28,.5,.04,'highpass',7000,9000);}],
    chest:[.3,(t,d)=>{const w=wet(d,.7);[72,76,79,84,88,91,96].forEach((m,i)=>bell(w,t+i*.045,m,.4,.065));for(let i=0;i<6;i++)T(d,t+.35+i*.05,'square',rnd(2200,3400),rnd(2200,3400),.03,.025);}],
    evo:[.5,(t,d)=>{const w=wet(d,.7);N(w,t,.45,.12,'highpass',600,9000,2,false,.4);T(w,t,'sawtooth',110,440,.45,.07,.4);
      const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(3800,t+.45);f.frequency.exponentialRampToValueAtTime(500,t+1.5);f.connect(envGain(t+.45,.01,.16,1.1,w));[57,64,69,73,76].forEach(m=>{osc('sawtooth',hz(m),0,t+.45,1.2,f,-7);osc('sawtooth',hz(m),0,t+.45,1.2,f,7);});
      [88,93,97,100].forEach((m,i)=>bell(w,t+.5+i*.07,m,.5,.06));T(d,t+.45,'sine',110,40,.4,.35);}],
    select:[.05,(t,d)=>{[84,88,91].forEach((m,i)=>T(d,t+i*.035,'square',hz(m),hz(m),.07,.045));}],
    hover:[.04,(t,d)=>{T(d,t,'sine',1500,1500,.03,.025);}],
    click:[.04,(t,d)=>{T(d,t,'square',700,500,.04,.04);N(d,t,.015,.03,'highpass',4000);}],
    reroll:[.15,(t,d)=>{for(let i=0;i<4;i++){N(d,t+i*.05,.04,.07,'bandpass',rnd(2000,3600),1500,2);}T(d,t+.2,'triangle',660,990,.1,.05);}],
    pause:[.1,(t,d)=>{T(d,t,'square',660,660,.07,.04);T(d,t+.08,'square',440,440,.1,.04);}],
    resume:[.1,(t,d)=>{T(d,t,'square',440,440,.07,.04);T(d,t+.08,'square',660,660,.1,.04);}],
    start:[.5,(t,d)=>{const w=wet(d,.8);bell(w,t,79,.7,.14);bell(w,t+.22,76,.9,.14);N(d,t+.3,.9,.1,'bandpass',300,2400,1.2,false,.6);T(d,t+.3,'sawtooth',70,140,.9,.06,.5);}],
    station:[1,(t,d)=>{const w=wet(d,.9);[72,76,79,84].forEach((m,i)=>bell(w,t+i*.13,m,.9,.1));}],
    warn:[.4,(t,d)=>{for(let i=0;i<2;i++){T(d,t+i*.36,'square',660,660,.14,.07);T(d,t+i*.36+.16,'square',494,494,.16,.07);}}],
    alert:[.25,(t,d)=>{T(d,t,'square',1175,1175,.05,.04);T(d,t+.06,'square',1568,1568,.08,.04);}],
    flick:[.12,(t,d)=>{N(d,t,.05,.16,'bandpass',3000,5000,3);}],
    elite:[.5,(t,d)=>{const w=wet(d,.5);T(w,t,'sawtooth',160,70,.45,.14);T(w,t,'sawtooth',164,73,.45,.1);N(w,t,.3,.08,'lowpass',900,200,1,true);T(d,t+.1,'square',740,620,.2,.04);}],
    boss:[1,(t,d)=>{const w=wet(d,.8);T(w,t,'sawtooth',300,900,.5,.07,.3);T(w,t+.5,'sawtooth',900,300,.5,.07,.02);T(w,t,'sawtooth',304,912,.5,.05,.3);
      T(d,t+1,'sine',120,30,.9,.5,.004);N(w,t+1,.9,.3,'lowpass',1800,120,1,true);T(w,t+1,'sawtooth',82,41,.9,.14);T(w,t+1,'sawtooth',116,58,.9,.1);}],
    voice:[.5,(t,d,who)=>{const v=VOICE[who]||VOICE.bagman,w=wet(d,.3);for(let i=0;i<v[4];i++){const f=v[1]*Math.pow(v[2],rnd(-1,1));T(w,t+i*v[3]*1.15,v[0],f,f*rnd(.86,1.12),v[3],v[0]==='sine'?.09:.04,.01);}}],
    roar:[.6,(t,d)=>{const w=wet(d,.6);T(w,t,'sawtooth',180,70,.6,.1,.04);T(w,t,'sawtooth',187,74,.6,.07,.04);N(w,t,.5,.12,'bandpass',500,180,1.2,false,.05);T(d,t+.05,'square',90,45,.5,.06);}],
    paper:[.15,(t,d)=>{for(let i=0;i<4;i++)N(d,t+i*.045,.07,.08,'highpass',rnd(2600,4200),6000,.8);N(d,t,.25,.05,'bandpass',1400,3000,1.5,false,.02);}],
    doorslam:[.3,(t,d)=>{[784,659].forEach((f,i)=>T(d,t+i*.16,'sine',f,f,.15,.06,.005));N(d,t+.36,.2,.2,'lowpass',900,150,1,true);T(d,t+.36,'sine',110,50,.22,.2);}],
    wheels:[.3,(t,d)=>{N(d,t,.55,.1,'bandpass',260,520,3,false,.08);for(let i=0;i<7;i++)T(d,t+i*.075,'square',rnd(80,110),70,.03,.045);}],
    zipper:[.2,(t,d)=>{N(d,t,.22,.09,'bandpass',1800,5200,6,false,.01);T(d,t+.2,'sine',150,80,.12,.1);}],
    rumble:[.4,(t,d)=>{N(d,t,.7,.2,'lowpass',240,90,1,true,.1);for(let i=0;i<9;i++)T(d,t+i*.07+rnd(0,.03),'sine',rnd(70,120),50,.06,.09);}],
    bass:[.4,(t,d)=>{[0,.22,.44].forEach(o=>{T(d,t+o,'sine',95,42,.2,.3,.004);T(d,t+o,'square',190,84,.08,.04);});}],
    nag:[.4,(t,d)=>{const w=wet(d,.4);for(let i=0;i<7;i++){const f=rnd(120,170);T(w,t+i*.085,'sawtooth',f,f*rnd(.8,1.3),.07,.05,.008);}T(w,t+.62,'sawtooth',170,90,.25,.06);}],
    phone:[.6,(t,d)=>{for(let k=0;k<2;k++)for(let i=0;i<6;i++){T(d,t+k*.42+i*.045,'square',i%2?1320:1100,i%2?1320:1100,.035,.035);}}],
    lash:[.09,(t,d,evo)=>{N(d,t,evo?.2:.13,.2,'bandpass',900,evo?5200:4200,2.5,false,.04);N(d,t+(evo?.16:.1),.03,.22,'highpass',3600);T(d,t+(evo?.16:.1),'triangle',1400,500,.04,.06);}],
    beam:[.12,(t,d,evo)=>{T(d,t,'sawtooth',evo?620:880,evo?180:320,.24,.06,.01);T(d,t,'square',evo?1240:1760,evo?360:640,.2,.025,.01);N(d,t,.2,.05,'highpass',5000,2500);if(evo)T(d,t,'sine',110,60,.3,.1);}],
    gum:[.3,(t,d)=>{T(d,t,'sine',240,560,.07,.05);T(d,t+.08,'sine',700,300,.03,.05);}],
    bump:[.12,(t,d,evo)=>{T(d,t,'sine',evo?150:130,45,.2,.3,.004);N(d,t,.12,.14,'lowpass',evo?1400:900,200,1,true);if(evo)bell(d,t+.03,84,.25,.05);}],
    boss2:[.2,(t,d)=>{T(d,t,'square',300,150,.12,.06);N(d,t,.1,.06,'bandpass',1200,600,1.5);T(d,t,'sine',160,80,.12,.1);}],
    bossdie:[1,(t,d)=>{const w=wet(d,.8);N(w,t,1.1,.45,'lowpass',3500,100,1,true);T(d,t,'sine',150,28,.9,.5);for(let i=0;i<5;i++)N(w,t+.1+i*.11,.14,.14,'bandpass',rnd(600,2400),300,1);
      [69,73,76,81,85,88].forEach((m,i)=>{T(w,t+.55+i*.09,'square',hz(m),hz(m),.2,.06);bell(w,t+.55+i*.09,m+12,.4,.06);});}],
    wave:[.3,(t,d)=>{const w=wet(d,.4);T(d,t,'sine',95,40,.4,.4);const f=AC.createBiquadFilter();f.type='lowpass';f.Q.value=9;f.frequency.setValueAtTime(180,t);f.frequency.exponentialRampToValueAtTime(1800,t+.14);f.frequency.exponentialRampToValueAtTime(200,t+.4);f.connect(envGain(t,.01,.2,.42,w));osc('sawtooth',55,0,t,.45,f);osc('sawtooth',55,0,t,.45,f,14);N(w,t,.35,.07,'bandpass',300,2400,2,false,.02);}],
    spin:[.5,(t,d)=>{for(let i=0;i<4;i++)N(d,t+i*.26,.24,.2,'bandpass',400,2400,1.6,false,.05);T(d,t,'sine',110,70,1,.14,.05);}],
    page:[.3,(t,d)=>{const w=wet(d,.7);N(w,t,.28,.3,'highpass',1800,5000,1,false,.01);N(w,t+.1,.2,.2,'bandpass',900,2600,2);T(d,t+.25,'sine',140,40,.4,.4);[69,76,81].forEach((m,i)=>bell(w,t+.28+i*.07,m,.5,.08));}],
    note:[.2,(t,d)=>{T(d,t,'square',880,880,.07,.05);T(d,t+.07,'square',1175,1175,.09,.05);}],
    scooter:[.15,(t,d,evo)=>{N(d,t,.4,.2,'bandpass',500,2600,1.4,false,.04);T(d,t,'sawtooth',evo?120:160,evo?260:320,.35,.05,.05);bell(d,t,evo?93:96,.3,.07);bell(d,t+.09,evo?93:96,.3,.07);}],
    alarmboom:[.08,(t,d)=>{const w=wet(d,.4);for(let i=0;i<5;i++)bell(w,t+i*.035,i%2?98:101,.12,.09);T(d,t,'sine',150,45,.25,.3);N(w,t,.2,.16,'lowpass',2600,300,1,true);}],
    zone:[.5,(t,d)=>{const w=wet(d,.7);N(d,t,.5,.16,'bandpass',300,3200,1.2,false,.25);[76,81,88].forEach((m,i)=>bell(w,t+.12+i*.09,m,.6,.09));}],
    doorclose:[.5,(t,d)=>{const w=wet(d,.6);bell(w,t,84,.35,.1);bell(w,t+.18,79,.5,.1);N(d,t+.3,.45,.12,'highpass',2500,900,.8,false,.02);T(d,t+.7,'sine',120,60,.15,.25);}],
    buswarn:[.5,(t,d)=>{for(let i=0;i<2;i++){T(d,t+i*.32,'sawtooth',370,370,.2,.1,.01);T(d,t+i*.32,'sawtooth',466,466,.2,.08,.01);}}],
    buspass:[.5,(t,d)=>{N(d,t,.9,.5,'lowpass',320,160,1,true,.1);T(d,t,'sawtooth',90,60,.8,.1,.05);T(d,t+.1,'sawtooth',370,330,.45,.06,.02);T(d,t+.1,'sawtooth',466,415,.45,.05,.02);}],
    stamp:[.1,(t,d)=>{T(d,t,'square',980,980,.04,.045);T(d,t+.07,'square',980,980,.04,.045);}],
    boom:[.1,(t,d)=>{const w=wet(d,.5);T(w,t,'sine',130,36,.3,.4);N(w,t,.25,.25,'lowpass',2200,200,1,true);N(w,t,.04,.12,'highpass',3000);}],
    trainwarn:[.5,(t,d)=>{const w=wet(d,.4);for(let i=0;i<8;i++)bell(w,t+i*.19,i%2?77:81,.22,.12);}],
    trainpass:[.5,(t,d)=>{const w=wet(d,.5);N(d,t,1.3,.55,'lowpass',260,140,1,true,.12);N(d,t,1.2,.12,'bandpass',900,500,.8,false,.1);
      const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=1700;f.connect(envGain(t,.05,.2,.95,w));osc('sawtooth',330,300,t,1,f);osc('sawtooth',392,356,t,1,f);osc('sawtooth',494,449,t,1,f);
      for(let i=0;i<9;i++){T(d,t+.12+i*.11,'square',180,90,.03,.08);N(d,t+.12+i*.11,.03,.08,'highpass',2500);}}],
    trainhit:[.3,(t,d)=>{T(d,t,'sine',160,30,.5,.6);N(d,t,.4,.4,'lowpass',3000,150,1,true);N(d,t,.08,.2,'highpass',2500);}],
    tick:[.3,(t,d,n)=>{const m=84+(10-(n||0));T(d,t,'square',hz(m),hz(m),.06,.06);bell(d,t,m,.2,.06);}],
    win:[2,(t,d)=>{const w=wet(d,.8);[[60,0],[64,.12],[67,.24],[72,.36],[76,.6],[79,.72],[84,.84]].forEach(([m,o])=>{T(w,t+o,'square',hz(m),hz(m),.2,.07);T(w,t+o,'sawtooth',hz(m-12),hz(m-12),.2,.05);});
      const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=3000;f.connect(envGain(t+1.05,.02,.14,1.6,w));[60,64,67,72,76].forEach(m=>{osc('sawtooth',hz(m),0,t+1.05,1.7,f,-6);osc('sawtooth',hz(m),0,t+1.05,1.7,f,6);});
      [84,88,91,96,100].forEach((m,i)=>bell(w,t+1.1+i*.08,m,.7,.07));T(d,t+1.05,'sine',130,50,.4,.35);N(w,t+1.05,1.2,.08,'highpass',6000);}],
    lose:[2,(t,d)=>{const w=wet(d,.7);[[69,0],[65,.26],[62,.52],[57,.78]].forEach(([m,o])=>{T(w,t+o,'triangle',hz(m),hz(m),.4,.14,.01);T(w,t+o,'sawtooth',hz(m-12),hz(m-12),.4,.04,.01);});
      T(w,t+1.05,'sawtooth',220,30,1.1,.1,.02);T(d,t+1.05,'sine',90,28,.9,.4);N(w,t+1.05,.9,.14,'lowpass',900,100,1,true);}]
  };
  const VOL={voice:1.2,roar:.9,rumble:.9,bass:.9,lash:1.1,beam:1,bump:.9,evo:.3,boss:.7,bossdie:.7,trainpass:.7,trainhit:.7,win:.7,lose:.75,boom:.7,shout:.75,hurt:.85,card:1.5,dash:1.6,select:1.4,click:1.3,hover:1.3,pick:1.2,kill:1.1,pause:1.3,resume:1.3,reroll:1.3,alert:1.3,stamp:1.4,dashready:1.2,throw:1.3};
  function fire(name,t,pan,arg){const g=AC.createGain();g.gain.value=VOL[name]||1;g.connect(panTo(pan,sfxGain));SFX[name][1](t,g,arg);}
  function sfx(name,pan,arg){
    if(!AC||mode===2)return;const s=SFX[name];if(!s)return;
    const now=AC.currentTime,key=name==='hit'?'hit'+arg:name;if(now-(last[key]||-9)<s[0])return;last[key]=now;
    try{fire(name,now,pan,arg);}catch(e){}
  }
  return{init,sfx,music,
    vol(m,s){mv=Math.max(0,Math.min(1,m));sv=Math.max(0,Math.min(1,s));mode=mv<=0&&sv<=0?2:mv<=0?1:0;if(mode!==0)song=null;applyMode();},
    cycle(){mode=(mode+1)%3;applyMode();if(mode!==0){song=null;}return mode;},
    get mode(){return mode;},
    /* offline rendering hooks, used only by the test harness to measure levels */
    _test:{build,SFX,SONGS,MENU,playStep,state(){return{ctx:AC?AC.state:'none',step:stepIdx,song:song?song.name:null,mode};},sfxAt(name,t,arg){fire(name,t,0,arg);}}};
})();
