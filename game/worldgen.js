// ============================================================
// worldgen.js - 넓은 대륙을 위한 절차적 도로/마을 생성기
//   같은 시드는 항상 같은 맵을 만든다 (저장/불러오기 안전)
// ============================================================
'use strict';

// 도로/야외 지역 생성
// o: { w, h, seed, exits:{north:x,south:x,east:y,west:y}, ground:'.', grass, trees, water, rocks, flowers, path:'=' }
function genRoute(o) {
  const R = seededRng(o.seed || 1), W = o.w, H = o.h;
  const g = []; for (let y = 0; y < H; y++) g.push(new Array(W).fill(o.ground || '.'));
  const P = []; for (let y = 0; y < H; y++) P.push(new Array(W).fill(false)); // 길 표시
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
  // 테두리
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) g[y][x] = 'T';
  const brush = (x, y) => { for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H) { g[Y][X] = o.path || '='; P[Y][X] = true; } } };
  const cx = Math.floor(W / 2 - 1 + (R() - 0.5) * W * 0.3), cy = Math.floor(H / 2 - 1 + (R() - 0.5) * H * 0.3);
  const hubX = clamp(cx, 3, W - 5), hubY = clamp(cy, 3, H - 5);
  const carve = (sx, sy) => {
    let x = sx, y = sy, guard = 2000;
    brush(x, y);
    while ((x !== hubX || y !== hubY) && guard-- > 0) {
      const dx = hubX - x, dy = hubY - y;
      // 주 방향으로 이동, 가끔 옆으로 꺾기
      if (Math.abs(dx) > 0 && (Math.abs(dy) === 0 || R() < Math.abs(dx) / (Math.abs(dx) + Math.abs(dy)) * (R() < 0.15 ? 0.2 : 1))) x += Math.sign(dx);
      else if (dy !== 0) y += Math.sign(dy);
      x = clamp(x, 0, W - 2); y = clamp(y, 0, H - 2);
      brush(x, y);
    }
  };
  const ex = o.exits || {};
  if (ex.north !== undefined) carve(ex.north, 0);
  if (ex.south !== undefined) carve(ex.south, H - 2);
  if (ex.west !== undefined) carve(0, ex.west);
  if (ex.east !== undefined) carve(W - 2, ex.east);
  // 지형 배치 가능 여부(길에서 1칸 떨어짐)
  const free = (x, y) => {
    if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) return false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && P[Y][X]) return false; }
    return g[y][x] === (o.ground || '.');
  };
  const area = W * H;
  const blob = (ch, n, rmin, rmax, even) => {
    for (let k = 0; k < n; k++) {
      const rw = rmin + Math.floor(R() * (rmax - rmin + 1)), rh = rmin + Math.floor(R() * (rmax - rmin + 1));
      let x0 = 2 + Math.floor(R() * (W - 4 - rw)), y0 = 2 + Math.floor(R() * (H - 4 - rh));
      if (even) {
        x0 -= x0 % 2; y0 -= y0 % 2;
        const w2 = rw + (rw % 2), h2 = rh + (rh % 2);
        for (let y = y0; y < y0 + h2; y += 2) for (let x = x0; x < x0 + w2; x += 2) {
          if (free(x, y) && free(x + 1, y) && free(x, y + 1) && free(x + 1, y + 1)) { set(x, y, ch); set(x + 1, y, ch); set(x, y + 1, ch); set(x + 1, y + 1, ch); }
        }
        continue;
      }
      for (let y = y0; y < y0 + rh; y++) for (let x = x0; x < x0 + rw; x++) {
        if (!even) { const nx = (x - x0 + 0.5) / rw - 0.5, ny = (y - y0 + 0.5) / rh - 0.5; if (nx * nx + ny * ny > 0.27) continue; }
        if (even ? (free(x, y) && free(x ^ 1, y)) : free(x, y)) set(x, y, ch);
      }
    }
  };
  blob('~', Math.round(area * (o.water || 0) / 30), 3, 6, false);
  blob('T', Math.round(area * (o.trees ?? 0.1) / 16), 2, 4, true);
  blob(',', Math.round(area * (o.grass ?? 0.25) / 18), 3, 7, false);
  if (o.ground2) blob(o.ground2, Math.round(area * 0.04), 3, 6, false);
  const singles = (ch, n) => { for (let k = 0; k < n; k++) { const x = 2 + Math.floor(R() * (W - 4)), y = 2 + Math.floor(R() * (H - 4)); if (free(x, y)) set(x, y, ch); } };
  singles('R', Math.round(area * (o.rocks ?? 0.006)));
  singles('b', Math.round(area * (o.bushes ?? 0.006)));
  singles('f', Math.round(area * (o.flowers ?? 0.008)));
  // 트레이너/아이템 후보 위치
  const spots = [];
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
    if (P[y][x] || g[y][x] === 'T' || g[y][x] === '~' || 'Rbfs'.includes(g[y][x])) continue;
    for (const [d, dx, dy] of [['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]]) {
      if (P[y + dy] && P[y + dy][x + dx] && !P[y][x]) { spots.push({ x, y, dir: d }); break; }
    }
  }
  const itemSpots = [];
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) if (!P[y][x] && (g[y][x] === ',' || g[y][x] === (o.ground || '.')) && R() < 0.02) itemSpots.push({ x, y });
  return { rows: g.map(r => r.join('')), spots, itemSpots, rng: R, exitPos: { north: ex.north, south: ex.south, east: ex.east, west: ex.west }, hub: [hubX, hubY] };
}

