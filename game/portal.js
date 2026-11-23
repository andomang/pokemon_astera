// ============================================================
// portal.js - 시공 포탈: 배지 3개부터 길목 곳곳에 열리는 "과거·미래로 이어진 틈"
//   * 이야기: 균열단이 시원의 결정(테라파고스)의 힘을 억지로 끌어내면서 시간이 뒤틀려,
//            아주 먼 과거와 먼 미래의 포켓몬(패러독스 포켓몬)이 아스테라로 넘어오기 시작했다.
//   * 길목 포탈(매일 바뀜) → 포탈 안 지역(고대의 숲 / 미래의 폐허)
//       - 풀숲: 패러독스 포켓몬 + 고대(화석·히스이) / 미래(기계·전기) 포켓몬. 레벨은 배지 수에 맞춤
//       - 수호자: 매일 한 번, 부스트에너지를 지닌 강한 패러독스 포켓몬
//       - 시간 연구원: 이야기 안내, 부스트에너지 지급·판매, 수호자 10번 이기면 유대의 개굴닌자
//   * 엔딩 후에는 더 강한 패러독스가 나오고, 근원인 "에어리어 제로"(균열 지대)의 코라이돈·미라이돈으로 이어짐
//   * 불러오는 순서: forms.js 다음 (고대활성·쿼크차지·부스트에너지가 forms.js 에 있음)
// ============================================================
'use strict';

// ---------------- 패러독스 포켓몬 (배지 단계별로 풀림) ----------------
const has = s => !!SPECIES[s];
const PARADOX = {
  past: [
    ['GREATTUSK', 3], ['SCREAMTAIL', 3], ['BRUTEBONNET', 3], ['FLUTTERMANE', 4], ['SLITHERWING', 3], ['SANDYSHOCKS', 4],
    ['ROARINGMOON', 6], ['WALKINGWAKE', 99], ['GOUGINGFIRE', 99], ['RAGINGBOLT', 99],
  ],
  future: [
    ['IRONTREADS', 3], ['IRONBUNDLE', 3], ['IRONHANDS', 3], ['IRONJUGULIS', 4], ['IRONMOTH', 4], ['IRONTHORNS', 4],
    ['IRONVALIANT', 6], ['IRONLEAVES', 99], ['IRONBOULDER', 99], ['IRONCROWN', 99],
  ],
};   // 숫자 = 필요한 배지 수 (99 = 엔딩 후)
// 함께 나오는 시대 포켓몬: 과거 = 화석 포켓몬 + 히스이 모습, 미래 = 기계·전기 포켓몬
const ERA_COMMON = {
  past: ['OMANYTE', 'KABUTO', 'AERODACTYL', 'LILEEP', 'ANORITH', 'CRANIDOS', 'SHIELDON', 'TIRTOUGA', 'ARCHEN', 'TYRUNT', 'AMAURA']
    .concat(Object.keys(SPECIES).filter(k => SPECIES[k].form && /히스이|Hisui/.test(SPECIES[k].fname || '') && !isSpecial(SPECIES[k].base)))
    .filter(has),
  future: ['PORYGON', 'MAGNEMITE', 'BELDUM', 'KLINK', 'ROTOM', 'ELEKID', 'TYNAMO', 'BRONZOR', 'GOLETT', 'VAROOM'].filter(has),
};
const ERA_INFO = {
  past: { key: 'PORTAL_PAST', name: '시공 포탈: 태고의 숲', color: ['#ffb347', '#c0392b'], word: '아주 먼 과거', bgm: 'SWSH Slumbering Weald Shrine', bg: 'forest' },
  future: { key: 'PORTAL_FUTURE', name: '시공 포탈: 미래의 폐허', color: ['#7ff3ff', '#6a3cff'], word: '아주 먼 미래', bgm: 'DPPT 133 Distortion World', bg: 'distortion' },
};
const champ = () => Flags.has('champion');
const portalBadges = () => champ() ? 99 : Player.badges.length;
function paradoxPool(era) { return PARADOX[era].filter(([s, need]) => has(s) && portalBadges() >= need).map(p => p[0]); }
// 포탈 안 레벨: 배지 3개 ≈ 29, 배지 8개 ≈ 54, 엔딩 후 60~68
function portalLevel() { return champ() ? 60 : 14 + Player.badges.length * 5; }

