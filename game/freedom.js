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
