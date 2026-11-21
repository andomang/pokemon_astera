// ============================================================
// quests.js - 퀘스트 (메인/서브/활동) + 화면 퀘스트 알림 + 지도 전체 공개
//   * 시작 메뉴의 "모험 수첩"을 "퀘스트"로 바꾸고, 메인·서브·활동·기록 4개 탭으로 보여준다.
//   * 퀘스트 완료 여부는 기존 진행 데이터(Flags/배지/가방/도감)에서 계산 → 저장 데이터 형식 변경 없음.
//   * 지도(타운맵)는 처음부터 모든 지역 이름과 길이 보이고, 메인 퀘스트 목적지를 표시한다.
// ============================================================
'use strict';

const mapName = k => (MAPS[k] && MAPS[k].name) || (INTERIOR_DEFS[k] && INTERIOR_DEFS[k].name) || k;
const hasItem = k => !!(Player.bag && Bag.count(k));
const visited = k => !!(Player.visited && Player.visited[k]);
const badgeN = () => (Player.badges || []).length;
const GYM_TOWNS = ['SPRAY', 'EMBER', 'STAR', 'PEAK', 'FROST', 'DUNE', 'CORAL', 'MAGMA'];
const GYM_TYPES = ['바위', '물', '에스퍼', '격투', '얼음', '땅', '페어리', '드래곤'];
const mainLegends = () => LEGENDS.filter(l => !/^RIFT/.test(l.map));

// ── 메인 퀘스트 (순서대로) ──
function mainQuests() {
  const q = [
    { id: 'starter', title: '첫 포켓몬 받기', where: 'DAWN', desc: '새벽마을 남쪽 한별 연구소에서 한별 박사에게 첫 파트너 포켓몬을 받자.', done: () => Flags.has('starter') },
    { id: 'pokedex', title: '포켓몬 도감 받기', where: 'DAWN', desc: '한별 박사에게 포켓몬 도감을 받고 본격적인 탐사를 시작하자.', done: () => Flags.has('pokedex') }
  ];
  GYM_TOWNS.forEach((town, i) => {
    const L = GYM_LEADERS[i] || {};
    q.push({
      id: 'gym' + (i + 1), title: (i + 1) + '번째 체육관: ' + mapName(town), where: town,
      desc: mapName(town) + ' 체육관 관장 ' + (L.name || '') + '(' + GYM_TYPES[i] + ' 타입)에게 이겨 ' + (L.badge || '배지') + '를 받자.',
      done: () => badgeN() > i
    });
  });
  q.push(
    { id: 'origin', title: '균열단을 막아라', where: 'ORIGIN', desc: '화산마을 동쪽 "시원의 길"에서 균열단 보스 제로스를 막고 시원의 결정을 지키자.', done: () => Flags.has('origin_done') },
    { id: 'champion', title: '포켓몬리그 제패', where: 'LEAGUE', desc: '화산마을 북쪽 챔피언로드를 지나 별빛 리그로! 사천왕 4명과 챔피언 카이에게 이기자.', done: () => Flags.has('champion') },
    {
      id: 'rift', title: '균열 지대의 전설', where: 'MEADOW', post: true,
      desc: '환상의 풀숲의 균열 관측원과 함께 대륙 곳곳의 균열 지대를 돌며 모든 시대의 전설·환상 포켓몬을 모으자.',
      progress: () => LEGENDS.filter(l => Player.caught[l.sp]).length + ' / ' + LEGENDS.length,
      done: () => LEGENDS.every(l => Player.caught[l.sp])
    }
  );
  return q;
}