// ---------------- 포탈 안 지역 (과거 / 미래) ----------------
for (const era of ['past', 'future']) {
  const E = ERA_INFO[era];
  const d = defineRoute(E.key, { name: E.name, bgm: E.bgm, battleBg: E.bg, w: 36, h: 30, seed: era === 'past' ? 7101 : 7202, exits: { south: 17, west: 14 }, ground: era === 'past' ? 'g' : '.', grass: 0.34, trees: era === 'past' ? 0.16 : 0.06, water: 0.03, weather: 'rift',
    items: [['BOOSTERENERGY'], ['BOOSTERENERGY'], ['RARECANDY'], ['MAXREVIVE'], [era === 'past' ? 'OLDAMBER' : 'ULTRABALL', era === 'past' ? 1 : 5]] });
  const [hx, hy] = d._hub;
  d.spawn = [hx, hy];
  d._spots = d._spots.filter(p => Math.abs(p.x - hx) > 2 || Math.abs(p.y - hy) > 2);
  const spot = () => { const s = d._spots.splice(Math.floor(d._spots.length / 2), 1)[0]; return s ? [s.x, s.y] : [hx + 4, hy + 3]; };
  const [bx, by] = spot();
  d.specials = [
    // 돌아가는 포탈 (들어온 곳으로)
    { id: 'tp_back_' + era, x: hx + 1, y: hy - 1, sprite: 'Graphics/Characters/Followers/' + (SPECIES.PORYGONZ ? 'PORYGONZ' : 'PORYGON') + '.png', follower: true, portalEra: era, script: 'portalReturn' },
    // 시간 연구원
    { id: 'tp_sage_' + era, x: hx - 2, y: hy + 1, sprite: 'trainer_SCIENTIST', dir: 'right', script: 'portalSage', arg: era },
    // 오늘의 수호자 (그림은 매일 바뀌므로 buildEvents 에서 정함)
    { id: 'pb_' + era, x: bx, y: by, sprite: 'Graphics/Characters/Followers/' + paradoxPool(era)[0] + '.png', follower: true, dir: 'down', aura: E.color[0], script: 'portalBoss', arg: era, bossEra: era,
      cond: () => Flags.get('pboss_' + era) !== todayKey() },
  ];
}
// 들어갈 때마다 배지 수에 맞춰 풀숲 포켓몬을 다시 정함
function setPortalEncounters(era) {
  const lv = portalLevel(), list = [];
  paradoxPool(era).forEach(s => list.push([s, 3]));
  ERA_COMMON[era].forEach(s => list.push([s, 4]));
  MAPS[ERA_INFO[era].key].encounters = { min: lv, max: lv + 5, list };
}
// 오늘의 수호자 (시대별로 매일 바뀜)
function portalBossSpecies(era) {
  const pool = paradoxPool(era); const R = seededRng(todayKey() * 7 + (era === 'past' ? 1 : 2));
  return pool[Math.floor(R() * pool.length)] || pool[0];
}

