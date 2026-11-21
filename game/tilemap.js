// ============================================================
// tilemap.js - RMXP 타일셋/오토타일 렌더링, 충돌, 맵 빌더
// ============================================================
'use strict';

// RMXP 오토타일 패턴 테이블 (48패턴 x 4 쿼터, 6x8 그리드의 16px 조각 번호)
const AUTOTILE_TABLE = [[27, 28, 33, 34], [5, 28, 33, 34], [27, 6, 33, 34], [5, 6, 33, 34], [27, 28, 33, 12], [5, 28, 33, 12], [27, 6, 33, 12], [5, 6, 33, 12], [27, 28, 11, 34], [5, 28, 11, 34], [27, 6, 11, 34], [5, 6, 11, 34], [27, 28, 11, 12], [5, 28, 11, 12], [27, 6, 11, 12], [5, 6, 11, 12], [25, 26, 31, 32], [25, 6, 31, 32], [25, 26, 31, 12], [25, 6, 31, 12], [15, 16, 21, 22], [15, 16, 21, 12], [15, 16, 11, 22], [15, 16, 11, 12], [29, 30, 35, 36], [29, 30, 11, 36], [5, 30, 35, 36], [5, 30, 11, 36], [39, 40, 45, 46], [5, 40, 45, 46], [39, 6, 45, 46], [5, 6, 45, 46], [25, 30, 31, 36], [15, 16, 45, 46], [13, 14, 19, 20], [13, 14, 19, 12], [17, 18, 23, 24], [17, 18, 11, 24], [41, 42, 47, 48], [5, 42, 47, 48], [37, 38, 43, 44], [37, 6, 43, 44], [13, 18, 19, 24], [13, 14, 43, 44], [37, 42, 43, 48], [17, 18, 47, 48], [13, 18, 43, 48], [1, 2, 7, 8]];
const AUTOTILE_LOOKUP = {};
AUTOTILE_TABLE.forEach((q, i) => { const k = q.join(','); if (AUTOTILE_LOOKUP[k] === undefined) AUTOTILE_LOOKUP[k] = i; });

// 이웃 연결 정보로 오토타일 패턴 번호 계산
function autotilePattern(same) {
  // same(dx,dy) -> bool
  const q = [];
  for (let qi = 0; qi < 4; qi++) {
    const dx = qi % 2, dy = qi >> 1;
    const sx = dx ? 1 : -1, sy = dy ? 1 : -1;
    const h = same(sx, 0), v = same(0, sy), d = same(sx, sy);
    let cx, cy;
    if (h && v && d) { cx = 2 + dx; cy = 4 + dy; }
    else if (h && v) { cx = 4 + dx; cy = dy; }
    else if (!h && !v) { cx = (dx ? 4 : 0) + dx; cy = (dy ? 6 : 2) + dy; }
    else if (h) { cx = 2 + dx; cy = (dy ? 6 : 2) + dy; }
    else { cx = (dx ? 4 : 0) + dx; cy = 4 + dy; }
    q.push(cy * 6 + cx + 1);
  }
  const k = q.join(',');
  return AUTOTILE_LOOKUP[k] !== undefined ? AUTOTILE_LOOKUP[k] : 0;
}

class Tileset {
  constructor(id) {
    const t = window.TILESETS[id];
    this.id = id;
    this.img = 'Graphics/Tilesets/' + t.img + '.png';
    this.autos = t.auto.map(n => n ? 'Graphics/Autotiles/' + n + '.png' : null);
    this.pass = t.pass; this.prio = t.prio; this.tt = t.tt;
  }
  preloadList() { return [this.img, ...this.autos.filter(Boolean)]; }
  drawTile(ctx, id, x, y, anim) {
    if (id <= 0) return;
    if (id < 384) {
      const p = this.autos[Math.floor(id / 48) - 1];
      const im = p && img(p);
      if (!im) return;
      if (im.height === 32) { // 1칸짜리 애니메이션 오토타일 (꽃 등)
        const n = Math.max(1, Math.floor(im.width / 32));
        ctx.drawImage(im, (Math.floor(anim / 16) % n) * 32, 0, 32, 32, x, y, 32, 32);
        return;
      }
      const frames = Math.max(1, Math.floor(im.width / 96));
      const fx = (Math.floor(anim / 16) % frames) * 96;
      const q = AUTOTILE_TABLE[id % 48];
      for (let i = 0; i < 4; i++) {
        const s = q[i] - 1;
        ctx.drawImage(im, fx + (s % 6) * 16, Math.floor(s / 6) * 16, 16, 16, x + (i % 2) * 16, y + (i >> 1) * 16, 16, 16);
      }
    } else {
      const im = img(this.img);
      if (!im) return;
      const t = id - 384;
      ctx.drawImage(im, (t % 8) * 32, Math.floor(t / 8) * 32, 32, 32, x, y, 32, 32);
    }
  }
}
const TILESET_CACHE = {};
function getTileset(id) { return TILESET_CACHE[id] || (TILESET_CACHE[id] = new Tileset(id)); }