// ── 서브 퀘스트 ──
// avail: 지금 할 수 있는지, lock: 잠겨 있을 때 안내
function sideQuests() {
  const cells = () => (Player.flags && Player.flags.cells) || 0;
  const legends = mainLegends();
  return [
    {
      id: 'megaring', title: '메가링 받기', where: 'EMBER', reward: '메가링, 메가스톤',
      desc: '불씨마을 포켓몬센터에서 기다리는 한별 박사의 조수를 찾아가자. 배지 2개가 있으면 메가링을 준다.',
      avail: () => badgeN() >= 1 || visited('EMBER'), lock: '물보라 체육관 배지를 받으면 열림',
      done: () => Flags.has('megaring')
    },
    {
      id: 'zring', title: 'Z링 받기', where: 'STAR', reward: 'Z링, Z크리스탈',
      desc: '별빛 체육관(3번째 배지)에서 이기면 관장 루나가 Z링과 Z크리스탈을 준다.',
      avail: () => badgeN() >= 2, lock: '배지 2개를 모으면 열림',
      done: () => hasItem('ZRING')
    },
    {
      id: 'dynamax', title: '다이맥스 밴드 받기', where: 'FROST', reward: '다이맥스 밴드',
      desc: '설원마을의 다이맥스 연구소에서 박사를 만나 다이맥스 밴드를 받자. 이후 맥스 레이드에서 다이맥스로 맞설 수 있다.',
      avail: () => badgeN() >= 4 || visited('FROST'), lock: '배지 4개를 모으면 열림',
      done: () => hasItem('DYNAMAXBAND')
    },
    {
      id: 'tera', title: '테라스탈 오브 받기', where: 'DUNE', reward: '테라스탈 오브',
      desc: '사막도시의 테라스탈 연구소에서 테라 박사를 만나 테라스탈 오브를 받자.',
      avail: () => badgeN() >= 5 || visited('DUNE'), lock: '배지 5개를 모으면 열림',
      done: () => hasItem('TERAORB')
    },
    // 랜드마크 선물 (landmarks.js)
    {
      id: 'cleffa', title: '별에서 온 선물', where: 'STAR', reward: '삐, 달의돌',
      desc: '별빛시티 동쪽 끝의 별빛 천문대에 들어가 천문학자와 이야기해 보자. 별똥별과 함께 떨어진 포켓몬을 맡기고 싶어 한다.',
      avail: () => badgeN() >= 2 || visited('STAR'), lock: '배지 2개를 모으면 열림',
      done: () => Flags.has('gift_cleffa')
    },
    {
      id: 'lapras', title: '등대의 라프라스', where: 'CORAL', reward: '라프라스',
      desc: '산호항구 남쪽 바닷가 등대의 등대지기를 만나 보자. 매일 밤 등대 불빛을 보러 오던 라프라스가 친구를 기다리고 있다.',
      avail: () => badgeN() >= 6 || visited('CORAL'), lock: '배지 6개를 모으면 열림',
      done: () => Flags.has('gift_lapras')
    },
    {
      id: 'zygarde', title: '지가르데 셀 모으기', where: 'MAGMA', reward: '지가르데',
      desc: '5~9번도로와 시원의 길에 흩어진 초록빛 셀을 10개 모아 화산마을 셀 연구소에 가져가자.',
      avail: () => badgeN() >= 3, lock: '배지 3개를 모으면 열림',
      progress: () => Math.min(cells(), 10) + ' / 10',
      done: () => Flags.has('zyg_gift')
    },
    {
      id: 'celebi', title: '시간을 넘는 방울', where: 'FOREST', reward: '셀레비와 만남',
      desc: Flags.has('gsball') ? 'GS볼을 손에 넣었다. 초록숲의 오래된 사당에 가 보자.' : '5번도로 어딘가에 금빛과 은빛으로 빛나는 볼이 떨어져 있다고 한다.',
      avail: () => badgeN() >= 3, lock: '배지 3개를 모으면 열림',
      progress: () => (Flags.has('gsball') ? 'GS볼 ✓' : 'GS볼 찾는 중'),
      done: () => !!Player.caught.CELEBI
    },
    {
      id: 'trade0', title: '교환: 스라크', where: 'PEAK', reward: '스라크 (Lv.' + TRADES[0].lv + ')',
      desc: '바위산마을 민가의 교환 상대가 격투 타입 포켓몬과 스라크를 바꾸고 싶어 한다.',
      avail: () => badgeN() >= 3 || visited('PEAK'), lock: '배지 3개를 모으면 열림',
      done: () => Flags.has('trade_0')
    },
    {
      id: 'trade1', title: '교환: 라프라스', where: 'FROST', reward: '거다이맥스 라프라스',
      desc: '설원마을 민가의 교환 상대가 얼음 타입 포켓몬과 라프라스(거다이맥스 인자)를 바꾸고 싶어 한다.',
      avail: () => badgeN() >= 4 || visited('FROST'), lock: '배지 4개를 모으면 열림',
      done: () => Flags.has('trade_1')
    },
    {
      id: 'legends', title: '대륙의 전설 포켓몬', where: null, reward: '전설의 포켓몬',
      desc: '6~9번도로, 초록숲, 화산마을에 전설과 환상의 포켓몬이 잠들어 있다. 각자 깨어나는 조건이 있다: ' +
        legends.map(l => SPECIES[l.sp].name + (Player.caught[l.sp] ? '✓' : '') + '(' + mapName(l.map) + ')').join(', '),
      avail: () => badgeN() >= 4, lock: '배지 4개를 모으면 열림',
      progress: () => legends.filter(l => Player.caught[l.sp]).length + ' / ' + legends.length,
      done: () => legends.every(l => Player.caught[l.sp])
    }
  ];
}

