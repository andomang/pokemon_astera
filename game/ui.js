// ============================================================
// ui.js - 대화창, 선택지, 메뉴, 파티/요약/가방/상점/PC/도감/카드/설정
// ============================================================
'use strict';

class Win {
  update() { }
  draw(ctx) { }
  close(v) { Game.closeWin(this, v); }
}
const SKIN = () => 'Graphics/Windowskins/speech hgss ' + (Player.options.skin || 1) + '.png';
const CHOICE_SKIN = 'Graphics/Windowskins/choice dp.png';
// 스킨 중앙 밝기로 글자색 결정
const SKIN_TONE = {};
function skinIsDark(path) {
  if (SKIN_TONE[path] !== undefined) return SKIN_TONE[path];
  const im = img(path); if (!im) return false;
  try {
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(im.width === 96 ? 37 : Math.floor(im.width / 2), Math.floor(im.height / 2), 1, 1).data;
    SKIN_TONE[path] = (d[0] * 0.3 + d[1] * 0.59 + d[2] * 0.11) < 128;
  } catch (e) { SKIN_TONE[path] = /speech hgss 1\.png$/.test(path); } // file:// 에서는 픽셀을 읽을 수 없으므로 미리 계산한 값 사용
  return SKIN_TONE[path];
}

// 대화창: speech 스킨(96x48) = 바깥 프레임 + 안쪽 텍스트 박스(20..54, 12..36)
function slice9(ctx, im, sx, sy, sw, sh, c, x, y, w, h) {
  const xs = [sx, sx + c, sx + sw - c], ws = [c, sw - 2 * c, c];
  const ys = [sy, sy + c, sy + sh - c], hs = [c, sh - 2 * c, c];
  const xd = [x, x + c, x + w - c], wd = [c, w - 2 * c, c];
  const yd = [y, y + c, y + h - c], hd = [c, h - 2 * c, c];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) if (wd[i] > 0 && hd[j] > 0) ctx.drawImage(im, xs[i], ys[j], ws[i], hs[j], xd[i], yd[j], wd[i], hd[j]);
}
function drawSpeechWindow(ctx, x, y, w, h) {
  const im = img(SKIN());
  if (!im) { drawWindow(ctx, x, y, w, h); return '#484848'; }
  const dark = skinIsDark(SKIN());
  if (im.width === 96 && im.height === 48) {
    // 바깥 프레임 (안쪽 사각형이 없는 오른쪽 부분을 이용)
    const pieces = [[0, 0, 16, 16], [60, 0, 16, 16], [80, 0, 16, 16], [0, 16, 16, 16], [60, 16, 16, 16], [80, 16, 16, 16], [0, 32, 16, 16], [60, 32, 16, 16], [80, 32, 16, 16]];
    const xd = [x, x + 16, x + w - 16], wd = [16, w - 32, 16], yd = [y, y + 16, y + h - 16], hd = [16, h - 32, 16];
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const p = pieces[j * 3 + i]; ctx.drawImage(im, p[0], p[1], p[2], p[3], xd[i], yd[j], wd[i], hd[j]); }
    // 안쪽 텍스트 박스
    slice9(ctx, im, 20, 12, 34, 24, 6, x + 18, y + 12, w - 36, h - 26);
  } else {
    const c = Math.floor(Math.min(im.width, im.height) / 3);
    slice9(ctx, im, 0, 0, im.width, im.height, c, x, y, w, h);
  }
  return dark ? '#f8f8f8' : '#505058';
}

// ---------------- 대화창 ----------------
class MessageBox extends Win {
  constructor(s, opts = {}) {
    super();
    this.opts = opts;
    this.speaker = opts.speaker || null;
    this.raw = String(s);
    this.lines = null; this.page = 0; this.shown = 0; this.wait = 0;
    this.typedResolve = null;
    this.typed = new Promise(r => this.typedResolve = r);
  }
  layout(ctx) { if (!this.lines) this.lines = wrapText(ctx, this.raw, 448, 24); }
  pageText() { return this.lines.slice(this.page * 2, this.page * 2 + 2).join('\n'); }
  update() {
    const ctx = Game.ctx; this.layout(ctx);
    const pt = this.pageText();
    const speed = [1, 2, 4][Player.options.textSpeed ?? 1];
    if (this.shown < pt.length) {
      this.shown = Math.min(pt.length, this.shown + speed);
      if (Input.trig('A') || Input.trig('B')) this.shown = pt.length;
      return;
    }
    const last = (this.page + 1) * 2 >= this.lines.length;
    if (last && this.opts.stay) { if (this.typedResolve) { this.typedResolve(); this.typedResolve = null; } return; }
    if (last && this.opts.auto) { if (++this.wait > this.opts.auto) this.close(); return; }
    if (Input.trig('A') || Input.trig('B')) {
      if (last) { this.close(); return; }
      this.page++; this.shown = 0;
    }
  }
  draw(ctx) {
    this.layout(ctx);
    const y = 384 - 104;
    const col = drawSpeechWindow(ctx, 8, y, 496, 96);
    const shadowC = col === '#f8f8f8' ? '#303030' : '#d0d0c8';
    if (this.speaker) {
      drawWindow(ctx, 8, y - 40, Math.max(96, textW(ctx, this.speaker, 22) + 36), 42, CHOICE_SKIN);
      text(ctx, this.speaker, 26, y - 31, { size: 22 });
    }
    const pt = this.pageText().slice(0, this.shown).split('\n');
    pt.forEach((l, i) => text(ctx, l, 30, y + 18 + i * 34, { size: 24, color: col, shadow: shadowC }));
    const last = (this.page + 1) * 2 >= this.lines.length;
    if (this.shown >= this.pageText().length && !this.opts.stay && Math.floor(Game.tick / 16) % 2) {
      drawImg(ctx, 'Graphics/UI/pause_arrow.png', 0, 0, 16, 16, 474, y + 66, 16, 16) ||
        (ctx.fillStyle = col, ctx.beginPath(), ctx.moveTo(474, y + 68), ctx.lineTo(490, y + 68), ctx.lineTo(482, y + 78), ctx.fill());
    }
  }
}
function say(s, opts) {
  const pages = [].concat(s);
  let p = Promise.resolve();
  for (const t of pages) p = p.then(() => Game.open(new MessageBox(t, opts)));
  return p;
}
// 질문 + 선택지
async function ask(q, options = ['예', '아니오'], opt = {}) {
  const mb = new MessageBox(q, { stay: true, speaker: opt.speaker });
  Game.ui.push(mb);
  await mb.typed;
  const r = await Game.open(new ChoiceBox(options, { cancel: opt.cancel ?? options.length - 1, x: opt.x, y: opt.y }));
  Game.ui.splice(Game.ui.indexOf(mb), 1);
  return r;
}
async function yesNo(q, opt) { return (await ask(q, ['예', '아니오'], opt)) === 0; }

// ---------------- 선택지 ----------------
class ChoiceBox extends Win {
  constructor(options, opt = {}) {
    super();
    this.options = options; this.opt = opt; this.i = opt.start || 0;
    this.w = opt.w || 0;
  }
  update() {
    const n = this.options.length;
    if (Input.rep('up')) { this.i = (this.i + n - 1) % n; SE.cursor(); }
    if (Input.rep('down')) { this.i = (this.i + 1) % n; SE.cursor(); }
    if (Input.trig('A')) { SE.ok(); this.close(this.i); }
    else if (Input.trig('B') && this.opt.cancel !== undefined && this.opt.cancel !== null) { SE.cancel(); this.close(this.opt.cancel); }
  }
  draw(ctx) {
    const w = this.w || Math.max(...this.options.map(o => textW(ctx, o, 24))) + 64;
    const h = this.options.length * 34 + 28;
    const x = clamp(this.opt.x ?? (504 - w), 4, 508 - w), y = clamp(this.opt.y ?? (384 - 112 - h), 4, 380 - h);
    drawWindow(ctx, x, y, w, h, CHOICE_SKIN);
    this.options.forEach((o, i) => text(ctx, o, x + 36, y + 14 + i * 34, { size: 24 }));
    drawCursorArrow(ctx, x + 14, y + 16 + this.i * 34);
  }
}

// 수량 선택
class QuantityBox extends Win {
  constructor(max, price, opt = {}) { super(); this.max = Math.max(1, max); this.n = 1; this.price = price; this.opt = opt; }
  update() {
    if (Input.rep('up')) { this.n = this.n >= this.max ? 1 : this.n + 1; SE.cursor(); }
    if (Input.rep('down')) { this.n = this.n <= 1 ? this.max : this.n - 1; SE.cursor(); }
    if (Input.rep('right')) { this.n = Math.min(this.max, this.n + 10); SE.cursor(); }
    if (Input.rep('left')) { this.n = Math.max(1, this.n - 10); SE.cursor(); }
    if (Input.trig('A')) { SE.ok(); this.close(this.n); }
    if (Input.trig('B')) { SE.cancel(); this.close(0); }
  }
  draw(ctx) {
    const w = this.price ? 220 : 120, x = 504 - w, y = 384 - 112 - 60;
    drawWindow(ctx, x, y, w, 56, CHOICE_SKIN);
    text(ctx, 'x' + String(this.n).padStart(2, '0'), x + 20, y + 16, { size: 24 });
    if (this.price) text(ctx, (this.price * this.n) + '원', x + w - 20, y + 16, { size: 24, align: 'right' });
  }
}

