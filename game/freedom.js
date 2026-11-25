// ============================================================
// freedom.js - 필드 상호작용 늘리기 (자유도)
//   예전엔 사람·표지판·아이템·동행 포켓몬에게만 말을 걸 수 있었고, 장식 소품과 지형은 그림일 뿐이었음.
//   A(결정)를 눌렀을 때 앞에 아무도 없으면 아래 순서로 찾음:
//     1) 마을 장식 소품 (places.js 가 칸마다 기록한 m.decorAt)
//        벤치(쉬기·회복) · 분수(동전 소원) · 우편함(편지) · 쓰레기통(뒤지기) · 게시판(팁) · 가로등 · 동상/비석(이야기)
//        시계(지금 시각) · 사당(기도·회복) · 노점(열매·낚싯대 가게) · 꽃(꿀) · 연못(낚시) · 큰 나무(박치기) · 바위(깨기)
//     2) 지형 문자 (맵 rows): 나무 T(박치기) · 물 ~(낚시) · 바위 R(깨기) · 덤불 b/p(열매 찾기) · 꽃 f(꿀)
//     3) 숨겨진 도구: 도로마다 매일 3곳, 가끔 반짝임으로 힌트
//   * 같은 자리는 하루 한 번 (Flags 'fx_맵_x_y' = 오늘 날짜). 벤치는 10분, 사당은 하루 한 번
//   * 불러오는 순서: places.js·lighting.js 다음
// ============================================================
'use strict';

const FX = {
  today: () => todayKey(),
  usedToday(w, x, y, tag) { return Flags.get('fx_' + tag + '_' + w.key + '_' + x + '_' + y) === todayKey(); },
  mark(w, x, y, tag) { Flags.set('fx_' + tag + '_' + w.key + '_' + x + '_' + y, todayKey()); },
  // 이 맵의 야생 레벨 (없으면 배지 수로)
  level(w) { const e = w.def.encounters; return e && e.min ? e.min + rand(Math.max(1, e.max - e.min + 1)) : 5 + Player.badges.length * 6 + rand(4); },
  async give(id, n = 1, msg) {
    if (!ITEMS[id]) return false;
    Bag.add(id, n); Audio2.playME('Item get');
    await say((msg ? msg + '\n' : '') + Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' ' + itemName(id) + (n > 1 ? ' ' + n + '개' : '') + J.eulreul(itemName(id)).slice(itemName(id).length) + ' 손에 넣었다!');
    return true;
  },
  // 타입 조건에 맞는 야생 포켓몬 하나 (전설 제외, 레벨에 맞는 진화 단계)
  wildOf(types, lv) {
    const maxStage = lv < 18 ? 0 : lv < 32 ? 1 : 2;
    const pool = SPECIES_LIST.filter(s => { const d = SPECIES[s]; return !isSpecial(s) && d.t.some(t => types.includes(t)) && evoStage(s) <= maxStage; });
    return pool.length ? pick(pool) : null;
  },
  async battle(sp, lv) { if (!sp) return; Audio2.cry(sp); await wildBattle(typeof regionalForm === 'function' ? regionalForm(sp) : sp, lv); },
  hasMove: id => Player.party.find(m => !m.fainted && m.knows(id)),
};

