// ============================================================
// touch.js - 모바일: 가상 컨트롤러(방향패드 + 버튼), 위치 드래그 이동, 확대/축소 방지
// ============================================================
'use strict';
const Touch = {
  isMobile: matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window,
  edit: false,
  press(k) { if (!Input.held[k]) { Input.pending[k] = true; Input.repeatT[k] = 0; } Input.held[k] = true; Audio2.unlock(); },
  release(k) { Input.held[k] = false; },
  posKey: 'astera_touchpos',
  loadPos() { try { return JSON.parse(localStorage.getItem(this.posKey) || '{}'); } catch (e) { return {}; } },
  savePos() {
    const p = {};
    for (const id of ['tc-pad', 'tc-btns', 'tc-sys']) { const e = document.getElementById(id); p[id] = { l: e.style.left, t: e.style.top }; }
    localStorage.setItem(this.posKey, JSON.stringify(p));
  },
  init() {
    // 확대/축소 방지
    const vp = document.querySelector('meta[name=viewport]');
    if (vp) vp.content = 'width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover';
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => document.addEventListener(ev, e => e.preventDefault(), { passive: false }));
    document.addEventListener('touchmove', e => { if (e.touches.length > 1 || (e.scale && e.scale !== 1)) e.preventDefault(); }, { passive: false });
    let lastTap = 0;
    document.addEventListener('touchend', e => { const now = Date.now(); if (now - lastTap < 320 && !e.target.closest('input,select,textarea,#side,#admin')) e.preventDefault(); lastTap = now; }, { passive: false });
    document.addEventListener('dblclick', e => e.preventDefault());
    document.body.classList.toggle('mobile', this.isMobile);
    if (!this.isMobile) return;
    this.build();
  },
  build() {
    const wrap = document.createElement('div'); wrap.id = 'touch';
    wrap.innerHTML =
      '<div id="tc-pad" class="tc-group"><div class="tc-handle">⠿</div><div class="pad"><div class="knob"></div></div></div>' +
      '<div id="tc-btns" class="tc-group"><div class="tc-handle">⠿</div><div class="btns"><button data-k="B" class="b">B</button><button data-k="A" class="a">A</button><button data-k="run" class="r tog">달리기</button></div></div>' +
      '<div id="tc-sys" class="tc-group"><div class="tc-handle">⠿</div><div class="sys"><button data-k="menu">메뉴</button><button data-k="L">L</button><button data-k="R">R</button><button id="tc-speed">배속</button><button id="tc-edit">배치</button><button id="tc-panel">설정</button></div></div>';
    document.body.appendChild(wrap);
    // 기본 위치
    const W = innerWidth, H = innerHeight, saved = this.loadPos();
    const cb = Game.canvas ? Game.canvas.getBoundingClientRect().bottom : 320;
    const def = { 'tc-pad': { l: '16px', t: (H - 200) + 'px' }, 'tc-btns': { l: (W - 190) + 'px', t: (H - 190) + 'px' }, 'tc-sys': { l: Math.max(8, W / 2 - 160) + 'px', t: Math.min(H - 260, cb + 6) + 'px' } };
    for (const id in def) { const e = document.getElementById(id), p = saved[id] || def[id]; e.style.left = p.l; e.style.top = p.t; this.clampEl(e); }
    this.bindPad(); this.bindButtons(); this.bindDrag();
  },
  clampEl(e) {
    const r = e.getBoundingClientRect();
    e.style.left = clamp(parseFloat(e.style.left) || 0, 0, Math.max(0, innerWidth - r.width)) + 'px';
    e.style.top = clamp(parseFloat(e.style.top) || 0, 0, Math.max(0, innerHeight - r.height)) + 'px';
  },
  bindPad() {
    const pad = document.querySelector('#tc-pad .pad'), knob = pad.querySelector('.knob');
    let id = null, cur = null;
    const setDir = d => { if (d === cur) return; if (cur) this.release(cur); cur = d; if (d) { this.press(d); if (navigator.vibrate) navigator.vibrate(8); } };
    const move = (x, y) => {
      const r = pad.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = x - cx, dy = y - cy; const dist = Math.hypot(dx, dy), max = r.width / 2 - 20;
      if (dist > max) { dx = dx / dist * max; dy = dy / dist * max; }
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      if (dist < 14) { setDir(null); return; }
      setDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    };
    const end = () => { id = null; setDir(null); knob.style.transform = ''; };
    pad.addEventListener('pointerdown', e => { if (this.edit) return; id = e.pointerId; pad.setPointerCapture(id); move(e.clientX, e.clientY); e.preventDefault(); });
    pad.addEventListener('pointermove', e => { if (e.pointerId === id) move(e.clientX, e.clientY); });
    pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
  },
  bindButtons() {
    document.querySelectorAll('#touch [data-k]').forEach(b => {
      const k = b.dataset.k;
      if (b.classList.contains('tog')) { // 달리기 토글
        b.addEventListener('pointerdown', e => { if (this.edit) return; e.preventDefault(); const on = !Input.held.run; Input.held.run = on; b.classList.toggle('on', on); });
        return;
      }
      b.addEventListener('pointerdown', e => { if (this.edit) return; e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add('on'); this.press(k); if (navigator.vibrate) navigator.vibrate(10); });
      const up = () => { b.classList.remove('on'); this.release(k); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    });
    document.getElementById('tc-speed').addEventListener('click', () => { const l = [1, 2, 4, 8]; setSpeed(l[(l.indexOf(Game.speed) + 1) % l.length]); toast('게임 속도 ' + Game.speed + '배'); });
    document.getElementById('tc-panel').addEventListener('click', () => document.body.classList.toggle('show-side'));
    document.getElementById('tc-edit').addEventListener('click', () => {
      this.edit = !this.edit; document.body.classList.toggle('tc-editing', this.edit);
      toast(this.edit ? '컨트롤러를 끌어서 위치를 옮기세요. 다시 "배치"를 누르면 저장됩니다.' : '컨트롤러 위치를 저장했습니다');
      if (!this.edit) this.savePos();
    });
  },
  bindDrag() {
    document.querySelectorAll('#touch .tc-group').forEach(g => {
      let sx, sy, ox, oy, pid = null;
      const start = e => {
        if (!this.edit && !e.target.classList.contains('tc-handle')) return;
        if (e.target.closest('button') && !this.edit) return;
        pid = e.pointerId; g.setPointerCapture(pid); sx = e.clientX; sy = e.clientY; ox = parseFloat(g.style.left); oy = parseFloat(g.style.top); e.preventDefault(); e.stopPropagation();
      };
      g.addEventListener('pointerdown', start, true);
      g.addEventListener('pointermove', e => { if (e.pointerId !== pid) return; g.style.left = (ox + e.clientX - sx) + 'px'; g.style.top = (oy + e.clientY - sy) + 'px'; this.clampEl(g); });
      const end = e => { if (e.pointerId !== pid) return; pid = null; this.savePos(); };
      g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
    });
    addEventListener('resize', () => document.querySelectorAll('#touch .tc-group').forEach(g => this.clampEl(g)));
  },
};
window.addEventListener('load', () => Touch.init());