// 마을 생성: 가로 거리(2칸) 위에 건물을 일렬로 세우고 문이 거리로 향하게 한다
// o: { w, h, seed, exits:{...}, buildings:[[stamp, interiorKey], ...], ground }
function genTown(o) {
  const R = seededRng(o.seed || 7), W = o.w, H = o.h;
  const g = []; for (let y = 0; y < H; y++) g.push(new Array(W).fill(o.ground || '.'));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) g[y][x] = 'T';
  const cx = (Math.floor(W / 2) - 1) & ~0;
  const streets = []; for (let y = 8; y <= H - 5; y += 9) streets.push(y);
  const pave = o.pave || '-';
  for (const sy of streets) for (let x = 3; x < W - 3; x++) { g[sy][x] = pave; g[sy + 1][x] = pave; }
  const vTop = o.exits.north !== undefined ? 0 : streets[0], vBot = o.exits.south !== undefined ? H - 1 : streets[streets.length - 1] + 1;
  for (let y = vTop; y <= vBot; y++) { g[y][cx] = pave; g[y][cx + 1] = pave; }
  const exitPos = { north: o.exits.north !== undefined ? cx : undefined, south: o.exits.south !== undefined ? cx : undefined };
  if (o.exits.west !== undefined) { const sy = streets[0]; for (let x = 0; x < 3; x++) { g[sy][x] = pave; g[sy + 1][x] = pave; } exitPos.west = sy; }
  if (o.exits.east !== undefined) { const sy = streets[Math.min(1, streets.length - 1)]; for (let x = W - 3; x < W; x++) { g[sy][x] = pave; g[sy + 1][x] = pave; } exitPos.east = sy; }
  // 건물 배치
  const stamps = [];
  let si = 0, x = 4;
  for (const [st, key] of o.buildings) {
    const s = STAMPS[st];
    let placed = false;
    while (!placed && si < streets.length) {
      const sy = streets[si];
      if (x + s.w > W - 3) { si++; x = 4; continue; }
      if (x < cx + 3 && x + s.w > cx - 1) { x = cx + 3; continue; }
      const top = sy - s.h;
      if (top < 2) { si++; x = 4; continue; }
      stamps.push([st, x, top, key]);
      x += s.w + 1 + Math.floor(R() * 2);
      placed = true;
    }
  }
  // 장식
  for (let k = 0; k < Math.floor(W * H / 60); k++) {
    const X = 3 + Math.floor(R() * (W - 6)), Y = 3 + Math.floor(R() * (H - 6));
    if (g[Y][X] !== (o.ground || '.')) continue;
    if (stamps.some(([st, sx, sy]) => X >= sx - 1 && X <= sx + STAMPS[st].w && Y >= sy - 1 && Y <= sy + STAMPS[st].h)) continue;
    if (g[Y + 1] && g[Y + 1][X] === pave) continue;
    g[Y][X] = R() < 0.6 ? 'f' : 'b';
  }
  // 표지판: 첫 거리 아래쪽, 중앙 길 옆
  const signY = streets[0] + 2, signX = cx - 2;
  g[signY][signX] = 's';
  return { rows: g.map(r => r.join('')), stamps, exitPos, sign: [signX, signY], streets, cx };
}

