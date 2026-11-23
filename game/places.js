// ============================================================
// places.js - 마을 꾸미기 + 지역 소개 카드
//   1) 마을마다 콘셉트에 맞는 장식(랜드마크, 가로등, 벤치, 분수, 나무, 바위...)을 빈 풀밭에 자동 배치
//      - 기존 ASCII 맵/건물/문/NPC/이벤트 위치는 그대로 둠
//      - 장식 하나를 놓을 때마다 문·출구·NPC·이벤트·표지판·트리거에 계속 걸어서 갈 수 있는지 검사하고,
//        막히면 그 장식은 취소 (시드 고정이라 항상 같은 결과)
//   2) 처음 방문하는 주요 장소에서 Higgsfield로 만든 오리지널 일러스트(game/art/*.jpg) 소개 카드 표시
// ============================================================
'use strict';

// ── 장식 조각: [시작행, 시작열, 가로칸, 세로칸] (Outside 타일셋) ──
const DECOR_STAMPS = {
  // 나무 꼭대기가 한 줄 위 타일에 걸쳐 있으므로 그 줄부터 찍음 (빈 'X' 칸은 xtiles.js로 건너뜀) — 예전엔 꼭대기가 잘려 보였음
  bigTree: [60, 3, 3, 4], yellowTree: [66, 3, 3, 4], wideTree: [70, 3, 3, 7],
  bush: [59, 3, 1, 1], yellowBush: [65, 3, 1, 1], roundBush: [75, 6, 1, 1],
  lamp: [128, 0, 2, 3], lampR: [128, 2, 2, 3],
  statue: [126, 6, 2, 4], clock: [123, 6, 2, 3], orb: [128, 5, 1, 2],
  bench: [130, 5, 3, 1], woodBench: [132, 6, 2, 2],
  shrine: [131, 0, 2, 3], booth: [131, 3, 2, 3],
  stallWhite: [125, 0, 3, 3], stallYellow: [125, 3, 3, 3],
  flowerRed: [119, 4, 1, 1], flowerMix: [119, 5, 1, 1], urn: [119, 3, 1, 1], bonsai: [118, 3, 1, 1],
  rock: [118, 0, 1, 1], boulder: [118, 1, 1, 1], rockPile: [142, 2, 3, 2], bigRock: [108, 0, 3, 3], greyRock: [115, 7, 1, 1],
  mailbox: [120, 2, 1, 2], notice: [122, 3, 1, 1], miniStatue: [120, 6, 1, 2], trash: [144, 0, 1, 2],
  fountain: [140, 5, 3, 3], ruinGate: [143, 5, 3, 4], pond: [86, 5, 3, 3],
  hedgeH: [85, 5, 3, 1], hedgeBlock: [83, 5, 2, 2],
  spire: [104, 3, 3, 4], greySpire: [114, 3, 3, 4]   // 밑동이 왼쪽 칸(3열)에 걸쳐 있어 3열부터 (rockPile도 2열에 걸침)
};