// ---------------- 배틀 명령 메뉴 ----------------
class BattleCommandMenu extends Win {
  constructor(b) { super(); this.b = b; this.i = BattleCommandMenu.last || 0; }
  update() {
    const i = this.i;
    if (Input.trig('left') && i % 2 === 1) { this.i--; SE.cursor(); }
    if (Input.trig('right') && i % 2 === 0) { this.i++; SE.cursor(); }
    if (Input.trig('up') && i >= 2) { this.i -= 2; SE.cursor(); }
    if (Input.trig('down') && i < 2) { this.i += 2; SE.cursor(); }
    if (Input.trig('A')) { SE.ok(); BattleCommandMenu.last = this.i; this.close(this.i); }
  }
  draw(ctx) {
    drawImg(ctx, 'Graphics/UI/Battle/overlay_command.png', 0, 288);
    const lines = wrapText(ctx, this.b.msgText, 216, 22);
    lines.slice(0, 2).forEach((l, k) => textFit(ctx, l, 20, 306 + k * 32, 222, { size: 22, color: '#f8f8f8', shadow: '#484848' }));
    const order = [0, 1, 2, 3]; // 싸운다, 포켓몬, 가방, 도망
    for (let k = 0; k < 4; k++) {
      const x = 252 + (k % 2) * 126, y = 294 + Math.floor(k / 2) * 42;
      drawImg(ctx, 'Graphics/UI/Battle/cursor_command.png', k === this.i ? 130 : 0, order[k] * 46, 130, 46, x, y, 130, 46);
    }
  }
}
const GIMMICK_NAME = { mega: '메가진화', dyna: '다이맥스', tera: '테라스탈' };
class FightMenu extends Win {
  constructor(b) { super(); this.b = b; this.i = FightMenu.last && b.p.mon.moves[FightMenu.last] ? FightMenu.last : 0; this.gims = b.availableGimmicks(); this.g = -1; b.pendingGimmick = null; }
  update() {
    const n = this.b.p.mon.moves.length, i = this.i;
    const go = j => { if (j >= 0 && j < n && j !== this.i) { this.i = j; SE.cursor(); } };
    if (Input.trig('left') && i % 2 === 1) go(i - 1);
    if (Input.trig('right') && i % 2 === 0) go(i + 1);
    if (Input.trig('up') && i >= 2) go(i - 2);
    if (Input.trig('down') && i < 2) go(i + 2);
    if ((Input.trig('L') || Input.trig('R') || Input.trig('menu')) && this.gims.length) { this.g = this.g + 1 >= this.gims.length ? -1 : this.g + 1; Audio2.se('GUI sel decision', 0.6); }
    if (Input.trig('A')) { SE.ok(); FightMenu.last = this.i; this.b.pendingGimmick = this.g >= 0 ? this.gims[this.g] : null; this.close(this.i); }
    if (Input.trig('B')) { SE.cancel(); this.close(-1); }
  }
  draw(ctx) {
    if (this.gims.length) {
      const on = this.g >= 0, label = on ? GIMMICK_NAME[this.gims[this.g]] + ' 준비!' : 'Q: ' + this.gims.map(g => GIMMICK_NAME[g]).join('/');
      drawWindow(ctx, 4, 244, Math.max(150, textW(ctx, label, 20) + 50), 40, CHOICE_SKIN);
      drawImg(ctx, 'Graphics/UI/Battle/cursor_mega.png', 0, on ? 46 : 0, 46, 46, 8, 246, 36, 36);
      text(ctx, label, 46, 254, { size: 20, color: on ? '#e03050' : '#484848' });
    }
    drawImg(ctx, 'Graphics/UI/Battle/overlay_fight.png', 0, 288);
    const mons = this.b.p.mon.moves;
    const dyna = this.b.p.dyna || this.gims[this.g] === 'dyna';
    mons.forEach((m, k) => {
      const zz = this.gims[this.g] === 'z' && typeof zMoveData === 'function' && zMoveData(this.b.p.mon, m.id);
      const md = dyna ? maxMoveData(this.b.p.mon, m.id) : (zz || MOVES[m.id]); if (!md) return;
      const x = 4 + (k % 2) * 188, y = 294 + Math.floor(k / 2) * 42;
      const row = TYPES[md.t] ? TYPES[md.t].icon : 0;
      drawImg(ctx, 'Graphics/UI/Battle/cursor_fight.png', k === this.i ? 192 : 0, row * 46, 192, 46, x, y, 192, 46);
      const fs = Math.max(13, Math.min(22, Math.floor(22 * 160 / Math.max(160, textW(ctx, md.name, 22)))));
      text(ctx, md.name, x + 96, y + 11 + Math.floor((22 - fs) / 2), { size: fs, align: 'center', color: '#f8f8f8', shadow: '#383838' });
    });
    const m = mons[this.i];
    if (m) {
      const md = dyna ? maxMoveData(this.b.p.mon, m.id) : MOVES[m.id];
      const col = m.pp === 0 ? '#f83818' : (m.pp <= m.max / 4 ? '#f88818' : (m.pp <= m.max / 2 ? '#f8b800' : '#484848'));
      text(ctx, 'PP: ' + m.pp + '/' + m.max, 448, 302, { size: 22, align: 'center', color: col, shadow: '#d0d0c8' });
      drawTypeIcon(ctx, md.t, 416, 336);
    }
  }
}

// 레벨업 능력치 창
class LevelUpWindow extends Win {
  constructor(mon, old) { super(); this.mon = mon; this.old = old; this.page = 0; }
  update() { if (Input.trig('A') || Input.trig('B')) { if (this.page === 0) this.page = 1; else this.close(); } }
  draw(ctx) {
    const x = 296, y = 20, w = 208, h = 6 * 32 + 28;
    drawWindow(ctx, x, y, w, h, CHOICE_SKIN);
    STAT_NAMES.forEach((s, i) => {
      text(ctx, s, x + 18, y + 14 + i * 32, { size: 22 });
      const v = this.page === 0 ? '+' + (this.mon.stats[i] - this.old[i]) : String(this.mon.stats[i]);
      text(ctx, v, x + w - 18, y + 14 + i * 32, { size: 22, align: 'right' });
    });
  }
}

// ---------------- 이름 입력 (HTML 오버레이) ----------------
function promptName(title, def = '', maxLen = 8) {
  return new Promise(res => {
    const wrap = document.getElementById('name-overlay');
    const inp = document.getElementById('name-input');
    document.getElementById('name-title').textContent = title;
    inp.value = def; inp.maxLength = maxLen;
    wrap.style.display = 'flex';
    setTimeout(() => { inp.focus(); inp.select(); }, 30);
    let closed = false, enterWhileComposing = false;
    const done = () => {
      if (closed) return; closed = true;
      const v = inp.value.trim().slice(0, maxLen);
      wrap.style.display = 'none';
      inp.onkeydown = null; document.getElementById('name-ok').onclick = null;
      document.removeEventListener('keydown', onDocKey, true);
      inp.removeEventListener('compositionend', onCompEnd);
      clearInterval(poll);
      document.removeEventListener('pointerdown', onTouchA, true);
      Input.held = {}; Input.consume();
      setTimeout(() => res(v || def), 50);
    };
    // 한글 입력 중(조합 중)에 누른 Enter는 조합이 끝난 뒤 확인으로 처리 (예전엔 무시돼서 다시 눌러야 했음)
    const onCompEnd = () => { if (enterWhileComposing) { enterWhileComposing = false; setTimeout(done, 0); } };
    inp.addEventListener('compositionend', onCompEnd);
    inp.onkeydown = e => {
      e.stopPropagation();
      if (e.key !== 'Enter') return;
      if (e.isComposing || e.keyCode === 229) { enterWhileComposing = true; return; }
      done();
    };
    // 입력칸 밖(게임 화면 등)을 눌러 포커스가 빠져도 Enter / Z 로 확인되게 (예전엔 게임이 멈춘 것처럼 보였음)
    const onDocKey = e => {
      if (closed || document.activeElement === inp) return;
      if ((e.key === 'Enter' || e.code === 'KeyZ') && !e.isComposing) { e.preventDefault(); e.stopPropagation(); done(); }
    };
    document.addEventListener('keydown', onDocKey, true);
    // 모바일 가상 패드의 A 버튼으로도 확인 (버튼을 직접 감지 + 혹시 몰라 눌린 상태도 확인)
    const onTouchA = e => { if (e.target.closest && e.target.closest('#touch .a')) { e.preventDefault(); done(); } };
    document.addEventListener('pointerdown', onTouchA, true);
    const poll = setInterval(() => { if (document.activeElement !== inp && Input.held.A) done(); }, 100);
    wrap.onclick = e => { if (e.target === wrap) inp.focus(); };   // 바깥 어두운 곳을 누르면 입력칸으로 포커스
    document.getElementById('name-ok').onclick = done;
  });
}

