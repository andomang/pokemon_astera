// ============================================================
// dev.js - 개발/테스트용 도구 (?test=1&map=R1&x=11&y=20, ?view=DAWN)
// ============================================================
'use strict';

async function devStart(q) {
  Player = newPlayer();
  Player.name = '테스트';
  const party = (q.get('party') || 'CHARMANDER:12,PIKACHU:10').split(',');
  for (const p of party) { const [s, l] = p.split(':'); const m = new Mon(s, +l || 10, { ot: Player.name }); m.ot = Player.name; Player.party.push(m); Player.caught[s] = Player.seen[s] = true; }
  Player.bag = { POTION: 5, SUPERPOTION: 3, POKEBALL: 10, GREATBALL: 5, ANTIDOTE: 2, RARECANDY: 3, FIRESTONE: 1, REPEL: 2 };
  Flags.set('starter'); Flags.set('starterId', 'CHARMANDER'); Flags.set('pokedex'); Flags.set('rival1');
  if (q.get('badges')) for (let i = 0; i < +q.get('badges'); i++) Player.badges.push(GYM_LEADERS[i].badge);
  Audio2.unlock();
  startWorld(q.get('map') || 'DAWN', +(q.get('x') || 11), +(q.get('y') || 9), q.get('dir') || 'down');
  Game.fadeA = 0;
  if (q.get('battle')) { await sleep(300); Game.world.runScript(() => wildBattle(q.get('battle'), +(q.get('lv') || 5))); }
  if (q.get('ui')) {
    await sleep(300);
    const u = q.get('ui');
    if (u === 'party') Game.open(new PartyScreen({ mode: 'field' }));
    if (u === 'bag') Game.open(new BagScreen({ mode: 'field' }));
    if (u === 'summary') Game.open(new SummaryScreen(Player.party, 0));
    if (u === 'summary2') { const s = new SummaryScreen(Player.party, 0); s.page = 1; Game.open(s); }
    if (u === 'summary3') { const s = new SummaryScreen(Player.party, 0); s.page = 2; Game.open(s); }
    if (u === 'dex') Game.open(new DexScreen());
    if (u === 'menu') Game.open(new StartMenu());
    if (u === 'shop') Game.open(new ShopScreen(shopStock()));
    if (u === 'card') Game.open(new TrainerCard());
    if (u === 'box') { Player.boxes[0].push(new Mon('EEVEE', 10), new Mon('ODDISH', 8)); Game.open(new BoxScreen('withdraw')); }
    if (u === 'say') say('안녕하세요! 이것은 대화창 테스트입니다. 한국어 폰트가 잘 나오는지 확인합니다.', { speaker: '한별 박사' });
    if (u === 'options') Game.open(new OptionsScreen());
    if (u === 'evo') Game.open(new EvolutionScene(Player.party[0], 'CHARMELEON'));
  }
}

// 맵 전체를 큰 캔버스에 그려서 확인
function devView(key) {
  const interior = !!INTERIOR_DEFS[key];
  const def = interior ? INTERIOR_DEFS[key] : MAPS[key];
  const map = interior ? buildInteriorMap(def.tmpl) : buildOutdoorMap(def);
  const cv = Game.canvas;
  cv.width = map.w * TILE; cv.height = map.h * TILE;
  cv.style.width = cv.width + 'px'; cv.style.height = cv.height + 'px';
  document.body.style.display = 'block'; document.body.style.overflow = 'visible';
  cv.style.position = 'absolute'; cv.style.left = '0px'; cv.style.top = '0px';
  document.getElementById('hint').style.display = 'none';
  Game.frame = () => { }; Game.noFit = true;
  const ctx = cv.getContext('2d');
  const paint = () => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
    const saveW = window.SCREEN_W;
    // 전체 그리기
    for (let z = 0; z < 3; z++) for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const id = map.layers[z][x + y * map.w]; if (id) map.ts.drawTile(ctx, id, x * TILE, y * TILE, 0);
    }
    // 통행 불가 표시 + 격자
    ctx.font = '9px monospace';
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      if (!map.passable(x, y, 'down') && !map.passable(x, y, 'up') && !map.passable(x, y, 'left') && !map.passable(x, y, 'right')) { ctx.fillStyle = 'rgba(255,0,0,0.18)'; ctx.fillRect(x * TILE, y * TILE, TILE, TILE); }
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.strokeRect(x * TILE, y * TILE, TILE, TILE);
      if (x % 2 === 0 && y % 2 === 0) { ctx.fillStyle = '#fff'; ctx.fillText(x + ',' + y, x * TILE + 1, y * TILE + 9); }
    }
    const mark = (x, y, c, t) => { ctx.fillStyle = c; ctx.fillRect(x * TILE + 8, y * TILE + 8, 16, 16); ctx.fillStyle = '#000'; ctx.fillText(t || '', x * TILE + 9, y * TILE + 20); };
    for (const n of def.npcs || []) mark(n.x, n.y, '#ff0', 'N');
    for (const n of def.trainers || []) mark(n.x, n.y, '#f80', 'T');
    for (const n of def.items || []) mark(n.x, n.y, '#0ff', 'I');
    for (const n of def.signs || []) mark(n.x, n.y, '#fff', 'S');
    for (const st of def.stamps || []) { if (!st[3]) continue; const s = STAMPS[st[0]]; mark(st[1] + s.door[0], st[2] + s.door[1], '#0f0', 'D'); }
    if (def.exit) mark(def.exit[0], def.exit[1], '#f0f', 'E');
    for (const t of def.triggers || []) { ctx.strokeStyle = '#f0f'; ctx.lineWidth = 2; ctx.strokeRect(t.x * TILE, t.y * TILE, t.w * TILE, t.h * TILE); }
  };
  let n = 0; const loop = () => { paint(); if (++n < 40) setTimeout(loop, 100); else document.title = 'READY'; }; loop();
}