// 타일 번호 헬퍼: 타일셋 이미지의 (행, 열)
const T = (r, c) => 384 + r * 8 + c;

class TileMap {
  constructor(w, h, tsId, layers) {
    this.w = w; this.h = h; this.ts = getTileset(tsId);
    this.layers = layers || [0, 1, 2].map(() => new Array(w * h).fill(0));
    // 타일 설정과 상관없이 막아야 하는 칸 (예: 좁은 나무 윗부분은 타일셋상 '통과 가능'이라 직접 막음)
    this.solid = new Set();
  }
  get(x, y, z) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? 0 : this.layers[z][x + y * this.w]; }
  set(x, y, z, id) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.layers[z][x + y * this.w] = id; }
  // RMXP/Essentials 통행 판정. dir: down|left|right|up
  passable(x, y, dir) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    if (this.solid && this.solid.has(x + y * this.w)) return false;
    const bit = { down: 1, left: 2, right: 4, up: 8 }[dir] || 0;
    for (let z = 2; z >= 0; z--) {
      const id = this.layers[z][x + y * this.w];
      if (!id) continue;
      const p = this.ts.pass[id] || 0;
      if ((p & bit) || (p & 0x0f) === 0x0f) return false;
      if (!this.ts.prio[id]) return true;
    }
    return true;
  }
  terrain(x, y) {
    for (let z = 2; z >= 0; z--) {
      const id = this.get(x, y, z);
      if (id && this.ts.tt[id]) return this.ts.tt[id];
    }
    return 0;
  }
  // 화면에 그리기. part: 'below' (우선순위0) | 'above' (우선순위>0)
  draw(ctx, camX, camY, anim, part) {
    const x0 = Math.floor(camX / TILE), y0 = Math.floor(camY / TILE);
    const x1 = Math.ceil((camX + SCREEN_W) / TILE), y1 = Math.ceil((camY + SCREEN_H) / TILE);
    for (let z = 0; z < 3; z++) {
      for (let y = Math.max(0, y0); y < Math.min(this.h, y1); y++) {
        for (let x = Math.max(0, x0); x < Math.min(this.w, x1); x++) {
          const id = this.layers[z][x + y * this.w];
          if (!id) continue;
          // forceBelow: 못 지나가는 물체의 맨 아랫줄(바로 아래 칸에 사람이 설 수 있는 칸)은 캐릭터 밑에 그림
          //  (바위 더미 등의 밑줄이 '위에 그리기'로 되어 있어 아래에 선 캐릭터 머리를 가리던 문제)
          const pr = (this.forceBelow && this.forceBelow.has(x + y * this.w)) ? 0 : (this.ts.prio[id] || 0);
          if ((part === 'below') !== (pr === 0)) continue;
          this.ts.drawTile(ctx, id, x * TILE - camX, y * TILE - camY, anim);
        }
      }
    }
  }
}