// ---------------- 가방 데이터 ----------------
const Bag = {
  get items() { return Player.bag; },
  add(id, n = 1) { Player.bag[id] = (Player.bag[id] || 0) + n; },
  remove(id, n = 1) { if (!Player.bag[id]) return; Player.bag[id] -= n; if (Player.bag[id] <= 0) delete Player.bag[id]; },
  count(id) { return Player.bag[id] || 0; },
  pocket(pk) { return Object.keys(Player.bag).filter(id => ITEMS[id] && pocketOf(id) === pk).sort((a, b) => Object.keys(ITEMS).indexOf(a) - Object.keys(ITEMS).indexOf(b)); }
};
const POCKETS = [[1, '도구'], [2, '회복'], [3, '몬스터볼'], [8, '중요한 물건']];
function pocketOf(id) { const p = ITEMS[id].pk; return p === 2 || p === 3 || p === 8 ? p : 1; }
ITEMS.LINKINGCORD && (ITEMS.LINKINGCORD.name = '연결의끈', ITEMS.LINKINGCORD.d = '신비한 힘이 담긴 끈. 통신교환으로 진화하는 포켓몬을 진화시킨다.');

// ---------------- 박스(PC) ----------------
const Storage = {
  deposit(mon) {
    for (let b = 0; b < Player.boxes.length; b++) if (Player.boxes[b].length < 30) { Player.boxes[b].push(mon); return b; }
    Player.boxes.push([mon]); return Player.boxes.length - 1;
  }
};

// ---------------- 파티 화면 ----------------
class PartyScreen extends Win {
  constructor(opt = {}) {
    super(); this.opt = opt; this.i = 0; this.swapFrom = -1;
    this.msg = opt.msg || (opt.mode === 'battle' ? '어느 포켓몬과 교체할까요?' : '포켓몬을 선택해 주세요.');
    this.busy = false;
  }
  get party() { return Player.party; }
  update() {
    if (this.busy) return;
    const n = this.party.length;
    const cancelIdx = n; // 취소 버튼
    const max = this.opt.forced ? n - 1 : cancelIdx;
    if (Input.rep('down') || Input.rep('right')) { this.i = this.i >= max ? 0 : this.i + 1; SE.cursor(); }
    if (Input.rep('up') || Input.rep('left')) { this.i = this.i <= 0 ? max : this.i - 1; SE.cursor(); }
    if (Input.trig('B')) {
      if (this.swapFrom >= 0) { this.swapFrom = -1; SE.cancel(); return; }
      if (!this.opt.forced) { SE.cancel(); this.close(-1); }
      return;
    }
    if (Input.trig('A')) {
      if (this.i === cancelIdx) { SE.cancel(); this.close(-1); return; }
      SE.ok();
      this.busy = true;
      this.select(this.i).finally(() => { this.busy = false; });
    }
  }
  async select(i) {
    const mon = this.party[i];
    const mode = this.opt.mode || 'field';
    if (this.swapFrom >= 0) {
      const a = this.swapFrom; this.swapFrom = -1;
      if (a !== i) { [this.party[a], this.party[i]] = [this.party[i], this.party[a]]; Audio2.se('GUI party switch'); }
      return;
    }
    if (mode === 'select' || mode === 'item') { this.close(i); return; }
    if (mode === 'battle') {
      const r = await this.subMenu(['교체한다', '상태를 본다', '그만둔다']);
      if (r === 0) {
        if (mon.fainted) { await this.note(mon.name + '에게는 싸울 기력이 없다!'); return; }
        if (this.opt.battle.p && this.opt.battle.p.mon === mon) { await this.note(mon.name + J.eunneun(mon.name).slice(mon.name.length) + ' 이미 나와 있다!'); return; }
        this.close(i); return;
      }
      if (r === 1) await Game.open(new SummaryScreen(this.party, i));
      return;
    }
    // 필드
    const opts = ['상태를 본다', '순서를 바꾼다', '도구'];
    if (this.party.length <= 1) opts.splice(1, 1);
    opts.push('그만둔다');
    const r = await this.subMenu(opts);
    if (opts[r] === '상태를 본다') { const k = await Game.open(new SummaryScreen(this.party, i)); }
    else if (opts[r] === '순서를 바꾼다') { this.swapFrom = i; this.msg = '어디로 옮길까요?'; }
    else if (opts[r] === '도구') {
      const o2 = ['지니게 한다', '맡는다', '그만둔다'];
      const r2 = await this.subMenu(o2);
      if (r2 === 0) {
        const id = await Game.open(new BagScreen({ mode: 'give' }));
        if (id) {
          if (mon.item) Bag.add(mon.item);
          Bag.remove(id); mon.item = id;
          await this.note(J.eunneun(mon.name) + ' ' + J.eulreul(itemName(id)) + ' 지니게 되었다.');
          if (Game.world) Game.world.setupFollower(false);
        }
      } else if (r2 === 1) {
        if (!mon.item) await this.note(J.eunneun(mon.name) + ' 아무것도 지니고 있지 않다.');
        else { Bag.add(mon.item); await this.note(mon.name + '에게서 ' + J.eulreul(itemName(mon.item)) + ' 받았다.'); mon.item = null; }
      }
    }
  }
  async subMenu(opts) { return await Game.open(new ChoiceBox(opts, { cancel: opts.length - 1, x: 296, y: 384 - (opts.length * 34 + 28) - 4, w: 208 })); }
  async note(s) { const old = this.msg; this.msg = s; await waitA(); this.msg = old; }
  draw(ctx) {
    drawImg(ctx, 'Graphics/UI/Party/bg.png', 0, 0) || (ctx.fillStyle = '#3aa', ctx.fillRect(0, 0, 512, 384));
    this.party.forEach((m, k) => {
      const x = (k % 2) * 256, y = 16 * (k % 2) + 96 * Math.floor(k / 2);
      const sel = k === this.i, sw = this.swapFrom === k;
      const shape = k === 0 ? 'round' : 'rect';
      let name = 'panel_' + shape + (m.fainted ? '_faint' : '') + (sw ? '_swap' : '') + (sel ? '_sel' : '');
      if (sw && sel) name = 'panel_' + shape + '_swap_sel2';
      if (!drawImg(ctx, 'Graphics/UI/Party/' + name + '.png', x, y)) drawImg(ctx, 'Graphics/UI/Party/panel_' + shape + (sel ? '_sel' : '') + '.png', x, y);
      drawImg(ctx, 'Graphics/UI/Party/icon_ball' + (sel ? '_sel' : '') + '.png', x + 10, y);
      const bob = sel && !m.fainted ? (Math.floor(Game.tick / 8) % 2) * -4 : 0;
      drawMonIcon(ctx, m.species, m.shiny, x + 28, y + 8 + bob, Game.tick, m.fainted);
      textFit(ctx, m.name, x + 96, y + 18, 120, { size: 22, ...WHITE_TEXT });
      if (m.gender !== 'N') text(ctx, m.gender === 'M' ? '♂' : '♀', x + 236, y + 18, { size: 22, align: 'right', color: m.gender === 'M' ? '#68b0f8' : '#f88888', shadow: '#383838' });
      drawImg(ctx, 'Graphics/UI/Party/overlay_lv.png', x + 20, y + 70);
      text(ctx, String(m.level), x + 42, y + 64, { size: 20, ...WHITE_TEXT });
      drawImg(ctx, 'Graphics/UI/Party/overlay_hp_back.png', x + 96, y + 50);
      const r = m.hp / m.maxhp, row = r > 0.5 ? 0 : (r > 0.2 ? 1 : 2);
      if (m.hp > 0) drawImg(ctx, 'Graphics/UI/Party/overlay_hp.png', 0, row * 8, Math.ceil(96 * r), 8, x + 128, y + 52, Math.ceil(96 * r), 8);
      text(ctx, m.hp + '/' + m.maxhp, x + 226, y + 64, { size: 20, align: 'right', ...WHITE_TEXT });
      drawStatusIcon(ctx, m.fainted ? 'FNT' : m.status, x + 78, y + 68);
      if (m.item) drawImg(ctx, 'Graphics/UI/Party/icon_item.png', x + 62, y + 48);
      if (this.opt.mode === 'item' && this.opt.item) {
        const ok = medicineUsable(m, this.opt.item) || (ITEMS[this.opt.item].fl.includes('EvolutionStone') && m.evolutionTarget('item', this.opt.item));
        if (ITEMS[this.opt.item].fl.includes('EvolutionStone') || this.opt.item === 'LINKINGCORD') text(ctx, m.evolutionTarget('item', this.opt.item) ? '가능!' : '불가능', x + 236, y + 64, { size: 18, align: 'right', color: ok ? '#f8f800' : '#c0c0c0', shadow: '#383838' });
      }
    });
    if (!this.opt.forced) { drawImg(ctx, 'Graphics/UI/Party/icon_cancel' + (this.i === this.party.length ? '_sel' : '') + '.png', 398, 328); text(ctx, '닫기', 454, 340, { size: 22, align: 'center', ...WHITE_TEXT }); }
    drawWindow(ctx, 4, 334, 388, 46, CHOICE_SKIN);
    text(ctx, this.msg, 20, 346, { size: 22 });
  }
}
function waitA() {
  return new Promise(res => { const w = new Win(); w.update = () => { if (Input.trig('A') || Input.trig('B')) w.close(); }; Game.open(w).then(res); });
}