// ── 마을별 장식 목록: [조각, 개수, 배치 방식] ──
//   방식: center=마을 중심 가까이, path=길 바로 옆, any=아무 빈 곳
const DECOR_THEMES = {
  DAWN: [['bigTree', 2, 'any'], ['pond', 1, 'any'], ['bench', 1, 'path'], ['mailbox', 2, 'path'], ['flowerRed', 6, 'any'], ['flowerMix', 4, 'any'], ['bush', 5, 'any']],
  SPRAY: [['fountain', 1, 'center'], ['pond', 2, 'any'], ['lamp', 3, 'path'], ['lampR', 2, 'path'], ['bench', 2, 'center'], ['hedgeH', 2, 'any'], ['trash', 2, 'path'], ['flowerMix', 5, 'any'], ['roundBush', 4, 'any']],
  EMBER: [['shrine', 1, 'center'], ['bigTree', 3, 'any'], ['yellowTree', 2, 'any'], ['lamp', 3, 'path'], ['lampR', 3, 'path'], ['pond', 1, 'any'], ['woodBench', 2, 'path'], ['flowerRed', 5, 'any'], ['bush', 6, 'any']],
  STAR: [['fountain', 1, 'center'], ['statue', 1, 'center'], ['clock', 1, 'center'], ['stallWhite', 1, 'path'], ['stallYellow', 1, 'path'], ['lamp', 4, 'path'], ['lampR', 4, 'path'], ['bench', 3, 'path'], ['trash', 3, 'path'], ['flowerMix', 6, 'any'], ['roundBush', 4, 'any']],
  PEAK: [['spire', 2, 'any'], ['shrine', 1, 'center'], ['bigTree', 2, 'any'], ['rockPile', 3, 'any'], ['boulder', 6, 'any'], ['rock', 6, 'any'], ['woodBench', 1, 'path'], ['notice', 2, 'path']],
  FROST: [['greySpire', 2, 'any'], ['statue', 1, 'center'], ['lamp', 3, 'path'], ['lampR', 3, 'path'], ['rockPile', 2, 'any'], ['boulder', 5, 'any'], ['mailbox', 2, 'path'], ['bench', 1, 'path']],
  DUNE: [['ruinGate', 1, 'center'], ['pond', 2, 'any'], ['spire', 2, 'any'], ['stallYellow', 2, 'path'], ['stallWhite', 1, 'path'], ['urn', 5, 'any'], ['rockPile', 3, 'any'], ['rock', 6, 'any'], ['bonsai', 3, 'any']],
  CORAL: [['stallWhite', 2, 'path'], ['stallYellow', 1, 'path'], ['fountain', 1, 'center'], ['lamp', 3, 'path'], ['lampR', 3, 'path'], ['bench', 3, 'path'], ['trash', 2, 'path'], ['flowerMix', 4, 'any'], ['roundBush', 4, 'any']],
  MAGMA: [['orb', 2, 'center'], ['bigRock', 2, 'any'], ['spire', 3, 'any'], ['rockPile', 4, 'any'], ['boulder', 6, 'any'], ['rock', 6, 'any'], ['lamp', 2, 'path'], ['lampR', 2, 'path'], ['urn', 3, 'any']],
  LEAGUE: [['fountain', 1, 'center'], ['statue', 2, 'center'], ['clock', 1, 'any'], ['lamp', 4, 'path'], ['lampR', 4, 'path'], ['hedgeH', 4, 'any'], ['flowerMix', 6, 'any'], ['flowerRed', 4, 'any'], ['bench', 2, 'path']],
  MEADOW: [['yellowTree', 3, 'any'], ['wideTree', 1, 'any'], ['pond', 2, 'any'], ['flowerMix', 10, 'any'], ['flowerRed', 8, 'any'], ['yellowBush', 6, 'any'], ['bush', 6, 'any']],
  ORIGIN: [['greySpire', 3, 'any'], ['bigRock', 2, 'any'], ['orb', 3, 'any'], ['greyRock', 6, 'any'], ['rockPile', 3, 'any']]
};

const DIR4 = [[0, -1, 'up', 'down'], [0, 1, 'down', 'up'], [-1, 0, 'left', 'right'], [1, 0, 'right', 'left']];

// 간단한 시드 난수 (맵마다 항상 같은 배치)
function decorRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function strHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/**
 * 맵에 장식 배치
 */