// ── 언제든 할 수 있는 활동 ──
function activities() {
  const fossils = typeof FOSSILS !== 'undefined' ? Object.keys(FOSSILS).filter(f => hasItem(f)).length : 0;
  return [
    { id: 'raid', title: '레이드 둥지', where: null, desc: '각 도로의 붉게 빛나는 둥지(맥스 레이드)와 빛나는 결정(테라 레이드). 매일 다른 포켓몬이 나타나고, 이기면 잡을 기회와 보상을 준다.', avail: () => Flags.has('pokedex') },
    { id: 'fossil', title: '화석 복원', where: 'DUNE', desc: '도로에서 찾은 화석을 사막도시 화석 복원소에서 고대 포켓몬으로 되살릴 수 있다.' + (fossils ? ' (가방에 화석 ' + fossils + '개)' : ''), avail: () => badgeN() >= 5 || visited('DUNE') || fossils > 0, lock: '배지 5개를 모으면 열림' },
    { id: 'tower', title: '배틀 타워', where: 'LEAGUE', desc: '레벨 50 이상 강자들과 3대3 연승 도전. 최고 기록: ' + ((Player.flags && Player.flags.towerBest) || 0) + '연승', avail: () => Flags.has('champion'), lock: '챔피언이 되면 열림' }
  ];
}

// 지금 진행 중인 메인 퀘스트
function currentMainQuest() {
  const list = mainQuests();
  return list.find(q => !q.done()) || list[list.length - 1];
}
window.currentMainQuest = currentMainQuest;