// ---------------- 포켓몬 요약 ----------------
class SummaryScreen extends Win {
  constructor(list, idx, opt = {}) {
    super(); this.list = list; this.idx = idx; this.opt = opt;
    this.page = opt.learn ? 2 : 0; this.mi = 0;
    Audio2.cry(this.mon.species, 0.6);
  }
  get mon() { return this.list[this.idx]; }
  update() {
    if (this.opt.learn) {
      const n = this.mon.moves.length + 1;
      if (Input.rep('up')) { this.mi = (this.mi + n - 1) % n; SE.cursor(); }
      if (Input.rep('down')) { this.mi = (this.mi + 1) % n; SE.cursor(); }
      if (Input.trig('A')) { SE.ok(); this.close(this.mi); }
      if (Input.trig('B')) { SE.cancel(); this.close(-1); }
      return;
    }
    if (Input.trig('left') && this.page > 0) { this.page--; Audio2.se('GUI summary change page', 0.7); }
    if (Input.trig('right') && this.page < 2) { this.page++; Audio2.se('GUI summary change page', 0.7); }
    if (Input.trig('up') && this.list.length > 1) { this.idx = (this.idx + this.list.length - 1) % this.list.length; Audio2.cry(this.mon.species, 0.6); }
    if (Input.trig('down') && this.list.length > 1) { this.idx = (this.idx + 1) % this.list.length; Audio2.cry(this.mon.species, 0.6); }
    if (Input.trig('B') || Input.trig('A')) { SE.cancel(); this.close(-1); }
  }
  // 기술 배우기 화면 전용 배치 (bg_learnmove.png 칸 위치에 맞춤)
  //   오른쪽: 기존 기술 4칸(위 22px부터 64px 간격) + 아래 따로 떨어진 새 기술 칸(294px)
  //   왼쪽: 회색 3줄(120/152/184px)에 분류·위력·명중, 그 아래 32px 줄무늬에 설명
  drawLearn(ctx, m) {
    const ink = { color: '#404040', shadow: '#c0c0c0' };
    const moves = m.moves.map(x => x.id).concat([this.opt.learn]);
    moves.forEach((id, i) => {
      const md = MOVES[id]; if (!md) return;
      const top = i < 4 ? 22 + i * 64 : 294;          // 칸의 윗선
      const mv = m.moves[i];
      drawTypeIcon(ctx, md.t, 248, top + 6);
      textFit(ctx, md.name, 318, top + 6, 166, { size: 22, ...ink });
      const pp = mv ? mv.pp + '/' + mv.max : md.pp + '/' + md.pp;
      text(ctx, 'PP', 342, top + 36, { size: 20, ...ink });
      text(ctx, pp, 478, top + 36, { size: 20, align: 'right', ...ink });
      if (i === this.mi) { ctx.strokeStyle = '#f83030'; ctx.lineWidth = 4; ctx.strokeRect(246, top + 2, 240, 62); }
    });
    // 새 기술 칸 위 작은 표시
    text(ctx, 'NEW', 488, 274, { size: 16, align: 'right', color: '#f8f8f8', shadow: '#a03030' });
    // 선택한 기술 정보
    const md = MOVES[moves[this.mi]];
    if (!md) return;
    const W = { color: '#f8f8f8', shadow: '#404040' };
    const rows = [['분류', ['물리', '특수', '변화'][md.c]], ['위력', md.p > 1 ? String(md.p) : '---'], ['명중', md.a > 0 ? String(md.a) : '---']];
    rows.forEach(([a, v], i) => {
      text(ctx, a, 14, 124 + i * 32, { size: 20, ...W });
      text(ctx, v, 197, 124 + i * 32, { size: 20, align: 'center', ...ink });
    });
    wrapText(ctx, md.d, 214, 18).slice(0, 5).forEach((l, i) => text(ctx, l, 10, 222 + i * 32, { size: 18, ...ink }));
  }
  draw(ctx) {
    const m = this.mon, d = m.data;
    const bg = this.opt.learn ? 'bg_learnmove' : ['bg_1', 'bg_3', 'bg_4'][this.page];
    drawImg(ctx, 'Graphics/UI/Summary/' + bg + '.png', 0, 0) || (ctx.fillStyle = '#ddd', ctx.fillRect(0, 0, 512, 384));
    const titles = ['포켓몬 정보', '능력치', '기술'];
    text(ctx, this.opt.learn ? '기술 배우기' : titles[this.page], 10, 8, { size: 24, ...WHITE_TEXT });
    // 왼쪽 공통: 이름, 레벨, 스프라이트
    drawImg(ctx, 'Graphics/UI/Summary/icon_ball_' + (m.ball || 'POKEBALL') + '.png', 14, 60);
    text(ctx, m.name, 46, 62, { size: 22, ...WHITE_TEXT });
    text(ctx, String(m.level), 46, 94, { size: 22, color: '#404040', shadow: '#c0c0c0' });
    if (m.gender !== 'N') text(ctx, m.gender === 'M' ? '♂' : '♀', this.opt.learn ? 128 : 178, 62, { size: 22, color: m.gender === 'M' ? '#68b0f8' : '#f88888', shadow: '#383838' });
    if (this.opt.learn) {
      // 기술 배우기 배경(bg_learnmove)은 이름 칸 오른쪽에 빈자리가 있음 → 아이콘을 그곳에 (아래 분류/위력 칸을 가리지 않게)
      drawMonIcon(ctx, m.species, m.shiny, 150, 50, Game.tick);
    } else if (this.page === 2) {
      drawMonIcon(ctx, m.species, m.shiny, 46, 120, Game.tick);
    } else drawMonSprite(ctx, 'Front', m.species, m.shiny, 104, 270, 2, Game.tick, { sizeMul: 0.85 });
    if (m.shiny) drawImg(ctx, 'Graphics/UI/shiny.png', 2, 134);
    if (!this.opt.learn) drawStatusIcon(ctx, m.fainted ? 'FNT' : m.status, 124, 100);
    if (this.opt.learn) { this.drawLearn(ctx, m); return; }
    if (this.opt.learn || this.page === 2) {
      // 기술 목록
      const moves = m.moves.map(x => x.id);
      if (this.opt.learn) moves.push(this.opt.learn);
      moves.forEach((id, i) => {
        const md = MOVES[id]; const y = 98 + i * 64 - (this.opt.learn ? 0 : 0);
        const mv = m.moves[i];
        drawTypeIcon(ctx, md.t, 246, y - 2);
        textFit(ctx, md.name, 318, y - 1, 170, { size: 22, color: '#404040', shadow: '#c0c0c0' });
        const pp = mv ? mv.pp + '/' + mv.max : md.pp + '/' + md.pp;
        text(ctx, 'PP', 342, y + 30, { size: 20, color: '#404040', shadow: '#c0c0c0' });
        text(ctx, pp, 460, y + 30, { size: 20, align: 'right', color: '#404040', shadow: '#c0c0c0' });
        if (this.opt.learn && i === this.mi) { ctx.strokeStyle = '#f83030'; ctx.lineWidth = 4; ctx.strokeRect(240, y - 10, 254, 60); }
      });
      // 선택 기술 설명
      const sel = this.opt.learn ? moves[this.mi] : null;
      if (sel) {
        const md = MOVES[sel];
        text(ctx, '분류 ' + ['물리', '특수', '변화'][md.c], 16, 156, { size: 20, color: '#404040', shadow: '#c0c0c0' });
        text(ctx, '위력 ' + (md.p > 1 ? md.p : '---'), 16, 184, { size: 20, color: '#404040', shadow: '#c0c0c0' });
        text(ctx, '명중 ' + (md.a > 0 ? md.a : '---'), 16, 212, { size: 20, color: '#404040', shadow: '#c0c0c0' });
        wrapText(ctx, md.d, 210, 18).slice(0, 5).forEach((l, i) => text(ctx, l, 12, 248 + i * 24, { size: 18, color: '#404040', shadow: '#c0c0c0' }));
      } else {
        text(ctx, '종류: ' + d.t.map(typeName).join('/'), 12, 200, { size: 20, color: '#404040', shadow: '#c0c0c0' });
      }
      return;
    }
    if (this.page === 0) {
      const rows = [['도감 No.', String(d.n).padStart(4, '0')], ['이름', d.name], ['타입', ''], ['어버이', m.ot || '-'], ['성격', NATURES[m.nature]]];
      rows.forEach(([a, b], i) => {
        text(ctx, a, 238, 80 + i * 32, { size: 22, ...WHITE_TEXT });
        if (b) text(ctx, b, 435, 80 + i * 32, { size: 22, align: 'center', color: '#404040', shadow: '#c0c0c0' });
      });
      d.t.forEach((t, i) => drawTypeIcon(ctx, t, d.t.length === 1 ? 403 : 370 + i * 66, 144));
      text(ctx, '도구: ' + (m.item ? itemName(m.item) : '없음'), 12, 300, { size: 18, color: '#404040', shadow: '#c0c0c0' });
      text(ctx, '테라: ' + typeName(m.tera) + (m.gmaxF ? '  ★거다이맥스' : ''), 12, 324, { size: 18, color: '#404040', shadow: '#c0c0c0' });
      text(ctx, '경험치', 238, 240, { size: 22, ...WHITE_TEXT });
      text(ctx, String(m.exp), 488, 272, { size: 22, align: 'right', color: '#404040', shadow: '#c0c0c0' });
      text(ctx, '다음 레벨까지', 238, 304, { size: 22, ...WHITE_TEXT });
      text(ctx, m.level >= 100 ? '0' : String(m.expAt(m.level + 1) - m.exp), 488, 334, { size: 22, align: 'right', color: '#404040', shadow: '#c0c0c0' });
      const im = img('Graphics/UI/Summary/overlay_exp.png');
      if (im) ctx.drawImage(im, 0, 0, im.width, im.height, 362, 372, Math.floor(128 * m.expProgress()), im.height);
      if (m.metMap) text(ctx, m.metMap + ' (Lv.' + m.metLevel + ')', 12, 352, { size: 16, color: '#404040', shadow: '#c0c0c0' });
    } else {
      // 능력치
      const ys = [82, 126, 158, 190, 222, 254];
      STAT_NAMES.forEach((s, i) => {
        const nm = natureMod(m.nature, i);
        const col = nm > 1 ? '#e04848' : nm < 1 ? '#4878e0' : null;
        text(ctx, s, 248, ys[i], { size: 22, ...(col ? { color: '#f8f8f8', shadow: col } : WHITE_TEXT) });
        const v = i === 0 ? m.hp + '/' + m.maxhp : String(m.stats[i]);
        text(ctx, v, 456, ys[i], { size: 22, align: 'right', color: '#404040', shadow: '#c0c0c0' });
      });
      const r = m.hp / m.maxhp, row = r > 0.5 ? 0 : (r > 0.2 ? 1 : 2);
      drawImg(ctx, 'Graphics/UI/Summary/overlay_hp.png', 0, row * 6, Math.ceil(96 * r), 6, 360, 110, Math.ceil(96 * r), 6);
      text(ctx, '특성: ' + abilityName(m.ability) + (m.abHidden ? ' (숨겨진 특성)' : ''), 224, 290, { size: 20, ...WHITE_TEXT });
      wrapText(ctx, (ABILITIES[m.ability] || {}).d || '', 270, 18).slice(0, 2).forEach((l, i) => text(ctx, l, 224, 324 + i * 24, { size: 18, color: '#404040', shadow: '#c0c0c0' }));
      text(ctx, '개체값 ' + m.ivs.reduce((a, b) => a + b, 0) + '/186', 12, 352, { size: 16, color: '#404040', shadow: '#c0c0c0' });
    }
  }
}