// ---------------- 지형·소품별 반응 ----------------
const BERRIES = ['ORANBERRY', 'SITRUSBERRY', 'PECHABERRY', 'CHERIBERRY', 'RAWSTBERRY', 'LEPPABERRY', 'LUMBERRY'];
const FX_ACT = {
  // 나무 박치기: 박치기를 아는 포켓몬이 있으면 더 잘 떨어짐
  async tree(w, x, y) {
    if (FX.usedToday(w, x, y, 'tree')) { await say('나무는 조용하다. 오늘은 더 떨어질 것이 없을 것 같다.'); return; }
    const hb = FX.hasMove('HEADBUTT');
    if (!(await yesNo(hb ? J.eunneun(hb.name) + ' 박치기로 나무를 흔들어 볼까요?' : '나무를 흔들어 볼까요?'))) return;
    FX.mark(w, x, y, 'tree'); Game.shake && Game.shake(6);
    await say(hb ? J.eunneun(hb.name) + '의 박치기! 나무가 크게 흔들렸다!' : '나무를 흔들었다!');
    const r = Math.random(), luck = hb ? 1 : 0.6;
    if (r < 0.35 * luck) { const sp = FX.wildOf(['BUG', 'FLYING', 'NORMAL', 'GRASS'], FX.level(w)); await say('무언가 떨어졌다!'); await FX.battle(sp, FX.level(w)); }
    else if (r < 0.7 * luck) await FX.give(pick(BERRIES), 1 + rand(2), '나무에서 열매가 떨어졌다!');
    else await say('...아무것도 떨어지지 않았다.');
  },
  // 낚시: 가장 좋은 낚싯대를 씀. 찌가 움직일 때 A를 눌러야 걸림
  async water(w, x, y) {
    const rod = ['SUPERROD', 'GOODROD', 'OLDROD'].find(id => Bag.count(id));
    if (!rod) { await say(['물이 맑다. 물고기 그림자가 보인다...', '(낚싯대가 있으면 낚시를 할 수 있다. 마을 노점에서 판다)']); return; }
    if (!Player.party.some(m => !m.fainted)) { await say('싸울 수 있는 포켓몬이 없다!'); return; }
    if (!(await yesNo(itemName(rod) + '로 낚시를 할까요?'))) return;
    // 기다리는 동안 메시지를 띄워 둠 (A를 눌러 닫는 창이 아니라, 찌가 움직일 때까지 그대로)
    const mb = new MessageBox('낚싯대를 드리웠다... (찌가 움직이면 A!)', { stay: true });
    Game.ui.push(mb);
    const closeMb = () => { const i = Game.ui.indexOf(mb); if (i >= 0) Game.ui.splice(i, 1); };
    const wait = 60 + rand(120);
    for (let i = 0; i < wait; i++) { await frames(1); if (Input.trig('A') || Input.trig('B')) { closeMb(); await say('너무 일찍 당겼다... 아무것도 걸리지 않았다.'); return; } }
    closeMb();
    Audio2.se('Exclaim'); await emote(w.player, '!');
    // 찌가 움직인 뒤 짧은 시간 안에 A
    let got = false;
    for (let i = 0; i < 40; i++) { await frames(1); if (Input.trig('A')) { got = true; break; } }
    if (!got) { await say('놓쳐 버렸다...'); return; }
    const base = FX.level(w), lv = rod === 'OLDROD' ? Math.max(5, base - 8) : rod === 'GOODROD' ? base : base + 5;
    const sp = rod === 'OLDROD' && chance(0.6) && SPECIES.MAGIKARP ? 'MAGIKARP' : FX.wildOf(['WATER'], lv);
    await say('걸렸다!');
    await FX.battle(sp, lv);
  },
  // 바위 깨기
  async rock(w, x, y) {
    if (FX.usedToday(w, x, y, 'rock')) { await say('이미 깨진 바위 조각만 남아 있다.'); return; }
    const rs = FX.hasMove('ROCKSMASH') || FX.hasMove('STRENGTH') || Player.party.find(m => !m.fainted && m.types.some(t => ['FIGHTING', 'ROCK', 'GROUND', 'STEEL'].includes(t)));
    if (!rs) { await say(['단단한 바위다.', '(격투·바위·땅·강철 타입 포켓몬이나 바위깨기를 아는 포켓몬이 있으면 깰 수 있을 것 같다)']); return; }
    if (!(await yesNo(J.eunneun(rs.name) + ' 바위를 깨 볼까요?'))) return;
    FX.mark(w, x, y, 'rock'); Audio2.se('Battle damage normal'); Game.shake && Game.shake(8);
    await say(J.eunneun(rs.name) + ' 바위를 산산조각 냈다!');
    const r = Math.random();
    if (r < 0.3) { await say('바위 밑에 숨어 있던 포켓몬이 튀어나왔다!'); await FX.battle(FX.wildOf(['ROCK', 'GROUND'], FX.level(w)), FX.level(w)); }
    else if (r < 0.75) await FX.give(pick(['HARDSTONE', 'STARDUST', 'PEARL', 'EVERSTONE', 'THUNDERSTONE', 'FIRESTONE', 'LEAFSTONE', 'WATERSTONE', 'MOONSTONE', 'NUGGET']), 1, '바위 조각 사이에서 무언가 반짝였다!');
    else if (r < 0.8) await FX.give(pick(['HELIXFOSSIL', 'DOMEFOSSIL', 'OLDAMBER']), 1, '오래된 화석이 박혀 있었다!');
    else await say('...아무것도 없었다.');
  },
  // 덤불: 열매 찾기
  async bush(w, x, y) {
    if (FX.usedToday(w, x, y, 'bush')) { await say('덤불을 뒤져 봤지만 더는 없는 것 같다.'); return; }
    FX.mark(w, x, y, 'bush');
    if (chance(0.55)) await FX.give(pick(BERRIES), 1, '덤불 속에서 열매를 찾았다!');
    else if (chance(0.3)) { await say('바스락! 덤불에서 포켓몬이 뛰어나왔다!'); await FX.battle(FX.wildOf(['BUG', 'GRASS', 'NORMAL'], FX.level(w)), FX.level(w)); }
    else await say('덤불을 뒤져 봤지만 아무것도 없었다.');
  },
  // 꽃: 꿀
  async flower(w, x, y) {
    if (FX.usedToday(w, x, y, 'flower') || !chance(0.35)) { await say(pick(['꽃향기가 은은하게 퍼진다.', '작은 꽃들이 바람에 흔들린다.', '꽃잎 위에 이슬이 맺혀 있다.'])); FX.mark(w, x, y, 'flower'); return; }
    FX.mark(w, x, y, 'flower');
    await FX.give('HONEY', 1, '꽃 사이에서 달콤한 꿀을 모았다!');
  },
};

