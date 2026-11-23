// ============================================================
// lighting.js - 필드 빛 연출: 시간대 색감, 햇살, 밤 불빛, 숲 안개, 떠다니는 빛 입자
//   * 에셋 폴더에 이미 있던 그림을 씀 (예전엔 쓰이지 않았음)
//       Graphics/Fogs/Sun.png              — 화면 크기(512×384) 햇살 번짐 → 낮 야외에 '스크린' 합성
//       Graphics/Fogs/Halycon Forest Fog.png — 큰 숲 안개 → 숲 맵에서 천천히 흐름
//       Graphics/Fogs/particle.png         — 작은 빛 → 낮엔 꽃가루, 밤엔 반딧불
//   * 시간대(실제 시각): 새벽 5~7시 분홍, 낮, 노을 16~18시 주황, 해질녘 18~19시 보라, 밤 19~5시 남색
//     해질녘·밤에는 어둠 막에 구멍을 뚫어 건물 문·주인공 주변만 밝게 (불빛)
//   * 설정 '낮/밤 연출'(Player.options.dayNight)을 끄면 색감·불빛은 끄고 햇살만 남김
//   * World.drawWeather 뒤에 그림 (캐릭터·위층 타일 위, 지역 이름·대화창 아래)
// ============================================================
'use strict';

const Lighting = {
  // 맵 종류별 분위기
  forestMaps: { FOREST: 1, RIFT_GALAR: 1, PORTAL_PAST: 1, MEADOW: 1 },
  noSunMaps: { RIFT_TIME: 1, RIFT_ORIGIN: 1, PORTAL_FUTURE: 1 },   // 어둡고 신비한 곳은 햇살 없음
  motes: [],          // 떠다니는 빛 입자
  dark: null,         // 어둠 막을 그릴 보조 캔버스

  // 지금 시각의 색감: { c: 색, a: 진하기, lights: 불빛 켤지 }
  phase() {
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    if (h >= 5 && h < 7) return { name: 'dawn', c: '255,150,170', a: 0.14 * (1 - Math.abs(h - 6)), lights: false };
    if (h >= 7 && h < 16) return { name: 'day', c: null, a: 0, lights: false };
    if (h >= 16 && h < 18) return { name: 'evening', c: '255,120,40', a: 0.14 + 0.1 * (h - 16) / 2, lights: false };
    if (h >= 18 && h < 19) return { name: 'dusk', c: '70,40,110', a: 0.22 + 0.18 * (h - 18), lights: true };
    return { name: 'night', c: '12,16,52', a: 0.46, lights: true };
  },

  draw(w, ctx, cx, cy) {
    const def = w.def; if (!def || !def.outdoor) return;
    const t = Game.tick, ph = this.phase(), dn = Player.options.dayNight !== false;
    const key = w.key;
    // 1) 숲 안개: 큰 안개 그림을 아주 천천히 흘림 (밤엔 조금 더 진하게)
    if (this.forestMaps[key]) {
      const fog = img('Graphics/Fogs/Halycon Forest Fog.png');
      if (fog) {
        // 'screen' 으로 겹쳐 회색 얼룩이 아니라 흰 안개처럼 보이게
        ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = ph.lights && dn ? 0.18 : 0.28;
        const ox = ((cx * 0.6 + t * 0.15) % fog.width + fog.width) % fog.width, oy = ((cy * 0.6 + t * 0.05) % fog.height + fog.height) % fog.height;
        for (let y = -oy; y < SCREEN_H; y += fog.height) for (let x = -ox; x < SCREEN_W; x += fog.width) ctx.drawImage(fog, x, y);
        ctx.restore();
      }
    }
    // 2) 시간대 색감 + 밤 불빛
    if (dn && ph.c) {
      if (ph.lights) this.drawDark(w, ctx, cx, cy, ph);
      else { ctx.fillStyle = 'rgba(' + ph.c + ',' + ph.a.toFixed(3) + ')'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
    }
    // 3) 햇살: 낮·새벽·노을 야외에 화면 크기 햇살 그림을 부드럽게 겹침 (숨 쉬듯 아주 조금 밝아졌다 어두워짐)
    const sunny = !ph.lights || !dn;
    if (sunny && !this.noSunMaps[key] && !/rain|snow|sand|ash|rift/.test(def.weather || '')) {
      const sun = img('Graphics/Fogs/Sun.png');
      if (sun) {
        // 왼쪽 위가 밝은 주황 그라데이션 그림. 'screen'(더하기)은 화면이 하얗게 바래서,
        //   색만 입히는 'soft-light' 로 대비를 지키고 + 왼쪽 위만 'screen' 으로 살짝 빛 번짐
        ctx.save(); ctx.globalCompositeOperation = 'soft-light';
        ctx.globalAlpha = ph.name === 'evening' ? 1 : 0.85;
        ctx.drawImage(sun, 0, 0, SCREEN_W, SCREEN_H);
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = (ph.name === 'evening' ? 0.32 : 0.22) + 0.04 * Math.sin(t / 90);
        ctx.drawImage(sun, 0, 0, SCREEN_W, SCREEN_H);
        ctx.restore();
      }
    }
    // 4) 떠다니는 빛 입자: 낮엔 꽃가루(풀숲·숲), 밤엔 반딧불
    this.drawMotes(ctx, cx, cy, ph.lights && dn, this.forestMaps[key] || w.map.hasGrass);
  },

  // 어둠 막: 남색으로 칠한 뒤 문·주인공 자리만 둥글게 지워서(불빛) 겹침
  drawDark(w, ctx, cx, cy, ph) {
    if (!this.dark) { this.dark = document.createElement('canvas'); this.dark.width = SCREEN_W; this.dark.height = SCREEN_H; }
    const d = this.dark.getContext('2d');
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, SCREEN_W, SCREEN_H);
    d.fillStyle = 'rgba(' + ph.c + ',' + ph.a.toFixed(3) + ')'; d.fillRect(0, 0, SCREEN_W, SCREEN_H);
    d.globalCompositeOperation = 'destination-out';
    const flicker = 1 + 0.04 * Math.sin(Game.tick / 7);
    const hole = (x, y, r) => {
      const g = d.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(0.5, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g; d.beginPath(); d.arc(x, y, r, 0, Math.PI * 2); d.fill();
    };
    const lights = [];
    for (const door of w.doors || []) lights.push([door.x * TILE + 16 - cx, door.y * TILE - cy, 70 * flicker, true]);
    const p = w.player;
    lights.push([p.x * TILE + p.px + 16 - cx, p.y * TILE + p.py + 8 - cy, 96, false]);   // 주인공 주변은 늘 조금 보이게
    for (const [x, y, r] of lights) if (x > -r && y > -r && x < SCREEN_W + r && y < SCREEN_H + r) hole(x, y, r);
    ctx.drawImage(this.dark, 0, 0);
    // 문 앞 불빛은 따뜻한 주황으로 살짝 더해 줌
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r, warm] of lights) {
      if (!warm || x < -r || y < -r || x > SCREEN_W + r || y > SCREEN_H + r) continue;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 0.8);
      g.addColorStop(0, 'rgba(255,170,80,0.22)'); g.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },

  drawMotes(ctx, cx, cy, night, lush) {
    const want = night ? 18 : (lush ? 10 : 0);
    while (this.motes.length < want) this.motes.push({ x: Math.random() * SCREEN_W, y: Math.random() * SCREEN_H, vx: (Math.random() - 0.5) * 0.3, vy: -0.1 - Math.random() * 0.25, ph: Math.random() * 6.28 });
    if (this.motes.length > want) this.motes.length = want;
    if (!want) return;
    const pim = img('Graphics/Fogs/particle.png');
    // 카메라가 움직이면 입자도 반대로 밀려 세상에 붙어 있는 것처럼 보이게
    const dx = this._lcx === undefined ? 0 : cx - this._lcx, dy = this._lcy === undefined ? 0 : cy - this._lcy;
    this._lcx = cx; this._lcy = cy;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const m of this.motes) {
      m.ph += 0.05; m.x += m.vx + Math.sin(m.ph) * 0.25 - dx; m.y += m.vy - dy;
      if (m.x < -10) m.x += SCREEN_W + 20; if (m.x > SCREEN_W + 10) m.x -= SCREEN_W + 20;
      if (m.y < -10) m.y += SCREEN_H + 20; if (m.y > SCREEN_H + 10) m.y -= SCREEN_H + 20;
      const a = night ? 0.45 + 0.45 * Math.sin(m.ph * 1.7) : 0.35;   // 반딧불은 깜빡임
      ctx.globalAlpha = Math.max(0, a);
      if (pim) {
        const s = night ? 10 : 7;
        ctx.filter = night ? 'hue-rotate(40deg)' : 'none';
        ctx.drawImage(pim, m.x - s / 2, m.y - s / 2, s, s);
      } else { ctx.fillStyle = night ? '#e8ff90' : '#fff6c8'; ctx.fillRect(m.x, m.y, 2, 2); }
    }
    ctx.filter = 'none';
    ctx.restore();
  },
};