// ---------------- 가방 ----------------
class BagScreen extends Win {
  constructor(opt = {}) {
    super(); this.opt = opt;
    this.pockets = POCKETS;
    this.pi = BagScreen.lastPocket || 0;
    if (opt.mode === 'battle' && BagScreen.lastPocket === undefined) this.pi = 1;
    this.ii = 0; this.top = 0; this.busy = false;
  }
  get list() { return Bag.pocket(this.pockets[this.pi][0]); }
  update() {
    if (this.busy) return;
    const L = this.list;
    if (Input.trig('left')) { this.pi = (this.pi + this.pockets.length - 1) % this.pockets.length; this.ii = 0; this.top = 0; SE.cursor(); }
    if (Input.trig('right')) { this.pi = (this.pi + 1) % this.pockets.length; this.ii = 0; this.top = 0; SE.cursor(); }
    const n = L.length + 1; // 마지막은 닫기
    if (Input.rep('up')) { this.ii = (this.ii + n - 1) % n; SE.cursor(); }
    if (Input.rep('down')) { this.ii = (this.ii + 1) % n; SE.cursor(); }
    if (this.ii < this.top) this.top = this.ii;
    if (this.ii >= this.top + 7) this.top = this.ii - 6;
    if (Input.trig('B')) { SE.cancel(); BagScreen.lastPocket = this.pi; this.close(null); return; }
    if (Input.trig('A')) {
      if (this.ii >= L.length) { SE.cancel(); BagScreen.lastPocket = this.pi; this.close(null); return; }
      SE.ok(); this.busy = true;
      this.choose(L[this.ii]).finally(() => this.busy = false);
    }
  }
  async choose(id) {
    BagScreen.lastPocket = this.pi;
    const it = ITEMS[id], mode = this.opt.mode || 'field';
    if (mode === 'sell' || mode === 'give') {
      if (mode === 'give' && pocketOf(id) === 8) { await this.note('그건 지니게 할 수 없다.'); return; }
      this.close(id); return;
    }
    if (mode === 'battle') {
      if (it.fl.includes('PokeBall')) {
        if (!this.opt.battle.wild) { await this.note('그건 여기서 쓸 수 없다!'); return; }
        if (Player.party.length >= 6 && Player.boxes.every(b => b.length >= 30)) { await this.note('더 이상 포켓몬을 가질 수 없다!'); return; }
        this.close({ item: id }); return;
      }
      if (pocketOf(id) === 2) {
        const t = await Game.open(new PartyScreen({ mode: 'item', item: id, msg: '누구에게 사용할까요?' }));
        if (t < 0) return;
        if (!medicineUsable(Player.party[t], id)) { await this.note('효과가 없을 것 같다.'); return; }
        this.close({ item: id, target: t }); return;
      }
      await this.note('지금은 사용할 수 없다!'); return;
    }
    // 필드
    const opts = [];
    const usable = id === 'ABILITYCAPSULE' || id === 'ABILITYPATCH' || pocketOf(id) === 2 || it.fl.includes('EvolutionStone') || !!it.mv || ['RARECANDY', 'REPEL', 'SUPERREPEL', 'MAXREPEL', 'ESCAPEROPE', 'LINKINGCORD'].includes(id) || /TERASHARD$/.test(id);
    if (usable) opts.push('사용한다');
    if (pocketOf(id) !== 8) opts.push('버린다');
    opts.push('그만둔다');
    const r = await Game.open(new ChoiceBox(opts, { cancel: opts.length - 1, x: 280, y: 384 - (opts.length * 34 + 28) - 50, w: 200 }));
    if (opts[r] === '사용한다') await useItemField(id, s => this.note(s), this);
    else if (opts[r] === '버린다') {
      const q = await Game.open(new QuantityBox(Bag.count(id)));
      if (q > 0) { Bag.remove(id, q); await this.note(J.eulreul(itemName(id)) + ' ' + q + '개 버렸다.'); }
    }
  }
  async note(s) { this.noteText = s; await waitA(); this.noteText = null; }
  draw(ctx) {
    const pk = this.pockets[this.pi][0];
    drawImg(ctx, 'Graphics/UI/Bag/bg_' + pk + '.png', 0, 0) || (ctx.fillStyle = '#e88', ctx.fillRect(0, 0, 512, 384));
    drawImg(ctx, 'Graphics/UI/Bag/bag_' + pk + (Player.gender === 'F' ? '_f' : '') + '.png', 30, 20);
    text(ctx, this.pockets[this.pi][1], 94, 182, { size: 22, align: 'center', color: '#404040', shadow: '#c0c0c0' });
    text(ctx, '◀', 6, 182, { size: 18, ...WHITE_TEXT }); text(ctx, '▶', 166, 182, { size: 18, ...WHITE_TEXT });
    const L = this.list;
    for (let k = 0; k < 7; k++) {
      const i = this.top + k; if (i > L.length) break;
      const y = 16 + k * 46;
      if (i === this.ii) drawImg(ctx, 'Graphics/UI/Bag/cursor.png', 178, y - 22) || (ctx.fillStyle = 'rgba(255,120,80,0.35)', ctx.fillRect(186, y - 4, 270, 34));
      if (i === L.length) { text(ctx, '가방 닫기', 210, y, { size: 22, color: '#404040', shadow: '#c0c0c0' }); continue; }
      const id = L[i];
      textFit(ctx, itemName(id), 210, y, 190, { size: 22, color: '#404040', shadow: '#c0c0c0' });
      if (pocketOf(id) !== 8) text(ctx, 'x' + Bag.count(id), 450, y, { size: 22, align: 'right', color: '#404040', shadow: '#c0c0c0' });
    }
    const sel = L[this.ii];
    if (sel) {
      drawImg(ctx, 'Graphics/Items/' + sel + '.png', 0, 0, 48, 48, 24, 312, 48, 48);
      wrapText(ctx, this.noteText || ITEMS[sel].d || '', 420, 20).slice(0, 2).forEach((l, i) => text(ctx, l, 84, 316 + i * 28, { size: 20, ...WHITE_TEXT }));
    } else if (this.noteText) text(ctx, this.noteText, 84, 316, { size: 20, ...WHITE_TEXT });
    if (this.opt.mode === 'sell') text(ctx, '팔 물건을 고르세요', 84, 350, { size: 18, ...WHITE_TEXT });
  }
}

