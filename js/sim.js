'use strict';
/* 출근길 서바이벌 — simulation (no DOM). Loaded by the page and by the headless test harness. */
const TAU=Math.PI*2,GAME_LEN=540,RAMP=600,LANE_GAP=1000,LANE_H=56,TRAIN_LEN=1080,TRAIN_SPD=1500,WMAX=6,EVO=7,PMAX=5,MAX_W=5,MAX_P=5;
const GATE_GAP=420,GATE_PER=130,GATE_HALF=28,GATE_TH=16,AISLE=80,DOOR_PER=320,DOOR_OPEN=9,ESC_W=220,ESC_PUSH=58;
/* the commute, place by place: 역삼역 앞 → 개찰구 → 승강장 → 열차 안 → 구로디지털단지역 승강장 → 에스컬레이터 → 회사 앞 */
const ZONES=[
  {key:'street',kind:'street',name:'역삼역 앞',short:'역삼역 앞',at:0,  y0:500,song:0,hazard:'bus',dens:.8,floor:[198,192,182],amb:.13,tint:'40,28,8',  line:'버스가 지나는 차도를 조심하세요'},
  {key:'gates', kind:'gates', name:'개찰구',   short:'개찰구',   at:40, y0:210,song:1,dens:.72,               floor:[214,212,204],amb:.26,tint:'12,18,26', line:'개찰구 사이 틈으로만 지나갈 수 있습니다'},
  {key:'platA', kind:'plat',  name:'역삼역 승강장',short:'역삼 승강장',station:'역삼',at:75,y0:500,song:1,hazard:'train',dens:.96,floor:[207,203,192],amb:.32,tint:'12,18,28',line:'선로에 경고가 뜨면 물러나세요'},
  {key:'train', kind:'train', name:'열차 안',  short:'열차 안',  at:110,y0:0,  song:2,dens:.5,               floor:[203,206,207],amb:.22,tint:'6,10,18',  line:'좁은 통로입니다. 역마다 문이 열리고 인파가 탑니다'},
  {key:'platB', kind:'plat',  name:'구로디지털단지역 승강장',short:'구디 승강장',station:'구로디지털단지',at:200,y0:500,song:3,hazard:'train',floor:[186,198,210],amb:.36,tint:'8,12,36',line:'내리는 인파를 뚫고 나가세요'},
  {key:'esc',   kind:'esc',   name:'에스컬레이터',short:'에스컬레이터',at:230,y0:0,song:4,           floor:[176,180,184],amb:.4, tint:'10,10,24', line:'계단이 위아래로 밀어냅니다',dens:.8},
  {key:'office',kind:'office',name:'회사 앞',  short:'회사 앞',  at:270,y0:0,  song:4,dens:.93,               floor:[214,208,198],amb:.13,tint:'44,24,6',  line:'9시가 코앞입니다'}
];
const STOPS=[{name:'강남'},{name:'교대'},{name:'사당'},{name:'신림'}],LAST_STOP='구로디지털단지';
const ZW={street:{pass:10,flyer:.8,runner:2,intern:2,zomb:2.5},gates:{pass:10,stud:4,intern:3,carrier:2,uncle:1.5},plat:{pass:10,zomb:2.5,intern:2.5,stud:3,runner:3,flyer:.7,uncle:2,carrier:1.5},
  train:{pass:10,uncle:4,stud:3,intern:2.5,zomb:2},esc:{pass:10,runner:5,stud:3,carrier:3,intern:2},office:{pass:10,intern:4,runner:3,flyer:3,uncle:3,carrier:3,stud:2}};
/* how each place is cleared: push through the crowd until its boss shows up, then beat the boss. The train is a fixed ride. */
const GATE={street:{crowd:36,boss:'flyboss'},gates:{crowd:38,boss:'bagman'},platA:{crowd:36,boss:'doorman'},train:{ride:90,opt:'speaker'},platB:{crowd:34,boss:'crowd'},esc:{crowd:38,boss:'carrierboss'},office:{crowd:30,boss:'lead'}};
const ENRAGE_STEP=20;
/* difficulty, named after the congestion levels on a platform display */
const DIFFS=[
  {key:'easy',  name:'여유',  blurb:'일곱 장소를 끝까지 둘러보기 좋습니다',  xp:.88,crowd:.52,foe:.58,boss:.55,enrage:70,hp:170,heal:40,rerolls:5,elite:1.6,hazard:1.4},
  {key:'normal',name:'보통',  blurb:'도착은 할 만하지만 정시 출근은 빠듯합니다',xp:.75,crowd:.8, foe:.76,boss:.7, enrage:50,hp:120,heal:28,rerolls:4,elite:1.25,hazard:1},
  {key:'hard',  name:'혼잡',  blurb:'조합을 잘 맞춰야 도착합니다',          xp:.7,crowd:1,  foe:.97,boss:.82,enrage:45,hp:100,heal:20,rerolls:3,elite:1,  hazard:1},
  {key:'hell',  name:'지옥철',blurb:'폭주가 빨리 오고 회복이 적습니다',      xp:.66,crowd:1.2,foe:1.15,boss:1.2,enrage:32,hp:100,heal:10,rerolls:2,elite:.75,hazard:.7}
];
const B=v=>v?1:0;
const WEAPONS={
  card:{name:'교통카드',evoName:'법인카드',pair:'shoes',
    lv:['가장 가까운 사람에게 카드를 던집니다. 두 명까지 꿰뚫습니다','카드 +1장','피해량 +5, 관통 +1','카드 +1장','카드 +1장, 던지는 속도 증가'],
    evoDesc:'한도 없는 카드 5장이 인파를 꿰뚫습니다',
    stat:l=>l>=6?{n:5,dmg:21,cd:.62,pierce:4}:{n:1+B(l>=2)+B(l>=4)+B(l>=5),dmg:11+5*B(l>=3),cd:l>=5?.76:.86,pierce:2+B(l>=3)}},
  umbrella:{name:'장우산',evoName:'골프 우산',pair:'armor',
    lv:['가까운 쪽을 우산으로 찌릅니다','피해량 +8','사거리 +25%, 등 뒤도 함께 찌릅니다','피해량 +10','공격 속도 +30%'],
    evoDesc:'검정과 금빛의 골프 우산으로 앞뒤 좌우 네 방향을 한꺼번에 세 번 찌릅니다. 세 번째는 길게 뻗어 일직선의 모두를 꿰뚫습니다',
    stat:l=>l>=6?{dmg:28,range:150,half:.5,both:true,cd:1.15,kb:150,combo:true,fin:58,finLen:300,finW:24}:{dmg:22+8*B(l>=2)+10*B(l>=4),range:108*(l>=3?1.25:1),half:.8,both:l>=3,cd:l>=5?.8:1.05,kb:130}},
  backpack:{name:'백팩 회전',evoName:'등산 배낭',pair:'snack',
    lv:['백팩 2개가 몸 주위를 돌며 부딪힙니다','백팩 +1개','피해량 +6, 회전 반경과 속도 증가','백팩 +1개','백팩 +1개, 피해량 +6'],
    evoDesc:'묵직한 등산 배낭 6개가 넓게 돕니다',
    stat:l=>l>=6?{n:6,dmg:38,radius:108,spin:4.8,size:19}:{n:2+B(l>=2)+B(l>=4)+B(l>=5),dmg:22+6*B(l>=3)+6*B(l>=5),radius:76*(l>=3?1.25:1),spin:3.2*(l>=3?1.3:1),size:13}},
  coffee:{name:'뜨거운 아메리카노',evoName:'사약 에스프레소',pair:'pods',
    lv:['커피를 던져 뜨거운 웅덩이를 만듭니다','웅덩이 크기 +25%','웅덩이 +1개','피해량 +4, 지속 시간 +1.5초','웅덩이 +1개'],
    evoDesc:'쓰디쓴 웅덩이 4개가 넓게 퍼지고 발을 묶습니다',
    stat:l=>l>=6?{n:4,r:88,tick:14,dur:5,cd:2.8,slow:.5}:{n:1+B(l>=3)+B(l>=5),r:54*(l>=2?1.25:1),tick:5.5+3*B(l>=4),dur:3+1.5*B(l>=4),cd:2.4,slow:.3}},
  anc:{name:'노이즈캔슬링',evoName:'풀볼륨 스피커',pair:'payday',
    lv:['주변 사람을 밀어내는 파동을 냅니다','피해량 +6','범위 +30%','발동 속도 +25%','피해량 +8, 범위 +25%'],
    evoDesc:'쩌렁쩌렁한 음파가 훨씬 넓게, 자주 터집니다',
    stat:l=>l>=6?{dmg:46,r:225,cd:1.3,kb:260}:{dmg:19+6*B(l>=2)+8*B(l>=5),r:120*(1+.3*B(l>=3)+.25*B(l>=5)),cd:1.8*(l>=4?.75:1),kb:170}},
  shout:{name:'"내릴게요!"',evoName:'"저 내려요!!!"',pair:'tumbler',
    lv:['화면의 모두를 밀쳐내고 잠시 멈춰 세웁니다','재사용 대기 2초 감소','피해량 +9','재사용 대기 2초 감소','피해량 +9, 멈춰 세우는 시간 +0.5초'],
    evoDesc:'6.5초마다 터지는 절규. 피해량이 크게 오릅니다',
    stat:l=>l>=6?{cd:6.5,dmg:55,stun:1.6}:{cd:13-2*B(l>=2)-2*B(l>=4),dmg:16+9*B(l>=3)+9*B(l>=5),stun:1+.5*B(l>=5)}},
  battery:{name:'보조배터리',evoName:'고속 충전기',pair:'focus',
    lv:['전기가 튀어 가까운 4명에게 번집니다','피해량 +6','번지는 수 +2','발동 속도 +20%','피해량 +8, 번지는 수 +3'],
    evoDesc:'12명에게 번지는 고압 전류. 맞으면 잠깐 굳습니다',
    stat:l=>l>=6?{dmg:42,chain:12,cd:.75,stun:.25}:{dmg:16+6*B(l>=2)+8*B(l>=5),chain:4+2*B(l>=3)+3*B(l>=5),cd:1.5*(l>=4?.8:1),stun:0}},
  hotpack:{name:'핫팩',evoName:'찜질방',pair:'vitamin',
    lv:['몸 주변을 뜨겁게 달궈 닿는 사람을 지집니다','범위 +20%','피해량 +3','범위 +20%','피해량 +4, 더 자주 지집니다'],
    evoDesc:'넓은 열기가 주변을 태우고 발걸음을 늦춥니다',
    stat:l=>l>=6?{r:160,dmg:20,tick:.3,slow:.25}:{r:86*(1+.2*B(l>=2)+.2*B(l>=4)),dmg:13+3*B(l>=3)+4*B(l>=5),tick:l>=5?.33:.45,slow:0}},
  scooter:{name:'킥보드 호출',evoName:'전동 킥보드 폭주',pair:'mask',
    lv:['킥보드가 가까운 적 쪽으로 일직선으로 질주하며 길 위의 모두를 칩니다','피해량 +10','차체 폭 +40%','킥보드 +1대 (반대 방향)','피해량 +12, 호출 속도 +20%'],
    evoDesc:'킥보드 3대가 부채꼴로 더 멀리 폭주합니다',
    stat:l=>l>=6?{n:3,dmg:58,w:30,cd:2.3,max:720}:{n:1+B(l>=4),dmg:32+10*B(l>=2)+12*B(l>=5),w:24*(l>=3?1.4:1),cd:2.6*(l>=5?.8:1),max:560}},
  selfie:{name:'셀카봉',evoName:'라이브 방송',pair:'badge',
    lv:['셀카봉이 시곗바늘처럼 돌며 닿는 사람을 칩니다','피해량 +5','길이 +30%','셀카봉 +1개','피해량 +6, 회전 속도 +30%'],
    evoDesc:'셀카봉 3개가 길게 돌고, 플래시에 맞으면 잠깐 굳습니다',
    stat:l=>l>=6?{n:3,dmg:28,len:195,spin:4.8,stun:.15}:{n:1+B(l>=4),dmg:14+5*B(l>=2)+6*B(l>=5),len:122*(l>=3?1.3:1),spin:3.2*(l>=5?1.3:1),stun:0}},
  handle:{name:'손잡이',evoName:'순환선',pair:'energy',
    lv:['손잡이가 날아갔다 돌아오며 지나는 길의 모두를 칩니다','피해량 +6','손잡이 +1개','피해량 +7, 사거리 +30%','손잡이 +1개'],
    evoDesc:'손잡이 4개가 더 멀리, 더 세게 돌아옵니다',
    stat:l=>l>=6?{n:4,dmg:36,range:1.5,size:16,cd:1.3}:{n:1+B(l>=3)+B(l>=5),dmg:22+6*B(l>=2)+7*B(l>=4),range:1+.3*B(l>=4),size:12,cd:1.5}},
  alarm:{name:'알람 시계',evoName:'스누즈 지옥',pair:'overtime',
    lv:['알람 시계를 던집니다. 잠시 뒤 울리며 주변을 터뜨리고 멈춰 세웁니다','피해량 +10','폭발 범위 +30%','시계 +1개','피해량 +12'],
    evoDesc:'시계 3개가 각각 세 번씩 울립니다',
    stat:l=>l>=6?{n:3,dmg:52,r:108,cd:2.4,stun:.6,rings:3}:{n:1+B(l>=4),dmg:31+10*B(l>=2)+12*B(l>=5),r:72*(l>=3?1.3:1),cd:2.6,stun:.4,rings:1}},
  tie:{name:'넥타이 채찍',evoName:'불금 넥타이',pair:'report',
    lv:['가장 가까운 사람 쪽으로 넥타이를 채찍처럼 내리칩니다. 끝자락에 맞으면 40% 더 아픕니다','피해량 +7','등 뒤쪽도 함께 후려칩니다','길이 +30%','피해량 +9, 공격 속도 +20%'],
    evoDesc:'앞뒤로 두 번 후려친 다음, 세 번째에는 머리 위로 크게 한 바퀴 돌려 주변을 쓸어 버립니다',
    stat:l=>l>=6?{dmg:46,len:178,w:38,both:true,cd:.62,kb:200}:{dmg:28+7*B(l>=2)+9*B(l>=5),len:130*(l>=4?1.3:1),w:28,both:l>=3,cd:.9*(l>=5?.8:1),kb:110}},
  laptop:{name:'노트북',evoName:'듀얼 모니터',pair:'will',
    lv:['떠 있는 노트북이 블루라이트 광선을 쏘며 부채꼴로 훑습니다. 닿는 동안 계속 피해를 줍니다','피해량 +9','광선 굵기 +50%','발사 속도 +20%','피해량 +11, 반대쪽으로도 쏩니다'],
    evoDesc:'모니터 네 대가 십자 광선을 쏘며 천천히 돌아갑니다',
    stat:l=>l>=6?{dmg:58,w:30,n:4,cd:1.8,len:640}:{dmg:31+9*B(l>=2)+11*B(l>=5),w:18*(l>=3?1.5:1),n:1+B(l>=5),cd:2*(l>=4?.8:1),len:520}},
  gum:{name:'씹던 껌',evoName:'풍선껌 지뢰밭',pair:'lotto',
    lv:['지나간 자리에 껌을 뱉습니다. 밟은 사람은 끈적하게 느려지고 피해를 받습니다','피해량 +3','껌 크기 +30%','더 자주 뱉습니다','피해량 +4, 지속 시간 +2초'],
    evoDesc:'큼직한 풍선껌이 발을 거의 묶어 버리고 훨씬 아프게 터집니다',
    stat:l=>l>=6?{r:76,tick:14,dur:6,cd:1,slow:.7}:{r:40*(l>=3?1.3:1),tick:7+3*B(l>=2)+3*B(l>=5),dur:4+2*B(l>=5),cd:1.6*(l>=4?.7:1),slow:.45}},
  shoulder:{name:'어깨빵',evoName:'출근 돌파',pair:'gym',
    lv:['몸에 부딪힌 사람을 어깨로 받아칩니다. 대시가 끝나는 자리에서는 주변을 훨씬 세게 들이받습니다','피해량 +9','대시 충격 범위 +30%','대시하며 스친 사람도 칩니다. 받아치는 간격이 짧아집니다','피해량 +11'],
    evoDesc:'부딪히는 족족 튕겨 내고, 대시가 지나간 길과 도착 지점이 통째로 터집니다. 맞은 사람은 잠깐 굳습니다',
    stat:l=>l>=6?{dmg:64,mul:2.8,r:160,cdE:.35,trail:true,stun:.5,kb:320}:{dmg:28+9*B(l>=2)+11*B(l>=5),mul:2.6,r:104*(l>=3?1.3:1),cdE:l>=4?.45:.65,trail:l>=4,stun:0,kb:250}}
};
const PASSIVES={
  shoes:{name:'운동화',desc:'이동 속도 +10%'},
  will:{name:'기계식 키보드',desc:'모든 피해량 +15%'},
  pods:{name:'샷 추가',desc:'공격 대기 시간 9% 감소'},
  tumbler:{name:'목캔디',desc:'공격 범위 +12%'},
  gym:{name:'헬스 회원권',desc:'최대 멘탈 +25, 초당 회복 +0.3'},
  badge:{name:'삼각대',desc:'떨어진 것을 줍는 범위 +40%'},
  armor:{name:'우비',desc:'받는 피해 9% 감소'},
  payday:{name:'플레이리스트',desc:'얻는 경험치 +10%'},
  energy:{name:'환승 요령',desc:'대시 대기 시간 15% 감소'},
  focus:{name:'고속 충전 케이블',desc:'치명타 확률 +6%'},
  lotto:{name:'껌 뽑기 기계',desc:'아이템이 떨어질 확률 +50%'},
  mask:{name:'헬멧',desc:'맞은 뒤 무적 시간 +0.12초'},
  report:{name:'보고서',desc:'진상과 진상 승객에게 주는 피해 +12%'},
  overtime:{name:'모닝콜',desc:'멘탈이 절반 이하일 때 피해량 +18%'},
  vitamin:{name:'목도리',desc:'초당 회복 +0.5'},
  snack:{name:'간식 보따리',desc:'레벨이 오를 때마다 멘탈 4 회복'}
};
const DOOR_RATE=[8,11];
const MACE={strap:85,dmg:218,slam:411,spin:5},BOMB={n:4,cd:1.5,fuse:1.3,dmg:135},GUARD={push:340,r:59,half:1.05,bash:48,dmg:79,counter:108,len:215,cd:.35,auto:.7};
const W_SCALE=.9,XP_SCALE=.9,SPIN_R=115,PHASES=['아침 인사','업무 지시','잔소리','긴급 회의','불호령'],DAY_LINE=['회사 앞에서 하필 팀장님을 만났습니다','서류와 지시가 쏟아집니다','잔소리가 발밑에 깔립니다','팀원들을 불러 모읍니다','9시가 코앞입니다. 전부 빨라집니다'];
const TALK={flyboss:['전단지 받아 가세요~','헬스장 오픈했어요!','한 장만요, 한 장만!','필라테스 첫 달 무료!'],bagman:['(음악 듣는 중)','뒤에 뭐 있어요?','아, 좁네...'],doorman:['저 다음 역에서 내려요','안쪽은 답답해서요','여기가 내 자리야'],speaker:['이 노래 좋지 않아요?','볼륨 좀 더 올릴까','쿵짝 쿵짝~'],crowd:['내립니다, 내려요!','밀지 마세요!','먼저 내리고 타요!'],carrierboss:['공항철도가 어디예요?','캐리어 좀 지나갈게요~','어머, 죄송~'],lead:[['좋은 아침~','주말 잘 쉬었나?'],['이것 좀 오늘까지 부탁해','메일 확인했나?'],['내가 자네 연차 때는 말이야','요즘 친구들은 말이야...'],['9시 회의 있는 거 알지?','전원 회의실로!'],['지금 몇 시인 줄 아나!','자네, 지각이야!']]};
const RAGE_TALK={flyboss:'안 받으면 못 지나가요!',bagman:'아, 왜 밀어요!',doorman:'안 비킨다니까!',speaker:'시끄럽다니, 뭐가!',crowd:'비켜요, 비켜!',carrierboss:'비행기 놓친단 말이에요!',lead:'자네 지금 나 무시하나!'};
for(const k in WEAPONS){const w=WEAPONS[k],f=w.stat;w.lv.push('피해량 +18%');
  w.stat=l=>{if(l>=EVO)return f(6);if(l===6){const o=f(5);if(o.dmg)o.dmg*=1.18;if(o.tick&&o.tick>1)o.tick*=1.18;return o;}return f(l);};}