function decorateTown(m, def, key) {
  const plan = DECOR_THEMES[key];
  if (!plan || !def.rows) return;
  const W = m.w, H = m.h, rows = def.rows;
  const ch = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? null : (rows[y][x] || '.');
  const idx = (x, y) => x + y * W;

  // 장식을 놓으면 안 되는 칸: 문 앞, 이벤트(사람/아이템/표지판) 주변, 트리거, 출구 근처
  const reserved = new Set();
  const reserve = (x, y, r = 0) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) reserved.add(idx(x + dx, y + dy)); };
  const events = [...(def.npcs || []), ...(def.trainers || []), ...(def.specials || []), ...(def.items || [])].filter(e => e && e.x !== undefined);
  events.forEach(e => reserve(e.x, e.y, 1));
  const doors = [];
  for (const st of def.stamps || []) {
    const s = STAMPS[st[0]]; if (!s) continue;
    if (s.door) { const dx = st[1] + s.door[0], dy = st[2] + s.door[1]; doors.push([dx, dy]); reserve(dx, dy + 1, 1); }
    for (let y = st[2]; y < st[2] + s.h; y++) for (let x = st[1]; x < st[1] + s.w; x++) reserved.add(idx(x, y));
  }
  for (const t of def.triggers || []) for (let y = t.y - 1; y <= t.y + (t.h || 1); y++) for (let x = t.x - 1; x <= t.x + (t.w || 1); x++) reserved.add(idx(x, y));
  if (def.spawn) reserve(def.spawn[0], def.spawn[1], 1);
  // 표지판 칸과 그 주변
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ch(x, y) === 's') reserve(x, y, 1);
  // 맵 가장자리 3칸 안쪽의 출구 근처
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if ((x === 0 || y === 0 || x === W - 1 || y === H - 1) && m.passable(x, y, 'down') && m.passable(x, y, 'up')) reserve(x, y, 3);
  }

  // 걸어서 갈 수 있는 칸 (사람이 이동하는 규칙과 같게: 나가는 방향/들어오는 방향 모두 통과 가능)
  const reach = () => {
    const seen = new Uint8Array(W * H), q = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if ((x === 0 || y === 0 || x === W - 1 || y === H - 1) && m.passable(x, y, 'up') && m.passable(x, y, 'down')) { seen[idx(x, y)] = 1; q.push([x, y]); }
    }
    if (!q.length && def.spawn) { seen[idx(def.spawn[0], def.spawn[1])] = 1; q.push(def.spawn); }
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy, d, od] of DIR4) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[idx(nx, ny)]) continue;
        if (!m.passable(x, y, d) || !m.passable(nx, ny, od)) continue;
        seen[idx(nx, ny)] = 1; q.push([nx, ny]);
      }
    }
    return seen;
  };
  // 반드시 닿아야 하는 곳: 문(바로 아래 칸), 이벤트·표지판의 이웃 칸, 트리거
  const targets = [];
  doors.forEach(([x, y]) => targets.push([[x, y + 1], [x, y]]));
  events.forEach(e => targets.push(DIR4.map(([dx, dy]) => [e.x + dx, e.y + dy])));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ch(x, y) === 's') targets.push(DIR4.map(([dx, dy]) => [x + dx, y + dy]));
  for (const t of def.triggers || []) { const cells = []; for (let y = t.y; y < t.y + (t.h || 1); y++) for (let x = t.x; x < t.x + (t.w || 1); x++) cells.push([x, y]); targets.push(cells); }
  const ok = (seen, cells) => cells.some(([x, y]) => x >= 0 && y >= 0 && x < W && y < H && seen[idx(x, y)]);
  const base = reach();
  const mustKeep = targets.filter(cells => ok(base, cells));
  const stillOk = () => { const s = reach(); return mustKeep.every(cells => ok(s, cells)); };

  // 맵의 기본 바닥 글자 (대부분 '.', 시원의 길처럼 돌바닥 'g'를 깐 맵도 있음)
  // 맵 설정에 바닥 종류가 없을 수도 있으므로, 맵에서 가장 많이 쓰인 바닥 글자를 기본 바닥으로 봄
  const counts = {};
  rows.join('').split('').forEach(c => { if ('.gyw'.includes(c)) counts[c] = (counts[c] || 0) + 1; });
  const groundCh = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || '.';
  const isGround = c => c === '.' || c === groundCh;
  const isPath = (x, y) => { const c = ch(x, y); return c !== null && !isGround(c) && '=-ygw'.includes(c); };
  const free = (x, y) => isGround(ch(x, y)) && !reserved.has(idx(x, y)) && !m.get(x, y, 1) && !m.get(x, y, 2) && !m.solid.has(idx(x, y));
  // 타일셋의 'X' 빈 칸은 찍지 않음 (xtiles.js)
  const tsName = String(m.ts.img || '').replace(/^.*\//, '').replace(/\.png$/i, '');
  const xSet = new Set((window.X_TILES && window.X_TILES[tsName]) || []);
  const fits = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (!free(x, y)) return false; return true; };
  const nearPath = (x0, y0, w, h) => { for (let x = x0; x < x0 + w; x++) if (isPath(x, y0 + h) || isPath(x, y0 - 1)) return true; for (let y = y0; y < y0 + h; y++) if (isPath(x0 - 1, y) || isPath(x0 + w, y)) return true; return false; };

  const rnd = decorRng(strHash('decor:' + key));
  const cx = W / 2, cy = H / 2;
  let placed = 0;
  for (const [name, count, mode] of plan) {
    const [r0, c0, w, h] = DECOR_STAMPS[name];
    // 후보 위치를 모아서 방식에 맞게 정렬
    const cand = [];
    for (let y = 1; y + h < H - 1; y++) for (let x = 1; x + w < W - 1; x++) {
      if (!fits(x, y, w, h)) continue;
      if (mode === 'path' && !nearPath(x, y, w, h)) continue;
      const d = Math.hypot(x + w / 2 - cx, y + h / 2 - cy);
      cand.push({ x, y, score: mode === 'center' ? d + rnd() * 2 : rnd() });
    }
    cand.sort((a, b) => a.score - b.score);
    let n = 0;
    for (const p of cand) {
      if (n >= count) break;
      if (!fits(p.x, p.y, w, h)) continue; // 앞서 놓은 장식과 겹치는지 다시 확인
      // 큰 장식끼리 너무 붙지 않게 주변 1칸 여유 (1칸짜리 소품은 예외)
      if (w * h > 1 && !fitsMargin(p.x, p.y, w, h)) continue;
      const before = [];
      for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
        const x = p.x + dx, y = p.y + dy, id = T(r0 + dy, c0 + dx);
        if (xSet.has(id)) continue;
        before.push([x, y, m.get(x, y, 1)]);
        m.set(x, y, 1, id);
        // 타일셋에서 '통과 가능'으로 된 소품(분수 등)도 장식 칸은 막음. 캐릭터 위에 그려지는 칸(나무 위쪽 등)만 예외
        if (!((m.ts.prio[id] || 0) > 0)) m.solid.add(idx(x, y));
      }
      if (!stillOk()) { before.forEach(([x, y, v]) => { m.set(x, y, 1, v); m.solid.delete(idx(x, y)); }); continue; }
      for (let dy = -1; dy <= h; dy++) for (let dx = -1; dx <= w; dx++) if (w * h > 1) reserved.add(idx(p.x + dx, p.y + dy));
      for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) reserved.add(idx(p.x + dx, p.y + dy));
      // 어떤 소품인지 칸마다 기록 → freedom.js 에서 말을 걸면(A) 소품마다 다른 반응
      m.decorAt = m.decorAt || {};
      for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) m.decorAt[idx(p.x + dx, p.y + dy)] = { name, x: p.x, y: p.y };
      n++; placed++;
    }
  }
  function fitsMargin(x0, y0, w, h) {
    for (let y = y0 - 1; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      if (m.get(x, y, 1) && ch(x, y) === '.' && reserved.has(idx(x, y))) return false;
    }
    return true;
  }
  m.decorCount = placed;
}

