// ============================================================
// shiny.js - 이로치(색이 다른 포켓몬) 연출
//   1) 전투에 이로치가 나오면 반짝임 효과음 + 별빛 폭발, 이후에도 은은하게 반짝임
//   2) 이름 옆에 ★ 표시 (전투 상자 / 파티 / 요약 / 박스)
//   3) 필드의 동료 포켓몬이 이로치면 가끔 반짝임
//   4) 이로치 그림이 없는 포켓몬은 색조를 바꿔서라도 "색이 다르게" 보이게
//   ui.js, battle.js, main.js 다음에 불러옴
// ============================================================
'use strict';

const Shiny = {
  // 4갈래 별 하나 그리기 (크기 r, 투명도 a)
  star(ctx, x, y, r, a, color) {
    if (a <= 0 || r <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, a);
    ctx.fillStyle = color || '#fff8c0';
    ctx.shadowColor = '#ffe060'; ctx.shadowBlur = r * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
    ctx.restore();
  },
  // 등장 순간: 중심에서 바깥으로 퍼지는 별빛 (t = 0~1)
  burst(ctx, cx, cy, rad, t) {
    const n = 10;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + t * 1.2;
      const d = rad * (0.25 + t * 0.9);
      const s = (1 - t) * (i % 2 ? 9 : 14);
      this.star(ctx, cx + Math.cos(ang) * d, cy + Math.sin(ang) * d * 0.8, s, 1 - t * 0.6, i % 3 ? '#fff8c0' : '#c8f0ff');
    }
    // 가운데 번쩍
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.55 - t);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(255,255,200,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },
  // 평소: 몇 개의 별이 차례로 반짝 (위치는 시간에 따라 바뀜, 같은 tick이면 같은 결과)
  twinkle(ctx, cx, cy, w, h, tick, count = 3) {
    for (let i = 0; i < count; i++) {
      const period = 70 + i * 23, ph = (tick + i * 37) % period;
      if (ph > 24) continue;
      const k = Math.floor((tick + i * 37) / period) * 7 + i * 13;
      const rx = (Math.sin(k * 12.9898) * 43758.5453) % 1, ry = (Math.sin(k * 78.233) * 12345.678) % 1;
      const x = cx + Math.abs(rx) * w - w / 2, y = cy + Math.abs(ry) * h - h / 2;
      const a = Math.sin((ph / 24) * Math.PI);
      this.star(ctx, x, y, 3 + a * 6, a);
    }
  },
  // 이름 뒤 ★
  mark(ctx, x, y, size = 18) {
    text(ctx, '★', x, y, { size, color: '#f8c020', shadow: '#a04000' });
    return textW(ctx, '★', size);
  },
  sound() { try { Audio2.se('Anim/PRSFX- Shiny', 0.8); } catch (e) { } }
};
window.Shiny = Shiny;

// ── 이로치 그림이 없으면 색조를 돌려서라도 다르게 ──
{
  const hasShinyArt = (kind, species) => {
    const p = monSpritePath(kind, species, true);
    return !!p && p.indexOf(' shiny/') >= 0;
  };
  const _sprite = drawMonSprite;
  // eslint-disable-next-line no-global-assign
  drawMonSprite = function (ctx, kind, species, shiny, cx, by, scale, tick, opts = {}) {
    if (shiny && !opts.flash && !hasShinyArt(kind, species)) {
      ctx.save(); ctx.filter = 'hue-rotate(160deg) saturate(1.3)';
      _sprite(ctx, kind, species, false, cx, by, scale, tick, { ...opts, glow: undefined });
      ctx.restore(); return;
    }
    return _sprite(ctx, kind, species, shiny, cx, by, scale, tick, opts);
  };
  const _icon = drawMonIcon;
  // eslint-disable-next-line no-global-assign
  drawMonIcon = function (ctx, species, shiny, x, y, tick, still) {
    if (shiny && !hasShinyArt('Icons', species)) {
      ctx.save(); ctx.filter = 'hue-rotate(160deg) saturate(1.3)';
      _icon(ctx, species, false, x, y, tick, still);
      ctx.restore();
    } else _icon(ctx, species, shiny, x, y, tick, still);
    // 작은 ★ (아이콘 오른쪽 위)
    if (shiny) text(ctx, '★', x + 50, y + 2, { size: 14, color: '#f8c020', shadow: '#a04000' });
  };
}