// ============================================================
// 퀘스트 화면
// ============================================================
class QuestScreen extends Win {
  constructor() {
    super();
    this.tabs = [['main', '메인'], ['side', '서브'], ['act', '활동'], ['stat', '기록']];
    this.tab = 0; this.i = 0; this.top = 0;
    this.build();
  }
  build() {
    const k = this.tabs[this.tab][0];
    if (k === 'main') {
      const all = mainQuests();
      const cur = currentMainQuest();
      // 지금 할 일 → 앞으로 할 일 → 끝낸 일 순서
      const curIdx = all.indexOf(cur);
      this.rows = [cur, ...all.slice(curIdx + 1).filter(q => !q.post || Flags.has('champion')), ...all.slice(0, curIdx).reverse()]
        .filter((q, i, a) => a.indexOf(q) === i)
        .map(q => ({ q, state: q.done() ? 'done' : (q === cur ? 'now' : 'next') }));
    } else if (k === 'side' || k === 'act') {
      const list = k === 'side' ? sideQuests() : activities();
      const st = q => (q.done && q.done()) ? 'done' : (q.avail && !q.avail() ? 'lock' : 'open');
      const order = { open: 0, lock: 1, done: 2 };
      this.rows = list.map(q => ({ q, state: st(q) })).sort((a, b) => order[a.state] - order[b.state]);
    } else {
      this.rows = [];
    }
    this.i = Math.min(this.i, Math.max(0, this.rows.length - 1));
  }
  update() {
    if (Input.trig('B')) { SE.cancel(); this.close(); return; }
    const n = this.tabs.length;
    if (Input.rep('right') || Input.trig('R')) { this.tab = (this.tab + 1) % n; this.i = 0; this.top = 0; this.build(); SE.cursor(); }
    if (Input.rep('left') || Input.trig('L')) { this.tab = (this.tab + n - 1) % n; this.i = 0; this.top = 0; this.build(); SE.cursor(); }
    if (this.rows.length) {
      if (Input.rep('down')) { this.i = (this.i + 1) % this.rows.length; SE.cursor(); }
      if (Input.rep('up')) { this.i = (this.i + this.rows.length - 1) % this.rows.length; SE.cursor(); }
    }
    const vis = 6;
    if (this.i < this.top) this.top = this.i;
    if (this.i >= this.top + vis) this.top = this.i - vis + 1;
  }
  draw(ctx) {
    if (Game.world) Game.world.draw(ctx);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, 512, 384);
    drawWindow(ctx, 8, 8, 496, 368, CHOICE_SKIN);
    // 탭
    this.tabs.forEach(([, name], t) => {
      const x = 24 + t * 74, on = t === this.tab;
      ctx.fillStyle = on ? '#3060c0' : 'rgba(0,0,0,0.12)';
      ctx.fillRect(x, 20, 68, 28);
      text(ctx, name, x + 34, 23, { size: 19, align: 'center', color: on ? '#fff' : '#505058', shadow: on ? '#203060' : null });
    });
    text(ctx, '◀ ▶ 탭 · B 닫기', 486, 26, { size: 15, align: 'right', color: '#808088', shadow: null });

    const k = this.tabs[this.tab][0];
    if (k === 'stat') return this.drawStats(ctx);
    if (!this.rows.length) { text(ctx, '표시할 항목이 없습니다.', 40, 80, { size: 20 }); return; }

    // 목록 (왼쪽)
    const vis = 6, rowH = 42, x0 = 24, y0 = 60, listW = 220;
    this.rows.slice(this.top, this.top + vis).forEach((r, j) => {
      const idx = this.top + j, y = y0 + j * rowH, sel = idx === this.i;
      if (sel) { ctx.fillStyle = 'rgba(48,96,192,0.18)'; ctx.fillRect(x0, y, listW, rowH - 4); }
      const mark = { now: '▶', next: '·', done: '✓', open: '!', lock: '×' }[r.state];
      const col = r.state === 'done' ? '#909098' : r.state === 'lock' ? '#a0a0a8' : r.state === 'now' ? '#c04020' : '#404048';
      text(ctx, mark, x0 + 6, y + 8, { size: 18, color: r.state === 'open' ? '#d07010' : col, shadow: null });
      textFit(ctx, r.state === 'lock' ? '(잠김) ' + r.q.title : r.q.title, x0 + 28, y + 8, listW - 34, { size: 18, color: col, shadow: null });
    });
    if (this.top > 0) text(ctx, '▲', x0 + listW / 2, y0 - 14, { size: 12, align: 'center', shadow: null });
    if (this.top + vis < this.rows.length) text(ctx, '▼', x0 + listW / 2, y0 + vis * rowH - 6, { size: 12, align: 'center', shadow: null });