// 필드에서 아이템 사용
async function useItemField(id, noteFn, bagScreen) {
  const it = ITEMS[id];
  if (id === 'REPEL' || id === 'SUPERREPEL' || id === 'MAXREPEL') {
    if (Player.repel > 0) { await noteFn('이전에 사용한 스프레이의 효과가 남아 있다.'); return; }
    Player.repel = { REPEL: 100, SUPERREPEL: 200, MAXREPEL: 250 }[id]; Bag.remove(id); Audio2.se('Repel');
    await noteFn(J.eulreul(itemName(id)) + ' 뿌렸다! 약한 야생 포켓몬이 나오지 않는다.'); return;
  }
  if (id === 'ESCAPEROPE') {
    if (!Game.world || !Game.world.def.outdoor) { await noteFn('여기서는 쓸 수 없다!'); return; }
    Bag.remove(id); if (bagScreen) bagScreen.close(null);
    Game.closeAllUI();
    await Game.world.warpToHeal(); return;
  }
  const t = await Game.open(new PartyScreen({ mode: 'item', item: id, msg: '누구에게 사용할까요?' }));
  if (t < 0) return;
  const mon = Player.party[t];
  if (it.fl.includes('EvolutionStone') || id === 'LINKINGCORD') {
    const evo = mon.evolutionTarget('item', id);
    if (!evo) { await noteFn('효과가 없을 것 같다.'); return; }
    Bag.remove(id);
    await Game.open(new EvolutionScene(mon, evo));
    return;
  }
  if (id === 'ABILITYCAPSULE' || id === 'ABILITYPATCH') {
    const t = await Game.open(new PartyScreen({ mode: 'select', msg: '누구에게 사용할까요?' }));
    if (t < 0) return;
    const mon = Player.party[t], d = mon.data;
    if (id === 'ABILITYCAPSULE') {
      if (mon.abHidden || (d.ab || []).length < 2) { await noteFn('효과가 없을 것 같다.'); return; }
      const nx = d.ab[((mon.abIdx || 0) + 1) % d.ab.length];
      if (!(await yesNo(mon.name + '의 특성을 ' + J.ro(abilityName(nx)) + ' 바꾸겠습니까?'))) return;
      mon.abIdx = ((mon.abIdx || 0) + 1) % d.ab.length;
    } else {
      if (mon.abHidden || !(d.hab || []).length) { await noteFn('효과가 없을 것 같다.'); return; }
      if (!(await yesNo(mon.name + '의 특성을 숨겨진 특성 ' + J.ro(abilityName(d.hab[0])) + ' 바꾸겠습니까?'))) return;
      mon.abHidden = true;
    }
    Bag.remove(id); Audio2.se('Pkmn level up');
    await noteFn(mon.name + '의 특성이 ' + J.ro(abilityName(mon.ability)) + ' 바뀌었다!');
    return;
  }
  if (it.mv && !(it.fl || []).includes('ZCrystal')) {
    const t = await Game.open(new PartyScreen({ mode: 'item', item: id, msg: moveName(it.mv) + '을(를) 누구에게?' }));
    if (t < 0) return;
    const mon = Player.party[t];
    const can = mon.data.tm.includes(it.mv) || mon.data.mv.some(x => x[1] === it.mv);
    if (!can) { await noteFn(J.eunneun(mon.name) + ' ' + J.eulreul(moveName(it.mv)) + ' 배울 수 없다!'); return; }
    if (mon.knows(it.mv)) { await noteFn(J.eunneun(mon.name) + ' 이미 그 기술을 알고 있다!'); return; }
    await learnMoveFlow(mon, it.mv, s => say(s));
    return;
  }
  if (/TERASHARD$/.test(id)) {
    if (Bag.count(id) < 50) { await noteFn('테라피스가 50개 필요하다! (현재 ' + Bag.count(id) + '개)'); return; }
    const t = await Game.open(new PartyScreen({ mode: 'select', msg: '테라스탈 타입을 바꿀 포켓몬은?' }));
    if (t < 0) return;
    const ty = id.replace('TERASHARD', '');
    Bag.remove(id, 50); Player.party[t].tera = ty;
    await noteFn(Player.party[t].name + '의 테라스탈 타입이 ' + typeName(ty) + J.ro(typeName(ty)).slice(typeName(ty).length) + ' 바뀌었다!');
    return;
  }
  if (id === 'RARECANDY') {
    if (mon.level >= 100 || mon.fainted) { await noteFn('효과가 없을 것 같다.'); return; }
    Bag.remove(id);
    mon.exp = mon.expAt(mon.level + 1);
    const old = mon.levelUp(); Audio2.se('Pkmn level up');
    await say(mon.name + '의 레벨이 ' + mon.level + J.ro(String(mon.level)).slice(String(mon.level).length) + ' 올랐다!');
    await Game.open(new LevelUpWindow(mon, old));
    for (const mv of mon.movesLearnedAt(mon.level)) await learnMoveFlow(mon, mv, s => say(s));
    const evo = mon.evolutionTarget('level');
    if (evo) await Game.open(new EvolutionScene(mon, evo));
    return;
  }
  if (!medicineUsable(mon, id)) { await noteFn('효과가 없을 것 같다.'); return; }
  const msg = applyMedicine(mon, id);
  Bag.remove(id); Audio2.se('Use item in party');
  await noteFn(msg);
}

// ---------------- 진화 연출 ----------------
class EvolutionScene extends Win {
  constructor(mon, target) {
    super(); this.mon = mon; this.target = target; this.t = 0; this.phase = 0; this.cancel = false;
    this.oldName = mon.name; this.oldSpecies = mon.species;
    this.run();
  }
  async run() {
    this.prevBGM = Audio2.bgmName;
    Audio2.stopBGM();
    this.msg = '어라...!? ' + this.oldName + '의 모습이...!';
    Audio2.cry(this.oldSpecies);
    await sleep(1500);
    Audio2.playME('Evolution start');
    await sleep(400);
    Audio2.playBGM('Evolution');
    this.phase = 1;
    const t0 = Game.tick;
    while (Game.tick - t0 < 360) {
      await frames(1);
      if (Input.trig('B')) { this.cancel = true; break; }
    }
    this.phase = 2;
    Audio2.stopBGM();
    if (this.cancel) {
      this.msg = '어라...? ' + this.oldName + '의 변화가 멈췄다!';
      await waitA();
    } else {
      const oldName = this.oldName;
      const hadNick = !!this.mon.nickname;
      this.mon.evolve(this.target);
      this.phase = 3;
      Audio2.cry(this.target);
      await Audio2.playME('Evolution success');
      this.msg = '축하합니다! ' + J.eunneun(oldName) + ' ' + J.ro(SPECIES[this.target].name) + ' 진화했다!';
      Player.seen[this.target] = true; Player.caught[this.target] = true;
      await waitA();
      // 진화 후 배우는 기술 (레벨 0 = 진화 시 습득)
      for (const mv of this.mon.movesLearnedAt(0)) { this.msg = ''; await learnMoveFlow(this.mon, mv, s => say(s)); }
      for (const mv of this.mon.movesLearnedAt(this.mon.level)) await learnMoveFlow(this.mon, mv, s => say(s));
    }
    if (this.prevBGM) Audio2.playBGM(this.prevBGM);
    this.close();
  }
  draw(ctx) {
    drawImg(ctx, 'Graphics/UI/evolution_bg.png', 0, 0) || (ctx.fillStyle = '#000', ctx.fillRect(0, 0, 512, 384));
    const t = Game.tick;
    if (this.phase === 1) {
      const k = Math.sin(t / Math.max(2, 14 - t % 360 / 30)) > 0;
      drawMonSprite(ctx, 'Front', k ? this.oldSpecies : this.target, this.mon.shiny, 256, 250, 2, t, { flash: true, still: true });
    } else {
      drawMonSprite(ctx, 'Front', this.phase === 3 ? this.target : this.oldSpecies, this.mon.shiny, 256, 250, 2, t);
    }
    if (this.msg) {
      const col = drawSpeechWindow(ctx, 8, 280, 496, 96);
      wrapText(ctx, this.msg, 448, 24).slice(0, 2).forEach((l, i) => text(ctx, l, 30, 298 + i * 34, { size: 24, color: col, shadow: col === '#f8f8f8' ? '#303030' : '#d0d0c8' }));
    }
  }
}