// 마을 소품 (places.js 의 장식 이름)
const DECOR_ACT = {
  async bench(w) {
    const last = Player.flags.benchAt || 0;
    if (Date.now() - last < 10 * 60 * 1000) { await say('벤치에 잠시 앉았다. 바람이 시원하다.'); return; }
    Player.flags.benchAt = Date.now();
    await say('벤치에 앉아 잠시 쉬었다...');
    Player.party.forEach(m => { if (!m.fainted) m.hp = Math.min(m.maxhp, m.hp + Math.ceil(m.maxhp * 0.25)); });
    Audio2.se('Use item in party');
    await say('포켓몬들도 함께 쉬며 체력을 조금 회복했다!');
  },
  async fountain(w, x, y) {
    if (FX.usedToday(w, x, y, 'wish')) { await say('분수 물이 반짝이며 흐른다. 오늘은 이미 소원을 빌었다.'); return; }
    if (Player.money < 100 || !(await yesNo('분수에 100원을 던지고 소원을 빌까요?'))) { await say('맑은 물이 시원하게 솟아오른다.'); return; }
    Player.money -= 100; FX.mark(w, x, y, 'wish');
    await say('퐁당! 동전이 물속으로 가라앉았다...');
    if (chance(0.5)) await FX.give(pick(['PPUP', 'RARECANDY', 'NUGGET', 'PEARL', 'BIGPEARL', 'STARPIECE', 'HEARTSCALE']), 1, '물속에서 무언가 떠올랐다!');
    else await say('물방울이 무지개처럼 반짝였다. 좋은 일이 생길 것 같다!');
  },
  async mailbox(w, x, y) {
    const owner = pick(['이 집', '이웃집', '앞집']);
    if (FX.usedToday(w, x, y, 'mail')) { await say(owner + ' 우편함이다. 오늘 온 편지는 이미 봤다.'); return; }
    FX.mark(w, x, y, 'mail');
    const tips = ['"요즘 길목에 이상한 소용돌이가 생긴대. 조심하렴!"', '"나무를 흔들면 열매나 포켓몬이 떨어지기도 한대."', '"분수에 동전을 던지면 행운이 온다는 소문이 있어."', '"밤에는 반딧불이 많이 날아다녀. 산책하기 좋지."', '"낚싯대는 마을 노점에서 판다던데?"'];
    await say([owner + ' 우편함에 편지가 꽂혀 있다...', pick(tips)]);
    if (chance(0.3)) await FX.give(pick(['POTION', 'SUPERPOTION', 'POKEBALL', 'GREATBALL']), 1, '편지 봉투 안에 선물이 들어 있었다!');
  },
  async trash(w, x, y) {
    if (FX.usedToday(w, x, y, 'trash')) { await say('쓰레기통이다. 이미 뒤져 봤다...'); return; }
    if (!(await yesNo('쓰레기통을 뒤져 볼까요?'))) return;
    FX.mark(w, x, y, 'trash');
    if (chance(0.45)) await FX.give(pick(['POKEBALL', 'POTION', 'ANTIDOTE', 'PARALYZEHEAL', 'REPEL', 'ESCAPEROPE', 'FRESHWATER']), 1, '쓸 만한 물건이 버려져 있었다!');
    else await say('...아무것도 없다. 손만 더러워졌다.');
  },
  async notice(w) {
    const tips = ['포켓몬센터에서는 언제든 무료로 회복할 수 있습니다.', '풀숲에 들어가면 야생 포켓몬이 나옵니다. 스프레이로 피할 수 있어요.', '배지 3개를 모으면 길목에 시공 포탈이 열린다는 소문이 있습니다.', '덤불·나무·바위를 조사하면 도구를 찾을 수도 있어요.', '분수의 소원, 우편함 편지는 하루에 한 번씩 바뀝니다.', '전설의 포켓몬을 잡으면 마그마시티 폼 연구원을 찾아가 보세요.'];
    await say([w.def.name + ' 게시판', pick(tips)]);
  },
  async lamp() { await say(typeof isDay === 'function' && !isDay() ? '가로등이 따뜻한 불빛으로 길을 비추고 있다.' : '가로등이다. 밤이 되면 불이 켜진다.'); },
  async statue() { await say(typeof LORE !== 'undefined' && LORE.length ? ['오래된 동상에 글귀가 새겨져 있다...', [].concat(pick(LORE))[0]] : '오래된 동상이다.'); },
  async clock() { const d = new Date(); await say('시계탑이 ' + d.getHours() + '시 ' + String(d.getMinutes()).padStart(2, '0') + '분을 가리키고 있다.'); },
  async shrine(w, x, y) {
    if (FX.usedToday(w, x, y, 'pray')) { await say('작은 사당이다. 오늘은 이미 기도를 드렸다.'); return; }
    if (!(await yesNo('작은 사당이다. 기도를 드릴까요?'))) return;
    FX.mark(w, x, y, 'pray');
    Player.party.forEach(m => m.heal()); Audio2.playME('Pkmn healing');
    await say(['두 손을 모으고 기도를 드렸다...', '포근한 빛이 포켓몬들을 감쌌다. 모두 기운을 되찾았다!']);
  },
  // 노점: 열매·음료·낚싯대 (배지에 따라 좋은 낚싯대)
  async stall() {
    await say('어서 오세요! 열매랑 음료, 낚시 도구를 팔아요.', { speaker: '노점 주인' });
    const stock = ['ORANBERRY', 'PECHABERRY', 'CHERIBERRY', 'RAWSTBERRY', 'FRESHWATER', 'SODAPOP', 'LEMONADE', 'MOOMOOMILK', 'HONEY', 'OLDROD']
      .concat(Player.badges.length >= 3 ? ['GOODROD', 'SITRUSBERRY'] : []).concat(Player.badges.length >= 6 ? ['SUPERROD', 'LUMBERRY'] : []);
    await Game.open(new ShopScreen(stock.filter(k => ITEMS[k] && ITEMS[k].pr > 0)));
  },
  async orb() { await say(Flags.has('portal_seen') ? '빛나는 구슬이다. 시공 포탈과 같은 빛을 띠고 있다...' : '안에서 무언가 빛나는 구슬이다.'); },
  async urn() { await say(pick(['오래된 항아리다. 안은 비어 있다.', '정성껏 가꾼 분재다.', '작은 화분에 꽃이 피어 있다.'])); },
  async hedge() { await say('잘 다듬어진 울타리다.'); },
  async ruin() { await say(['오래된 유적의 문이다.', '"바다 밑으로 가라앉았던 아스테라의 옛 문명..." 희미하게 글자가 남아 있다.']); },
};
// 장식 이름 → 반응 (places.js DECOR_STAMPS 이름)
const DECOR_MAP = {
  bench: 'bench', woodBench: 'bench', fountain: 'fountain', mailbox: 'mailbox', trash: 'trash', notice: 'notice',
  lamp: 'lamp', lampR: 'lamp', statue: 'statue', miniStatue: 'statue', clock: 'clock', shrine: 'shrine',
  booth: 'stall', stallWhite: 'stall', stallYellow: 'stall', orb: 'orb', urn: 'urn', bonsai: 'urn',
  hedgeH: 'hedge', hedgeBlock: 'hedge', ruinGate: 'ruin', spire: 'ruin', greySpire: 'ruin',
  flowerRed: 'flower', flowerMix: 'flower', pond: 'water',
  bigTree: 'tree', yellowTree: 'tree', wideTree: 'tree', bush: 'bush', yellowBush: 'bush', roundBush: 'bush',
  rock: 'rock', boulder: 'rock', rockPile: 'rock', bigRock: 'rock', greyRock: 'rock',
};
// 지형 문자 → 반응
const TERRAIN_MAP = { T: 'tree', '~': 'water', R: 'rock', b: 'bush', p: 'bush', f: 'flower' };