// 못 지나가는 칸인데 바로 아래 칸에 사람이 설 수 있으면, 그 칸의 '위에 그리기' 타일을 캐릭터 밑으로 내림
//  → 물체 앞(남쪽)에 선 캐릭터의 머리가 물체 밑동에 가려지지 않음
function markForceBelow(m) {
  const walk = (x, y) => ['up', 'down', 'left', 'right'].some(d => m.passable(x, y, d));
  m.forceBelow = new Set();
  for (let y = 0; y < m.h - 1; y++) for (let x = 0; x < m.w; x++) {
    if (walk(x, y) || !walk(x, y + 1)) continue;
    for (let z = 0; z < 3; z++) { const id = m.get(x, y, z); if (id && m.ts.prio[id] > 0) { m.forceBelow.add(x + y * m.w); break; } }
  }
}

// 맵을 만들 때 장식을 함께 배치 (main.js의 load와 개발용 ?view 둘 다 이 함수를 씀)
{
  const _build = buildOutdoorMap;
  // eslint-disable-next-line no-global-assign
  buildOutdoorMap = function (def) {
    const m = _build(def);
    const key = Object.keys(MAPS).find(k => MAPS[k] === def);
    if (key && DECOR_THEMES[key]) {
      try { decorateTown(m, def, key); } catch (e) { console.error('[장식] ' + key, e); }
    }
    markForceBelow(m);
    return m;
  };
}

