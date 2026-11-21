// ============================================================
// legendfix.js - 필드에 서 있는 전설·환상 포켓몬 / 레이드 둥지 위치 바로잡기
//   문제: 전설 위치를 "길가 지점 목록"에서 순서대로 뽑기만 해서
//     * 스프라이트(64~160px)가 커서 건물·나무·다른 전설과 그림이 겹치고
//     * 지점이 모자라면 (4+i, 4) 같은 임시 좌표 → 나무/건물 위에 서 있었음
//   해결: 맵을 불러온 뒤, 실제 스프라이트 크기만큼의 영역이
//     - 걸을 수 있는 칸이고 (건물 벽·나무·물 아님)
//     - 지붕/나무 윗부분(우선순위 타일)이 없고
//     - 다른 캐릭터·전설·문·표지판과 겹치지 않는
//     가장 가까운 칸으로 옮긴다. 한 번 정한 자리는 맵 정의에 저장해 다음에도 같은 곳.
//   places.js(마을 장식) 다음, story.js 데이터가 준비된 뒤 불러와야 함
// ============================================================
'use strict';

const FieldSpots = {
  // 옮길 대상: 전설(lg_) / 레이드 둥지(den_)
  movable(c) { return !!(c && c.id && /^(lg_|den_)/.test(c.id)); },

  // 캐릭터 그림이 차지하는 화면 영역(픽셀, 맵 기준) — Char.draw와 같은 계산
  rect(c, x, y) {
    const im = c.sprite ? img(c.spritePath) : null;
    const fw = im ? im.width / 4 : 32, fh = im ? im.height / 4 : 48;
    const left = x * TILE + 16 - fw / 2;
    const top = y * TILE + 32 - fh + (c.follower ? 8 : 0);
    // 스프라이트 안쪽 여백(투명)이 꽤 있으므로 실제 몸통 크기로 조금 줄여서 판단
    const padX = fw * 0.18, padTop = fh * 0.22;
    return { l: left + padX, r: left + fw - padX, t: top + padTop, b: y * TILE + 32 };
  },

  // 그림이 덮는 타일 목록
  tilesOf(r) {
    const out = [];
    for (let ty = Math.floor(r.t / TILE); ty <= Math.floor((r.b - 1) / TILE); ty++)
      for (let tx = Math.floor(r.l / TILE); tx <= Math.floor((r.r - 1) / TILE); tx++) out.push([tx, ty]);
    return out;
  },

  // 이 칸에 우선순위(위에 그려지는) 타일이 있는지 = 지붕/나무 윗부분
  hasPrio(m, x, y) {
    for (let z = 0; z < 3; z++) { const id = m.get(x, y, z); if (id && m.ts.prio[id]) return true; }
    return false;
  },
  // 사방에서 들어갈 수 있는 평평한 칸
  open(m, x, y) {
    return ['down', 'up', 'left', 'right'].every(d => m.passable(x, y, d)) && !this.hasPrio(m, x, y);
  },

  // 플레이어 위치에서 걸어서 갈 수 있는 칸 (BFS)
  reach(w) {
    const m = w.map, seen = new Uint8Array(m.w * m.h);
    const q = [[w.player.x, w.player.y]];
    if (w.player.x < 0 || w.player.y < 0 || w.player.x >= m.w || w.player.y >= m.h) return seen;
    seen[w.player.x + w.player.y * m.w] = 1;
    const D = [[0, 1, 'down'], [0, -1, 'up'], [-1, 0, 'left'], [1, 0, 'right']];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy, d] of D) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || seen[nx + ny * m.w]) continue;
        if (!m.passable(nx, ny, d)) continue;
        seen[nx + ny * m.w] = 1; q.push([nx, ny]);
      }
    }
    return seen;
  },

  // 두 사각형이 겹치는지 (여유 margin 픽셀)
  overlap(a, b, margin) {
    return a.l < b.r + margin && b.l < a.r + margin && a.t < b.b + margin && b.t < a.b + margin;
  },

  // 자리 판정: 그림 영역 전체가 열린 칸이고, 다른 것들과 겹치지 않음
  ok(w, c, x, y, placed, reach) {
    const m = w.map;
    if (x < 2 || y < 2 || x >= m.w - 2 || y >= m.h - 2) return false;     // 맵 가장자리(출구 줄) 제외
    if (!reach[x + y * m.w] || !this.open(m, x, y)) return false;
    if (w.doors.some(d => Math.abs(d.x - x) <= 1 && Math.abs(d.y - y) <= 2)) return false;
    if (w.def.signs && w.def.signs.some(s => Math.abs(s.x - x) <= 1 && Math.abs(s.y - y) <= 1)) return false;
    if (w.def.triggers && w.def.triggers.some(t => x >= t.x - 1 && x < t.x + t.w + 1 && y >= t.y - 1 && y < t.y + t.h + 1)) return false;
    const r = this.rect(c, x, y);
    // 그림이 덮는 칸에 벽·나무·지붕이 없어야 함 (자기 발밑 칸 위쪽 포함)
    for (const [tx, ty] of this.tilesOf(r)) {
      if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return false;
      if (!this.open(m, tx, ty)) return false;
    }
    // 길을 막지 않게: 상하좌우 중 3칸 이상은 열려 있어야 함 (좁은 통로 금지)
    let free = 0;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (this.open(m, x + dx, y + dy) && reach[(x + dx) + (y + dy) * m.w]) free++;
    if (free < 3) return false;
    // 다른 캐릭터와 겹치지 않게
    for (const o of placed) {
      if (Math.abs(o.x - x) <= 1 && Math.abs(o.y - y) <= 1) return false;
      if (this.overlap(r, o.r, o.big ? 10 : 2)) return false;
    }
    return true;
  },

  // 맵을 불러온 뒤 실행 (이미지 크기를 알아야 해서 비동기)
  async fix(w) {
    const list = w.chars.filter(c => this.movable(c) && c.sprite);
    if (!list.length) return;
    const key = w.def === MAPS[w.key] ? w.key : null;
    // 그림 크기 확인 전에는 잠깐 숨김 (엉뚱한 자리에서 깜빡이는 것 방지)
    list.forEach(c => { c._fsHide = true; c.visible = false; });
    await preload(list.map(c => c.spritePath).filter(Boolean));
    if (Game.world !== w || w.chars.indexOf(list[0]) < 0) { list.forEach(c => { c.visible = true; }); return; }
    const reach = this.reach(w);
    // 이미 서 있는 다른 캐릭터(NPC·트레이너·아이템·표지판 등)는 장애물
    const placed = w.chars.filter(c => !list.includes(c) && c.visible !== false && !c.gone)
      .map(c => ({ x: c.x, y: c.y, r: this.rect(c, c.x, c.y), big: false }));
    placed.push({ x: w.player.x, y: w.player.y, r: this.rect(w.player, w.player.x, w.player.y), big: false });
    // 큰 그림부터 자리를 잡아야 남는 공간에 작은 것이 들어감 (순서가 일정해야 매번 같은 결과)
    const area = c => { const im = img(c.spritePath); return im ? im.width * im.height : 0; };
    const order = list.slice().sort((a, b) => area(b) - area(a) || (a.id < b.id ? -1 : 1));
    for (const c of order) {
      const spec = (w.def.specials || []).find(s => s.id === c.id);
      const L = c.id.startsWith('lg_') && typeof LEGEND_BY_ID !== 'undefined' ? LEGEND_BY_ID[c.arg] : null;
      const wander = L && L.wander;
      let best = null;
      if (this.ok(w, c, c.x, c.y, placed, reach)) best = [c.x, c.y];
      else {
        // 원래 자리에서 가까운 순으로 나선형 탐색
        const R = Math.max(w.map.w, w.map.h);
        for (let r = 1; r < R && !best; r++) {
          for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r && !best; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            if (this.ok(w, c, c.x + dx, c.y + dy, placed, reach)) best = [c.x + dx, c.y + dy];
          }
        }
      }
      if (best) {
        c.x = best[0]; c.y = best[1];
        // 다음에 이 맵을 불러올 때도 같은 자리 (배회형은 매번 무작위라 저장 안 함)
        if (spec && !wander && key) { spec.x = c.x; spec.y = c.y; if (L) { L.x = c.x; L.y = c.y; } }
      }
      placed.push({ x: c.x, y: c.y, r: this.rect(c, c.x, c.y), big: true });
    }
    list.forEach(c => { if (c._fsHide) { c.visible = true; c._fsHide = false; } });
  }
};
window.FieldSpots = FieldSpots;

// 맵을 불러올 때마다 확인 (이벤트 다시 만들기(refreshEvents) 때도 새로 생긴 전설 확인)
{
  const W = World.prototype;
  const _load = W.load;
  W.load = function (...args) {
    const r = _load.apply(this, args);
    FieldSpots.fix(this).catch(e => console.warn('[FieldSpots]', e));
    return r;
  };
}

// ── 맵에 서 있는 전설이 사라지는 조건 ──
//   예전: 도감에 그 종이 "잡음"이면 사라짐 → 관리자 "도감 전부 포획 처리"를 쓰거나,
//         환상의 풀숲 등 다른 곳에서 같은 종을 잡으면 균열 지대 전설이 싸워 보지도 못하고 사라졌음
//   지금: 그 자리의 전설과 싸워서 직접 잡았을 때만 사라짐 (잡으면 legend_종ID 플래그가 남음)
Object.keys(MAPS).forEach(k => (MAPS[k].specials || []).forEach(s => {
  if (!s.id || !s.id.startsWith('lg_')) return;
  const L = typeof LEGEND_BY_ID !== 'undefined' && LEGEND_BY_ID[s.arg];
  s.cond = () => !Flags.has('legend_' + s.arg) && !(L && L.hideIf && L.hideIf());
}));