    // 상세 (오른쪽)
    const r = this.rows[this.i], q = r.q, dx = 258, dw = 230;
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(dx - 8, 56, dw + 12, 306);
    const label = { now: '진행 중', next: '다음 목표', done: '완료', open: '할 수 있음', lock: '잠김' }[r.state];
    text(ctx, label, dx, 62, { size: 16, color: r.state === 'done' ? '#309040' : r.state === 'lock' ? '#909098' : '#c04020', shadow: null });
    wrapText(ctx, q.title, dw, 21).slice(0, 2).forEach((l, i) => text(ctx, l, dx, 84 + i * 26, { size: 21 }));
    let y = 138;
    if (q.where) { textFit(ctx, '장소: ' + mapName(q.where) + (visited(q.where) ? '' : ' (미방문)'), dx, y, dw, { size: 17, color: '#3060c0', shadow: null }); y += 26; }
    if (q.progress) { textFit(ctx, '진행: ' + q.progress(), dx, y, dw, { size: 17, color: '#3060c0', shadow: null }); y += 26; }
    if (q.reward) { textFit(ctx, '보상: ' + q.reward, dx, y, dw, { size: 17, color: '#906010', shadow: null }); y += 26; }
    const body = r.state === 'lock' && q.lock ? q.lock + '\n' + q.desc : q.desc;
    const lines = [];
    body.split('\n').forEach(p => lines.push(...wrapText(ctx, p, dw, 17)));
    lines.slice(0, Math.floor((356 - y) / 22)).forEach((l, i) => text(ctx, l, dx, y + 4 + i * 22, { size: 17, color: '#404048', shadow: null }));
  }
  drawStats(ctx) {
    const chap = Object.keys(CHAPTERS).filter(k => Flags.has('chap_' + k)).map(k => CHAPTERS[k][0]).pop() || '프롤로그';
    text(ctx, chap, 40, 66, { size: 20, color: '#c05020' });
    const lc = LEGENDS.filter(l => Player.caught[l.sp]).length;
    const rows = [
      ['배지', badgeN() + ' / 8'],
      ['도감 (포획)', Object.keys(Player.caught || {}).length + ' / ' + SPECIES_LIST.length],
      ['전설·환상', lc + ' / ' + LEGENDS.length],
      ['지가르데 셀', ((Player.flags && Player.flags.cells) || 0) + ' / 10'],
      ['배틀 타워 최고', ((Player.flags && Player.flags.towerBest) || 0) + '연승'],
      ['플레이 시간', Math.floor((Player.playTime || 0) / 3600) + '시간 ' + Math.floor((Player.playTime || 0) / 60) % 60 + '분']
    ];
    rows.forEach(([a, v], i) => { text(ctx, a, 40, 102 + i * 32, { size: 20 }); text(ctx, v, 470, 102 + i * 32, { size: 20, align: 'right' }); });
    (Player.badges || []).forEach((b, i) => drawImg(ctx, 'Graphics/UI/Trainer Card/icon_badges.png', i * 32, 0, 32, 32, 60 + i * 48, 312, 32, 32));
  }
}
window.QuestScreen = QuestScreen;

// 시작 메뉴: "모험 수첩" → "퀘스트"
Object.defineProperty(StartMenu.prototype, 'items', {
  get() {
    const a = [];
    if (Flags.has('pokedex')) a.push(['포켓몬 도감', 'dex']);
    if (Player.party.length) a.push(['포켓몬', 'party']);
    a.push(['가방', 'bag'], ['퀘스트', 'journal'], ['지도', 'map']);
    if (Player.badges.length >= 3) a.push(['공중날기', 'fly']);
    a.push([Player.name, 'card'], ['저장', 'save'], ['설정', 'options'], ['닫기', 'close']);
    return a;
  }
});
{
  const _run = StartMenu.prototype.run;
  StartMenu.prototype.run = async function (k) {
    if (k === 'journal') { await Game.open(new QuestScreen()); return; }
    return _run.call(this, k);
  };
}