// ============================================================
// 실내 꾸미기: 보조 장식층 (실내 맵에도 야외 타일셋 소품을 올림)
//   TileMap.extras = [{x, y, id}] (야외 타일셋 번호), 우선순위가 있는 칸(나무 위쪽 등)은 캐릭터 위에 그림
//   장식이 놓인 칸은 타일셋 통행 설정에 따라 막힘(extraSolid)
// ============================================================
{
  const TP = TileMap.prototype;
  const _draw = TP.draw;
  TP.draw = function (ctx, camX, camY, anim, part) {
    _draw.call(this, ctx, camX, camY, anim, part);
    if (!this.extras || !this.extras.length) return;
    const O = getTileset(6);
    for (const e of this.extras) {
      // 못 지나가는 장식의 맨 아랫줄(아래 칸이 바닥)은 캐릭터 밑에 그림 (머리 가림 방지)
      let pr = O.prio[e.id] || 0;
      if (pr && this.extraSolid && this.extraSolid.has(e.x + e.y * this.w) && !this.extraSolid.has(e.x + (e.y + 1) * this.w)) pr = 0;
      if ((part === 'below') !== (pr === 0)) continue;
      const sx = e.x * TILE - camX, sy = e.y * TILE - camY;
      if (sx < -TILE || sy < -TILE || sx > SCREEN_W || sy > SCREEN_H) continue;
      O.drawTile(ctx, e.id, sx, sy, anim);
    }
  };
  const _pass = TP.passable;
  TP.passable = function (x, y, dir) {
    if (this.extraSolid && this.extraSolid.has(x + y * this.w)) return false;
    return _pass.call(this, x, y, dir);
  };
}

// 체육관은 타입, 그 외는 용도에 맞는 소품
const ROOM_THEMES = {
  GYM1: [['bigRock', 2], ['spire', 2], ['rockPile', 2], ['boulder', 6], ['rock', 4]],                 // 바위
  GYM2: [['fountain', 2], ['urn', 4], ['bonsai', 4], ['greyRock', 2]],                               // 물
  GYM3: [['orb', 4], ['statue', 2], ['miniStatue', 4]],                                              // 에스퍼
  GYM4: [['statue', 2], ['boulder', 4], ['woodBench', 2], ['notice', 2]],                            // 격투
  GYM5: [['greySpire', 3], ['greyRock', 6]],                                                         // 얼음
  GYM6: [['spire', 3], ['rockPile', 3], ['urn', 3], ['rock', 5]],                                    // 땅
  GYM7: [['statue', 1], ['flowerMix', 8], ['flowerRed', 6], ['bonsai', 4]],                          // 페어리
  GYM8: [['orb', 2], ['spire', 3], ['bigRock', 2], ['greySpire', 2]],                                // 드래곤
  LAB: [['bonsai', 4], ['notice', 2], ['miniStatue', 2], ['trash', 1]],
  CHAMPION: [['statue', 2], ['orb', 2], ['fountain', 1]],
  HOME: [['bonsai', 2], ['urn', 1]],
  RIVAL_HOME: [['bonsai', 2], ['notice', 1]],
  STAR_OBS: [['orb', 2], ['miniStatue', 2], ['notice', 2], ['bonsai', 2]],   // 천문대: 별 구슬·관측 자료
  CORAL_LIGHT: [['urn', 2], ['bonsai', 1], ['trash', 1]]                     // 등대: 항구 소품
};