// ---------------- 길목 포탈 (배지 3개부터, 매일 몇 곳씩 열림) ----------------
const PORTAL_ROUTES = ['R1', 'R2', 'FOREST', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9'].filter(k => MAPS[k]);
// 오늘 열린 길목: 3곳 중 1곳꼴 + 매일 한 곳은 반드시
function portalOpen(i) { const t = todayKey(); return (t + i) % PORTAL_ROUTES.length === 0 || ((t * 31 + i * 17) % 3 === 0); }
PORTAL_ROUTES.forEach((key, i) => {
  const d = MAPS[key], era = i % 2 ? 'future' : 'past';
  // 자리는 대충 가운데로 두면, 불러올 때 legendfix(FieldSpots)가 걸을 수 있고 겹치지 않는 가장 가까운 칸으로 옮김
  const sp = (d._spots || []).filter(p => !occupied(d, p.x, p.y));
  const s = sp.length ? sp[(i * 11) % sp.length] : null;
  const x = s ? s.x : Math.floor((d.rows ? d.rows[0].length : 24) / 2), y = s ? s.y : Math.floor((d.rows ? d.rows.length : 20) / 2);
  if (s) d._spots.splice(d._spots.indexOf(s), 1);
  d.specials = d.specials || [];
  d.specials.push({ id: 'tp_' + key, x, y, sprite: 'Graphics/Characters/Followers/' + (SPECIES.PORYGONZ ? 'PORYGONZ' : 'PORYGON') + '.png', follower: true, portalEra: era,
    script: 'timePortal', arg: era, cond: () => Player.badges.length >= 3 && portalOpen(i) });
});
// 포탈도 legendfix 자리 바로잡기 대상에 넣음 (id 가 tp_ / pb_)
const _fsMovable = FieldSpots.movable.bind(FieldSpots);
FieldSpots.movable = c => _fsMovable(c) || !!(c && c.id && /^(tp_|pb_)/.test(c.id));

// 수호자 그림은 그날의 종으로
const _portalBuild = World.prototype.buildEvents;
World.prototype.buildEvents = function () {
  _portalBuild.call(this);
  for (const c of this.chars) if (c.bossEra) { const sp = portalBossSpecies(c.bossEra); if (sp) c.sprite = 'Graphics/Characters/Followers/' + sp + '.png'; }
};
// 포탈 그리기: 스프라이트 대신 빙글빙글 도는 시공의 소용돌이 (과거 = 주황·빨강, 미래 = 하늘·보라)
const _portalDraw = Char.prototype.draw;
Char.prototype.draw = function (ctx, camX, camY) {
  if (!this.portalEra || !this.visible) return _portalDraw.call(this, ctx, camX, camY);
  const [c1, c2] = ERA_INFO[this.portalEra].color;
  const cx = Math.round(this.x * TILE + this.px - camX + 16), cy = Math.round(this.y * TILE + this.py - camY + 8);
  const t = Game.tick / 18, pulse = 1 + 0.08 * Math.sin(t * 2);
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(pulse, pulse * 1.25);
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, c1); g.addColorStop(0.8, c2); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(0, 0, 8 + k * 5, t + k * 2.1, t + k * 2.1 + Math.PI * 0.9); ctx.stroke(); }
  ctx.restore();
  this._emoteAt = this.emote ? [cx, cy - 22] : null;
};