/* hidden combinations: two evolved weapons that belong together merge into one slot */
const FUSIONS={
  remote:{name:'재택근무',a:'laptop',b:'battery',desc:'모니터 네 대가 쉬지 않고 돌아가며 노란 광선을 쏩니다. 광선에 닿은 사람에게서 번개가 터져 옆 사람들로 줄줄이 번집니다. 두 무기의 피해량이 30% 오릅니다'},
  bulldozer:{name:'배낭 철퇴',a:'backpack',b:'shoulder',desc:'끈에 매단 거대한 배낭 하나를 해머던지기처럼 크게 휘두릅니다. 느리지만 한 방이 세고 맞은 사람은 잠깐 굳습니다. 대시가 끝나면 배낭을 앞에 내려찍어 넓게 날려 버립니다'},
  gentleman:{name:'풀정장 신사',a:'umbrella',b:'tie',desc:'펼친 우산이 걷는 방향 앞을 막아서서 날아오는 것을 튕겨 내고, 닿는 사람을 앞으로 밀어냅니다. 막을 때마다 넥타이가 크게 한 바퀴 돌아 반격합니다'},
  routine:{name:'커피 시한폭탄',a:'coffee',b:'alarm',desc:'사람들 사이에 커피잔을 내려놓습니다. 컵 위의 시곗바늘이 한 바퀴 돌면 알람과 함께 두 번 연달아 터져 주변을 굳히고 진한 커피를 바닥에 쏟습니다'},
  freepass:{name:'프리패스',a:'card',b:'handle',desc:'카드와 손잡이가 하나의 순환선이 됩니다. 카드는 사람에서 사람으로 다섯 번까지 갈아타고, 카드가 꽂힌 커다란 손잡이 고리가 돌아올 때마다 카드 여섯 장이 더 나갑니다. 두 무기의 피해량이 50% 오릅니다'}
};
const PAIR_OF={};for(const k in WEAPONS)PAIR_OF[WEAPONS[k].pair]=k;
const ENEMIES={
  pass:{name:'승객',hp:10,spd:54,dmg:8,r:11,xp:1},
  zomb:{name:'스마트폰 좀비',hp:14,spd:90,dmg:9,r:11,xp:1},
  intern:{name:'아아 든 인턴',hp:20,spd:76,dmg:8,r:11,xp:2},
  stud:{name:'백팩 학생',hp:36,spd:62,dmg:10,r:12,xp:3,kbRes:.5},
  runner:{name:'뛰는 승객',hp:28,spd:58,dmg:14,r:11,xp:3},
  flyer:{name:'전단지 알바',hp:38,spd:72,dmg:8,r:11,xp:4},
  uncle:{name:'쩍벌 아저씨',hp:95,spd:38,dmg:15,r:18,xp:6,kbRes:.7},
  carrier:{name:'캐리어 여행객',hp:160,spd:44,dmg:18,r:16,xp:9,kbRes:.85},
  flyboss:{name:'진상 전단지 알바',boss:true,hp:165,spd:56,dmg:9,r:17,xp:40,spr:'flyer',sc:1.7},
  doorman:{name:'문지기',boss:true,hp:2600,spd:26,dmg:20,r:30,xp:70,spr:'uncle',sc:1.9},
  carrierboss:{name:'진상 캐리어 여행객',boss:true,hp:4500,spd:54,dmg:22,r:27,xp:120,spr:'carrier',sc:1.8},
  bagman:{name:'백팩 빌런',boss:true,hp:780,spd:66,dmg:16,r:26,xp:60},
  crowd:{name:'하차 인파',boss:true,hp:3600,spd:46,dmg:22,r:40,xp:110},
  speaker:{name:'스피커 빌런',boss:true,hp:2600,spd:64,dmg:20,r:27,xp:170},
  lead:{name:'김 팀장',boss:true,hp:3500,spd:54,dmg:26,r:30,xp:260,spr:'uncle',sc:2}
};
function xpNeed(l){const k=l-1;return Math.floor((k<=20?4+2.3*k+.085*k*k:84*Math.pow(1.16,k-20))*1.22)+1;}
function clockText(t){const m=Math.floor(t/(GAME_LEN/60)),h=8+Math.floor(m/60),mm=m%60;return (h<10?'0':'')+h+':'+(mm<10?'0':'')+mm;}