function decorateRoom(m, def, key) {
  const plan = ROOM_THEMES[key];
  if (!plan || m._decorated) return;
  m._decorated = true;
  m.extras = []; m.extraSolid = new Set();
  const W = m.w, H = m.h, idx = (x, y) => x + y * W;
  const O = getTileset(6);
  const xSet = new Set((window.X_TILES && window.X_TILES.Outside) || []);
  const reserved = new Set();
  const reserve = (x, y, r = 0) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) reserved.add(idx(x + dx, y + dy)); };
  const events = [...(def.npcs || []), ...(def.trainers || []), ...(def.specials || []), ...(def.items || [])].filter(e => e && e.x !== undefined);
  events.forEach(e => reserve(e.x, e.y, 1));
  // 트레이너 시선이 지나는 칸은 비워 둠 (체육관 진행 방식이 바뀌지 않게)
  for (const t of def.trainers || []) {
    const [dx, dy] = DIRS[t.dir] || [0, 0];
    for (let i = 1; i <= (t.sight || 4); i++) reserve(t.x + dx * i, t.y + dy * i, 0);
  }
  const exits = [def.exit, ...(def.exitAlt || [])].filter(Boolean);
  exits.forEach(([x, y]) => reserve(x, y, 2));

  const walk = (x, y) => ['up', 'down', 'left', 'right'].every(d => m.passable(x, y, d));
  const reach = () => {
    const seen = new Uint8Array(W * H), q = [];
    // 출구 칸과, 플레이어가 실제로 들어서는 출구 바로 위 칸에서 시작
    exits.forEach(([x, y]) => { for (const yy of [y, y - 1]) if (yy >= 0 && !seen[idx(x, yy)]) { seen[idx(x, yy)] = 1; q.push([x, yy]); } });
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy, d, od] of DIR4) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[idx(nx, ny)]) continue;
        if (!m.passable(x, y, d) || !m.passable(nx, ny, od)) continue;
        seen[idx(nx, ny)] = 1; q.push([nx, ny]);
      }
    }
    return seen;
  };
  const targets = events.map(e => DIR4.map(([dx, dy]) => [e.x + dx, e.y + dy]));
  const ok = (seen, cells) => cells.some(([x, y]) => x >= 0 && y >= 0 && x < W && y < H && seen[idx(x, y)]);
  const base = reach();
  const mustKeep = targets.filter(c => ok(base, c));
  // 처음부터 걸어 다닐 수 있고, 가구가 없는 바닥 칸만 사용
  // 일부 실내 템플릿은 바닥(카펫 등)이 1층에 깔려 있음 → 걸을 수 있고 캐릭터 위에 그려지지 않는 칸이면 바닥으로 봄
  const floorLike = (x, y) => { const l1 = m.get(x, y, 1); return !l1 || !(m.ts.prio[l1] > 0); };
  const free = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1 && base[idx(x, y)] && walk(x, y) &&
    floorLike(x, y) && !m.get(x, y, 2) && !reserved.has(idx(x, y)) && !m.extraSolid.has(idx(x, y));
  const fits = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (!free(x, y)) return false; return true; };

  const rnd = decorRng(strHash('room:' + key));
  for (const [name, count] of plan) {
    const [r0, c0, w, h] = DECOR_STAMPS[name];
    const cand = [];
    for (let y = 1; y + h < H; y++) for (let x = 1; x + w < W; x++) if (fits(x, y, w, h)) cand.push({ x, y, s: rnd() });
    cand.sort((a, b) => a.s - b.s);
    let n = 0;
    for (const p of cand) {
      if (n >= count) break;
      if (!fits(p.x, p.y, w, h)) continue;
      const added = [];
      for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
        const id = T(r0 + dy, c0 + dx);
        if (xSet.has(id)) continue;
        const x = p.x + dx, y = p.y + dy;
        m.extras.push({ x, y, id });
        // 통과할 수 있는 칸(나무 위쪽처럼 우선순위가 있는 칸)이 아니면 막음
        const solid = !((O.prio[id] || 0) > 0 && !((O.pass[id] || 0) & 0x0f));
        if (solid) m.extraSolid.add(idx(x, y));
        added.push([idx(x, y), solid]);
      }
      const s = reach();
      if (!mustKeep.every(c => ok(s, c))) {
        // 막히면 되돌림
        m.extras.splice(m.extras.length - added.length, added.length);
        added.forEach(([i, solid]) => { if (solid) m.extraSolid.delete(i); });
        continue;
      }
      // 큰 소품 주변 1칸은 비워서 답답하지 않게
      for (let dy = -1; dy <= h; dy++) for (let dx = -1; dx <= w; dx++) if (w * h > 1) reserved.add(idx(p.x + dx, p.y + dy));
      n++;
    }
  }
  m.decorCount = m.extras.length;
}

{
  const W = World.prototype;
  const _load = W.load;
  W.load = function (key, ...rest) {
    const r = _load.call(this, key, ...rest);
    if (ROOM_THEMES[key] && this.map && !this.map._decorated) {
      try { decorateRoom(this.map, this.def, key); } catch (e) { console.error('[실내 장식] ' + key, e); }
    }
    // 예전 저장 위치가 지금은 장식이 놓인 칸이면 가장 가까운 빈 칸으로 옮김 (갇힘 방지)
    const p = this.player, m = this.map;
    const stuck = (x, y) => !['up', 'down', 'left', 'right'].some(d => m.passable(x, y, d));
    if (m && stuck(p.x, p.y) && !(this.doors || []).some(d => d.x === p.x && d.y === p.y)) {
      outer: for (let rr = 1; rr < 12; rr++) for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) {
        const nx = p.x + dx, ny = p.y + dy;
        if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || stuck(nx, ny) || this.charAt(nx, ny)) continue;
        p.x = nx; p.y = ny; Player.x = nx; Player.y = ny; this.setupFollower(true); this.updateCamera();
        break outer;
      }
    }
    return r;
  };
}