// ---------------- 스크립트 ----------------
Object.assign(SCRIPTS, {
  // 길목의 포탈
  async timePortal(w, c, era) {
    const E = ERA_INFO[era];
    if (!Flags.has('portal_seen')) {
      Flags.set('portal_seen');
      await say(['공간이 소용돌이처럼 일그러져 있다...!', '틈 너머로 낯선 공기가 흘러나온다. ' + E.word + '의 냄새가 난다.',
        '(균열단이 시원의 결정의 힘을 억지로 끌어내면서, 아스테라 곳곳에 시간의 틈이 열리기 시작한 것 같다.)']);
    } else await say(E.word + '로 이어진 시공 포탈이 빛나고 있다.');
    if (!Player.party.some(m => !m.fainted)) { await say('싸울 수 있는 포켓몬이 없다!'); return; }
    if (!(await yesNo('포탈 안으로 들어가시겠습니까?'))) return;
    Player.portalReturn = { map: w.key, x: c.x, y: c.y + 1 };
    setPortalEncounters(era);
    const key = E.key;
    await Game.fade(1, 20); Audio2.se('warp.mp3');
    w.load(key, MAPS[key].spawn[0], MAPS[key].spawn[1], 'down');
    await Game.fade(0, 20);
    await say(E.name.replace('시공 포탈: ', '') + '에 도착했다... 패러독스 포켓몬의 기척이 느껴진다!');
  },
  async portalReturn(w) {
    if (!(await yesNo('들어왔던 곳으로 돌아가시겠습니까?'))) return;
    const r = Player.portalReturn || { map: 'R3', x: 10, y: 10 };
    await Game.fade(1, 20); Audio2.se('warp.mp3');
    w.load(r.map, r.x, r.y, 'down');
    await Game.fade(0, 20);
  },
  // 시간 연구원: 이야기 + 부스트에너지 + 수호자 10번 보상
  async portalSage(w, c, era) {
    const S = '시간 연구원 루미';
    const clears = Player.flags.portalClears || 0;
    if (!Flags.has('sage_met')) {
      Flags.set('sage_met');
      await say(['어머, 여기까지 오다니! 나는 시간의 틈을 조사하는 연구원 루미야.',
        '이곳의 포켓몬은 "패러독스 포켓몬"이라고 불러. 아주 먼 과거, 혹은 아주 먼 미래의 모습을 한 포켓몬이지.',
        '과거의 아이들은 쾌청할 때 "고대활성", 미래의 아이들은 전기가 흐를 때 "쿼크차지"로 강해져.',
        '날씨가 아니어도 부스트에너지를 지니게 하면 힘을 낼 수 있어. 연구 협력 기념으로 줄게!'], { speaker: S });
      Bag.add('BOOSTERENERGY', 3); Audio2.playME('Key item get');
      await say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' 부스트에너지 3개를 손에 넣었다!');
    }
    await say('지금까지 시간의 수호자를 ' + clears + '번 진정시켰어.' + (clears < 10 ? ' (10번이면 특별한 선물이 있어!)' : ''), { speaker: S });
    if (clears >= 10 && !Flags.has('bond_gift') && SPECIES.GRENINJA_1) {
      await say(['정말 대단해! 시간의 틈에서 너를 계속 지켜본 아이가 있어.', '트레이너와의 유대로 모습을 바꾸는 개굴닌자야. 함께 싸우며 상대를 쓰러뜨리면 진짜 힘을 보여 줄 거야!'], { speaker: S });
      const m = new Mon('GRENINJA_1', 50, { ot: Player.name }); m.ot = Player.name; m.metMap = E_NAME(era);
      givePokemon(m); Flags.set('bond_gift'); Audio2.playME('Pkmn get');
      await say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' 유대변화 특성의 개굴닌자를 받았다!');
    }
    if (champ()) await say(['시간의 틈은 결국 한곳으로 이어져 있었어. 균열 지대 "에어리어 제로"...', '그곳에는 고대와 미래의 정점, 코라이돈과 미라이돈이 있다고 해. 균열 관측원에게 물어보렴!'], { speaker: S });
    else await say('균열단이 시원의 결정을 노리는 한 시간의 틈은 계속 열릴 거야. 배지를 모을수록 더 강한 패러독스가 나타날 테니 조심해!', { speaker: S });
    if (await yesNo('부스트에너지를 사 갈래? (하나에 20000원)')) await Game.open(new ShopScreen(['BOOSTERENERGY']));
  },
  // 오늘의 수호자: 부스트에너지를 지닌 강한 패러독스 (하루 한 번, 잡을 수도 있음)
  async portalBoss(w, c, era) {
    const sp = portalBossSpecies(era); if (!sp) return;
    if (!Player.party.some(m => !m.fainted)) { await say('싸울 수 있는 포켓몬이 없다!'); return; }
    Audio2.cry(sp); await emote(c, '!');
    await say('시간의 수호자 ' + J.iga(SPECIES[sp].name) + ' 앞을 가로막았다!\n' + (era === 'past' ? '태고의 거친 숨결' : '미래의 차가운 기계음') + '이 느껴진다!');
    if (!(await yesNo('승부를 거시겠습니까?'))) return;
    const mon = new Mon(sp, portalLevel() + 5, { shiny: chance(1 / 150) });
    mon.item = 'BOOSTERENERGY';
    mon.ivs = mon.ivs.map(v => Math.max(v, 20)); mon.calcStats(); mon.hp = mon.stats[0];
    const r = await startBattle({ type: 'wild', foe: [mon], bgm: 'SV Battle', bg: ERA_INFO[era].bg });
    if (r === 'win' || r === 'caught') {
      Flags.set('pboss_' + era, todayKey());
      Player.flags.portalClears = (Player.flags.portalClears || 0) + 1;
      Bag.add('BOOSTERENERGY', 1); Bag.add(pick(['RARECANDY', 'PPUP', 'MAXREVIVE', 'ULTRABALL']), 1);
      Audio2.playME('Item get');
      await say(['시간의 틈이 잠시 잠잠해졌다...', '수호자가 있던 자리에서 부스트에너지와 도구를 주웠다! (수호자 ' + Player.flags.portalClears + '번째)']);
      w.refreshEvents();
    }
  },
});
function E_NAME(era) { return ERA_INFO[era].name.replace('시공 포탈: ', ''); }