// 맵에 풀숲(지형 2)이 있는지 한 번만 계산해 둠 (꽃가루 입자 여부)
const _lightLoad = World.prototype.load;
World.prototype.load = function (...a) {
  const r = _lightLoad.apply(this, a);
  try {
    const m = this.map; let grass = false;
    if (m && m.terrain && this.def && this.def.rows) {
      const H = this.def.rows.length, W = this.def.rows[0].length;
      for (let y = 0; y < H && !grass; y += 2) for (let x = 0; x < W; x += 2) if (m.terrain(x, y) === 2) { grass = true; break; }
    }
    if (m) m.hasGrass = grass;
  } catch (e) { }
  Lighting.motes.length = 0; Lighting._lcx = undefined;
  return r;
};
const _lightDrawWeather = World.prototype.drawWeather;
World.prototype.drawWeather = function (ctx, cx, cy) {
  _lightDrawWeather.call(this, ctx, cx, cy);
  Lighting.draw(this, ctx, cx, cy);
};
// 필요한 그림 미리 받기 (첫 프레임에 빈 화면이 안 되게)
if (typeof preload === 'function') preload(['Graphics/Fogs/Sun.png', 'Graphics/Fogs/particle.png', 'Graphics/Fogs/Halycon Forest Fog.png']).catch(() => { });