// ---------------- 숨겨진 도구 (도로마다 매일 3곳) ----------------
const HIDDEN_LOOT = ['POTION', 'SUPERPOTION', 'HYPERPOTION', 'ETHER', 'REVIVE', 'GREATBALL', 'ULTRABALL', 'RARECANDY', 'PPUP', 'NUGGET', 'STARDUST', 'PEARL', 'HEARTSCALE', 'TINYMUSHROOM', 'BIGMUSHROOM', 'ESCAPEROPE'];
function hiddenSpots(w) {
  const def = w.def, m = w.map;
  if (!def.outdoor || !def.rows || !def.encounters) return [];
  if (w._hidden && w._hidden.day === todayKey() && w._hidden.key === w.key) return w._hidden.list;
  const R = seededRng(todayKey() * 13 + strHashFx(w.key));
  const cand = [];
  for (let y = 2; y < m.h - 2; y++) for (let x = 2; x < m.w - 2; x++) {
    const ch = def.rows[y] && def.rows[y][x];
    if ((ch === '.' || ch === ',' || ch === 'g') && ['up', 'down', 'left', 'right'].every(d => m.passable(x, y, d)) && !w.charAt(x, y)) cand.push([x, y]);
  }
  const list = [];
  for (let i = 0; i < 3 && cand.length; i++) { const k = Math.floor(R() * cand.length); list.push(cand.splice(k, 1)[0]); }
  w._hidden = { day: todayKey(), key: w.key, list };
  return list;
}
function strHashFx(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

// ---------------- 상호작용 연결 ----------------
const _fxInteract = World.prototype.interact;
World.prototype.interact = function () {
  const p = this.player, [dx, dy] = DIRS[p.dir], fx = p.x + dx, fy = p.y + dy;
  // 기존 대상(사람·동행 포켓몬·표지판)이 있으면 원래대로
  const f = this.follower;
  const busy = this.charAt(fx, fy) || (!this.map.passable(fx, fy, OPP[p.dir]) && this.charAt(fx + dx, fy + dy)) ||
    (f && f.x === fx && f.y === fy && !f.hiddenUntilMove) || (this.def.signs || []).some(s => s.x === fx && s.y === fy);
  if (busy) return _fxInteract.call(this);
  const w = this, m = this.map;
  // 1) 숨겨진 도구 (발밑 또는 바로 앞)
  for (const [hx, hy] of hiddenSpots(this)) {
    if ((hx === fx && hy === fy) || (hx === p.x && hy === p.y)) {
      if (FX.usedToday(w, hx, hy, 'hidden')) break;
      this.runScript(async () => { FX.mark(w, hx, hy, 'hidden'); await FX.give(pick(HIDDEN_LOOT), 1, '땅을 살펴보니 무언가 묻혀 있었다!'); });
      return;
    }
  }
  // 2) 마을 장식 소품
  const dec = m.decorAt && m.decorAt[fx + fy * m.w];
  if (dec && DECOR_MAP[dec.name]) {
    const a = DECOR_MAP[dec.name];
    this.runScript(() => (DECOR_ACT[a] || FX_ACT[a]).call(null, w, dec.x, dec.y));
    return;
  }
  // 3) 지형 (야외)
  const ch = this.def.outdoor && this.def.rows && this.def.rows[fy] && this.def.rows[fy][fx];
  if (ch && TERRAIN_MAP[ch] && fx > 1 && fy > 1 && fx < m.w - 2 && fy < m.h - 2) {
    const a = TERRAIN_MAP[ch];
    this.runScript(() => FX_ACT[a](w, fx, fy));
    return;
  }
  return _fxInteract.call(this);
};

// 숨겨진 도구 반짝임: 가끔 한 번씩 반짝 (위치 힌트)
const _fxDraw = World.prototype.draw;
World.prototype.draw = function (ctx) {
  _fxDraw.call(this, ctx);
  const t = Game.tick % 180; if (t > 24) return;
  const { x: cx, y: cy } = this.cam;
  for (const [hx, hy] of hiddenSpots(this)) {
    if (FX.usedToday(this, hx, hy, 'hidden')) continue;
    const sx = hx * TILE + 16 - cx, sy = hy * TILE + 16 - cy, r = 3 + (t < 12 ? t : 24 - t) * 0.5;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,255,220,0.9)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(sx - r, sy); ctx.lineTo(sx + r, sy); ctx.moveTo(sx, sy - r); ctx.lineTo(sx, sy + r); ctx.stroke(); ctx.restore();
  }
};