// ---------------- 상점 ----------------
class ShopScreen extends Win {
  constructor(stock) { super(); this.stock = stock; this.i = 0; this.top = 0; this.busy = false; this.msg = '무엇을 사시겠어요?'; }
  update() {
    if (this.busy) return;
    const n = this.stock.length + 1;
    if (Input.rep('up')) { this.i = (this.i + n - 1) % n; SE.cursor(); }
    if (Input.rep('down')) { this.i = (this.i + 1) % n; SE.cursor(); }
    if (this.i < this.top) this.top = this.i;
    if (this.i >= this.top + 6) this.top = this.i - 5;
    if (Input.trig('B')) { SE.cancel(); this.close(); return; }
    if (Input.trig('A')) {
      if (this.i === this.stock.length) { SE.cancel(); this.close(); return; }
      SE.ok(); this.busy = true; this.buy(this.stock[this.i]).finally(() => this.busy = false);
    }
  }
  async buy(id) {
    const price = ITEMS[id].pr;
    const max = Math.min(99, Math.floor(Player.money / Math.max(1, price)));
    if (max < 1) { this.msg = '돈이 부족하네요.'; await waitA(); this.msg = '무엇을 사시겠어요?'; return; }
    this.msg = J.eulreul(itemName(id)) + ' 몇 개 사시겠어요?';
    const q = await Game.open(new QuantityBox(max, price));
    if (q > 0) {
      this.msg = itemName(id) + ' ' + q + '개는 ' + (price * q) + '원입니다. 괜찮으세요?';
      const ok = await Game.open(new ChoiceBox(['예', '아니오'], { cancel: 1, x: 400, y: 200 }));
      if (ok === 0) {
        Player.money -= price * q; Bag.add(id, q); Audio2.se('Mart buy item');
        this.msg = '감사합니다!';
        if (id === 'POKEBALL' && q >= 10) { Bag.add('PREMIERBALL', Math.floor(q / 10)); this.msg = '덤으로 프리미어볼도 드릴게요!'; }
        await waitA();
      }
    }
    this.msg = '무엇을 사시겠어요?';
  }
  draw(ctx) {
    if (Game.world) Game.world.draw(ctx);
    drawImg(ctx, 'Graphics/UI/Mart/bg.png', 0, 0);
    drawWindow(ctx, 4, 4, 196, 56, CHOICE_SKIN);
    text(ctx, Player.money + '원', 184, 18, { size: 22, align: 'right' });
    for (let k = 0; k < 6; k++) {
      const i = this.top + k; if (i > this.stock.length) break;
      const y = 22 + k * 32;
      if (i === this.i) drawCursorArrow(ctx, 202, y);
      if (i === this.stock.length) { text(ctx, '그만둔다', 222, y, { size: 22 }); continue; }
      const id = this.stock[i];
      textFit(ctx, itemName(id), 222, y, 170, { size: 22 });
      text(ctx, ITEMS[id].pr + '원', 484, y, { size: 22, align: 'right' });
    }
    const sel = this.stock[this.i];
    if (sel) {
      drawImg(ctx, 'Graphics/Items/' + sel + '.png', 0, 0, 48, 48, 16, 300, 48, 48);
      wrapText(ctx, ITEMS[sel].d || '', 410, 20).slice(0, 3).forEach((l, i) => text(ctx, l, 84, 290 + i * 28, { size: 20, ...WHITE_TEXT }));
      text(ctx, '가방에 ' + Bag.count(sel) + '개', 16, 250, { size: 18, ...WHITE_TEXT });
    }
    drawWindow(ctx, 4, 204, 300, 44, CHOICE_SKIN);
    text(ctx, this.msg, 18, 214, { size: 18 });
  }
}

// ---------------- PC 박스 ----------------
class BoxScreen extends Win {
  constructor(mode) { super(); this.mode = mode; this.box = 0; this.i = 0; this.busy = false; this.msg = mode === 'withdraw' ? '데려갈 포켓몬을 고르세요.' : ''; }
  update() {
    if (this.busy) return;
    if (Input.trig('L')) { this.box = (this.box + Player.boxes.length - 1) % Player.boxes.length; SE.cursor(); }
    if (Input.trig('R')) { this.box = (this.box + 1) % Player.boxes.length; SE.cursor(); }
    const i = this.i;
    if (Input.rep('left')) { if (i % 6 === 0) { this.box = (this.box + Player.boxes.length - 1) % Player.boxes.length; this.i += 5; } else this.i--; SE.cursor(); }
    if (Input.rep('right')) { if (i % 6 === 5) { this.box = (this.box + 1) % Player.boxes.length; this.i -= 5; } else this.i++; SE.cursor(); }
    if (Input.rep('up')) { this.i = (this.i + 30 - 6) % 30; SE.cursor(); }
    if (Input.rep('down')) { this.i = (this.i + 6) % 30; SE.cursor(); }
    if (Input.trig('B')) { SE.cancel(); this.close(); return; }
    if (Input.trig('A')) {
      const mon = Player.boxes[this.box][this.i];
      if (!mon) return;
      SE.ok(); this.busy = true; this.act(mon).finally(() => this.busy = false);
    }
  }
  async act(mon) {
    const r = await Game.open(new ChoiceBox(['데려간다', '상태를 본다', '놓아준다', '그만둔다'], { cancel: 3, x: 330, y: 200 }));
    if (r === 0) {
      if (Player.party.length >= 6) { this.msg = '파티가 가득 찼습니다!'; return; }
      Player.boxes[this.box].splice(this.i, 1); mon.heal(); Player.party.push(mon);
      Audio2.se('GUI storage pick up'); this.msg = J.eulreul(mon.name) + ' 데려갔다!';
    } else if (r === 1) await Game.open(new SummaryScreen(Player.boxes[this.box], this.i));
    else if (r === 2) {
      const ok = await Game.open(new ChoiceBox(['예', '아니오'], { cancel: 1, x: 400, y: 200 }));
      if (ok === 0) { Player.boxes[this.box].splice(this.i, 1); this.msg = J.eulreul(mon.name) + ' 놓아주었다. 잘 가!'; }
    }
  }
  draw(ctx) {
    drawImg(ctx, 'Graphics/UI/Storage/bg.png', 0, 0) || (ctx.fillStyle = '#9bd', ctx.fillRect(0, 0, 512, 384));
    drawImg(ctx, 'Graphics/UI/Storage/box_' + (this.box % 40) + '.png', 184, 18);
    text(ctx, '박스 ' + (this.box + 1), 346, 30, { size: 24, align: 'center', ...WHITE_TEXT });
    const list = Player.boxes[this.box];
    for (let k = 0; k < 30; k++) {
      const x = 184 + 10 + (k % 6) * 48, y = 18 + 62 + Math.floor(k / 6) * 48;
      const m = list[k];
      if (m) drawMonIcon(ctx, m.species, m.shiny, x - 8, y - 16, Game.tick, k !== this.i);
      if (k === this.i) drawImg(ctx, 'Graphics/UI/Storage/cursor_point_1.png', x, y - 40);
    }
    const sel = list[this.i];
    if (sel) {
      drawMonSprite(ctx, 'Front', sel.species, sel.shiny, 90, 190, 1.5, Game.tick);
      text(ctx, sel.name, 12, 196, { size: 22, ...WHITE_TEXT });
      text(ctx, 'Lv.' + sel.level, 12, 226, { size: 20, ...WHITE_TEXT });
      sel.types.forEach((t, i) => drawTypeIcon(ctx, t, 12 + i * 68, 256));
    }
    drawWindow(ctx, 4, 334, 504, 46, CHOICE_SKIN);
    text(ctx, this.msg || 'L/R(Q/E): 박스 변경   Z: 선택   X: 닫기', 18, 346, { size: 20 });
  }
}

// ---------------- 포켓몬 도감 ----------------
class DexScreen extends Win {
  constructor() {
    super();
    this.i = 0; this.top = 0; this.detail = false; this.busy = false;
    this.list = SPECIES_LIST;
    const firstUnseen = this.list.findIndex(s => !Player.seen[s]);
    this.maxShown = Math.max(151, this.list.length);
  }
  update() {
    if (this.detail) {
      if (Input.trig('B') || Input.trig('A')) { SE.cancel(); this.detail = false; }
      if (Input.trig('up')) this.move(-1, true);
      if (Input.trig('down')) this.move(1, true);
      return;
    }
    if (Input.rep('up')) this.move(-1);
    if (Input.rep('down')) this.move(1);
    if (Input.rep('left')) this.move(-8);
    if (Input.rep('right')) this.move(8);
    if (Input.trig('A')) {
      const s = this.list[this.i];
      if (Player.seen[s]) { SE.ok(); this.detail = true; Audio2.cry(s, 0.7); } else SE.buzz();
    }
    if (Input.trig('B')) { SE.cancel(); this.close(); }
  }
  move(d, seenOnly) {
    let j = this.i;
    do { j = clamp(j + d, 0, this.list.length - 1); } while (seenOnly && !Player.seen[this.list[j]] && j > 0 && j < this.list.length - 1);
    if (j !== this.i) { this.i = j; SE.cursor(); if (seenOnly) Audio2.cry(this.list[j], 0.7); }
    if (this.i < this.top) this.top = this.i;
    if (this.i >= this.top + 9) this.top = this.i - 8;
  }
  draw(ctx) {
    const seen = Object.keys(Player.seen).filter(k => Player.seen[k]).length, caught = Object.keys(Player.caught).filter(k => Player.caught[k]).length;
    const s = this.list[this.i], d = SPECIES[s];
    if (this.detail) {
      drawImg(ctx, 'Graphics/UI/Pokedex/bg_info.png', 0, 0) || (ctx.fillStyle = '#e33', ctx.fillRect(0, 0, 512, 384));
      drawMonSprite(ctx, 'Front', s, false, 104, 240, 2, Game.tick, { sizeMul: 0.8 });
      text(ctx, 'No.' + String(d.n).padStart(4, '0') + '  ' + d.name, 246, 48, { size: 24, color: '#404040', shadow: '#c0c0c0' });
      text(ctx, d.cat + ' 포켓몬', 246, 80, { size: 22, color: '#404040', shadow: '#c0c0c0' });
      if (Player.caught[s]) {
        d.t.forEach((t, i) => drawTypeIcon(ctx, t, 296 + i * 70, 120));
        text(ctx, '키 ' + (d.h / 10).toFixed(1) + 'm', 314, 162, { size: 22, color: '#404040', shadow: '#c0c0c0' });
        text(ctx, '몸무게 ' + (d.w / 10).toFixed(1) + 'kg', 314, 194, { size: 22, color: '#404040', shadow: '#c0c0c0' });
        wrapText(ctx, d.dex, 460, 20).slice(0, 4).forEach((l, i) => text(ctx, l, 26, 264 + i * 28, { size: 20, color: '#404040', shadow: '#c0c0c0' }));
      } else {
        text(ctx, '아직 잡지 않은 포켓몬이다.', 26, 264, { size: 20, color: '#404040', shadow: '#c0c0c0' });
      }
      return;
    }
    drawImg(ctx, 'Graphics/UI/Pokedex/bg_list.png', 0, 0) || (ctx.fillStyle = '#e33', ctx.fillRect(0, 0, 512, 384));
    text(ctx, '포켓몬 도감', 128, 8, { size: 24, align: 'center', ...WHITE_TEXT });
    text(ctx, '발견 ' + seen, 40, 302, { size: 22, color: '#404040', shadow: '#c0c0c0' });
    text(ctx, '포획 ' + caught, 40, 330, { size: 22, color: '#404040', shadow: '#c0c0c0' });
    if (Player.seen[s]) drawMonSprite(ctx, 'Front', s, false, 112, 250, 2, Game.tick, { sizeMul: 0.75 });
    text(ctx, Player.seen[s] ? d.name : '?????', 112, 58, { size: 22, align: 'center', color: '#404040', shadow: '#c0c0c0' });
    for (let k = 0; k < 9; k++) {
      const i = this.top + k; if (i >= this.list.length) break;
      const sp = this.list[i], y = 66 + k * 34;
      if (i === this.i) drawImg(ctx, 'Graphics/UI/Pokedex/cursor_list.png', 236, y - 8);
      if (Player.caught[sp]) drawImg(ctx, 'Graphics/UI/Pokedex/icon_own.png', 252, y);
      else if (Player.seen[sp]) drawImg(ctx, 'Graphics/UI/Pokedex/icon_seen.png', 252, y);
      text(ctx, String(SPECIES[sp].n).padStart(4, '0'), 278, y, { size: 20, color: '#404040', shadow: '#c0c0c0' });
      text(ctx, Player.seen[sp] ? SPECIES[sp].name : '-----', 336, y, { size: 20, color: '#404040', shadow: '#c0c0c0' });
    }
  }
}

