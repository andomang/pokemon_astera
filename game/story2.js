// ============================================================
// story2.js - 스토리 몰입: 챕터 카드, 박사 통화, 모험 수첩, Z링/특성 아이템 입수
// ============================================================
'use strict';
class ChapterCard extends Win {
  constructor(title, lines) { super(); this.title = title; this.lines = lines; this.t = 0; }
  update() { this.t++; if (this.t > 40 && (Input.trig('A') || Input.trig('B'))) { SE.ok(); this.close(); } }
  draw(ctx) {
    const a = Math.min(1, this.t / 30);
    ctx.fillStyle = 'rgba(5,8,24,' + (0.92 * a) + ')'; ctx.fillRect(0, 0, 512, 384);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (a * (0.2 + 0.6 * Math.abs(Math.sin(this.t / 40 + i)))) + ')'; ctx.fillRect((i * 97) % 512, (i * 61) % 384, 2, 2); }
    ctx.globalAlpha = a;
    text(ctx, this.title, 256, 96, { size: 30, align: 'center', color: '#f8d030', shadow: '#503010' });
    ctx.fillStyle = '#f8d030'; ctx.fillRect(96, 140, 320, 2);
    this.lines.forEach((l, i) => { if (this.t > 30 + i * 25) text(ctx, l, 256, 168 + i * 32, { size: 20, align: 'center', ...WHITE_TEXT }); });
    if (this.t > 40 && Math.floor(this.t / 30) % 2) text(ctx, '▼', 256, 350, { size: 18, align: 'center', ...WHITE_TEXT });
    ctx.globalAlpha = 1;
  }
}
const CHAPTERS = {
  start: ['제1장  새벽의 출발', ['떠오른 대륙, 아스테라.', '첫 파트너와 함께', '아무도 끝을 본 적 없는 여행이 시작된다.']],
  1: ['제2장  균열의 그림자', ['바위 배지를 손에 넣었다.', '하지만 숲 너머에서', '수상한 자들의 움직임이 느껴진다...']],
  2: ['제3장  유대의 빛', ['물결 배지를 손에 넣었다.', '메가진화, 결정에 반응하는 유대의 힘.', '대륙의 비밀에 한 걸음 다가간다.']],
  3: ['제4장  별이 가리키는 길', ['별빛 배지를 손에 넣었다.', '균열단의 보스, 제로스가 모습을 드러냈다.', '북쪽 바위산 너머로 여행은 이어진다.']],
  4: ['제5장  설원의 거인', ['주먹 배지를 손에 넣었다.', '얼어붙은 설원 아래,', '오래된 거인이 잠들어 있다고 한다.']],
  5: ['제6장  사막의 붉은 구슬', ['서리 배지를 손에 넣었다.', '균열단은 고대의 구슬을 노리고 있다.', '모래폭풍 속으로.']],
  6: ['제7장  바다로 이어진 항구', ['사구 배지를 손에 넣었다.', '탐사대가 처음 닻을 내린 항구.', '쪽빛 구슬의 행방은...?']],
  7: ['제8장  용의 땅', ['요정 배지를 손에 넣었다.', '화산 너머, 용들이 지키는 마을.', '마지막 체육관이 기다린다.']],
  8: ['제9장  시원의 결정', ['여덟 개의 배지가 모였다.', '시원의 길 끝에서', '균열단과의 마지막 결전이 기다린다.']],
  origin: ['제10장  별빛 리그로', ['테라파고스가 진정되고, 균열단은 해산했다.', '이제 남은 것은 단 하나.', '아스테라 최초의 챔피언 자리.']],
  champion: ['종장  모든 시대가 만나는 곳', ['당신은 아스테라의 챔피언이 되었다.', '균열 지대에는 모든 시대의 전설이 기다린다.', '여행은... 아직 끝나지 않았다.']],
};
const PROF_CALLS = {
  1: ['여보세요, {P}? 한별이다!', '첫 배지를 땄다고? 대단하구나!', '그런데 초록숲 근처에서 "균열단"이라는 무리가 목격됐다는구나. 조심하렴.'],
  2: ['{P}, 두 번째 배지 축하한다!', '불씨마을 포켓몬센터 앞에 내 조수를 보내 두었단다. 메가링을 받아 가렴!'],
  3: ['{P}! 별빛시티에서 균열단 보스를 만났다고...?', '"시원의 결정"... 이 대륙이 떠오른 이유와 관계가 있을지도 모르겠구나.', 'Z링을 받았니? 기술을 고를 때 Q키로 Z파워를 쓸 수 있단다.'],
  4: ['설원마을 연구소에 다이맥스를 연구하는 친구가 있단다. 꼭 들러 보렴!'],
  5: ['사막도시 모래빛에는 테라스탈 연구소가 있지. 결정의 힘을 다루는 법을 배울 수 있을 거야.', '그리고... 균열단이 붉은 구슬을 노린다는 소식이 들어왔다.'],
  6: ['산호항구는 우리 탐사대가 처음 도착한 곳이란다.', '쪽빛 구슬도 균열단이 노리고 있다는 정보가 있어. 부탁한다, {P}!'],
  7: ['용암 마을의 용진은 아주 강한 관장이다. 하지만 너라면 할 수 있어!'],
  8: ['{P}, 큰일이다! 균열단 보스가 "시원의 길"로 들어갔다!', '시원의 결정이 깨어나면 대륙 전체가 위험해. 부디... 막아 다오!'],
};
async function profCall(n) {
  const lines = PROF_CALLS[n]; if (!lines) return;
  Audio2.se('PC open');
  await say('♪ 포켓기어가 울린다... 한별 박사의 연락이다!');
  await say(lines.map(l => l.replace(/\{P\}/g, Player.name)), { speaker: '한별 박사(통화)' });
}
async function chapter(key) {
  if (Flags.has('chap_' + key) || !CHAPTERS[key]) return;
  Flags.set('chap_' + key);
  await Game.open(new ChapterCard(CHAPTERS[key][0], CHAPTERS[key][1]));
}
const _givePokedex = SCRIPTS.givePokedex;
SCRIPTS.givePokedex = async function (w) { await _givePokedex(w); await chapter('start'); };
const _gymLeader = SCRIPTS.gymLeader;
SCRIPTS.gymLeader = async function (w, c, i) {
  const before = Player.badges.length;
  await _gymLeader(w, c, i);
  const n = Player.badges.length;
  if (n > before) {
    if (n === 3 && !Bag.count('ZRING')) {
      Bag.add('ZRING'); Bag.add('NORMALIUMZ'); Bag.add('PSYCHIUMZ'); Bag.add(pick(['FIRIUMZ', 'WATERIUMZ', 'GRASSIUMZ']));
      await say(['그리고 이것도... 먼 알로라 지방의 "Z링"과 Z크리스탈이에요.', 'Z크리스탈을 포켓몬에게 지니게 하고, 같은 타입 기술을 고를 때 Q키로 Z파워를 고르세요.', '한 배틀에 한 번뿐인 강력한 Z기술이 나간답니다.'], { speaker: '루나' });
      Audio2.playME('Key item get'); await say(J.eunneun(Player.name) + ' Z링과 Z크리스탈을 받았다!');
    }
    await chapter(n); await profCall(n);
  }
};
const _terapagos = SCRIPTS.terapagos;
SCRIPTS.terapagos = async function (w, c) { await _terapagos(w, c); await chapter('origin'); };
const _champion2 = SCRIPTS.champion;
SCRIPTS.champion = async function (w, c) { await _champion2(w, c); if (Flags.has('champion')) await chapter('champion'); };
SCRIPTS.megaShop = async function (w) {
  const r = await ask('어떤 걸 보시겠어요?', ['메가스톤', 'Z크리스탈', '특성 아이템', '그만두기'], { speaker: '점원' });
  if (r === 0) await Game.open(new ShopScreen(MEGA_STONES));
  if (r === 1) await Game.open(new ShopScreen(Z_CRYSTALS));
  if (r === 2) await Game.open(new ShopScreen(['ABILITYCAPSULE', 'ABILITYPATCH'].filter(k => ITEMS[k])));
};
if (ITEMS.ABILITYCAPSULE) Object.assign(ITEMS.ABILITYCAPSULE, { name: '특성캡슐', pr: ITEMS.ABILITYCAPSULE.pr || 10000, d: '포켓몬의 일반 특성을 다른 일반 특성으로 바꿔 준다.' });
if (ITEMS.ABILITYPATCH) Object.assign(ITEMS.ABILITYPATCH, { name: '특성패치', pr: ITEMS.ABILITYPATCH.pr || 30000, d: '포켓몬의 특성을 숨겨진 특성으로 바꿔 준다.' });
const _shopStock2 = shopStock;
shopStock = function () { const s = _shopStock2(); if (Player.badges.length >= 4) s.push('ABILITYCAPSULE'); if (Player.badges.length >= 6) s.push('ABILITYPATCH'); return [...new Set(s)].filter(i => ITEMS[i]); };
const _den = SCRIPTS.den;
SCRIPTS.den = async function (w, c, i) {
  const before = Flags.get('den_' + i);
  await _den(w, c, i);
  if (Flags.get('den_' + i) !== before && chance(0.35)) { const it = pick(['ABILITYCAPSULE', 'ABILITYPATCH', 'ABILITYCAPSULE']); Bag.add(it); await say('보너스! ' + J.eulreul(itemName(it)) + ' 손에 넣었다!'); }
};