function createSim(host,opts){
  opts=opts||{};
  const R=Math.random,CELL=48,MAXR=60;
  const di=Math.max(0,Math.min(3,opts.restore&&opts.restore.diff!==undefined?opts.restore.diff|0:opts.diff===undefined?2:opts.diff|0));let D=DIFFS[di];
  const S={diff:di,t:0,state:'run',kills:0,delay:0,zone:0,zk:'street',song:0,zt:0,phase:'crowd',rage:0,rageT:0,clearT:0,gate:null,started:false,late:false,optDone:false,stopIdx:0,doorT:0,doorAcc:0,pvx:0,side:1,spawnX:540,seen:{},pending:0,pickMode:'level',buildVer:1,fus:{},fsrc:{},rerolls:D.rerolls,
    p:{x:0,y:LANE_GAP/2,r:11,hp:100,maxhp:100,inv:0,fx:1,fy:0,level:1,xp:0,moving:false,anim:0,dashT:0,dashCd:0,ddx:1,ddy:0,slow:0},
    weapons:{},passives:{},wt:{},M:null,
    enemies:[],shots:[],puddles:[],lobs:[],bullets:[],beans:[],items:[],zones:[],slicks:[],waves:[],riders:[],rangs:[],mines:[],beams:[],selfA:0,ev:[],
    spawnAcc:0,nextRow:25,nextElite:35,evIdx:0,bosses:[],boss:null,orbA:0,nextId:1,dmg:{},taken:0,takenBy:{},dashes:0,input:{x:0,y:0},choices:null,spawnR:600,
    train:null,trainT:40,trainSeen:false,eliteSeen:false,rush:1,auraT:0};
  const p=S.p;
  const ev=o=>{if(S.ev.length<400)S.ev.push(o);};
  if(opts.restore&&opts.restore.weapons){const r=opts.restore;S.t=r.t||0;S.zone=Math.max(0,Math.min(ZONES.length-1,r.zone|0));S.kills=r.kills||0;S.weapons=Object.assign({},r.weapons);S.passives=Object.assign({},r.passives||{});p.level=r.level||1;p.xp=r.xp||0;S.dmg=Object.assign({},r.dmg||{});S.rerolls=r.rerolls|0;S.fus=Object.assign({},r.fus||{});S.fsrc=Object.assign({},r.fsrc||{});}
  else if(opts.build){S.weapons=Object.assign({},opts.build.weapons);S.passives=Object.assign({},opts.build.passives||{});}
  else{S.weapons.card=1;S.passives.shoes=1;}
  function recalc(){
    const P=S.passives;
    S.M={might:1+.15*(P.will||0),cd:1-.09*(P.pods||0),area:1+.12*(P.tumbler||0),speed:1+.1*(P.shoes||0),pick:1+.4*(P.badge||0),regen:.3*(P.gym||0)+.5*(P.vitamin||0),bossDmg:1+.12*(P.report||0),low:1+.18*(P.overtime||0),lvHeal:4*(P.snack||0),armor:1-.09*(P.armor||0),xp:1+.1*(P.payday||0),dashCd:2.4*(1-.15*(P.energy||0)),crit:.08+.06*(P.focus||0),luck:1+.5*(P.lotto||0),invT:.45+.12*(P.mask||0)};
    p.maxhp=D.hp+25*(P.gym||0);S.buildVer++;
  }
  recalc();
  p.hp=opts.restore&&opts.restore.hp>0?Math.min(opts.restore.hp,p.maxhp):p.maxhp;

  /* ---------------- places ---------------- */
  function spawnPos(k){
    if(S.zk==='train'){const sd=R()<.78?S.side:-S.side;return[p.x+sd*(S.spawnX*(k||1)+R()*70),(R()*2-1)*(AISLE-14)];}
    const a=R()*TAU;return[p.x+Math.cos(a)*S.spawnR*(k||1),p.y+Math.sin(a)*S.spawnR*(k||1)];
  }
  function enterZone(i){
    const Z=ZONES[i],G=GATE[Z.key];S.zone=i;S.zk=Z.kind;S.song=Z.song;let left='';
    S.beams.length=0;S.zt=0;S.phase=G.ride?'ride':'crowd';S.rage=0;S.gate=null;S.stopIdx=0;S.optDone=false;
    if(i>0&&S.started){
      for(const e of S.bosses)if(!e.dead)left=e.def.name;S.bosses.length=0;S.boss=null;
      const sx=-p.x,sy=Z.y0-p.y;
      for(const b of S.beans){b.x+=sx;b.y+=sy;b.att=true;}
      for(const it of S.items){const a=R()*TAU,d=30+R()*40;it.x=Math.cos(a)*d;it.y=Z.y0+Math.sin(a)*(Z.kind==='train'?d*.6:d);}
      S.enemies.length=0;
      S.shots.length=S.puddles.length=S.lobs.length=S.bullets.length=S.zones.length=S.slicks.length=S.waves.length=S.riders.length=S.rangs.length=S.mines.length=0;
      S.train=null;S.delay=0;S.doorT=0;S.pvx=0;p.x=0;p.y=Z.y0;p.dashT=0;p.inv=Math.max(p.inv,1.3);
      if(p.hp<p.maxhp){p.hp=Math.min(p.maxhp,p.hp+D.heal);ev({k:'heal',v:D.heal});}
      ev({k:'zone',i});host.sfx('zone');
    }
    S.started=true;S.trainT=Z.hazard?(i===0?13:6):1e9;S.nextRow=S.t+10;S.nextElite=S.t+(i===0?30:14);
    host.banner(Z.name,left?left+'을 따돌렸습니다. '+Z.line:Z.line,'station');
  }
  const BOSS_LINE={flyboss:'전단지를 한 뭉치씩 뿌립니다',doorman:'출입문 앞에서 절대 안 비킵니다',carrierboss:'캐리어로 길을 통째로 막습니다',bagman:'가방을 뒤로 멘 채 돌아섭니다',crowd:'내리는 사람들이 한 덩어리로 밀려옵니다',speaker:'이어폰 없이 최대 볼륨',lead:DAY_LINE[0]};
  function boss(type){
    const ba=R()*TAU,bd=S.zk==='train'?300:260,bx=p.x+(S.zk==='train'?(R()<.5?-1:1)*bd:Math.cos(ba)*bd),by=S.zk==='train'?0:p.y+Math.sin(ba)*bd*.8,e=spawn(type,bx,by);
    e.intro=1.3;ev({k:'bossin',x:bx,y:by});
    if(type==='speaker'){e.tm=2.6;e.t2=0;e.acc=.6;}
    if(type==='lead'){e.day=0;e.label='김 팀장 · '+PHASES[0];e.z=2;e.fan=1.5;e.row=2;e.t2=3;e.stp=4;e.sq=0;}
    e.t3=5;e.sayT=2.2;e.cc=0;e.pend=0;
    if(type===GATE[ZONES[S.zone].key].boss)S.gate=e;
    S.bosses.push(e);S.boss=e;host.banner(e.def.name,BOSS_LINE[type],'boss');host.sfx('boss');
  }
  function ring(n,quiet){
    const rr=S.spawnR*.9,t=S.t;
    for(let i=0;i<n;i++){const ty=t>400&&i%4===0?'uncle':t>260&&i%3===0?'stud':'pass';
      if(S.zk==='train'){const sd=i%2?1:-1;spawn(ty,p.x+sd*(S.spawnX+(i>>1)*16),(((i*37)%100)/50-1)*(AISLE-14));}
      else{const a=i/n*TAU;spawn(ty,p.x+Math.cos(a)*rr,p.y+Math.sin(a)*rr);}}
    if(!quiet){host.banner('인파에 둘러싸였습니다',S.zk==='train'?'앞뒤에서 밀려옵니다':'틈을 뚫고 나가세요','warn');host.sfx('warn');}
  }
  const ZK=[0,.13,.26,.39,.52,.64,.76];
  const q=()=>Math.min(1.3,ZK[S.zone]+Math.min(.11,S.zt/700));
  function say(e,txt){if(e&&!e.dead&&txt)ev({k:'say',id:e.id,txt});}
  function hpMul(){const k=q();return 1+k*2.4+k*k*6;}
  function pickType(t){
    const w=ZW[S.zk],f=Math.min(1.3,.35+t/300);let tot=0;
    for(const k in w)tot+=k==='pass'?w[k]:w[k]*f;
    let r=R()*tot;
    for(const k in w){r-=k==='pass'?w[k]:w[k]*f;if(r<=0)return k;}
    return 'pass';
  }
  function spawn(type,x,y){
    const d=ENEMIES[type],k=q(),m=d.boss?D.boss:hpMul(S.t)*D.foe;
    const e={id:S.nextId++,type,def:d,x,y,hp:d.hp*m,maxhp:d.hp*m,r:d.r,sc:1,
      spd:d.spd*(d.boss?1:(.9+R()*.2)*(1+k*.38)),dmg:d.dmg*(d.boss?(D.foe+1)/2:(1+k*1.2)*D.foe),xp:d.xp,
      kx:0,ky:0,stun:0,slow:0,slowAmt:0,flash:0,bpT:0,sfT:0,anim:R()*10,vx:0,vy:0,st:0,tm:d.boss?2.5:1+R()*2,t2:d.boss?6:0,acc:0,ang:R()*TAU,
      dx:1,dy:0,seed:(R()*1000)|0,dead:false,boss:!!d.boss,elite:false,mv:true};
    if(type==='zomb'){const a=S.zk==='train'?(x<p.x?0:Math.PI):Math.atan2(p.y-y,p.x-x)+(R()-.5)*.3;e.vx=Math.cos(a)*e.spd;e.vy=Math.sin(a)*e.spd;}
    S.enemies.push(e);return e;
  }
  function spawnElite(){
    let ty=pickType(S.t);if(ty==='zomb')ty='pass';
    const q0=spawnPos(),e=spawn(ty,q0[0],q0[1]);
    e.elite=true;e.hp=e.maxhp=Math.max(140,Math.min(e.maxhp,30*hpMul(S.t)*D.foe)*11);e.r*=1.45;e.sc=1.45;e.dmg*=1.5;e.spd*=1.1;e.xp=e.def.xp*10;
    if(!S.eliteSeen){S.eliteSeen=true;host.banner('진상 승객 등장','훨씬 끈질기고 아픕니다. 잡으면 원두를 듬뿍 떨어뜨립니다','warn');}
    host.sfx('elite');
  }
  function zombieRow(){
    const n=Math.min(24,9+Math.floor(S.t/40));
    if(S.zk==='gates')return;
    if(S.zk==='train'){const sd=R()<.5?-1:1,m=Math.min(n,14);for(let i=0;i<m;i++){const e=spawn('zomb',p.x+sd*(S.spawnX+Math.floor(i/5)*30),((i%5)-2)*30);e.vx=-sd*e.spd;e.vy=0;}return;}
    const a=S.zk==='esc'?(R()<.5?1:-1)*Math.PI/2:R()*TAU,dx=-Math.cos(a),dy=-Math.sin(a);
    const ox=p.x+Math.cos(a)*S.spawnR,oy=p.y+Math.sin(a)*S.spawnR;
    for(let i=0;i<n;i++){const o=(i-(n-1)/2)*34;const e=spawn('zomb',ox-dy*o,oy+dx*o);e.vx=dx*e.spd;e.vy=dy*e.spd;}
  }
  /* turnstile rows: solid cabinets with gaps; anything small enough has to use a gap */
  function gateSolve(o,r){
    const ry=Math.round(o.y/GATE_GAP)*GATE_GAP,dy=o.y-ry;if(Math.abs(dy)>=GATE_TH+r)return;
    const gx=Math.round(o.x/GATE_PER)*GATE_PER,lx=o.x-gx,lim=GATE_HALF-r;
    if(Math.abs(lx)<=GATE_HALF&&lim>0){if(Math.abs(dy)<GATE_TH){if(lx>lim)o.x=gx+lim;else if(lx<-lim)o.x=gx-lim;}return;}
    o.y=ry+(dy>=0?1:-1)*(GATE_TH+r);
  }

  /* ---------------- spatial grid ---------------- */
  const grid=new Map();let gridAge=0;
  const key=(cx,cy)=>(cx+32768)*65536+(cy+32768);
  function buildGrid(){
    if(++gridAge>600){grid.clear();gridAge=0;}else grid.forEach(a=>{a.length=0;});
    const E=S.enemies;
    for(let i=0;i<E.length;i++){const e=E[i];if(e.dead)continue;const k=key(Math.floor(e.x/CELL),Math.floor(e.y/CELL));let a=grid.get(k);if(!a){a=[];grid.set(k,a);}a.push(e);}
  }
  function query(x,y,r,fn){
    const x0=Math.floor((x-r-MAXR)/CELL),x1=Math.floor((x+r+MAXR)/CELL),y0=Math.floor((y-r-MAXR)/CELL),y1=Math.floor((y+r+MAXR)/CELL);
    for(let cx=x0;cx<=x1;cx++)for(let cy=y0;cy<=y1;cy++){const a=grid.get(key(cx,cy));if(!a)continue;for(let i=0;i<a.length;i++){const e=a[i];if(!e.dead)fn(e);}}
  }

  /* ---------------- combat helpers ---------------- */
  function hit(e,d,kx,ky,src){
    if(e.dead)return;
    if(e.intro>0)return;d*=S.M.might*W_SCALE*(S.fsrc[src]?(S.fus.freepass&&(src==='card'||src==='handle')?1.5:1.3):1)*(e.boss||e.elite?S.M.bossDmg:1)*(p.hp<p.maxhp*.5?S.M.low:1);const crit=R()<S.M.crit;if(crit)d*=2;
    e.hp-=d;e.flash=.12;
    const res=e.boss?1:e.elite?.8:(e.def.kbRes||0);e.kx+=kx*(1-res);e.ky+=ky*(1-res);
    ev({k:'num',x:e.x,y:e.y-e.r-8,v:d,crit});S.dmg[src]=(S.dmg[src]||0)+d;
    if(crit)host.sfx('crit',e.x);if(e.hp<=0)kill(e,src);else{host.sfx('hit',e.x,src);ev({k:'hit',x:e.x,y:e.y,src});}
  }
  function dropBean(x,y,v){
    if(S.beans.length>=380){S.beans[(R()*S.beans.length)|0].v+=v;return;}
    S.beans.push({x,y,v,att:false,sp:0,ph:R()*TAU});
  }
  function kill(e,src){
    if(e.dead)return;
    e.dead=true;S.kills++;host.sfx(e.boss?'bossdie':e.elite?'elitedie':src==='train'?'trainkill':'kill',e.x);
    ev({k:'kill',x:e.x,y:e.y,type:e.type,seed:e.seed,sc:e.sc,vx:e.kx,vy:e.ky,boss:e.boss,elite:e.elite,src});
    if(e.type==='intern'&&!e.elite)S.slicks.push({x:e.x,y:e.y,r:38,life:3.2,dur:3.2});
    if(e.boss){
      for(let i=0;i<16;i++){const a=R()*TAU,d=R()*70;dropBean(e.x+Math.cos(a)*d,e.y+Math.sin(a)*d,Math.ceil(e.xp/16));}
      S.bosses=S.bosses.filter(b=>b!==e);S.boss=S.bosses.length?S.bosses[S.bosses.length-1]:null;host.shake(12);
      if(e===S.gate){S.gate=null;S.phase='clear';S.clearT=1.5;S.pending+=1;S.pickMode='chest';p.hp=Math.min(p.maxhp,p.hp+D.heal);ev({k:'heal',v:D.heal});
        host.banner(e.def.name+' 통과',S.zone===ZONES.length-1?'회사 정문이 열렸습니다':'상여금을 챙기고 다음 장소로 갑니다','good');}
      else{S.items.push({kind:'chest',x:e.x,y:e.y,t:0});host.banner(e.def.name+' 통과','상여금 봉투가 떨어졌습니다','good');}
    }else if(e.elite){
      for(let i=0;i<6;i++){const a=R()*TAU,d=R()*30;dropBean(e.x+Math.cos(a)*d,e.y+Math.sin(a)*d,Math.ceil(e.xp/6));}
      if(R()<.4*S.M.luck)S.items.push({kind:'kimbap',x:e.x,y:e.y,t:0});
    }else{
      dropBean(e.x,e.y,e.xp);
      const r=R();
      if(r<.007*S.M.luck)S.items.push({kind:'kimbap',x:e.x,y:e.y,t:0});
      else if(r<.0105*S.M.luck)S.items.push({kind:'pass',x:e.x,y:e.y,t:0});
    }
  }
  function hurt(d,force,src){
    if(opts.demo||S.state!=='run')return;
    if(!force&&p.inv>0)return;
    d*=S.M.armor;p.hp-=d;S.taken+=d;S.takenBy[src||'contact']=(S.takenBy[src||'contact']||0)+d;p.inv=S.M.invT;host.sfx('hurt');host.shake(8);ev({k:'hurt',v:d});
    if(p.hp<=0){p.hp=0;S.state='over';host.end(false);}
  }
  function nearestN(n,maxD){
    const out=[],E=S.enemies,m2=maxD*maxD;
    for(let i=0;i<E.length;i++){const e=E[i];if(e.dead)continue;const dx=e.x-p.x,dy=e.y-p.y,d=dx*dx+dy*dy;if(d>m2)continue;
      if(out.length<n){out.push({e,d});out.sort((a,b)=>a.d-b.d);}else if(d<out[n-1].d){out[n-1]={e,d};out.sort((a,b)=>a.d-b.d);}}
    return out;
  }
  function shoot(x,y,a,spd,dmg,kind,life,r){
    if(S.bullets.length>=260)S.bullets.shift();
    S.bullets.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:life||4,dmg,r:r||7,kind,a:R()*TAU});
  }

  /* ---------------- weapons ---------------- */
  function ready(k,cd,dt,first){
    if(S.wt[k]===undefined)S.wt[k]=cd*(first===undefined?.3:first);
    S.wt[k]-=dt;if(S.wt[k]<=0){S.wt[k]+=cd*S.M.cd;if(S.wt[k]<0)S.wt[k]=cd*S.M.cd;return true;}return false;
  }
  function pickSpot(){
    const E=S.enemies;
    for(let tr=0;tr<12&&E.length;tr++){const e=E[(R()*E.length)|0];if(e.dead)continue;if(Math.hypot(e.x-p.x,e.y-p.y)<300)return[e.x,e.y];}
    const a=R()*TAU,d=70+R()*90;return[p.x+Math.cos(a)*d,p.y+Math.sin(a)*d];
  }
  function weapons(dt){
    let Wp=S.weapons;const M=S.M;let l;
    for(const fk in S.fus){if(Wp===S.weapons)Wp=Object.assign({},S.weapons);const f=FUSIONS[fk];Wp[f.a]=EVO;Wp[f.b]=EVO;}
    /* three combinations replace both parent weapons with one new attack */
    const FZ=S.fus;
    if(FZ.bulldozer){Wp.backpack=0;Wp.shoulder=0;
      /* pack mace: one huge pack on a strap, swung round like a hammer throw; a dash ends in an overhead slam */
      const F=S.mace||(S.mace={a:0,sl:0,rad:60,x:p.x,y:p.y}),R0=150*M.area,sz=48;
      if(F.sl>0){F.sl-=dt;if(F.sl<=0){const r=175*M.area;query(F.x,F.y,r,e=>{const dx=e.x-F.x,dy=e.y-F.y,d=Math.hypot(dx,dy)||1;if(d<r+e.r){if(!e.boss)e.stun=Math.max(e.stun,.8);hit(e,MACE.slam,dx/d*380,dy/d*380,'bulldozer');}});ev({k:'maceslam',x:F.x,y:F.y,r});host.shake(9);host.sfx('bump',undefined,true);F.rad=Math.hypot(F.x-p.x,F.y-p.y);F.a=Math.atan2(F.y-p.y,F.x-p.x);}}
      else{F.a+=MACE.spin*dt;F.rad+=(R0-F.rad)*Math.min(1,dt*4);const ox=p.x+Math.cos(F.a)*F.rad,oy=p.y+Math.sin(F.a)*F.rad;F.x=ox;F.y=oy;
        query(ox,oy,sz,e=>{if(e.bpT>0)return;const dx=e.x-ox,dy=e.y-oy,rr=e.r+sz;if(dx*dx+dy*dy<rr*rr){e.bpT=.5;if(!e.boss)e.stun=Math.max(e.stun,.25);hit(e,MACE.dmg,-Math.sin(F.a)*300,Math.cos(F.a)*300,'bulldozer');ev({k:'macehit',x:e.x,y:e.y});}});
        /* the taut strap clips whoever stands between you and the pack */
        {const cx=Math.cos(F.a),cy=Math.sin(F.a);query(p.x+cx*F.rad*.5,p.y+cy*F.rad*.5,F.rad*.5,e=>{if(e.bpT>0)return;const dx=e.x-p.x,dy=e.y-p.y,al=dx*cx+dy*cy;if(al>10&&al<F.rad-sz&&Math.abs(dx*cy-dy*cx)<10+e.r){e.bpT=.5;hit(e,MACE.strap,-cy*160,cx*160,'bulldozer');}});}
        if(p.dashT>0)S.wasDash=true;else if(S.wasDash){S.wasDash=false;F.sl=F.sd=.24;F.x0=ox;F.y0=oy;ev({k:'macedash',a:Math.atan2(p.fy,p.fx)});F.x=p.x+p.fx*80;F.y=p.y+p.fy*80;}}}
    if(FZ.routine){Wp.coffee=0;Wp.alarm=0;
      /* coffee time bomb: cups set down among the crowd tick for a moment, then go off and flood the floor */
      if(ready('routine',BOMB.cd*M.cd,dt)){let live=0;for(const m of S.mines)if(m.tb)live++;let n=0;for(let k=0;k<BOMB.n&&live+k<8;k++){const q=pickSpot();S.mines.push({tb:true,x:q[0]+(R()-.5)*56,y:q[1]+(R()-.5)*44,fuse:BOMB.fuse,dur:BOMB.fuse,r:WEAPONS.alarm.stat(EVO).r*M.area,dmg:BOMB.dmg,stun:.7,rings:2,evo:true});n++;}if(n)host.sfx('throw');}}
    if(FZ.gentleman){Wp.umbrella=0;Wp.tie=0;
      /* umbrella guard: the open umbrella is held out in the walking direction, stops what hits it, and every block is answered by the necktie */
      const G=S.gent||(S.gent={a:Math.atan2(p.fy,p.fx),cd:0,auto:1,fl:0}),ta=Math.atan2(p.fy,p.fx),dd=Math.atan2(Math.sin(ta-G.a),Math.cos(ta-G.a));
      G.a+=dd*Math.min(1,dt*12);G.cd-=dt;G.auto-=dt;if(G.fl>0)G.fl-=dt;let blocked=false;
      const inArc=(x,y,rad)=>{const dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy);if(d>GUARD.r+rad||d<GUARD.r-30-rad)return false;const an=Math.atan2(dy,dx)-G.a;return Math.abs(Math.atan2(Math.sin(an),Math.cos(an)))<GUARD.half;};
      for(let i=S.bullets.length-1;i>=0;i--){const b=S.bullets[i];if(inArc(b.x,b.y,b.r)){ev({k:'parry',x:b.x,y:b.y});S.bullets.splice(i,1);blocked=true;}}
      query(p.x,p.y,GUARD.r+40,e=>{if(e.shT>0||e.intro>0)return;if(inArc(e.x,e.y,e.r)){e.shT=.3;const gx=Math.cos(G.a),gy=Math.sin(G.a);hit(e,GUARD.bash,gx*GUARD.push,gy*GUARD.push,'gentleman');blocked=true;}});
      if(blocked){if(G.fl<=0)host.sfx('hit',undefined,'umbrella');G.fl=.18;}
      if((blocked&&G.cd<=0)||G.auto<=0){const r=GUARD.len*M.area,dm=blocked?GUARD.counter:GUARD.dmg;G.cd=GUARD.cd;G.auto=GUARD.auto*M.cd;
        query(p.x,p.y,r,e=>{const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;if(d<r+e.r)hit(e,dm,dx/d*280,dy/d*280,'gentleman');});ev({k:'lashspin',r,w:38*Math.sqrt(M.area),gent:true});host.sfx('lash',undefined,true);if(blocked)host.shake(3);}}
    if((l=Wp.card)){const s=WEAPONS.card.stat(l);
      if(S.wt.card===undefined)S.wt.card=.4;S.wt.card-=dt;
      if(S.wt.card<=0){const cn=s.n+(S.fus.freepass?2:0),T=nearestN(cn,540);
        if(T.length){S.wt.card=s.cd*M.cd;
          for(let i=0;i<cn;i++){const e=T[i%T.length].e,rep=Math.floor(i/T.length);
            const a=Math.atan2(e.y-p.y,e.x-p.x)+(rep?(rep%2?1:-1)*.14*Math.ceil(rep/2):0);
            S.shots.push({x:p.x,y:p.y,vx:Math.cos(a)*450,vy:Math.sin(a)*450,life:1.4,dmg:s.dmg,pierce:s.pierce,hits:[],evo:l>=EVO,a});}
          host.sfx('card',undefined,l>=EVO);}
        else S.wt.card=.15;}
    }
    if((l=Wp.umbrella)){const s=WEAPONS.umbrella.stat(l);
      if(s.combo){const gent=!!S.fus.gentleman,quad=true,Q=S.umbQ;
        if(Q){Q.t-=dt;if(Q.t<=0){const fin=Q.n===2,range=(fin?s.finLen:s.range)*M.area,ba=Q.a+(gent?Q.n*Math.PI/4:0),dirs=[ba,ba+Math.PI/2,ba+Math.PI,ba-Math.PI/2];
            for(const a of dirs){const cx=Math.cos(a),cy=Math.sin(a);
              if(fin){const w=s.finW*M.area,E=S.enemies;for(let i=0;i<E.length;i++){const e=E[i];if(e.dead)continue;const dx=e.x-p.x,dy=e.y-p.y,al=dx*cx+dy*cy;if(al<-e.r||al>range+e.r)continue;if(Math.abs(dx*cy-dy*cx)<w+e.r)hit(e,s.fin,cx*s.kb*2.2,cy*s.kb*2.2,'umbrella');}}
              else query(p.x,p.y,range,e=>{const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy);if(d>range+e.r)return;const da=Math.abs(((Math.atan2(dy,dx)-a)%TAU+TAU+Math.PI)%TAU-Math.PI);if(da<=s.half||d<e.r+p.r)hit(e,s.dmg,cx*s.kb,cy*s.kb,'umbrella');});}
            ev({k:'stab',a:ba,range,n:Q.n,quad});host.sfx('swing',undefined,fin);if(fin)host.shake(3);
            Q.n++;Q.t=Q.n===2?.2:.15;if(Q.n>2)S.umbQ=null;}}
        else if(ready('umbrella',s.cd*(gent?.8:1),dt)){let a=Math.atan2(p.fy,p.fx);const T=nearestN(1,s.finLen*M.area);if(T.length)a=Math.atan2(T[0].e.y-p.y,T[0].e.x-p.x);S.umbQ={a,n:0,t:0};}}
      else if(ready('umbrella',s.cd,dt)){const range=s.range*M.area;let a=Math.atan2(p.fy,p.fx);
        const T=nearestN(1,range*1.6);if(T.length)a=Math.atan2(T[0].e.y-p.y,T[0].e.x-p.x);
        query(p.x,p.y,range,e=>{const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy);if(d>range+e.r)return;
          const da=Math.abs(((Math.atan2(dy,dx)-a)%TAU+TAU+Math.PI)%TAU-Math.PI);
          if(da<=s.half||(s.both&&Math.PI-da<=s.half)||d<e.r+p.r){const k=s.kb/(d||1);hit(e,s.dmg,dx*k,dy*k,'umbrella');}});
        ev({k:'swipe',a,range,half:s.half,both:s.both,evo:false});host.sfx('swing',undefined,l>=EVO);}
    }
    if((l=Wp.backpack)){const s=WEAPONS.backpack.stat(l),bull=!!S.fus.bulldozer,rad=s.radius*M.area*(bull?.8:1);S.orbA+=s.spin*dt;
      /* bulldozer: the packs stop orbiting and lock into a blade in front of the player, turning with the walking direction */
      if(bull){const ta=Math.atan2(p.fy,p.fx);if(S.bullA===undefined)S.bullA=ta;const d=Math.atan2(Math.sin(ta-S.bullA),Math.cos(ta-S.bullA));S.bullA+=d*Math.min(1,dt*11);}
      const bsz=s.size*(bull?1.35:1),bfx=bull?Math.cos(S.bullA):0,bfy=bull?Math.sin(S.bullA):0;
      for(let k=0;k<s.n;k++){const a=bull?S.bullA+(k-(s.n-1)/2)*.44:S.orbA+k*TAU/s.n,ox=p.x+Math.cos(a)*rad,oy=p.y+Math.sin(a)*rad;
        query(ox,oy,bsz,e=>{if(e.bpT>0)return;const dx=e.x-ox,dy=e.y-oy,rr=e.r+bsz;if(dx*dx+dy*dy<rr*rr){e.bpT=bull?.2:.3;const ex=e.x-p.x,ey=e.y-p.y,d=Math.hypot(ex,ey)||1;if(bull)hit(e,s.dmg,bfx*230,bfy*230,'backpack');else hit(e,s.dmg,ex/d*130,ey/d*130,'backpack');}});}
    }
    if((l=Wp.coffee)){const s=WEAPONS.coffee.stat(l);
      if(ready('coffee',s.cd,dt)){
        for(let k=0;k<s.n;k++){const q=pickSpot();S.lobs.push({x0:p.x,y0:p.y-10,x1:q[0],y1:q[1],t:0,dur:.36,r:s.r*M.area,life:s.dur,dmg:s.tick,slow:s.slow,evo:l>=EVO});}
        host.sfx('throw');}
    }
    if((l=Wp.anc)){const s=WEAPONS.anc.stat(l);
      if(ready('anc',s.cd,dt)){const r=s.r*M.area;
        query(p.x,p.y,r,e=>{const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;if(d<r+e.r)hit(e,s.dmg,dx/d*s.kb,dy/d*s.kb,'anc');});
        ev({k:'ring',r,evo:l>=EVO});host.sfx('pulse',undefined,l>=EVO);}
    }
    if((l=Wp.shout)){const s=WEAPONS.shout.stat(l);
      if(ready('shout',s.cd,dt,.25)){const r=S.spawnR,E=S.enemies;
        for(let i=0;i<E.length;i++){const e=E[i];if(e.dead)continue;const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;if(d<r){if(!e.boss)e.stun=Math.max(e.stun,e.elite?s.stun*.5:s.stun);hit(e,s.dmg,dx/d*330,dy/d*330,'shout');}}
        S.bullets.length=0;
        ev({k:'shout',r,evo:l>=EVO});host.sfx('shout',undefined,l>=EVO);host.shake(6);}
    }
    if((l=Wp.battery)){const s=WEAPONS.battery.stat(l);
      if(S.wt.battery===undefined)S.wt.battery=.5;S.wt.battery-=dt;
      if(S.wt.battery<=0){const T=nearestN(1,290);
        if(T.length){S.wt.battery=s.cd*M.cd;
          let cur=T[0].e;const pts=[p.x,p.y-14],used=[],jump=150*M.area;
          for(let c=0;c<=s.chain&&cur;c++){used.push(cur.id);pts.push(cur.x,cur.y-6);const cx=cur.x,cy=cur.y;
            if(s.stun&&!cur.boss)cur.stun=Math.max(cur.stun,s.stun);
            hit(cur,s.dmg,0,0,'battery');
            let nx=null,nd=jump*jump;
            query(cx,cy,jump,e=>{if(used.indexOf(e.id)>=0)return;const dx=e.x-cx,dy=e.y-cy,d2=dx*dx+dy*dy;if(d2<nd){nd=d2;nx=e;}});
            cur=nx;}
          ev({k:'zap',pts,evo:l>=EVO});host.sfx('zap',undefined,l>=EVO);}
        else S.wt.battery=.2;}
    }
    if((l=Wp.scooter)){const s=WEAPONS.scooter.stat(l);
      if(S.wt.scooter===undefined)S.wt.scooter=.6;S.wt.scooter-=dt;
      if(S.wt.scooter<=0){const T=nearestN(1,520);
        if(T.length){S.wt.scooter=s.cd*M.cd;const a=Math.atan2(T[0].e.y-p.y,T[0].e.x-p.x),dirs=l>=EVO?[a-.32,a,a+.32]:s.n>1?[a,a+Math.PI]:[a];
          for(const d of dirs)S.riders.push({x:p.x-Math.cos(d)*90,y:p.y-Math.sin(d)*90,dx:Math.cos(d),dy:Math.sin(d),dist:0,max:s.max*M.area,w:s.w*M.area,dmg:s.dmg,hits:[],evo:l>=EVO});
          host.sfx('scooter',undefined,l>=EVO);}
        else S.wt.scooter=.2;}
    }
    if((l=Wp.selfie)){const s=WEAPONS.selfie.stat(l),len=s.len*M.area;S.selfA+=s.spin*dt;
      for(let k=0;k<s.n;k++){const a=S.selfA+k*TAU/s.n,cx=Math.cos(a),sy=Math.sin(a);
        for(let d=26;d<=len;d+=26){const bx=p.x+cx*d,by=p.y+sy*d;query(bx,by,15,e=>{if(e.sfT>0)return;const ex=e.x-bx,ey=e.y-by,rr=e.r+15;if(ex*ex+ey*ey<rr*rr){e.sfT=.4;if(s.stun&&!e.boss)e.stun=Math.max(e.stun,s.stun);hit(e,s.dmg,-sy*70,cx*70,'selfie');}});}}
    }
    if((l=Wp.handle)){const s=WEAPONS.handle.stat(l);
      if(S.wt.handle===undefined)S.wt.handle=.5;S.wt.handle-=dt;
      if(S.wt.handle<=0){const T=nearestN(s.n,420);
        if(T.length){S.wt.handle=s.cd*M.cd;const sp=560*s.range*Math.sqrt(M.area);
          for(let i=0;i<s.n;i++){const e=T[i%T.length].e,rep=Math.floor(i/T.length),a=Math.atan2(e.y-p.y,e.x-p.x)+(rep?(rep%2?1:-1)*.35*Math.ceil(rep/2):0);
            S.rangs.push({x:p.x,y:p.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,ph:0,t:0,sp:0,dmg:s.dmg,size:s.size,hits:[],evo:l>=EVO});}
          host.sfx('throw');}
        else S.wt.handle=.15;}
    }
    if((l=Wp.alarm)){const s=WEAPONS.alarm.stat(l);
      if(ready('alarm',s.cd,dt)){for(let k=0;k<s.n;k++){const q=pickSpot();S.lobs.push({kind:'alarm',x0:p.x,y0:p.y-10,x1:q[0],y1:q[1],t:0,dur:.4,r:s.r*M.area,dmg:s.dmg,stun:s.stun,rings:s.rings,evo:l>=EVO});}host.sfx('throw');}
    }
    if((l=Wp.tie)){const s=WEAPONS.tie.stat(l);
      if(ready('tie',s.cd,dt)){const len=s.len*M.area,w=s.w*Math.sqrt(M.area),gent=!!S.fus.gentleman;S.tieN=(S.tieN||0)+1;
        if(l>=EVO&&(gent||S.tieN%3===0)){const r=len*(gent?1.15:.95);query(p.x,p.y,r,e=>{const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;if(d<r+e.r)hit(e,s.dmg*1.35,dx/d*s.kb*1.4,dy/d*s.kb*1.4,'tie');});ev({k:'lashspin',r,w,gent});host.sfx('lash',undefined,true);host.shake(3);}
        else{const T=nearestN(1,len+140),a0=T.length?Math.atan2(T[0].e.y-p.y,T[0].e.x-p.x):Math.atan2(p.fy,p.fx),as=s.both?[a0,a0+Math.PI]:[a0];
        for(const a of as){const cx=Math.cos(a),cy=Math.sin(a);query(p.x+cx*len/2,p.y+cy*len/2,len/2+w,e=>{const dx=e.x-p.x,dy=e.y-p.y,al=dx*cx+dy*cy;if(al>-e.r&&al<len+e.r&&Math.abs(dx*cy-dy*cx)<w+e.r){const tip=al>len*.68;hit(e,s.dmg*(tip?1.4:1),cx*s.kb*(tip?1.5:1),cy*s.kb*(tip?1.5:1),'tie');}});}
        ev({k:'lash',as,len,w,evo:l>=EVO});host.sfx('lash',undefined,l>=EVO);}}
    }
    if(S.fus.remote){let n=0;for(const b of S.beams)if(b.perm)n++;
      if(!n)for(let j=0;j<4;j++)S.beams.push({perm:true,a:j*TAU/4,da:.75,life:.5,dur:1,len:600*Math.sqrt(M.area),w:20*M.area,dmg:27,tick:0,evo:true,j});}
    else if((l=Wp.laptop)){const s=WEAPONS.laptop.stat(l);
      if(S.wt.laptop===undefined)S.wt.laptop=.7;S.wt.laptop-=dt;
      if(S.wt.laptop<=0){const T=nearestN(1,480);
        if(T.length){S.wt.laptop=s.cd*M.cd;const a0=Math.atan2(T[0].e.y-p.y,T[0].e.x-p.x),len=s.len*Math.sqrt(M.area),w=s.w*M.area,evo=l>=EVO,dir=R()<.5?-1:1,sw=evo?.8:.5,dur=evo?.9:.6;
          for(let j=0;j<s.n;j++)S.beams.push({a:a0+j*TAU/s.n-dir*sw/2,da:dir*sw/dur,life:dur,dur,len,w,dmg:s.dmg*.31,tick:0,evo,j});
          ev({k:'laptop',evo});host.sfx('beam',undefined,evo);}
        else S.wt.laptop=.2;}
    }
    for(let i=S.beams.length-1;i>=0;i--){const b=S.beams[i];if(b.perm){if(!S.fus.remote){S.beams.splice(i,1);continue;}b.life=.5;}else b.life-=dt;b.a+=b.da*dt;b.tick-=dt;
      if(b.tick<=0){b.tick=b.perm?.12:.2;let zc=0;const cx=Math.cos(b.a),cy=Math.sin(b.a),E=S.enemies;for(let k=0;k<E.length;k++){const e=E[k];if(e.dead)continue;const dx=e.x-p.x,dy=e.y-p.y,al=dx*cx+dy*cy;if(al<-e.r||al>b.len+e.r)continue;if(Math.abs(dx*cy-dy*cx)<b.w+e.r){hit(e,b.dmg,cx*45,cy*45,'laptop');
          if(b.perm&&!(e.rzT>0)&&zc<3){zc++;e.rzT=.45;let cur=e;const pts=[e.x,e.y-6],used=[e.id];
            for(let c=0;c<4&&cur;c++){let nx=null,nd=165*165;const ux=cur.x,uy=cur.y;query(ux,uy,165,o=>{if(o.dead||used.indexOf(o.id)>=0)return;const ox=o.x-ux,oy=o.y-uy,d2=ox*ox+oy*oy;if(d2<nd){nd=d2;nx=o;}});
              if(nx){used.push(nx.id);pts.push(nx.x,nx.y-6);nx.rzT=.3;hit(nx,38,0,0,'battery');}cur=nx;}
            if(pts.length>2){ev({k:'zap',pts,evo:true,gold:true});host.sfx('zap',e.x,true);}}}}}

      if(b.life<=0)S.beams.splice(i,1);}
    if((l=Wp.gum)){const s=WEAPONS.gum.stat(l);
      if(ready('gum',s.cd,dt)){S.puddles.push({x:p.x-p.fx*14,y:p.y-p.fy*14,r:s.r*M.area,life:s.dur,dur:s.dur,tick:.15,dmg:s.tick,slow:s.slow,evo:l>=EVO,gum:true,ph:R()*TAU});host.sfx('gum');}
    }
    if((l=Wp.shoulder)){const s=WEAPONS.shoulder.stat(l),bull=!!S.fus.bulldozer,r=s.r*M.area*(bull?1.45:1),evo=l>=EVO;if(bull){s.cdE=.2;s.stun=.8;s.mul*=1.5;}
      /* the big hit only comes out of a dash: that is the risk, and the reward */
      const burst=()=>{query(p.x,p.y,r,e=>{const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;if(d<r+e.r){if(s.stun&&!e.boss)e.stun=Math.max(e.stun,s.stun);e.shT=.3;hit(e,s.dmg*s.mul,dx/d*s.kb*1.3,dy/d*s.kb*1.3,'shoulder');}});if(bull){ev({k:'fcast',t:'bulldozer',r});host.shake(8);}else{ev({k:'bump',r,evo,a:Math.atan2(p.ddy||p.fy,p.ddx||p.fx)});host.shake(evo?6:4);}host.sfx('bump',undefined,evo);};
      if(p.dashT>0){S.wasDash=true;if(s.trail)query(p.x,p.y,38,e=>{if(e.shT>0)return;const dx=e.x-p.x,dy=e.y-p.y,rr=38+e.r;if(dx*dx+dy*dy<rr*rr){e.shT=.5;hit(e,s.dmg*1.3,p.ddx*200,p.ddy*200,'shoulder');}});}
      else{if(S.wasDash){S.wasDash=false;burst();}
        /* standing your ground: whoever walks into you gets shouldered back */
        let n=0;S.wt.shN=(S.wt.shN||0)-dt;query(p.x,p.y,p.r+40,e=>{if(e.shT>0||e.intro>0)return;const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;if(d<p.r+e.r+(bull?22:9)){e.shT=s.cdE;hit(e,s.dmg,dx/d*s.kb,dy/d*s.kb,'shoulder');if(n++<2)ev({k:'nudge',x:p.x+dx/d*(p.r+4),y:p.y+dy/d*(p.r+4),a:Math.atan2(dy,dx),evo,bag:bull});}});
        if(n&&S.wt.shN<=0){S.wt.shN=.14;host.sfx('hit',undefined,'shoulder');}}
    }
    if((l=Wp.hotpack)){const s=WEAPONS.hotpack.stat(l);S.auraT-=dt;
      if(S.auraT<=0){S.auraT=s.tick*M.cd;const r=s.r*M.area;
        query(p.x,p.y,r,e=>{const dx=e.x-p.x,dy=e.y-p.y,rr=r+e.r*.6;if(dx*dx+dy*dy<rr*rr){if(s.slow&&!e.boss){e.slow=.5;e.slowAmt=Math.max(e.slowAmt,s.slow);}hit(e,s.dmg,0,0,'hotpack');}});}
    }
  }

  /* ---------------- level up ---------------- */
  const owned=o=>Object.keys(o).length;
  function genChoices(){
    if(S.pickMode==='start'){
      const ks=Object.keys(WEAPONS),out=[];
      while(out.length<3){const k=ks.splice((R()*ks.length)|0,1)[0],w=WEAPONS[k];out.push({kind:'weapon',key:k,to:1,name:w.name,desc:w.lv[0],tag:'시작 무기',hint:'진화 짝: '+PASSIVES[w.pair].name});}
      return out;
    }
    const pool=[],evos=[],wn=owned(S.weapons)+owned(S.fus),pn=owned(S.passives);
    for(const k in FUSIONS){const f=FUSIONS[k];if(S.weapons[f.a]>=EVO&&S.weapons[f.b]>=EVO)evos.unshift({kind:'fuse',key:k,to:1,name:f.name,desc:f.desc,tag:'히든 조합',hint:WEAPONS[f.a].evoName+' + '+WEAPONS[f.b].evoName});}
    for(const k in WEAPONS){if(S.fsrc[k])continue;const l=S.weapons[k]||0,w=WEAPONS[k],hint='진화 짝: '+PASSIVES[w.pair].name+(S.passives[w.pair]?' (보유)':'');
      if(l===0){if(wn<MAX_W)pool.push({kind:'weapon',key:k,to:1,name:w.name,desc:w.lv[0],tag:'새 무기',hint,wt:S.passives[w.pair]?2.5:1});}
      else if(l<WMAX)pool.push({kind:'weapon',key:k,to:l+1,name:w.name,desc:w.lv[l],tag:'무기 강화',hint,wt:3});
      else if(l===WMAX&&S.passives[w.pair])evos.push({kind:'evo',key:k,to:WMAX+1,name:w.evoName,desc:w.evoDesc,tag:'진화',hint:w.name+' + '+PASSIVES[w.pair].name});}
    for(const k in PASSIVES){const l=S.passives[k]||0,pq=PASSIVES[k],wk=PAIR_OF[k],hint=WEAPONS[wk].name+' 진화에 필요'+(S.weapons[wk]?' (보유)':'');
      if(l===0){if(pn<MAX_P)pool.push({kind:'passive',key:k,to:1,name:pq.name,desc:pq.desc,tag:'새 장비',hint,wt:S.weapons[wk]?3.5:1});}
      else if(l<PMAX)pool.push({kind:'passive',key:k,to:l+1,name:pq.name,desc:pq.desc,tag:'장비 강화',hint,wt:2});}
    const out=[];
    if(evos.length)out.push(evos[0].kind==='fuse'?evos[0]:evos[(R()*evos.length)|0]);
    while(out.length<3&&pool.length){let tot=0;for(const c of pool)tot+=c.wt;let r=R()*tot,i=0;for(;i<pool.length-1;i++){r-=pool[i].wt;if(r<=0)break;}out.push(pool.splice(i,1)[0]);}
    const heals=[{kind:'heal',key:'heal',to:0,name:'삼각김밥',desc:'멘탈을 20 회복합니다',tag:'간식',hint:'더 올릴 것이 없을 때 나옵니다'},
      {kind:'heal',key:'heal2',to:0,name:'캔커피',desc:'멘탈을 20 회복합니다',tag:'간식',hint:'더 올릴 것이 없을 때 나옵니다'},
      {kind:'heal',key:'heal',to:0,name:'편의점 도시락',desc:'멘탈을 20 회복합니다',tag:'간식',hint:'더 올릴 것이 없을 때 나옵니다'}];
    let hi=0;while(out.length<3)out.push(heals[hi++]);
    return out;
  }
  function apply(c){
    if(c.kind==='fuse'){const f=FUSIONS[c.key];delete S.weapons[f.a];delete S.weapons[f.b];S.fus[c.key]=1;S.fsrc[f.a]=S.fsrc[f.b]=1;ev({k:'fuse'});host.sfx('evo');}
    else if(c.kind==='weapon'||c.kind==='evo')S.weapons[c.key]=c.to;
    else if(c.kind==='passive'){S.passives[c.key]=c.to;if(c.key==='gym')p.hp+=25;}
    else p.hp+=20;
    recalc();p.hp=Math.min(p.hp,p.maxhp);
  }
  function openLevelUp(){
    if(S.admNoPick){S.pending=0;S.pickMode='level';return;}
    while(S.pending>0){
      const ch=genChoices();
      if(opts.demo||opts.autoPick){apply(opts.autoPick?opts.autoPick(ch,S):ch[(R()*ch.length)|0]);S.pending--;if(S.pending===0||S.pickMode==='start')S.pickMode='level';continue;}
      S.choices=ch;S.state='levelup';if(S.pickMode!=='start')host.sfx(S.pickMode==='chest'?'chest':'level');host.levelUp(ch,S.pickMode);return;
    }
  }
  function choose(i){
    if(S.state!=='levelup'||!S.choices||!S.choices[i])return;
    apply(S.choices[i]);S.choices=null;S.pending--;S.state='run';p.inv=Math.max(p.inv,.7);
    if(S.pending===0||S.pickMode==='start')S.pickMode='level';
    if(S.pending>0)openLevelUp();
  }
  function reroll(){
    if(S.state!=='levelup'||S.rerolls<=0||S.pickMode==='start')return false;
    S.rerolls--;S.choices=genChoices();host.levelUp(S.choices,S.pickMode);return true;
  }
  function dash(){
    if(S.state!=='run'||p.dashCd>0)return false;
    let dx=S.input.x,dy=S.input.y;const l=Math.hypot(dx,dy);
    if(l>.1){dx/=l;dy/=l;}else{dx=p.fx;dy=p.fy;}
    p.ddx=dx;p.ddy=dy;p.dashT=.2;p.dashCd=S.M.dashCd;p.inv=Math.max(p.inv,.34);S.dashes++;host.sfx('dash');ev({k:'dash',x:p.x,y:p.y});return true;
  }

  /* ---------------- main update ---------------- */
  function update(dt,view){
    if(S.state!=='run')return;
    if(S.pending>0){openLevelUp();if(S.state!=='run')return;}
    S.t+=dt;const t=S.t,M=S.M,k=q();
    if(view){S.spawnR=Math.hypot(view.w,view.h)/2+50;S.spawnX=view.w/2+70;}
    if(!S.started)enterZone(S.zone);
    S.zt+=dt;
    {const G=GATE[ZONES[S.zone].key];
      if(S.phase==='crowd'){if(S.zt>=G.crowd){boss(G.boss);S.phase='boss';S.rage=0;S.rageT=D.enrage;}}
      else if(S.phase==='boss'){S.rageT-=dt;if(S.rageT<=0){S.rage++;S.rageT=ENRAGE_STEP;if(S.gate){S.gate.dmg*=1.08;say(S.gate,RAGE_TALK[S.gate.type]);S.gate.sayT=5;host.sfx('roar',S.gate.x);}host.banner('폭주 '+S.rage+'단계','진상의 기술이 강해지고 인파가 더 몰려듭니다','warn');host.sfx('warn');ring(8+S.rage*4,true);}}
      else if(S.phase==='clear'){S.clearT-=dt;if(S.clearT<=0){if(S.zone===ZONES.length-1){S.late=S.t>GAME_LEN;S.state='won';host.end(true);return;}enterZone(S.zone+1);}}
      else if(S.phase==='ride'){if(!S.optDone&&S.zt>=46){S.optDone=true;boss(G.opt);}if(S.zt>=G.ride)enterZone(S.zone+1);}}

    // slicks affect the player
    p.slow=0;
    for(let i=S.slicks.length-1;i>=0;i--){const s=S.slicks[i];s.life-=dt;if(s.life<=0){S.slicks.splice(i,1);continue;}
      const dx=p.x-s.x,dy=p.y-s.y;if(dx*dx+dy*dy<s.r*s.r)p.slow=.45;}
    if(p.slow>0&&!S.wasSlow)host.sfx('slip');S.wasSlow=p.slow>0;
    if(GAME_LEN-S.t<=10&&GAME_LEN>S.t){const n=Math.ceil(GAME_LEN-S.t);if(n!==S.lastTick&&n>0){S.lastTick=n;host.sfx('tick',undefined,n);}}
    // player
    let ix=S.input.x,iy=S.input.y;const il=Math.hypot(ix,iy);
    p.moving=il>.05;
    if(p.dashCd>0){p.dashCd-=dt;if(p.dashCd<=0)host.sfx('dashready');}
    if(p.dashT>0){p.dashT-=dt;p.x+=p.ddx*640*dt;p.y+=p.ddy*640*dt;p.fx=p.ddx;p.fy=p.ddy;p.inv=Math.max(p.inv,.12);p.anim+=dt*2;}
    else if(p.moving){if(il>1){ix/=il;iy/=il;}const sp=152*M.speed*(1-p.slow);p.x+=ix*sp*dt;p.y+=iy*sp*dt;const n=Math.hypot(ix,iy)||1;p.fx=ix/n;p.fy=iy/n;p.anim+=dt;}
    if(S.zk==='gates')gateSolve(p,p.r);
    else if(S.zk==='train'){if(S.pvx){p.x+=S.pvx*dt;S.pvx*=Math.exp(-5*dt);if(Math.abs(S.pvx)<2)S.pvx=0;}p.y=Math.max(-AISLE+p.r,Math.min(AISLE-p.r,p.y));}
    else if(S.zk==='esc'&&p.dashT<=0){const c=((Math.floor(p.x/ESC_W)%3)+3)%3;if(c!==1)p.y+=(c===0?-1:1)*ESC_PUSH*dt;}
    if(p.inv>0)p.inv-=dt;
    if(M.regen&&p.hp<p.maxhp)p.hp=Math.min(p.maxhp,p.hp+M.regen*dt);

    // spawning
    const dens=(ZONES[S.zone].dens||1)*D.crowd,cap=(150+t*.55)*dens;
    const rate=S.phase==='clear'?0:(1.8+12*k+13*k*k)*(1+.3*S.rage)*dens*(S.admRate===undefined?1:S.admRate);
    S.spawnAcc+=rate*dt;
    while(S.spawnAcc>=1){S.spawnAcc-=1;if(S.enemies.length<cap){const q0=spawnPos();spawn(pickType(t),q0[0],q0[1]);}}
    if(t>=S.nextRow&&S.phase!=='clear'){S.nextRow=t+(t>300?15:20);zombieRow();if(t>420)zombieRow();}
    if(t>=S.nextElite&&S.phase!=='clear'){S.nextElite=t+(t>360?20:28)*D.elite;spawnElite();}

    // riding the train: every stop opens the doors and lets a crowd in
    if(S.zk==='train'){
      if(S.stopIdx<STOPS.length&&S.zt>=GATE.train.ride/5*(S.stopIdx+1)){const st=STOPS[S.stopIdx++];S.doorT=DOOR_OPEN;S.doorAcc=0;S.side=-S.side;S.pvx=150;for(const e of S.enemies)if(!e.boss)e.kx+=170;
        if(S.stopIdx>=3)S.song=3;host.banner('이번 역은 '+st.name,'문이 열립니다. 닫힐 때까지 버티세요','station');host.sfx('station');host.shake(5);ev({k:'doors',open:1});}
      if(S.doorT>0){S.doorT-=dt;
        /* people pour in through every door near the player, in surges, and shove whoever stands in the doorway */
        const surge=.55+.45*Math.sin((DOOR_OPEN-S.doorT)*2.4);S.doorAcc+=dt*(DOOR_RATE[0]+DOOR_RATE[1]*k)*D.crowd*(S.doorT>DOOR_OPEN-1.2?2.2:1)*surge*2;
        while(S.doorAcc>=1){S.doorAcc-=1;if(S.enemies.length<cap+70){const dx=Math.round((p.x+(R()*2-1)*470-160)/DOOR_PER)*DOOR_PER+160,sd=R()<.5?-1:1;let ty=pickType(t);if(ty==='zomb'||ty==='carrier')ty='pass';
          const e=spawn(ty,dx+(R()-.5)*40,sd*(AISLE+62+R()*70));e.board=1.6;}}
        {const ox=((p.x-160)%DOOR_PER+DOOR_PER*1.5)%DOOR_PER-DOOR_PER/2;if(Math.abs(ox)<48&&Math.abs(p.y)>AISLE-46&&p.dashT<=0)p.y-=Math.sign(p.y)*150*dt;}
        if(S.doorT<=0){S.pvx=-130;for(const e of S.enemies)if(!e.boss)e.kx-=150;host.sfx('doorclose');ev({k:'doors',open:0});}}
    }
    // lane hazard: a bus on the street, a train at the platform
    const hz=ZONES[S.zone].hazard;
    S.trainT-=dt;
    if(hz&&!S.train&&S.trainT<=0){
      const ln=Math.round(p.y/LANE_GAP),bus=hz==='bus';
      S.train={kind:hz,len:bus?560:TRAIN_LEN,spd:bus?1150:TRAIN_SPD,y:ln*LANE_GAP,dir:R()<.5?1:-1,warn:1.5,on:false,x:0,hitP:false,hit:{}};
      host.sfx(bus?'buswarn':'trainwarn');
      if(!S.seen[hz]){S.seen[hz]=1;host.banner(bus?'버스가 옵니다':'열차가 들어옵니다',(bus?'차도':'선로')+' 밖으로 물러나세요. 인파는 치고 지나갑니다','warn');}
      S.trainT=((bus?10:13-7*k)+R()*3)*D.hazard;
    }
    if(S.train){const T=S.train;
      if(!T.on){T.warn-=dt;if(T.warn<=0){T.on=true;T.x=p.x-T.dir*(S.spawnR+60);host.sfx(T.kind==='bus'?'buspass':'trainpass');if(Math.abs(p.y-T.y)<S.spawnR)host.shake(9);}}
      else{T.x+=T.dir*T.spd*dt;const tail=T.x-T.dir*T.len,lo=Math.min(T.x,tail),hi=Math.max(T.x,tail),E=S.enemies;
        for(let i=0;i<E.length;i++){const e=E[i];if(e.dead||e.x<lo||e.x>hi||Math.abs(e.y-T.y)>LANE_H+e.r*.4)continue;
          if(e.boss||e.elite){if(!T.hit[e.id]){T.hit[e.id]=1;const d=e.boss?350:e.maxhp*.6;e.hp-=d;e.flash=.15;ev({k:'num',x:e.x,y:e.y-e.r-8,v:d,crit:true});S.dmg.train=(S.dmg.train||0)+d;if(e.hp<=0)kill(e,'train');}}
          else{e.kx=T.dir*700;e.ky=(e.y>=T.y?1:-1)*260;S.dmg.train=(S.dmg.train||0)+e.hp;kill(e,'train');}}
        if(p.x>lo&&p.x<hi&&Math.abs(p.y-T.y)<LANE_H+4){
          if(!T.hitP){T.hitP=true;hurt(45,true,'train');ev({k:'trainhit',x:p.x,y:p.y});}
          p.y=T.y+(p.y>=T.y?1:-1)*(LANE_H+p.r+8);p.dashT=0;}
        if((T.dir>0&&tail>p.x+S.spawnR+120)||(T.dir<0&&tail<p.x-S.spawnR-120))S.train=null;}
      if(S.state!=='run')return;
    }

    // enemies
    const E=S.enemies,farR=S.spawnR*1.55,zk=S.zk,pcell=Math.floor(p.y/GATE_GAP);
    for(let i=E.length-1;i>=0;i--){
      const e=E[i];
      if(e.dead){E[i]=E[E.length-1];E.pop();continue;}
      e.anim+=dt;if(e.flash>0)e.flash-=dt;if(e.bpT>0)e.bpT-=dt;if(e.shT>0)e.shT-=dt;if(e.rzT>0)e.rzT-=dt;if(e.sfT>0)e.sfT-=dt;if(e.slow>0)e.slow-=dt;else e.slowAmt=0;
      const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1,nx=dx/d,ny=dy/d;
      let mvx=0,mvy=0;const rg=e.boss?Math.min(4,S.rage):0,bdt=e.boss?dt*(1+.12*rg):dt;
      if(e.intro>0){e.intro-=dt;if(e.intro<=0){ev({k:'bossland',x:e.x,y:e.y});host.shake(12);host.sfx('stamp');say(e,(e.type==='lead'?TALK.lead[0]:TALK[e.type]||[''])[0]);host.sfx('voice',e.x,e.type);}continue;}
      if(e.boss&&TALK[e.type]){e.sayT-=dt;if(e.sayT<=0){e.sayT=6+R()*4;const L=e.type==='lead'?TALK.lead[e.day||0]:TALK[e.type];say(e,L[(R()*L.length)|0]);host.sfx('voice',e.x,e.type);}}
      if(e.stun>0){e.stun-=dt;e.mv=false;}
      else{
        e.mv=true;
        const sp=e.spd*(e.slow>0&&!e.boss?1-e.slowAmt:1)*(e.boss?1+.1*Math.min(4,S.rage):1);
        switch(e.type){
          case 'zomb':{const f=sp/e.spd;mvx=e.vx*f;mvy=e.vy*f;break;}
          case 'runner':
            if(e.st===0){mvx=nx*sp;mvy=ny*sp;if(d<250){e.st=1;e.tm=.5;host.sfx('alert',e.x);}}
            else if(e.st===1){e.mv=false;e.tm-=dt;if(e.tm<=0){e.st=2;e.tm=.55;e.dx=nx;e.dy=ny;}}
            else if(e.st===2){mvx=e.dx*360;mvy=e.dy*360;e.tm-=dt;if(e.tm<=0){e.st=3;e.tm=.9;}}
            else{mvx=nx*sp*.5;mvy=ny*sp*.5;e.tm-=dt;if(e.tm<=0)e.st=0;}
            break;
          case 'flyer':
            if(d>240){mvx=nx*sp;mvy=ny*sp;}else if(d<160){mvx=-nx*sp*.6;mvy=-ny*sp*.6;}else{const sd=e.seed&1?1:-1;mvx=-ny*sp*.5*sd;mvy=nx*sp*.5*sd;}
            e.tm-=dt;if(e.tm<=0){e.tm=3-k*.6;if(d<420){shoot(e.x,e.y-8,Math.atan2(dy,dx),160+k*30,8*(1+k*.5),2,3.2,6);host.sfx('flick',e.x);}}
            break;
          case 'flyboss':
            if(d>190){mvx=nx*sp;mvy=ny*sp;}else if(d<100){mvx=-nx*sp*.6;mvy=-ny*sp*.6;}else{mvx=-ny*sp*.5;mvy=nx*sp*.5;}
            e.tm-=bdt;if(e.tm<=0){e.tm=2.6;const a0=Math.atan2(dy,dx);for(const j of(rg>=1?[-.2,0,.2]:[-.14,.14]))shoot(e.x,e.y-8,a0+j,160+rg*12,6,2,3.4,6);host.sfx('flick',e.x);}
            e.t2-=bdt;if(e.t2<=0){e.t2=9;const n=rg>=2?6:4;for(let j=0;j<n;j++){const a=j/n*TAU;spawn(rg>=2&&j%3===0?'flyer':'pass',e.x+Math.cos(a)*44,e.y+Math.sin(a)*44);}say(e,'여기요, 여기!');}
            e.t3-=bdt;if(e.t3<=0){e.t3=8;const n=6+rg*2,o=R()*TAU;for(let j=0;j<n;j++)shoot(e.x,e.y-8,o+j/n*TAU,100,5,2,3.6,6);say(e,'받으세요!!');host.sfx('paper',e.x);}
            break;
          case 'doorman':mvx=nx*sp;mvy=ny*sp;
            e.tm-=bdt;if(e.tm<=0){e.tm=3.6;e.cc++;S.zones.push({x:e.x+nx*40,y:e.y+ny*40,r:120+rg*10,warn:.9,dur:.9,dmg:22,txt:'비켜요',kind:'door'});host.sfx('stamp');say(e,'밀지 마요!');
              if(rg>=1&&e.cc%2===0)S.waves.push({x:e.x,y:e.y,r:e.r,spd:190,max:520,dmg:14,gap:R()*TAU,gw:.7-.06*rg,hit:false,kind:'push'});}
            e.t2-=bdt;if(e.t2<=0){e.t2=5;const n=6+rg;for(let j=0;j<n;j++){const a=j/n*TAU;spawn(j%2?'pass':'stud',e.x+Math.cos(a)*(e.r+18),e.y+Math.sin(a)*(e.r+18));}host.sfx('boss2',e.x);say(e,'다들 이쪽으로 타요!');}
            e.t3-=bdt;if(e.t3<=0){e.t3=7.5;const n=4+Math.min(2,rg);for(let j=0;j<n;j++)S.zones.push({x:e.x+nx*(70+j*92),y:e.y+ny*(70+j*92),r:60,warn:.75+j*.16,dur:.75+j*.16,dmg:20,txt:'쿵',kind:'door'});host.sfx('doorslam',e.x);say(e,'출입문 닫습니다!');}
            break;
          case 'carrierboss':
            if(e.st===0){mvx=nx*sp;mvy=ny*sp;e.t2-=bdt;if(e.t2<=0&&d<480){e.st=1;e.t2=.65;e.dx=nx;e.dy=ny;e.cc=rg>=2?1:0;host.sfx('alert',e.x);say(e,'비켜 주세요~!');}
              e.t3-=bdt;if(e.t3<=0&&d<520){e.t3=6;const a0=Math.atan2(dy,dx),n=rg>=1?5:3;for(let j=0;j<n;j++){const o=(j-(n-1)/2)*56;shoot(e.x-ny*o,e.y+nx*o,a0,135+rg*10,14,8,6,13);}host.sfx('wheels',e.x);say(e,'어머, 굴러가네~');}}
            else if(e.st===1){e.mv=false;e.t2-=bdt;if(e.t2<=0){e.st=2;e.t2=.9;e.acc=0;host.sfx('wheels',e.x);}}
            else{mvx=e.dx*400;mvy=e.dy*400;e.t2-=bdt;e.acc+=dt;if(e.acc>=.16){e.acc=0;S.slicks.push({x:e.x,y:e.y,r:34,life:3,dur:3});}
              if(e.t2<=0){const o=R()*TAU,n=10+rg*2;for(let j=0;j<n;j++)shoot(e.x,e.y,o+j/n*TAU,150,11,10);host.shake(4);ev({k:'crash',x:e.x,y:e.y});
                if(e.cc>0){e.cc--;e.st=1;e.t2=.45;e.dx=nx;e.dy=ny;host.sfx('alert',e.x);}else{e.st=0;e.t2=3.4;}}}
            break;
          case 'bagman':
            if(e.st===0){mvx=nx*sp;mvy=ny*sp;
              e.t3-=bdt;if(e.t3<=0&&d<210){e.t3=6;S.zones.push({x:e.x+nx*30,y:e.y+ny*30,r:100+rg*8,warn:.7,dur:.6,dmg:16,txt:'퍽',kind:'swat'});host.sfx('swing',e.x);say(e,'어, 뒤에 누구 있었어요?');}
              e.tm-=bdt;if(e.tm<=0&&d<270){e.st=3;e.tm=.75;host.sfx('alert',e.x);say(e,'어? 누가 불렀나?');}
              else{e.t2-=bdt;if(e.t2<=0&&d<460){e.st=1;e.t2=.65;e.dx=nx;e.dy=ny;e.cc=rg>=1?1:0;host.sfx('alert',e.x);say(e,'잠깐만요, 지나갈게요!');}}}
            else if(e.st===1){e.mv=false;e.t2-=bdt;if(e.t2<=0){e.st=2;e.t2=.8;}}
            else if(e.st===2){mvx=e.dx*450;mvy=e.dy*450;e.t2-=bdt;if(e.t2<=0){if(e.cc>0){e.cc--;e.st=1;e.t2=.4;e.dx=nx;e.dy=ny;host.sfx('alert',e.x);}else{e.st=0;e.t2=5.5;}}}
            else if(e.st===3){e.mv=false;e.tm-=bdt;if(e.tm<=0){e.st=4;e.tm=1.1;e.acc=0;host.sfx('spin',e.x);}}
            else{mvx=nx*sp*1.3;mvy=ny*sp*1.3;e.tm-=bdt;e.acc+=bdt;
              if(d<SPIN_R+p.r&&p.inv<=0)hurt(20,false,'spin');
              if(e.acc>=.18){e.acc=0;e.ang+=.7;const n=rg>=2?6:4;for(let j=0;j<n;j++)shoot(e.x,e.y,e.ang+j*TAU/n,150,10,5);}
              if(e.tm<=0){e.st=0;e.tm=3.6;const o=R()*TAU;for(let j=0;j<8;j++)shoot(e.x,e.y,o+j/8*TAU,110,9,5,3.5);host.sfx('zipper',e.x);}}
            break;
          case 'crowd':mvx=nx*sp;mvy=ny*sp;
            e.tm-=bdt;if(e.tm<=0){e.tm=3.2;if(E.length<cap+50)for(let j=0;j<10;j++){const a=j/10*TAU;spawn(j%3?'pass':'stud',e.x+Math.cos(a)*(e.r+18),e.y+Math.sin(a)*(e.r+18));}host.sfx('boss2',e.x);}
            {const volley=()=>{const g=Math.atan2(dy,dx)+(R()<.5?-1:1)*(.5+R()*.9),gw=.45-.04*rg;for(let j=0;j<32;j++){const a=j/32*TAU;let da=Math.abs(((a-g)%TAU+TAU+Math.PI)%TAU-Math.PI);if(da>gw)shoot(e.x,e.y,a,120+rg*10,13,9,6,8);}host.sfx('rumble',e.x);};
            e.t2-=bdt;if(e.t2<=0){e.t2=5;volley();say(e,'우르르르!');if(rg>=2)e.pend=.7;}
            if(e.pend>0){e.pend-=dt;if(e.pend<=0)volley();}}
            e.t3-=bdt;if(e.t3<=0){e.t3=9-rg;zombieRow();say(e,'환승합니다, 비켜요!');host.sfx('rumble',e.x);}
            break;
          case 'speaker':{const rage=(e.hp<e.maxhp*.5?1.4:1)*(1+.12*rg);
            if(zk==='train'){if(d>430){mvx=nx*sp;mvy=ny*sp;}else if(d<310){mvx=-Math.sign(dx||1)*sp*1.2;}else mvy=Math.sin(t*1.7)*sp*.5;}
            else if(d>310){mvx=nx*sp;mvy=ny*sp;}else if(d<190){mvx=-nx*sp*.7;mvy=-ny*sp*.7;}else{mvx=-ny*sp*.6;mvy=nx*sp*.6;}
            e.tm-=bdt*rage;
            if(e.st===0){e.acc+=bdt*rage;if(zk==='train'){if(e.tm>1)e.tm=1;}else if(e.acc>=.6&&e.t2<(rage>1?4:3)){e.acc=0;e.t2++;S.waves.push({x:e.x,y:e.y,r:e.r,spd:rage>1?250:210,max:640,dmg:15,gap:zk==='train'?Math.atan2(dy,dx)+(R()<.5?-1:1)*(.62+R()*.1):R()*TAU,gw:.55,hit:false});host.sfx('wave',e.x);}if(e.tm<=0){e.st=1;e.tm=1;}}
            else if(e.st===1){if(e.tm<=0){e.st=2;e.tm=1.9;e.acc=0;e.t2=0;say(e,'이 노래 아세요?');}}
            else if(e.st===2){e.acc+=bdt*rage;if(e.acc>=(zk==='train'?.3:.42)&&e.t2<(zk==='train'?5:4)){e.acc=0;e.t2++;const a0=Math.atan2(dy,dx)+(e.t2%2?.1:-.1);if(zk==='train')shoot(e.x,e.y,Math.atan2(dy,dx),175,9,6,4.5);else for(let j=-2;j<=2;j++)shoot(e.x,e.y,a0+j*.2,205,12,6,4);host.sfx('note',e.x);}if(e.tm<=0){e.st=3;e.tm=.8;}}
            else if(e.st===3){if(e.tm<=0){e.st=4;e.tm=1.5;e.acc=0;e.t2=0;say(e,'베이스 갑니다!');host.sfx('bass',e.x);}}
            else if(e.st===4){e.acc+=bdt*rage;if(e.acc>=.3&&e.t2<(zk==='train'?2:rage>1?5:3)){e.acc=0;e.t2++;const a=R()*TAU,o=e.t2===1?0:R()*90;S.zones.push({x:p.x+Math.cos(a)*o,y:p.y+Math.sin(a)*o,r:zk==='train'?60:78,warn:.95,dur:.95,dmg:26,txt:'쿵',kind:'bass'});host.sfx('stamp');}if(e.tm<=0){e.st=5;e.tm=1;}}
            else{if(e.tm<=0){e.st=0;e.tm=2.6;e.acc=.6;e.t2=0;}}
            break;}
          case 'lead':{e.age=(e.age||0)+dt;const day=Math.min(4,Math.max(Math.floor((1-e.hp/e.maxhp)*5),Math.floor(e.age/9)));
            if(day>e.day){e.day=day;e.label='김 팀장 · '+PHASES[day];host.banner(PHASES[day],DAY_LINE[day],'boss');host.sfx('page',e.x);ev({k:'page',x:e.x,y:e.y});host.shake(8);S.bullets.length=0;say(e,TALK.lead[day][0]);e.sayT=5;}
            const f=(day>=4?1.45:1);
            if(e.st===1){e.mv=false;e.t2-=bdt;if(e.t2<=0){e.st=2;e.t2=.7;}}
            else if(e.st===2){mvx=e.dx*560;mvy=e.dy*560;e.t2-=bdt;if(e.t2<=0){e.st=0;e.t2=3.2;}}
            else{mvx=nx*sp*f;mvy=ny*sp*f;if(day>=4){e.t2-=bdt;if(e.t2<=0&&d<520){e.st=1;e.t2=.8;e.dx=nx;e.dy=ny;host.sfx('warn');say(e,'거기 서!');}}}
            /* paperwork: alternating full ring and a turning spiral */
            e.tm-=bdt*f;if(e.tm<=0){e.tm=2.6;e.cc++;e.ang+=.2;const n=16+rg*3;if(e.cc%2)for(let j=0;j<n;j++)shoot(e.x,e.y,e.ang+j/n*TAU,150,12,7);else for(let j=0;j<n;j++)shoot(e.x,e.y,e.ang+j*.42,120+j*7,12,7);host.sfx('paper',e.x);}
            /* approval stamps that walk toward wherever you are */
            e.stp-=bdt*f;if(e.stp<=0){e.stp=6.5;e.sq=4+Math.min(3,rg);e.acc=0;say(e,'결재 올려!');}
            if(e.sq>0){e.acc-=dt;if(e.acc<=0){e.acc=.34;e.sq--;S.zones.push({x:p.x,y:p.y,r:56,warn:.8,dur:.8,dmg:24,txt:'결재',kind:'stamp'});host.sfx('stamp');}}
            if(day>=1){e.fan-=bdt*f;if(e.fan<=0){e.fan=3;const a0=Math.atan2(dy,dx),h=3+Math.min(2,rg);for(let j=-h;j<=h;j++)shoot(e.x,e.y,a0+j*.15,210,12,3,4);host.sfx('flick',e.x);say(e,'이것도, 이것도!');}}
            if(day>=2){e.z-=bdt*f;if(e.z<=0){e.z=4.5;const n=3+Math.min(3,rg);for(let j=0;j<n;j++){const a=R()*TAU,o=j?40+R()*90:0;S.zones.push({x:p.x+Math.cos(a)*o,y:p.y+Math.sin(a)*o,r:74,warn:1,dur:1,dmg:26,txt:'잔소리',kind:'nag'});}
              S.waves.push({x:e.x,y:e.y,r:e.r,spd:200+rg*15,max:600,dmg:16,gap:Math.atan2(dy,dx)+(R()<.5?-1:1)*(.7+R()*.5),gw:.6-.05*rg,hit:false,kind:'nag'});host.sfx('nag',e.x);say(e,'내가 자네 때는 말이야!');}}
            if(day>=3){e.row-=bdt*f;if(e.row<=0){e.row=6.5;zombieRow();const n=8;for(let j=0;j<n;j++){const a=j/n*TAU;S.zones.push({x:p.x+Math.cos(a)*170,y:p.y+Math.sin(a)*170,r:52,warn:1.1,dur:1.1,dmg:22,txt:'회의',kind:'meet'});}host.sfx('phone',e.x);say(e,'전원 회의실로!');}}
            break;}
          default:mvx=nx*sp;mvy=ny*sp;
        }
      }
      if(zk==='gates'&&!e.boss&&e.r<=20&&e.stun<=0&&(e.type!=='runner'||e.st===0||e.st===3)){const ce=Math.floor(e.y/GATE_GAP);
        if(ce!==pcell){const ry=(ce<pcell?ce+1:ce)*GATE_GAP,dyr=ry-e.y;
          if(Math.abs(dyr)<70){const lx=Math.round(e.x/GATE_PER)*GATE_PER-e.x,lim=GATE_HALF-e.r-1,sp=Math.hypot(mvx,mvy)||e.spd;
            if(Math.abs(lx)>lim){mvx=Math.sign(lx)*sp;mvy=Math.abs(dyr)>GATE_TH+e.r+5?Math.sign(dyr)*sp*.35:0;}else{mvx=lx*5;mvy=(ce<pcell?1:-1)*sp;}}}}
      if(e.board>0){e.board-=dt;mvx*=.15;mvy=-Math.sign(e.y)*Math.max(150,e.spd*2.4);if(Math.abs(e.y)<AISLE-16){e.board=0;e.ky=-Math.sign(e.y)*120;}}
      e.x+=(mvx+e.kx)*dt;e.y+=(mvy+e.ky)*dt;
      if(zk==='gates'){if(!e.boss&&e.r<=20)gateSolve(e,e.r);}
      else if(zk==='train'){if(!(e.board>0)&&(!e.boss||e.type==='speaker')){const lim=AISLE-Math.min(e.r,30);if(e.y>lim)e.y=lim;else if(e.y<-lim)e.y=-lim;}}
      else if(zk==='esc'&&!e.boss){const c=((Math.floor(e.x/ESC_W)%3)+3)%3;if(c!==1)e.y+=(c===0?-1:1)*ESC_PUSH*dt;}
      const dec=Math.exp(-7*dt);e.kx*=dec;e.ky*=dec;
      if(zk==='train'?Math.abs(dx)>S.spawnX*1.7:d>farR){
        if(e.type==='zomb'){if(e.vx*dx+e.vy*dy<0){e.dead=true;E[i]=E[E.length-1];E.pop();}}
        else{const q0=spawnPos();e.x=q0[0];e.y=q0[1];e.kx=e.ky=0;}
      }
    }
    buildGrid();
    for(let i=0;i<E.length;i++){const e=E[i];if(e.boss)continue;
      const cx=Math.floor(e.x/CELL),cy=Math.floor(e.y/CELL);
      for(let ax=cx-1;ax<=cx+1;ax++)for(let ay=cy-1;ay<=cy+1;ay++){const a=grid.get(key(ax,ay));if(!a)continue;
        for(let j=0;j<a.length;j++){const o=a[j];if(o.id<=e.id||o.boss)continue;
          const dx=o.x-e.x,dy=o.y-e.y,rr=e.r+o.r,d2=dx*dx+dy*dy;
          if(d2<rr*rr&&d2>.0001){const d=Math.sqrt(d2),push=(rr-d)*.25,nx=dx/d,ny=dy/d;e.x-=nx*push;e.y-=ny*push;o.x+=nx*push;o.y+=ny*push;}}}
    }

    weapons(dt);

    // thrown coffee
    for(let i=S.lobs.length-1;i>=0;i--){const b=S.lobs[i];b.t+=dt;if(b.t>=b.dur&&b.kind==='alarm'){S.mines.push({x:b.x1,y:b.y1,fuse:.6,dur:.6,r:b.r,dmg:b.dmg,stun:b.stun,rings:b.rings,evo:b.evo});S.lobs.splice(i,1);continue;}if(b.t>=b.dur){S.puddles.push({x:b.x1,y:b.y1,r:b.r,life:b.life,dur:b.life,tick:0,dmg:b.dmg,slow:b.slow,evo:b.evo,ph:R()*TAU});ev({k:'splash',x:b.x1,y:b.y1,r:b.r,evo:b.evo});host.sfx('splash',b.x1,b.evo);if(S.fus.routine){query(b.x1,b.y1,b.r,e=>{const dx=e.x-b.x1,dy=e.y-b.y1;if(dx*dx+dy*dy<b.r*b.r){if(!e.boss)e.stun=Math.max(e.stun,.5);hit(e,36,0,0,'alarm');}});ev({k:'alarmboom',x:b.x1,y:b.y1,r:b.r,evo:true});host.sfx('alarmboom',b.x1);}S.lobs.splice(i,1);}}
    // alarm clocks
    for(let i=S.mines.length-1;i>=0;i--){const m=S.mines[i];m.fuse-=dt;
      if(m.fuse<=0){query(m.x,m.y,m.r,e=>{const dx=e.x-m.x,dy=e.y-m.y,d=Math.hypot(dx,dy)||1;if(d<m.r+e.r*.5){if(!e.boss)e.stun=Math.max(e.stun,e.elite?m.stun*.5:m.stun);hit(e,m.dmg,dx/d*150,dy/d*150,m.tb?'routine':'alarm');}});
        ev({k:'alarmboom',x:m.x,y:m.y,r:m.r,evo:m.evo});host.sfx('alarmboom',m.x);
        if(m.tb&&--m.rings>0){m.fuse=m.dur=.55;m.again=true;}
        else if(m.tb){S.puddles.push({x:m.x,y:m.y,r:m.r*.85,life:4.5,dur:4.5,tick:0,dmg:14.4,slow:.5,evo:true,src:'routine',ph:R()*TAU});ev({k:'splash',x:m.x,y:m.y,r:m.r*.85,evo:true});host.sfx('splash',m.x,true);S.mines.splice(i,1);}
        else if(--m.rings>0){m.fuse=m.dur=.55;}else{if(S.fus.routine){S.puddles.push({x:m.x,y:m.y,r:m.r*.8,life:5,dur:5,tick:0,dmg:15,slow:.5,evo:true,ph:R()*TAU});ev({k:'fcast',t:'routine',r:m.r,x:m.x,y:m.y});}S.mines.splice(i,1);}}}
    // kickboards
    for(let i=S.riders.length-1;i>=0;i--){const r=S.riders[i],st=900*dt;r.x+=r.dx*st;r.y+=r.dy*st;r.dist+=st;
      query(r.x,r.y,r.w,e=>{if(r.hits.indexOf(e.id)>=0)return;const ex=e.x-r.x,ey=e.y-r.y,rr=e.r+r.w;if(ex*ex+ey*ey<rr*rr){r.hits.push(e.id);const sd=(ex*-r.dy+ey*r.dx)>=0?1:-1;hit(e,r.dmg,-r.dy*sd*170+r.dx*60,r.dx*sd*170+r.dy*60,'scooter');}});
      if(r.dist>r.max)S.riders.splice(i,1);}
    // returning handles
    for(let i=S.rangs.length-1;i>=0;i--){const b=S.rangs[i];b.t+=dt;
      if(b.ph===0){const dc=Math.exp(-3.2*dt);b.vx*=dc;b.vy*=dc;if(b.vx*b.vx+b.vy*b.vy<90*90){b.ph=1;b.hits.length=0;b.sp=90;}}
      else{const dx=p.x-b.x,dy=p.y-b.y,d=Math.hypot(dx,dy)||1;b.sp=Math.min(720,b.sp+1500*dt);b.vx=dx/d*b.sp;b.vy=dy/d*b.sp;if(d<20||b.t>3){if(S.fus.freepass&&d<20){const o=R()*TAU;for(let k=0;k<6;k++){const a=o+k*TAU/6;S.shots.push({x:p.x,y:p.y,vx:Math.cos(a)*480,vy:Math.sin(a)*480,life:1.2,dmg:30,pierce:3,hits:[],evo:true,a});}ev({k:'fcast',t:'freepass',r:70});host.sfx('card',undefined,true);}S.rangs.splice(i,1);continue;}}
      b.x+=b.vx*dt;b.y+=b.vy*dt;
      query(b.x,b.y,b.size,e=>{if(b.hits.indexOf(e.id)>=0)return;const ex=e.x-b.x,ey=e.y-b.y,rr=e.r+b.size;if(ex*ex+ey*ey<rr*rr){b.hits.push(e.id);hit(e,b.dmg,b.vx*.15,b.vy*.15,'handle');}});}
    // shots
    const Sh=S.shots;
    for(let i=Sh.length-1;i>=0;i--){const s=Sh[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;s.a+=dt*16;
      if(s.life>0&&s.pierce>0)query(s.x,s.y,8,e=>{if(s.pierce<=0||s.hits.indexOf(e.id)>=0)return;const dx=e.x-s.x,dy=e.y-s.y,rr=e.r+8;
        if(dx*dx+dy*dy<rr*rr){s.hits.push(e.id);s.pierce--;hit(e,s.dmg,s.vx*.2,s.vy*.2,'card');
          if(S.fus.freepass){if(s.bn===undefined)s.bn=5;if(s.bn>0){let nx=null,nd=280*280;query(s.x,s.y,280,o=>{if(o.dead||s.hits.indexOf(o.id)>=0)return;const ox=o.x-s.x,oy=o.y-s.y,d2=ox*ox+oy*oy;if(d2<nd){nd=d2;nx=o;}});if(nx){s.bn--;s.pierce++;const sp=Math.hypot(s.vx,s.vy),d=Math.sqrt(nd)||1;s.vx=(nx.x-s.x)/d*sp;s.vy=(nx.y-s.y)/d*sp;s.life=Math.max(s.life,.7);ev({k:'transfer',x:s.x,y:s.y,tx:nx.x,ty:nx.y});}}}}});
      if(s.life<=0||s.pierce<=0){Sh[i]=Sh[Sh.length-1];Sh.pop();}}
    // puddles
    const Pd=S.puddles;
    for(let i=Pd.length-1;i>=0;i--){const u=Pd[i];u.life-=dt;u.tick-=dt;
      if(u.tick<=0){u.tick=.4;query(u.x,u.y,u.r,e=>{const dx=e.x-u.x,dy=e.y-u.y,rr=u.r+e.r*.5;if(dx*dx+dy*dy<rr*rr){e.slow=.6;e.slowAmt=Math.max(e.slowAmt,u.slow);hit(e,u.dmg,0,0,u.src||(u.gum?'gum':'coffee'));}});}
      if(u.life<=0){Pd[i]=Pd[Pd.length-1];Pd.pop();}}
    // enemy bullets
    const Bl=S.bullets;
    for(let i=Bl.length-1;i>=0;i--){const b=Bl[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;b.a+=dt*5;
      const dx=b.x-p.x,dy=b.y-p.y,rr=b.r+p.r-3;let gone=b.life<=0;
      if(!gone&&dx*dx+dy*dy<rr*rr&&p.inv<=0){hurt(b.dmg,false,'bullet'+b.kind);gone=true;}
      if(gone){Bl[i]=Bl[Bl.length-1];Bl.pop();}}
    if(S.state!=='run')return;
    // sound rings: a hit unless the player stands in the gap or dashes through
    for(let i=S.waves.length-1;i>=0;i--){const w=S.waves[i];w.r+=w.spd*dt;
      if(!w.hit&&p.inv<=0){const dx=p.x-w.x,dy=p.y-w.y,dd=Math.hypot(dx,dy);
        if(Math.abs(dd-w.r)<9+p.r*.5){const da=Math.abs(((Math.atan2(dy,dx)-w.gap)%TAU+TAU+Math.PI)%TAU-Math.PI);if(da>w.gw){w.hit=true;hurt(w.dmg,false,'wave');}}}
      if(w.r>w.max)S.waves.splice(i,1);}
    if(S.state!=='run')return;
    // stamped zones
    for(let i=S.zones.length-1;i>=0;i--){const z=S.zones[i];z.warn-=dt;
      if(z.warn<=0){const dx=p.x-z.x,dy=p.y-z.y;if(dx*dx+dy*dy<(z.r+p.r*.5)*(z.r+p.r*.5))hurt(z.dmg,false,'zone');ev({k:'boom',x:z.x,y:z.y,r:z.r,txt:z.txt,kind:z.kind});host.sfx('boom',z.x);host.shake(5);S.zones.splice(i,1);}}
    if(S.state!=='run')return;
    // contact
    if(p.inv<=0){let worst=0;query(p.x,p.y,p.r,e=>{const dx=e.x-p.x,dy=e.y-p.y,rr=e.r+p.r-3;if(dx*dx+dy*dy<rr*rr&&e.dmg>worst)worst=e.dmg;});if(worst)hurt(worst);}
    if(S.state!=='run')return;

    // beans & items
    const Bn=S.beans,pr=62*M.pick,pr2=pr*pr;
    for(let i=Bn.length-1;i>=0;i--){const b=Bn[i],dx=p.x-b.x,dy=p.y-b.y,d2=dx*dx+dy*dy;
      if(!b.att&&d2<pr2)b.att=true;
      if(b.att){const d=Math.sqrt(d2)||1;b.sp=Math.min(b.sp+1200*dt,620);const st=b.sp*dt;
        if(d<=st+12){p.xp+=b.v*M.xp*D.xp*(opts.xpMul||1);host.sfx('pick',undefined,b.v);ev({k:'pick',v:b.v});Bn[i]=Bn[Bn.length-1];Bn.pop();continue;}
        b.x+=dx/d*st;b.y+=dy/d*st;}}
    if(zk==='train'){const lim=AISLE-12;for(const b of S.beans){if(b.y>lim)b.y=lim;else if(b.y<-lim)b.y=-lim;}for(const it of S.items){if(it.y>lim)it.y=lim;else if(it.y<-lim)it.y=-lim;}}
    const It=S.items;
    for(let i=It.length-1;i>=0;i--){const it=It[i];it.t+=dt;const dx=p.x-it.x,dy=p.y-it.y,rr=p.r+20;
      if(dx*dx+dy*dy<rr*rr){
        if(it.kind==='kimbap'){p.hp=Math.min(p.maxhp,p.hp+25);host.sfx('heal');ev({k:'heal',v:25});}
        else if(it.kind==='pass'){for(const b of Bn)b.att=true;host.sfx('heal');host.banner('정기권 발견','흩어진 원두가 모두 모입니다','good');}
        else{S.pending+=2;S.pickMode='chest';p.hp=Math.min(p.maxhp,p.hp+20);ev({k:'heal',v:20});}
        It[i]=It[It.length-1];It.pop();}
      else if(it.kind!=='chest'&&it.t>45){It[i]=It[It.length-1];It.pop();}}

    // progression
    let need=xpNeed(p.level),lv=false;
    while(p.xp>=need){p.xp-=need;p.level++;S.pending++;need=xpNeed(p.level);lv=true;if(S.M.lvHeal&&p.hp<p.maxhp)p.hp=Math.min(p.maxhp,p.hp+S.M.lvHeal);}
    if(lv)ev({k:'level'});
    if(S.pending>0)openLevelUp();
  }

  /* ---------------- autopilot (title-screen demo and balance tests) ---------------- */
  function bot(){
    let ax=0,ay=0,danger=0;const E=S.enemies;
    for(let i=0;i<E.length;i++){const e=E[i];if(e.dead)continue;const dx=p.x-e.x,dy=p.y-e.y,dd=Math.hypot(dx,dy)||1,d=dd-e.r-p.r,lim=(e.boss?240:e.elite?170:120)*(opts.botRange||1);
      if(d<lim){const w=(e.boss?3:e.elite?2:1)*Math.pow(1-Math.max(0,d)/lim,2);ax+=dx/dd*w;ay+=dy/dd*w;if(d<7)danger=1;}}
    for(const b of S.bullets){const dx=p.x-b.x,dy=p.y-b.y,dd=Math.hypot(dx,dy)||1;if(dd<110){const w=2.2*Math.pow(1-dd/110,2);
        const cross=dx*b.vy-dy*b.vx>0?1:-1,bl=Math.hypot(b.vx,b.vy)||1;ax+=dx/dd*w*.5+(-b.vy/bl)*cross*w;ay+=dy/dd*w*.5+(b.vx/bl)*cross*w;if(dd<24)danger=1;}}
    for(const z of S.zones){const dx=p.x-z.x,dy=p.y-z.y,dd=Math.hypot(dx,dy)||1;if(dd<z.r+30){ax+=dx/dd*4;ay+=dy/dd*4;if(z.warn<.25)danger=1;}}
    for(const w of S.waves){const dx=p.x-w.x,dy=p.y-w.y,dd=Math.hypot(dx,dy)||1,gapd=w.r-dd;
      if(gapd>-150&&gapd<25){const da=Math.abs(((Math.atan2(dy,dx)-w.gap)%TAU+TAU+Math.PI)%TAU-Math.PI);
        if(da>w.gw-.12){const sg=(((Math.atan2(dy,dx)-w.gap)%TAU+TAU+Math.PI)%TAU-Math.PI)>0?-1:1;ax+=-dy/dd*sg*3;ay+=dx/dd*sg*3;if(gapd>-34&&!w.hit){danger=1;ax-=dx/dd*6;ay-=dy/dd*6;}}}}
    if(S.train){const dy=p.y-S.train.y;if(Math.abs(dy)<LANE_H+70){ay+=(dy>=0?1:-1)*6;}}
    else{const ln=Math.round(p.y/LANE_GAP)*LANE_GAP,dy=p.y-ln;if(Math.abs(dy)<LANE_H+30&&S.trainT<4)ay+=(dy>=0?1:-1)*1.5;}
    for(const s of S.slicks){const dx=p.x-s.x,dy=p.y-s.y,dd=Math.hypot(dx,dy)||1;if(dd<s.r+20){ax+=dx/dd*.8;ay+=dy/dd*.8;}}
    let best=null,bd=460*460;
    for(const b of S.beans){const dx=b.x-p.x,dy=b.y-p.y,d2=dx*dx+dy*dy;if(d2<bd){bd=d2;best=b;}}
    for(const it of S.items){const dx=it.x-p.x,dy=it.y-p.y,d2=dx*dx+dy*dy;if(d2<650*650&&(it.kind!=='kimbap'||p.hp<p.maxhp*.8)){best=it;break;}}
    if(best){const dx=best.x-p.x,dy=best.y-p.y,d=Math.hypot(dx,dy)||1;ax+=dx/d*.45;ay+=dy/d*.45;}
    if(S.zk==='gates'&&Math.abs(ay)>.05){const ry=(ay>0?Math.floor(p.y/GATE_GAP)+1:Math.floor(p.y/GATE_GAP))*GATE_GAP;
      if(Math.abs(ry-p.y)<46){const lx=Math.round(p.x/GATE_PER)*GATE_PER-p.x;if(Math.abs(lx)>GATE_HALF-p.r-3){const m=Math.hypot(ax,ay);ax=Math.sign(lx)*m;ay*=.15;}}}
    if(S.zk==='train'){ay*=.6;}
    const l=Math.hypot(ax,ay);
    if(l<.02){const a=S.t*.4;return{x:Math.cos(a),y:Math.sin(a),dash:false};}
    return{x:ax/l,y:ay/l,dash:danger>0&&p.dashCd<=0};
  }
  function serialize(){return{diff:S.diff,zone:S.zone,t:S.t,hp:p.hp,level:p.level,xp:p.xp,kills:S.kills,weapons:S.weapons,passives:S.passives,dmg:S.dmg,rerolls:S.rerolls,x:p.x,y:p.y,fus:S.fus,fsrc:S.fsrc};}
  return{S,update,choose,reroll,dash,bot,serialize,dbg:{setDiff(i){i=Math.max(0,Math.min(3,i|0));D=DIFFS[i];S.diff=i;},recalc,enterZone,boss,spawn,kill}};
}
if(typeof module!=='undefined')module.exports={EVO,FUSIONS,DIFFS,createSim,WEAPONS,PASSIVES,ENEMIES,ZONES,GATE,xpNeed,clockText,GAME_LEN};