// 낚싯대·꿀 가격 (원래 0원이라 살 수 없었음)
const FX_PRICES = { OLDROD: 1000, GOODROD: 6000, SUPERROD: 15000, HONEY: 300 };
for (const k in FX_PRICES) if (ITEMS[k] && !ITEMS[k].pr) ITEMS[k].pr = FX_PRICES[k];

// ============================================================
// 실내 가구 상호작용 — 템플릿(집·연구소·센터·상점)마다 가구가 있는 칸 [x1, y1, x2, y2, 종류]
//   집 템플릿 house1·house2 는 모양이 같음 (우리 집·이웃집·각 마을 민가 공통)
// ============================================================
const INDOOR_OBJS = {
  house: [[9, 2, 10, 2, 'tv'], [13, 2, 13, 3, 'fridge'], [14, 2, 14, 3, 'cupboard'], [15, 2, 15, 3, 'sink'], [3, 5, 3, 7, 'bookshelf'], [5, 5, 5, 6, 'bath'], [14, 8, 15, 9, 'bed']],
  lab: [[0, 1, 3, 2, 'labpc'], [9, 1, 12, 1, 'research'], [0, 8, 4, 9, 'research'], [8, 8, 12, 9, 'research'], [1, 3, 2, 5, 'healer'], [6, 1, 7, 1, 'board'], [0, 11, 0, 11, 'plant'], [12, 11, 12, 11, 'plant']],
  pc: [[1, 1, 1, 2, 'plant'], [2, 1, 3, 1, 'magazine'], [7, 0, 8, 0, 'tv'], [12, 1, 13, 1, 'poster'], [2, 6, 3, 7, 'sofa'], [11, 6, 12, 7, 'sofa']],
  mart: [[1, 1, 1, 2, 'plant'], [7, 1, 9, 1, 'drinkcase'], [7, 4, 10, 6, 'goods']],
};
const TMPL_GROUP = { house1: 'house', house2: 'house', lab: 'lab', pc: 'pc', mart: 'mart' };
const atHome = w => w.key === 'HOME';
const INDOOR_ACT = {
  // TV: 오늘의 뉴스 — 열린 시공 포탈·아직 못 만난 전설·생활 정보 (탐험 단서)
  async tv(w) {
    const news = [];
    if (typeof PORTAL_ROUTES !== 'undefined' && Player.badges.length >= 3) {
      const open = PORTAL_ROUTES.filter((k, i) => portalOpen(i)).map(k => MAPS[k].name);
      if (open.length) news.push('[긴급 속보] 오늘 시공의 틈이 관측된 곳: ' + open.join(', ') + '. 이상한 포켓몬 목격담이 잇따르고 있습니다.');
    }
    if (typeof LEGENDS !== 'undefined') {
      const l = LEGENDS.filter(x => !Player.caught[x.sp] && MAPS[x.map] && (!x.cond || x.cond()));
      if (l.length) { const x = pick(l); news.push('[미스터리 특집] ' + MAPS[x.map].name + ' 근처에서 ' + (x.mythical ? '환상의' : '전설의') + ' 포켓몬을 봤다는 제보가 들어왔습니다!'); }
    }
    news.push(pick([isDay() ? '[날씨] 오늘 아스테라는 맑음. 나무 그늘 아래 벤치에서 쉬어 가세요.' : '[날씨] 밤이 깊었습니다. 반딧불이 많은 숲은 산책하기 좋아요.',
      '[생활 정보] 도로의 반짝이는 곳에는 누군가 떨어뜨린 도구가 묻혀 있을지도 모릅니다.', '[낚시 소식] 좋은 낚싯대일수록 강한 물 포켓몬이 걸린다고 합니다.']));
    await say(['TV가 켜져 있다...'].concat(news.slice(0, 2)));
  },
  async fridge(w, x, y) {
    if (FX.usedToday(w, x, y, 'fridge')) { await say('냉장고다. 오늘 먹을 건 이미 꺼냈다.'); return; }
    FX.mark(w, x, y, 'fridge');
    await FX.give(pick(['FRESHWATER', 'SODAPOP', 'LEMONADE', 'MOOMOOMILK']), 1, atHome(w) ? '엄마가 넣어 둔 음료가 있다. "모험 중에 마시렴" 이라는 쪽지가 붙어 있다!' : '"마음껏 드세요" 라는 쪽지와 함께 음료가 있다.');
  },
  async cupboard(w, x, y) {
    const lucky = !FX.usedToday(w, x, y, 'cup') && chance(0.5);
    FX.mark(w, x, y, 'cup');
    if (!lucky) { await say(pick(['찬장에 그릇이 가지런히 놓여 있다.', '향신료 병이 줄지어 있다.', '맛있는 냄새가 남아 있다.'])); return; }
    await FX.give(pick(['ORANBERRY', 'PECHABERRY', 'POTION', 'HONEY']), 1, '찬장 구석에서 무언가 찾았다!');
  },
  async sink(w) {
    if (atHome(w)) { Player.party.forEach(m => m.heal()); Audio2.playME('Pkmn healing'); await say(['시원한 물로 얼굴을 씻었다.', '포켓몬들에게도 물을 먹였다. 모두 기운을 되찾았다!']); }
    else await say('깨끗한 개수대다. 물이 반짝인다.');
  },
  // 책장: 아스테라 이야기 + 쓸모 있는 팁, 집마다 한 번 책 사이에서 기술머신이 나올 수 있음
  async bookshelf(w) {
    const books = [
      typeof LORE !== 'undefined' && LORE.length ? [].concat(pick(LORE))[0] : '아스테라는 200년 전 바다 밑으로 가라앉았던 대륙이라고 한다.',
      '「포켓몬 상성 입문」 물은 불에, 불은 풀에, 풀은 물에 강하다. 날씨가 맞으면 기술의 위력도 달라진다.',
      '「진화의 비밀」 어떤 포켓몬은 돌을, 어떤 포켓몬은 친밀도를, 어떤 포켓몬은 특별한 장소를 필요로 한다.',
      '「전설 연구 노트」 유전자쐐기, 녹슨 검… 전설을 잡으면 마그마시티의 폼 연구원을 찾아가라.',
      '「낚시꾼의 일기」 찌가 움직이는 그 순간! 너무 일찍 당기면 물고기는 도망간다.',
    ];
    await say(['책장에 책이 빼곡하다. 한 권을 펼쳐 보았다...', pick(books)]);
    if (!Flags.has('book_tm_' + w.key) && chance(0.25) && typeof TM_LIST !== 'undefined' && TM_LIST.length) {
      Flags.set('book_tm_' + w.key);
      await FX.give(pick(TM_LIST), 1, '책 사이에 기술머신이 끼워져 있었다!');
    }
  },
  async bath(w, x, y) {
    const lucky = !FX.usedToday(w, x, y, 'bath') && chance(0.3);
    FX.mark(w, x, y, 'bath');
    if (lucky) { await FX.give(pick(['HEARTSCALE', 'PEARL', 'SHOALSALT']), 1, '욕조 바닥에서 반짝이는 것을 주웠다!'); return; }
    await say(pick(['따뜻한 물이 받아져 있다. 물 포켓몬이 좋아할 것 같다.', '고무 오리 장난감이 둥둥 떠 있다.']));
  },
  // 침대: 우리 집에서는 푹 자고 완전 회복
  async bed(w) {
    if (!atHome(w)) { await say('남의 침대다. 함부로 누우면 안 될 것 같다.'); return; }
    if (!(await yesNo('침대에서 푹 쉴까요?'))) return;
    await Game.fade(1, 20);
    Player.party.forEach(m => m.heal()); Audio2.playME('Pkmn healing');
    await Game.fade(0, 20);
    await say(['푹 자고 일어났다! 포켓몬들도 모두 기운이 넘친다.', pick(['꿈에서 빛나는 소용돌이를 봤다...', '꿈속에서 누군가 "아스테라의 중심으로 와라" 하고 속삭였다.', '창밖에서 포켓몬 울음소리가 들린다. 오늘도 모험 날씨다!'])]);
  },
  // 연구소 컴퓨터: 포켓몬 맡기기·찾기 (센터 PC 와 같은 기능)
  async labpc(w) { await say('연구소 컴퓨터를 켰다. 박스 시스템에 접속한다...'); if (SCRIPTS.pcBox) await SCRIPTS.pcBox(w); },
  async research() {
    const seen = Object.keys(Player.seen || {}).length, caught = Object.keys(Player.caught || {}).length;
    await say(['연구 자료가 빼곡하다.', pick(['「아스테라 생태 보고서」 지금까지 ' + seen + '종을 발견하고 ' + caught + '종을 잡았다고 기록되어 있다.', '「패러독스 가설」 쾌청할 때 강해지는 고대의 포켓몬, 전기가 흐를 때 강해지는 미래의 포켓몬.', '「레이드 관측」 붉게 빛나는 둥지에서는 다이맥스한 포켓몬이 기다린다.'])]);
  },
  async healer() { Player.party.forEach(m => m.heal()); Audio2.playME('Pkmn healing'); await say('연구용 회복 장치를 빌려 썼다. 포켓몬들이 모두 회복되었다!'); },
  async board() { await say(['게시판에 연구 메모가 붙어 있다.', pick(['"오늘의 과제: 도로의 나무를 흔들어 서식 포켓몬 조사하기"', '"바위 밑 화석 채집 — 격투 타입 포켓몬과 함께 갈 것"', '"강가에서 낚시로 물 포켓몬 표본 확보"'])]); },
  async plant() { await say(pick(['잎이 반질반질한 화분이다. 누군가 정성껏 키우는 것 같다.', '화분에서 은은한 풀 냄새가 난다.'])); },
  async magazine() { await say(['잡지가 꽂혀 있다.', pick(['「월간 트레이너」 이번 달 특집: 분수에 동전을 던지면 행운이?', '「여행 아스테라」 숨은 명소 — 우편함 편지가 매일 바뀌는 마을들', '「배틀 비법」 교체 타이밍이 승부를 가른다!'])]); },
  async poster() { await say('포스터: "포켓몬센터는 24시간 무료로 회복해 드립니다!"'); },
  async sofa() { await say(pick(['푹신한 소파다. 잠깐 앉아 쉬었다.', '소파 옆 탁자에 누가 두고 간 지도가 있다. 도로마다 반짝이는 표시가 그려져 있다...'])); },
  async drinkcase() { await say('음료 진열대다. 시원한 음료가 가득하다. (계산대에서 살 수 있다)'); },
  async goods() { await say(pick(['상품이 가지런히 진열되어 있다.', '새로 들어온 볼이 반짝이고 있다.', '"오늘의 추천: 좋은 낚싯대는 마을 노점에서!" 라는 쪽지가 붙어 있다.'])); },
};