function currentGoal() {
  const b = Player.badges.length;
  if (!Flags.has('starter')) return '마을 남쪽 한별 연구소에서 첫 포켓몬을 받자.';
  if (!Flags.has('pokedex')) return '한별 박사에게 도감을 받자.';
  const g = ['1번도로를 지나 물보라시티 체육관(바위 타입)에 도전하자.', '2번도로·초록숲을 지나 불씨마을 체육관(물 타입)에 도전하자.', '3번도로를 지나 별빛시티 체육관(에스퍼 타입)에 도전하자.' + (Flags.has('megaring') ? '' : ' 불씨마을의 박사 조수에게서 메가링을 받자.'),
    '별빛시티 북쪽 5번도로를 넘어 바위산마을 체육관(격투 타입)으로!', '6번도로 설원을 지나 설원마을 체육관(얼음 타입)으로. 다이맥스 연구소도 들르자.', '동쪽 사막을 건너 사막도시 모래빛 체육관(땅 타입)으로. 테라스탈 연구소도 있다.',
    '남쪽 산호해안을 따라 산호항구 체육관(페어리 타입)으로.', '9번도로 화산지대를 지나 화산마을 용암 체육관(드래곤 타입)으로!'];
  if (b < 8) return g[b];
  if (!Flags.has('origin_done')) return '화산마을 동쪽 "시원의 길"에서 균열단 보스 제로스를 막자!';
  if (!Flags.has('champion')) return '화산마을 북쪽 챔피언로드를 지나 별빛 리그로! 사천왕과 챔피언 카이에게 도전하자.';
  const lc = LEGENDS.filter(l => Player.caught[l.sp]).length;
  return '환상의 풀숲의 균열 관측원과 함께 균열 지대의 전설을 모으자! (' + lc + '/' + LEGENDS.length + ')';
}
class JournalScreen extends Win {
  update() { if (Input.trig('A') || Input.trig('B')) { SE.cancel(); this.close(); } }
  draw(ctx) {
    if (Game.world) Game.world.draw(ctx);
    drawWindow(ctx, 12, 12, 488, 360, CHOICE_SKIN);
    text(ctx, '모험 수첩', 36, 28, { size: 26 });
    const chap = Object.keys(CHAPTERS).filter(k => Flags.has('chap_' + k)).map(k => CHAPTERS[k][0]).pop() || '프롤로그';
    text(ctx, chap, 476, 32, { size: 18, align: 'right', color: '#c05020' });
    text(ctx, '▶ 지금 할 일', 36, 72, { size: 20, color: '#3060c0' });
    wrapText(ctx, currentGoal(), 420, 20).slice(0, 3).forEach((l, i) => text(ctx, l, 52, 100 + i * 28, { size: 20 }));
    const lc = LEGENDS.filter(l => Player.caught[l.sp]).length;
    const rows = [['배지', Player.badges.length + ' / 8'], ['도감 (포획)', Object.keys(Player.caught).length + ' / ' + SPECIES_LIST.length], ['전설·환상', lc + ' / ' + LEGENDS.length], ['지가르데 셀', (Player.flags.cells || 0) + ' / 10'], ['배틀 타워 최고', (Player.flags.towerBest || 0) + '연승']];
    rows.forEach(([a, v], i) => { text(ctx, a, 52, 196 + i * 28, { size: 20 }); text(ctx, v, 460, 196 + i * 28, { size: 20, align: 'right' }); });
    Player.badges.forEach((b, i) => drawImg(ctx, 'Graphics/UI/Trainer Card/icon_badges.png', i * 32, 0, 32, 32, 60 + i * 48, 332, 32, 32));
  }
}
Object.defineProperty(StartMenu.prototype, 'items', {
  get() {
    const a = [];
    if (Flags.has('pokedex')) a.push(['포켓몬 도감', 'dex']);
    if (Player.party.length) a.push(['포켓몬', 'party']);
    a.push(['가방', 'bag'], ['모험 수첩', 'journal'], ['지도', 'map']);
    if (Player.badges.length >= 3) a.push(['공중날기', 'fly']);
    a.push([Player.name, 'card'], ['저장', 'save'], ['설정', 'options'], ['닫기', 'close']);
    return a;
  }
});
const _smRun2 = StartMenu.prototype.run;
StartMenu.prototype.run = async function (k) { if (k === 'journal') { await Game.open(new JournalScreen()); return; } return _smRun2.call(this, k); };