// ============================================================
// 지역 소개 카드
// ============================================================
const PLACE_INFO = {
  DAWN: '아스테라 탐사대가 첫발을 내디딘 바닷가 마을',
  SPRAY: '거대한 폭포의 물보라가 무지개를 만드는 도시',
  EMBER: '숲 가장자리, 등불이 꺼지지 않는 마을',
  STAR: '천문대가 밤하늘을 지켜보는 대륙 최대의 도시',
  PEAK: '강인한 주먹이 단련되는 고지의 마을',
  FROST: '오로라가 춤추는 북쪽 끝 마을',
  DUNE: '오아시스 위에 세워진 고대 도시',
  CORAL: '대륙 탐사선이 처음 닻을 내린 항구',
  MAGMA: '용의 전설이 살아 숨쉬는 화산 기슭의 마을',
  ORIGIN: '시원의 결정이 잠든 대륙의 중심',
  LEAGUE: '아스테라 최강의 트레이너들이 기다리는 곳',
  MEADOW: '시공의 균열이 열리는 꿈결 같은 풀밭'
};
const placeArt = {};
function placeArtImg(key) {
  if (!PLACE_INFO[key]) return null;
  if (!placeArt[key]) { const im = new Image(); im.src = 'game/art/' + key + '.jpg'; placeArt[key] = im; }
  return placeArt[key];
}

class LocationCard extends Win {
  constructor(key) { super(); this.key = key; this.t = 0; this.im = placeArtImg(key); }
  update() {
    this.t++;
    // 처음 0.5초는 넘기지 않음 (이동하다 누른 키로 바로 닫히지 않게), 5초 뒤 자동으로 닫힘
    if (this.t > 30 && (Input.trig('A') || Input.trig('B'))) { SE.ok(); this.close(); }
    if (this.t > 300) this.close();
  }
  draw(ctx) {
    if (Game.world) Game.world.draw(ctx);
    const a = Math.min(1, this.t / 20);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 512, 384);
    if (this.im && this.im.complete && this.im.naturalWidth) {
      // 천천히 확대되는 연출
      const s = 1 + Math.min(this.t, 300) / 3000;
      const w = 512 * s, h = 384 * s;
      ctx.drawImage(this.im, (512 - w) / 2, (384 - h) / 2, w, h);
    }
    // 아래쪽 이름 띠
    const g = ctx.createLinearGradient(0, 270, 0, 384);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = g; ctx.fillRect(0, 260, 512, 124);
    const name = (MAPS[this.key] && MAPS[this.key].name) || this.key;
    textFit(ctx, name, 24, 300, 460, { size: 30, color: '#ffffff', shadow: '#000' });
    textFit(ctx, PLACE_INFO[this.key], 26, 342, 460, { size: 18, color: '#f8d878', shadow: '#000' });
    ctx.globalAlpha = 1;
  }
}
window.LocationCard = LocationCard;

// 처음 들어온 주요 장소에서 카드 표시 (스크립트 실행 중이면 끝난 뒤에)
{
  const W = World.prototype;
  const _load = W.load;
  W.load = function (key, ...rest) {
    const r = _load.call(this, key, ...rest);
    if (PLACE_INFO[key] && Player.flags && !Player.flags['place_' + key]) { this._pendingPlace = key; placeArtImg(key); }
    return r;
  };
  const _update = W.update;
  W.update = function (...args) {
    if (this._pendingPlace && !this.busy && !Game.ui.length && Game.scene === this) {
      const k = this._pendingPlace; this._pendingPlace = null;
      Player.flags['place_' + k] = true;
      this.runScript(() => Game.open(new LocationCard(k)));
    }
    return _update.apply(this, args);
  };
}

// 지도에서 장소를 고르고 A를 누르면 그 장소의 일러스트를 다시 볼 수 있음 (공중날기 모드는 원래대로)
{
  const _upd = TownMapScreen.prototype.update;
  TownMapScreen.prototype.update = function () {
    if (!this.fly && Input.trig('A')) {
      const k = this.keys[this.i];
      if (PLACE_INFO[k]) { SE.ok(); Game.open(new LocationCard(k)); return; }
    }
    return _upd.call(this);
  };
}