// 지역 테마 타입으로 야생 포켓몬 목록 자동 생성 (모든 세대 공존)
function autoEncounters(types, minLv, maxLv, seed, n = 16, extra = []) {
  const R = seededRng(seed);
  const maxStage = maxLv < 18 ? 0 : maxLv < 32 ? 1 : 2;
  const pool = SPECIES_LIST.filter(s => {
    const d = SPECIES[s];
    if (isSpecial(s) || d.cr <= 5) return false;
    if (!d.t.some(t => types.includes(t))) return false;
    const st = evoStage(s);
    if (st > maxStage) return false;
    if (maxLv >= 30 && st === 0 && d.evo.length && R() < 0.5) return false;
    return true;
  });
  const out = [];
  const used = new Set();
  for (let i = 0; i < n * 4 && out.length < n && pool.length; i++) {
    const s = pool[Math.floor(R() * pool.length)];
    if (used.has(s)) continue;
    used.add(s);
    out.push([s, 4 + Math.floor(R() * 10)]);
  }
  for (const e of extra) out.push(e);
  return { min: minLv, max: maxLv, list: out };
}

// 생성한 결과를 MAPS 항목으로 만들기
function defineRoute(key, o, extra = {}) {
  const r = genRoute(o);
  const R = r.rng;
  const def = { name: o.name, bgm: o.bgm, battleBg: o.battleBg || 'field', outdoor: true, rows: r.rows, exitPos: r.exitPos, exits: o.links || {}, weather: o.weather, ...extra };
  if (o.enc) def.encounters = o.enc;
  // 트레이너 자동 배치
  const sp = r.spots.slice();
  def.trainers = (o.trainers || []).map((t, i) => {
    const k = Math.floor(R() * sp.length); const s = sp.splice(k, 1)[0] || { x: 3 + i, y: 3, dir: 'down' };
    return { id: key + '_t' + i, x: s.x, y: s.y, dir: s.dir, sight: 4, money: (t.money || t.team.reduce((a, b) => a + b[1], 0) * 25), ...t };
  });
  const isp = r.itemSpots.slice();
  def.items = (o.items || []).filter(it => ITEMS[it[0]]).map((it, i) => { const k = Math.floor(R() * isp.length); const s = isp.splice(k, 1)[0] || { x: 3, y: 3 + i }; return { id: key + '_i' + i, x: s.x, y: s.y, item: it[0], n: it[1] || 1 }; });
  def._spots = sp; def._items = isp; def._hub = r.hub;
  MAPS[key] = def;
  return def;
}
function defineTown(key, o, extra = {}) {
  const t = genTown(o);
  const def = { name: o.name, bgm: o.bgm, battleBg: 'field', outdoor: true, rows: t.rows, stamps: t.stamps, exitPos: t.exitPos, exits: o.links || {}, signGround: '.', weather: o.weather, ...extra };
  def.signs = [{ x: t.sign[0], y: t.sign[1], text: o.signText || o.name }];
  def._streets = t.streets; def._cx = t.cx;
  MAPS[key] = def;
  return def;
}
// 생성 맵에서 사람이 서 있을 만한 빈 칸 찾기
function freeSpotNear(key, x, y) {
  const d = MAPS[key];
  for (let r = 0; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const X = x + dx, Y = y + dy, c = d.rows[Y] && d.rows[Y][X];
    if (!c || !'.,=-y'.includes(c)) continue;
    if ((d.stamps || []).some(([st, sx, sy]) => X >= sx && X < sx + STAMPS[st].w && Y >= sy && Y < sy + STAMPS[st].h + 1)) continue;
    if ((d.npcs || []).some(n => n.x === X && n.y === Y) || (d.trainers || []).some(n => n.x === X && n.y === Y)) continue;
    return [X, Y];
  }
  return [x, y];
}