// ------------------------------------------------------------
// 야외 맵 빌더: ASCII 레이아웃 + 건물 스탬프 → 타일 레이어
// ------------------------------------------------------------
// 건물/오브젝트 스탬프 (Outside 타일셋 기준: 시작행, 시작열, 너비, 높이, 문 위치)
const STAMPS = {
  house_green: { r: 167, c: 0, w: 5, h: 4, door: [2, 3] },
  house_blue: { r: 171, c: 0, w: 5, h: 4, door: [2, 3] },
  house_small: { r: 281, c: 0, w: 5, h: 4, door: [2, 3] },
  lab: { r: 285, c: 0, w: 6, h: 4, door: [2, 3] },
  pc: { r: 326, c: 0, w: 5, h: 5, door: [2, 4] },
  mart: { r: 331, c: 0, w: 4, h: 4, door: [2, 3] },
  gym: { r: 343, c: 0, w: 7, h: 6, door: [3, 5] },
  league: { r: 350, c: 0, w: 7, h: 5, door: [3, 4] },
  tree: { r: 55, c: 0, w: 3, h: 3 },
  tree2: { r: 52, c: 4, w: 2, h: 3 },
  fountain: { r: 180, c: 5, w: 3, h: 2 },
};
function hash2(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

// 9-패치 지형 세트(길/포장도로): 시작 행 r
function terrainSetTile(r, n, s, w, e, nw, ne, sw, se) {
  if (n && s && w && e) {
    if (!se) return T(r, 4);
    if (!sw) return T(r, 5);
    if (!ne) return T(r + 1, 4);
    if (!nw) return T(r + 1, 5);
    return T(r + 1, 2);
  }
  if (!n && !s) { // 가로 1칸 줄
    if (!w && !e) return T(r + 3, 0);
    if (!w) return T(r + 3, 1);
    if (!e) return T(r + 3, 3);
    return T(r + 3, 2);
  }
  if (!w && !e) { // 세로 1칸 줄
    if (!n) return T(r, 0);
    if (!s) return T(r + 2, 0);
    return T(r + 1, 0);
  }
  const row = !n ? r : (!s ? r + 2 : r + 1);
  const col = !w ? 1 : (!e ? 3 : 2);
  return T(row, col);
}

function buildOutdoorMap(def) {
  const rows = def.rows;
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const m = new TileMap(w, h, def.tileset || 6);
  const ch = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? null : (rows[y][x] || '.');
  const isC = (c, set) => c !== null && set.includes(c);
  const edgeSame = (x, y, set) => { const c = ch(x, y); return c === null ? true : set.includes(c); };
  const GRASS = T(0, 1);
  const grassVar = (x, y) => { const r = hash2(x, y); return r < 0.86 ? GRASS : T(0, 2 + Math.floor((r - 0.86) / 0.035) % 4); };

  // 나무(2칸 폭) 짝 맞추기: 맵 좌표의 짝/홀이 아니라 가로로 이어진 T 덩어리 단위로 2칸씩 짝지음
  //  - 오른쪽 맵 끝에 붙은 덩어리는 오른쪽 끝부터 짝지음 → 테두리 숲 열이 위아래 줄과 항상 맞음
  //  - 그 외에는 왼쪽부터 짝지음 (왼쪽 테두리 숲도 위아래와 맞음)
  //  - 폭이 홀수라 1칸이 남으면 반쪽 나무 대신 1칸짜리 좁은 나무('n')를 안쪽 끝에 둠
  const treeCol = rows.map(() => new Array(w).fill(null)); // 0=왼쪽 반, 1=오른쪽 반, 'n'=좁은 나무
  const treePair = rows.map(() => new Array(w).fill(0));   // 몇 번째 나무인지 (중간 줄 무늬 교차용)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w;) {
      if (ch(x, y) !== 'T') { x++; continue; }
      let e = x;
      while (e + 1 < w && ch(e + 1, y) === 'T') e++;
      const len = e - x + 1, odd = len % 2 === 1;
      const fromRight = e === w - 1 && x !== 0;
      for (let i = 0; i < len; i++) {
        const cx = x + i;
        // 오른쪽부터 짝지을 때는 남는 칸이 맨 왼쪽(안쪽), 왼쪽부터면 맨 오른쪽(안쪽)
        if (odd && (fromRight ? i === 0 : i === len - 1)) { treeCol[y][cx] = 'n'; continue; }
        const k = fromRight ? (odd ? i - 1 : i) : i;
        treeCol[y][cx] = k % 2;
        // 중간 줄 무늬는 맵 기준 나무 번호로 (테두리 열끼리 무늬가 이어지게)
        treePair[y][cx] = Math.floor((cx - (k % 2)) / 2);
      }
      x = e + 1;
    }
  }
  // 세로로 이어진 T 칸 수 (좁은 나무 높이 고르기용)
  // 좁은 나무('n') 칸끼리만 세로로 이어 셈 (옆 큰 나무 칸까지 세면 높이가 틀어져 나무가 잘려 보임)
  const treeHeightAt = (x, y) => {
    let top = y, bot = y;
    while (top > 0 && treeCol[top - 1][x] === 'n') top--;
    while (bot < h - 1 && treeCol[bot + 1][x] === 'n') bot++;
    return { top, bot, len: bot - top + 1 };
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = ch(x, y);
    const N = (dx, dy, set) => edgeSame(x + dx, y + dy, set);
    switch (c) {
      case ',': m.set(x, y, 0, def.grassTile ? T(def.grassTile[0], def.grassTile[1]) : T(0, 6)); break; // 풀숲
      case 'y': case 'g': case 'w': {
        const r = c === 'y' ? 19 : c === 'g' ? 26 : 33;
        m.set(x, y, 0, terrainSetTile(r, N(0, -1, c), N(0, 1, c), N(-1, 0, c), N(1, 0, c), N(-1, -1, c), N(1, -1, c), N(-1, 1, c), N(1, 1, c)));
        break;
      }
      case '=': case '-': {
        const set = c === '=' ? '=' : '-'; const r = c === '=' ? 12 : 33;
        m.set(x, y, 0, terrainSetTile(r, N(0, -1, set), N(0, 1, set), N(-1, 0, set), N(1, 0, set), N(-1, -1, set), N(1, -1, set), N(-1, 1, set), N(1, 1, set)));
        break;
      }
      case '~': {
        m.set(x, y, 0, 48 + autotilePattern((dx, dy) => edgeSame(x + dx, y + dy, '~')));
        break;
      }
      case 'f': m.set(x, y, 0, GRASS); m.set(x, y, 1, 48 * 5); break; // 꽃(애니메이션)
      case 'T': {
        m.set(x, y, 0, GRASS);
        const up = isC(ch(x, y - 1), 'T') || ch(x, y - 1) === null;
        const down = isC(ch(x, y + 1), 'T') || ch(x, y + 1) === null;
        const col = treeCol[y][x];
        let tile;
        if (col === 'n') {
          // 1칸 폭 좁은 나무 (Outside 타일셋 실제 그림 위치)
          //  - 높이 1칸: 덤불(59행 3열)
          //  - 높이 2칸: 작은 나무 한 그루(62~63행 6열: 윗부분/밑동)
          //  - 높이 3칸 이상: 세로로 이어지는 나무 줄(60행 7열=꼭대기, 61·62행 7열=반복 몸통, 63행 7열=밑동)
          //  (예전에는 59행 7열(빈 칸)·58~60행 6열 몸통 반복을 써서 나무가 잘리거나 1.5그루처럼 보였음)
          const v = treeHeightAt(x, y);
          if (v.len === 1) tile = T(59, 3);
          else if (v.len === 2) tile = y === v.top ? T(62, 6) : T(63, 6);
          else if (y === v.top) tile = T(60, 7);
          else if (y === v.bot) tile = T(63, 7);
          else tile = T(61 + ((y - v.top - 1) % 2), 7);
          // 원래 나무 칸이었으므로 그림과 상관없이 막음
          m.solid.add(x + y * w);
        } else if (!down) tile = T(54, col);
        else if (!up) tile = T(52, 2 + col);
        else tile = T(52 + (((treePair[y][x] + y) % 2) + 2) % 2, col);
        m.set(x, y, 1, tile);
        break;
      }
      case 'b': m.set(x, y, 0, GRASS); m.set(x, y, 1, T(59, 3)); break; // 작은 덤불
      case 'R': m.set(x, y, 0, GRASS); m.set(x, y, 1, T(118, 1)); break; // 바위
      case 'p': m.set(x, y, 0, GRASS); m.set(x, y, 1, T(119, 4)); break; // 꽃덤불
      case 's': m.set(x, y, 0, def.signGround === '-' ? T(34, 2) : GRASS); m.set(x, y, 1, T(119, 1)); break; // 표지판
      default: m.set(x, y, 0, grassVar(x, y));
    }
    // 바닥 지형 위에 놓인 오브젝트는 바닥 지형을 깔아준다
    if (def.ground && def.ground !== '.' && 'TbRpsf'.includes(c)) {
      const base = def.ground, r = base === 'y' ? 19 : base === 'g' ? 26 : 33;
      m.set(x, y, 0, T(r + 1, 2));
    }
  }
  // 스탬프 배치
  for (const st of def.stamps || []) {
    const s = STAMPS[st[0]]; const ox = st[1], oy = st[2];
    for (let dy = 0; dy < s.h; dy++) for (let dx = 0; dx < s.w; dx++) {
      const id = T(s.r + dy, s.c + dx);
      const z = m.get(ox + dx, oy + dy, 1) ? 2 : 1;
      m.set(ox + dx, oy + dy, z, id);
    }
  }
  return m;
}

function buildInteriorMap(key) {
  const d = window.INTERIORS[key];
  const n = d.w * d.h;
  const layers = [0, 1, 2].map(z => d.data.slice(z * n, (z + 1) * n));
  return new TileMap(d.w, d.h, d.ts, layers);
}