// ---------------- 트레이너 카드 ----------------
class TrainerCard extends Win {
  update() { if (Input.trig('A') || Input.trig('B')) { SE.cancel(); this.close(); } }
  draw(ctx) {
    drawImg(ctx, 'Graphics/UI/Trainer Card/bg.png', 0, 0);
    drawImg(ctx, 'Graphics/UI/Trainer Card/card' + (Player.gender === 'F' ? '_f' : '') + '.png', 0, 0);
    const c = WHITE_TEXT;
    text(ctx, '이름', 34, 64, { size: 22, ...c }); text(ctx, Player.name, 302, 64, { size: 22, align: 'right', ...c });
    text(ctx, 'ID No.', 332, 64, { size: 22, ...c }); text(ctx, String(Player.id).padStart(5, '0'), 468, 64, { size: 22, align: 'right', ...c });
    text(ctx, '용돈', 34, 112, { size: 22, ...c }); text(ctx, Player.money + '원', 302, 112, { size: 22, align: 'right', ...c });
    text(ctx, '도감', 34, 160, { size: 22, ...c }); text(ctx, Object.keys(Player.caught).length + '마리', 302, 160, { size: 22, align: 'right', ...c });
    const t = Math.floor(Player.playTime / 60);
    text(ctx, '플레이 시간', 34, 208, { size: 22, ...c }); text(ctx, Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'), 302, 208, { size: 22, align: 'right', ...c });
    text(ctx, '모험 시작', 34, 256, { size: 22, ...c }); text(ctx, Player.started || '-', 302, 256, { size: 22, align: 'right', ...c });
    const tr = 'Graphics/Trainers/' + (Player.gender === 'F' ? 'POKEMONTRAINER_May' : 'POKEMONTRAINER_Brendan') + '.png';
    const im = img(tr); if (im) ctx.drawImage(im, 0, 0, im.height, im.height, 336, 100, 128, 128);
    Player.badges.forEach((b, i) => drawImg(ctx, 'Graphics/UI/Trainer Card/icon_badges.png', i * 32, 0, 32, 32, 72 + i * 48, 310, 32, 32));
  }
}

// ---------------- 설정 ----------------
class OptionsScreen extends Win {
  constructor() { super(); this.i = 0; }
  get rows() {
    const o = Player.options;
    return [
      ['텍스트 속도', ['느림', '보통', '빠름'][o.textSpeed ?? 1], d => o.textSpeed = clamp((o.textSpeed ?? 1) + d, 0, 2)],
      ['대화창 모양', String(o.skin || 1), d => o.skin = ((o.skin || 1) - 1 + d + 20) % 20 + 1],
      ['동료 포켓몬', o.follower !== false ? '함께 걷기' : '끄기', d => o.follower = !(o.follower !== false)],
      ['배경 음악', Math.round(Audio2.vol * 10) + '', d => { Audio2.vol = clamp(Math.round(Audio2.vol * 10 + d) / 10, 0, 1); o.bgmVol = Audio2.vol; if (Audio2.bgm) Audio2.bgm.volume = Audio2.vol; }],
      ['효과음', Math.round(Audio2.seVol * 10) + '', d => { Audio2.seVol = clamp(Math.round(Audio2.seVol * 10 + d) / 10, 0, 1); o.seVol = Audio2.seVol; SE.cursor(); }],
      ['교체 질문', o.battleShift !== false ? '묻기' : '안 묻기', d => o.battleShift = !(o.battleShift !== false)],
      ['전투 메시지', o.autoBattleText ? '자동 넘김' : '버튼 넘김', d => o.autoBattleText = !o.autoBattleText],
    ];
  }
  update() {
    const n = this.rows.length;
    if (Input.rep('up')) { this.i = (this.i + n - 1) % n; SE.cursor(); }
    if (Input.rep('down')) { this.i = (this.i + 1) % n; SE.cursor(); }
    if (Input.rep('left')) { this.rows[this.i][2](-1); SE.cursor(); }
    if (Input.rep('right')) { this.rows[this.i][2](1); SE.cursor(); }
    if (Input.trig('B') || Input.trig('A')) { SE.cancel(); this.close(); }
  }
  draw(ctx) {
    if (Game.world) Game.world.draw(ctx);
    drawWindow(ctx, 16, 16, 480, 352, CHOICE_SKIN);
    text(ctx, '설정', 40, 34, { size: 26 });
    this.rows.forEach((r, i) => {
      const y = 76 + i * 33;
      if (i === this.i) drawCursorArrow(ctx, 36, y + 2);
      text(ctx, r[0], 60, y, { size: 22 });
      text(ctx, '◀ ' + r[1] + ' ▶', 440, y, { size: 22, align: 'right', color: i === this.i ? '#e05030' : '#484848' });
    });
    const pc = drawSpeechWindow(ctx, 30, 306, 452, 54);
    text(ctx, '대화창 모양 미리보기', 52, 322, { size: 20, color: pc, shadow: pc === '#f8f8f8' ? '#303030' : '#d0d0c8' });
  }
}

// ---------------- 시작 메뉴 ----------------
class StartMenu extends Win {
  constructor() { super(); this.i = StartMenu.last || 0; this.busy = false; }
  get items() {
    const a = [];
    if (Flags.has('pokedex')) a.push(['포켓몬 도감', 'dex']);
    if (Player.party.length) a.push(['포켓몬', 'party']);
    a.push(['가방', 'bag'], [Player.name, 'card'], ['저장', 'save'], ['설정', 'options'], ['닫기', 'close']);
    return a;
  }
  update() {
    if (this.busy) return;
    const n = this.items.length;
    if (Input.rep('up')) { this.i = (this.i + n - 1) % n; SE.cursor(); }
    if (Input.rep('down')) { this.i = (this.i + 1) % n; SE.cursor(); }
    if (Input.trig('B') || Input.trig('menu')) { SE.cancel(); this.close(); return; }
    if (Input.trig('A')) {
      StartMenu.last = this.i; SE.ok();
      const k = this.items[this.i][1];
      if (k === 'close') { this.close(); return; }
      this.busy = true;
      this.run(k).finally(() => this.busy = false);
    }
  }
  async run(k) {
    if (k === 'dex') await Game.open(new DexScreen());
    if (k === 'party') await Game.open(new PartyScreen({ mode: 'field' }));
    if (k === 'bag') await Game.open(new BagScreen({ mode: 'field' }));
    if (k === 'card') { Audio2.se('GUI trainer card open'); await Game.open(new TrainerCard()); }
    if (k === 'options') { await Game.open(new OptionsScreen()); SaveSys.saveOptions(); }
    if (k === 'save') {
      const ok = await yesNo('지금까지의 모험을 기록하겠습니까?');
      if (ok) { SaveSys.save(); Audio2.se('GUI save choice'); await say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' 레포트에 확실히 기록했다!'); }
    }
  }
  draw(ctx) {
    const it = this.items, sp = Math.min(36, Math.floor(340 / it.length)), w = 200, h = it.length * sp + 28, x = 512 - w - 4, y = 4;
    drawWindow(ctx, x, y, w, h, CHOICE_SKIN);
    it.forEach((o, i) => text(ctx, o[0], x + 40, y + 14 + i * sp, { size: sp < 34 ? 22 : 24 }));
    drawCursorArrow(ctx, x + 16, y + 14 + this.i * sp);
    // 하단 정보
    drawWindow(ctx, 4, 4, 210, 50, CHOICE_SKIN);
    text(ctx, (Game.world ? Game.world.def.name : ''), 20, 16, { size: 20 });
  }
}