// ============================================================
// 화면 왼쪽 위 퀘스트 알림 (맵에 들어올 때, 메인 목표가 바뀔 때 잠깐 표시)
// ============================================================
const QuestTracker = {
  until: 0, text: '', lastId: null,
  show(t, sec = 5) { this.text = t; this.until = Game.tick + sec * 60; },
  check(force) {
    if (!Game.world || !Player.party) return;
    const q = currentMainQuest();
    if (force || q.id !== this.lastId) {
      const changed = this.lastId && q.id !== this.lastId;
      this.lastId = q.id;
      this.show((changed ? '새 목표: ' : '목표: ') + q.title);
    }
  },
  draw(ctx, world) {
    if (Game.tick > this.until || !this.text) return;
    const left = this.until - Game.tick;
    const a = Math.min(1, left / 30);
    // 지역 이름 배너가 내려와 있으면 그 아래에 표시 (겹침 방지) — World.draw의 배너 위치 계산과 동일
    let y = 8;
    const t = world ? world.nameShow : 0;
    if (t > 0) { const by = t > 130 ? -50 + (150 - t) * 2.5 : (t < 20 ? -50 + t * 2.5 : 0); y = Math.max(8, by + 64 + 4); }
    ctx.globalAlpha = a;
    const w = Math.min(300, textW(ctx, this.text, 16) + 28);
    ctx.fillStyle = 'rgba(16,24,48,0.82)'; ctx.fillRect(8, y, w, 28);
    ctx.fillStyle = '#f8d030'; ctx.fillRect(8, y, 4, 28);
    textFit(ctx, this.text, 20, y + 5, w - 24, { size: 16, color: '#f8f8f8', shadow: '#000' });
    ctx.globalAlpha = 1;
  }
};
window.QuestTracker = QuestTracker;
{
  const _load = World.prototype.load;
  World.prototype.load = function (...args) {
    const r = _load.apply(this, args);
    // 실외 맵에 들어올 때만 목표를 보여줌 (집 안을 드나들 때마다 뜨지 않게)
    if (this.def && this.def.outdoor) QuestTracker.check(true);
    return r;
  };
  const _draw = World.prototype.draw;
  World.prototype.draw = function (ctx) {
    _draw.call(this, ctx);
    // 다른 창이 위에 없을 때만
    if (Game.scene === this && !Game.ui.length) { QuestTracker.check(false); QuestTracker.draw(ctx, this); }
  };
}

// ============================================================
// 지도: 처음부터 모든 지역 공개 + 메인 퀘스트 목적지 표시
// ============================================================
{
  const _draw = TownMapScreen.prototype.draw;
  TownMapScreen.prototype.draw = function (ctx) {
    const real = Player.visited;
    // 원래 그리기는 방문한 곳만 이름/색을 보여주므로, 그리는 동안만 전부 방문한 것처럼 보여줌
    Player.visited = new Proxy({}, { get: () => true });
    try { _draw.call(this, ctx); } finally { Player.visited = real; }
    // 메인 퀘스트 목적지 (깜빡이는 별)
    const q = currentMainQuest();
    if (q.where && MAP_NODES[q.where] && Math.floor(Game.tick / 20) % 2 === 0) {
      const [x, y] = MAP_NODES[q.where];
      text(ctx, '★', x, y - 30, { size: 20, align: 'center', color: '#ff5030', shadow: '#000' });
    }
    // 아직 안 가 본 곳 표시
    const k = this.keys[this.i];
    const tag = (q.where === k ? '★ 메인 목표  ' : '') + (real && real[k] ? '' : '미방문');
    if (tag) text(ctx, tag, 494, 352, { size: 16, align: 'right', color: '#c04020', shadow: null });
    text(ctx, '★ = ' + q.title, 10, 8, { size: 15, ...WHITE_TEXT });
  };
}