// ── 전투 ──
{
  const B = Battle.prototype;

  // 이름 줄: 이름(+성별) 뒤에 ★
  const _row = B.drawNameRow;
  B.drawNameRow = function (ctx, m, left, right, y) {
    if (!m.shiny) return _row.call(this, ctx, m, left, right, y);
    // ★ 자리(18px)만큼 오른쪽 끝을 당겨서 원래 함수로 그리게 하고, 레벨은 원래 자리에 다시
    const lv = 'Lv' + m.level, lvW = textW(ctx, lv, 19);
    const genderW = m.gender !== 'N' ? 20 : 0;
    const nameMax = Math.max(36, right - lvW - 10 - genderW - 18 - left);
    text(ctx, lv, right - 2, y + 1, { size: 19, align: 'right', color: '#404040', shadow: '#d8d8d0' });
    const nw = textFit(ctx, m.name, left, y, nameMax, { size: 22, color: '#404040', shadow: '#d8d8d0' });
    let x = left + nw + 3;
    if (m.gender !== 'N') { text(ctx, m.gender === 'M' ? '♂' : '♀', x, y, { size: 20, color: m.gender === 'M' ? '#3070f0' : '#f05050', shadow: null }); x += 18; }
    Shiny.mark(ctx, x, y + 2, 17);
  };

  // 스프라이트 위 반짝임: 각 편에서 처음 보이는 이로치면 폭발 + 효과음
  const _draw = B.draw;
  B.draw = function (ctx) {
    _draw.call(this, ctx);
    this._shiny = this._shiny || { f: { mon: null, t: 0 }, p: { mon: null, t: 0 } };
    const sides = [['f', this.f, this.sprites && this.sprites.f, 384, 182, 150], ['p', this.p, this.sprites && this.sprites.p, 128, 312, 190]];
    for (const [k, bt, sp, x0, y0, h] of sides) {
      const st = this._shiny[k];
      if (!bt || !sp || !sp.visible || (sp.alpha !== undefined && sp.alpha < 0.5)) continue;
      const m = bt.mon;
      if (st.mon !== m) { st.mon = m; st.t = m.shiny ? 1 : 0; if (m.shiny) Shiny.sound(); }
      if (!m.shiny) continue;
      const cx = x0 + (sp.x || 0), cy = y0 + (sp.y || 0) - h / 2;
      if (st.t > 0) { Shiny.burst(ctx, cx, cy, h * 0.75, 1 - st.t); st.t -= 1 / 45; }
      Shiny.twinkle(ctx, cx, cy, h * 0.9, h * 0.9, this.tick || Game.tick, 3);
    }
  };
}

// ── 파티 화면 / 요약 화면 이름 뒤 ★ ──
{
  const P = PartyScreen && PartyScreen.prototype;
  if (P && P.draw) {
    const _d = P.draw;
    P.draw = function (ctx) {
      _d.call(this, ctx);
      (this.party || []).forEach((m, k) => {
        if (!m || !m.shiny) return;
        const x = (k % 2) * 256, y = 16 * (k % 2) + 96 * Math.floor(k / 2);
        // 이름 바로 뒤 (이름은 최대 120px로 줄여 그려짐)
        const nw = Math.min(120, textW(ctx, m.name, 22));
        Shiny.mark(ctx, x + 96 + nw + 3, y + 20, 16);
      });
    };
  }
  const S = SummaryScreen.prototype;
  const _sd = S.draw;
  S.draw = function (ctx) {
    _sd.call(this, ctx);
    const m = this.mon;
    if (m && m.shiny) {
      const nw = textW(ctx, m.name, 22);
      Shiny.mark(ctx, 46 + nw + 4, 64, 18);
    }
  };
}

// ── 필드: 이로치 동료 포켓몬이 가끔 반짝 ──
{
  const _cd = Char.prototype.draw;
  Char.prototype.draw = function (ctx, camX, camY) {
    _cd.call(this, ctx, camX, camY);
    if (!this.follower || !this.mon || !this.mon.shiny || !this.visible) return;
    const cx = this.x * TILE + this.px - camX + 16, cy = this.y * TILE + this.py - camY;
    Shiny.twinkle(ctx, cx, cy, 40, 40, Game.tick, 2);
  };
}