// 실내에서 A: 사람·표지판이 없으면 가구 → 방 장식 소품 순서로 찾음
const _fxInteractIn = World.prototype.interact;
World.prototype.interact = function () {
  if (this.def.outdoor) return _fxInteractIn.call(this);
  const p = this.player, [dx, dy] = DIRS[p.dir], fx = p.x + dx, fy = p.y + dy;
  const f = this.follower;
  const busy = this.charAt(fx, fy) || (!this.map.passable(fx, fy, OPP[p.dir]) && this.charAt(fx + dx, fy + dy)) ||
    (f && f.x === fx && f.y === fy && !f.hiddenUntilMove) || (this.def.signs || []).some(s => s.x === fx && s.y === fy);
  if (busy) return _fxInteractIn.call(this);
  const w = this, idef = typeof INTERIOR_DEFS !== 'undefined' && INTERIOR_DEFS[this.key];
  const objs = INDOOR_OBJS[TMPL_GROUP[idef && idef.tmpl]] || [];
  const o = objs.find(([x1, y1, x2, y2]) => fx >= x1 && fx <= x2 && fy >= y1 && fy <= y2);
  if (o) { this.runScript(() => INDOOR_ACT[o[4]](w, o[0], o[1])); return; }
  const dec = this.map.decorAt && this.map.decorAt[fx + fy * this.map.w];
  if (dec && DECOR_MAP[dec.name]) { const a = DECOR_MAP[dec.name]; this.runScript(() => (DECOR_ACT[a] || FX_ACT[a]).call(null, w, dec.x, dec.y)); return; }
  return _fxInteractIn.call(this);
};
