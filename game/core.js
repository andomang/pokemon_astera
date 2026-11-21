// ============================================================
// core.js - 에셋 로딩, 입력, 사운드, 텍스트, 공용 유틸
// ============================================================
'use strict';

// 어나더레드 에셋 폴더 위치 (index.html 기준 상대경로)
const ASSET_ROOT = '../Pokemon Another Red_PWT_250821/';
const SCREEN_W = 512, SCREEN_H = 384, TILE = 32;

const GD = window.GAMEDATA;
const SPECIES = GD.species, MOVES = GD.moves, TYPES = GD.types, ITEMS = GD.items;
const SPECIES_LIST = Object.keys(SPECIES).filter(k => !SPECIES[k].form).sort((a, b) => SPECIES[a].n - SPECIES[b].n);
const isLegendary = s => (SPECIES[s].fl || []).includes('Legendary');
const isMythical = s => (SPECIES[s].fl || []).includes('Mythical');
const isSpecial = s => isLegendary(s) || isMythical(s) || (SPECIES[s].fl || []).some(f => f === 'UltraBeast' || f === 'Paradox');
const baseOf = s => (SPECIES[s] && SPECIES[s].base) || s;
// 폼 검색: 메가스톤/거다이맥스/원시회귀
const FORM_INDEX = { mega: {}, gmax: {} };
for (const k in SPECIES) {
  const d = SPECIES[k]; if (!d.form) continue;
  if (d.mega) FORM_INDEX.mega[d.base + '|' + d.mega] = k;
  if (d.megamove) FORM_INDEX.mega[d.base + '|' + d.megamove] = k;
  if (d.gmax) FORM_INDEX.gmax[d.base] = k;
}
// 시드 난수
function seededRng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function assetURL(p) {
  return encodeURI(ASSET_ROOT + p).replace(/#/g, '%23').replace(/'/g, '%27');
}

// ---------------- 이미지 ----------------
const IMG = {};
function img(path) {
  let e = IMG[path];
  if (!e) {
    e = IMG[path] = { im: new Image(), ok: false, err: false };
    e.im.onload = () => { e.ok = true; };
    e.im.onerror = () => { e.err = true; };
    e.im.src = assetURL(path);
  }
  return e.ok ? e.im : null;
}
function imgReady(path) { img(path); const e = IMG[path]; return e.ok || e.err; }
function imgFailed(path) { img(path); return IMG[path].err; }
function preload(paths) {
  return new Promise(res => {
    paths.forEach(p => img(p));
    const t0 = performance.now();
    const chk = () => {
      if (paths.every(imgReady) || performance.now() - t0 > 8000) res();
      else setTimeout(chk, 30);
    };
    chk();
  });
}
// 이미지 그리기 (로드 전이면 생략)
function drawImg(ctx, path, sx, sy, sw, sh, dx, dy, dw, dh) {
  const im = img(path);
  if (!im) return false;
  if (sw === undefined) { ctx.drawImage(im, sx, sy); return true; }
  if (dx === undefined) { ctx.drawImage(im, sx, sy, sw, sh); return true; }
  ctx.drawImage(im, sx, sy, sw, sh, dx, dy, dw ?? sw, dh ?? sh);
  return true;
}

// ---------------- 포켓몬 스프라이트 경로 ----------------
function monSpritePath(kind, species, shiny) {
  // kind: Front | Back | Icons | Followers
  const base = kind === 'Followers' ? 'Graphics/Characters/Followers' + (shiny ? ' shiny' : '') + '/'
    : 'Graphics/Pokemon/' + kind + (shiny ? ' shiny' : '') + '/';
  const p = base + species + '.png';
  if (shiny && imgFailed(p)) return monSpritePath(kind, species, false);
  if (imgFailed(p)) return kind === 'Followers' ? null : 'Graphics/Pokemon/' + kind + '/000.png';
  return p;
}
// 애니메이션 스트립(프레임=정사각형) 그리기
function drawMonSprite(ctx, kind, species, shiny, cx, by, scale, frameTick, opts = {}) {
  const p = monSpritePath(kind, species, shiny);
  const im = p && img(p);
  if (!im) return;
  const fh = im.height, nf = Math.max(1, Math.floor(im.width / fh));
  const f = opts.still ? 0 : Math.floor(frameTick / 3) % nf;
  const s = scale * (opts.sizeMul || 1);
  const w = fh * s, h = fh * s;
  ctx.save();
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  if (opts.flash) ctx.filter = 'brightness(3)';
  else if (opts.glow) ctx.filter = 'drop-shadow(0 0 4px ' + opts.glow + ') drop-shadow(0 0 8px ' + opts.glow + ')';
  ctx.drawImage(im, f * fh, 0, fh, fh, Math.round(cx - w / 2), Math.round(by - h), Math.round(w), Math.round(h));
  ctx.restore();
}
function drawMonIcon(ctx, species, shiny, x, y, tick, still) {
  const p = monSpritePath('Icons', species, shiny);
  const im = p && img(p);
  if (!im) return;
  const n = Math.max(1, Math.floor(im.width / im.height));
  const f = still ? 0 : Math.floor(tick / 12) % n;
  ctx.drawImage(im, f * im.height, 0, im.height, im.height, x, y, im.height, im.height);
}

// ---------------- 입력 ----------------
const Input = {
  held: {}, pressed: {}, pending: {}, repeatT: {},
  map: {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    KeyZ: 'A', Space: 'A', Enter: 'A', KeyC: 'A',
    KeyX: 'B', Escape: 'B', Backspace: 'B',
    ShiftLeft: 'run', ShiftRight: 'run',
    KeyQ: 'L', KeyE: 'R', KeyM: 'menu'
  },
  init() {
    addEventListener('keydown', e => {
      const ae = document.activeElement;
      if (ae && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)) return;
      if (window.KeyCapture && window.KeyCapture(e)) { e.preventDefault(); return; }
      const k = this.map[e.code];
      if (!k) return;
      e.preventDefault();
      if (!this.held[k]) { this.pending[k] = true; this.repeatT[k] = 0; }
      this.held[k] = true;
      Audio2.unlock();
    });
    addEventListener('keyup', e => {
      const k = this.map[e.code];
      if (k) this.held[k] = false;
    });
    addEventListener('blur', () => { this.held = {}; });
    addEventListener('pointerdown', () => Audio2.unlock());
  },
  // 프레임 시작 시 호출: 이번 프레임의 입력을 고정 (비동기 스크립트도 같은 프레임 입력을 봄)
  beginFrame() {
    this.pressed = this.pending; this.pending = {};
    for (const k in this.held) this.repeatT[k] = this.held[k] ? (this.repeatT[k] || 0) + 1 : 0;
  },
  // 가상 키 입력 (테스트/터치용)
  press(k) { this.pending[k] = true; },
  trig(k) { return !!this.pressed[k]; },
  // 메뉴용 키 반복
  rep(k) {
    if (this.pressed[k]) return true;
    const t = this.repeatT[k] || 0;
    return this.held[k] && t > 18 && t % 4 === 0;
  },
  dir() {
    for (const d of ['up', 'down', 'left', 'right']) if (this.held[d]) return d;
    return null;
  },
  consume() { this.pressed = {}; }
};

// ---------------- 사운드 ----------------
const Audio2 = {
  bgm: null, bgmName: null, me: null, unlocked: false, vol: 0.5, seVol: 0.6,
  pendingBGM: null, cache: {},
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.pendingBGM) { const n = this.pendingBGM; this.pendingBGM = null; this.bgmName = null; this.playBGM(n); }
  },
  playBGM(name) {
    if (!name) { this.stopBGM(); return; }
    if (this.bgmName === name && this.bgm) return;
    this.stopBGM();
    this.bgmName = name;
    if (!this.unlocked) { this.pendingBGM = name; return; }
    const a = new Audio(assetURL('Audio/BGM/' + name + '.ogg'));
    a.loop = true; a.volume = this.vol;
    a.play().catch(() => { });
    this.bgm = a;
  },
  stopBGM() {
    if (this.bgm) { this.bgm.pause(); this.bgm = null; }
    this.bgmName = null;
  },
  fadeBGM(ms = 600) {
    const a = this.bgm; if (!a) return;
    this.bgm = null; this.bgmName = null;
    const v0 = a.volume, t0 = performance.now();
    const step = () => {
      const t = (performance.now() - t0) / ms;
      if (t >= 1) { a.pause(); return; }
      a.volume = v0 * (1 - t); requestAnimationFrame(step);
    };
    step();
  },
  se(name, vol = 1, folder = 'SE') {
    if (!this.unlocked) return null;
    const a = new Audio(assetURL('Audio/' + folder + '/' + name + (name.includes('.') ? '' : '.ogg')));
    a.volume = Math.min(1, this.seVol * vol);
    a.play().catch(() => { });
    return a;
  },
  cry(species, vol = 1) {
    const sp = SPECIES[species] && SPECIES[species].form ? SPECIES[species].base : species;
    return this.se('Cries/' + sp, vol);
  },
  // 효과 음악(ME): BGM 일시정지 후 재생, 끝나면 재개
  playME(name) {
    return new Promise(res => {
      if (!this.unlocked) { res(); return; }
      const bg = this.bgm;
      if (bg) bg.pause();
      const a = new Audio(assetURL('Audio/ME/' + name + '.ogg'));
      a.volume = this.vol;
      let done = false;
      const fin = () => { if (done) return; done = true; if (bg && this.bgm === bg) bg.play().catch(() => { }); res(); };
      a.onended = fin; a.onerror = fin;
      setTimeout(fin, 9000);
      a.play().catch(fin);
    });
  }
};
const SE = {
  cursor: () => Audio2.se('GUI sel cursor', 0.7),
  ok: () => Audio2.se('GUI sel decision', 0.8),
  cancel: () => Audio2.se('GUI sel cancel', 0.8),
  buzz: () => Audio2.se('GUI sel buzzer', 0.8),
  menu: () => Audio2.se('GUI menu open', 0.8),
  bump: () => Audio2.se('Player bump', 0.6),
  door: () => Audio2.se('Door enter', 0.8),
  exitDoor: () => Audio2.se('Door exit', 0.8),
  exclaim: () => Audio2.se('Exclaim', 0.9),
};

// ---------------- 텍스트 ----------------
const FONT = '"PowerGreen", "DungGeunMo", "Malgun Gothic", monospace';
// 글꼴 불러오기: 시작을 오래 막지 않게
//   - 게임 글꼴(PowerGreen, 약 3.7MB)은 최대 2.5초까지만 기다리고 시작 (늦게 와도 도착하는 즉시 화면에 반영 — 매 프레임 다시 그림)
//   - 보조 글꼴(둥근모꼴, 약 1.5MB)은 기다리지 않고 뒤에서 받음
//   (예전엔 두 글꼴 약 5MB를 다 받을 때까지 타이틀이 안 떴음)
function loadFonts() {
  const load = (name, url) => new FontFace(name, 'url("' + url + '")').load().then(ff => document.fonts.add(ff)).catch(() => null);
  const main = load('PowerGreen', assetURL('Fonts/power green.ttf'));
  setTimeout(() => load('DungGeunMo', 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/DungGeunMo.woff'), 0);
  return Promise.race([main, new Promise(r => setTimeout(r, 2500))]);
}
function setFont(ctx, size) { ctx.font = size + 'px ' + FONT; }
// 그림자 있는 텍스트 (포켓몬 스타일)
function text(ctx, s, x, y, opt = {}) {
  const size = opt.size || 22;
  setFont(ctx, size);
  ctx.textBaseline = 'top';
  ctx.textAlign = opt.align || 'left';
  const col = opt.color || '#484848', sh = opt.shadow === undefined ? '#d0d0c8' : opt.shadow;
  if (sh) { ctx.fillStyle = sh; ctx.fillText(s, x + 2, y); ctx.fillText(s, x, y + 2); ctx.fillText(s, x + 2, y + 2); }
  ctx.fillStyle = col;
  ctx.fillText(s, x, y);
  ctx.textAlign = 'left';
}
const WHITE_TEXT = { color: '#f8f8f8', shadow: '#383838' };
function textW(ctx, s, size = 22) { setFont(ctx, size); return ctx.measureText(s).width; }
// 폭에 맞게 글자 크기를 줄여서 출력
function textFit(ctx, s, x, y, maxW, opt = {}) {
  let size = opt.size || 22;
  while (size > 12 && textW(ctx, s, size) > maxW) size--;
  text(ctx, s, x, y + Math.floor(((opt.size || 22) - size) / 2), { ...opt, size });
  return textW(ctx, s, size);
}
// 줄바꿈
function wrapText(ctx, s, maxW, size = 22) {
  setFont(ctx, size);
  const out = [];
  for (const para of String(s).split('\n')) {
    let line = '';
    for (const word of para.split(/(\s+)/)) {
      if (!word) continue;
      const test = line + word;
      if (ctx.measureText(test).width > maxW && line.trim()) {
        out.push(line.trimEnd());
        line = word.trimStart();
        // 단어 하나가 너무 길면 글자 단위로 자름
        while (ctx.measureText(line).width > maxW) {
          let i = line.length;
          while (i > 1 && ctx.measureText(line.slice(0, i)).width > maxW) i--;
          out.push(line.slice(0, i)); line = line.slice(i);
        }
      } else line = test;
    }
    out.push(line.trimEnd());
  }
  return out;
}

// 9-slice 창 (Windowskins/choice N, speech N)
function drawWindow(ctx, x, y, w, h, skin = 'Graphics/Windowskins/choice 1.png') {
  const im = img(skin);
  if (!im) {
    ctx.fillStyle = '#f8f8f8'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#506070'; ctx.lineWidth = 4; ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    return;
  }
  const c = Math.floor(im.width / 3), mW = im.width - 2 * c, mH = im.height - 2 * c;
  const sx = [0, c, im.width - c], sw = [c, mW, c];
  const dx = [x, x + c, x + w - c], dw = [c, w - 2 * c, c];
  const sy = [0, c, im.height - c], sh = [c, mH, c];
  const dy = [y, y + c, y + h - c], dh = [c, h - 2 * c, c];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
    if (dw[i] > 0 && dh[j] > 0) ctx.drawImage(im, sx[i], sy[j], sw[i], sh[j], dx[i], dy[j], dw[i], dh[j]);
  }
}
function drawCursorArrow(ctx, x, y) {
  if (!drawImg(ctx, 'Graphics/UI/sel_arrow.png', x, y)) {
    ctx.fillStyle = '#484848';
    ctx.beginPath(); ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + 14, y + 11); ctx.lineTo(x + 2, y + 20); ctx.fill();
  }
}

// ---------------- 유틸 ----------------
const rand = n => Math.floor(Math.random() * n);
const chance = p => Math.random() < p;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = arr => arr[rand(arr.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
function frames(n) { return new Promise(r => Game.waitFrames(n, r)); }
function typeName(t) { return (TYPES[t] && TYPES[t].name) || t; }
function itemName(id) { return (ITEMS[id] && ITEMS[id].name) || id; }
function moveName(id) { return (MOVES[id] && MOVES[id].name) || id; }
function speciesName(id) { return (SPECIES[id] && SPECIES[id].name) || id; }
// 받침 유무로 조사 선택: josa('피카츄','이','가')
const DIGIT_READ = { '0': '영', '1': '일', '2': '이', '3': '삼', '4': '사', '5': '오', '6': '육', '7': '칠', '8': '팔', '9': '구' };
function josa(word, a, b) {
  const s = String(word);
  let last = s[s.length - 1];
  if (DIGIT_READ[last]) {
    last = DIGIT_READ[last];
    if (/[1-9]0$/.test(s)) last = '십';
    if (/[1-9]00$/.test(s)) last = '백';
    if (/[1-9]000$/.test(s)) last = '천';
  }
  const c = last.charCodeAt(0);
  if (c < 0xac00 || c > 0xd7a3) return s + b;
  const jong = (c - 0xac00) % 28;
  if (a === '으로' && jong === 8) return s + b; // ㄹ받침 + 로
  return s + (jong ? a : b);
}
const J = {
  iga: w => josa(w, '이', '가'), eunneun: w => josa(w, '은', '는'), eulreul: w => josa(w, '을', '를'),
  wagwa: w => josa(w, '과', '와'), ro: w => josa(w, '으로', '로'), a: w => josa(w, '아', '야')
};
// 타입 아이콘 (UI/types.png: 64x28 한 줄씩, 한국어)
function drawTypeIcon(ctx, type, x, y) {
  const t = TYPES[type]; if (!t) return;
  drawImg(ctx, 'Graphics/UI/types.png', 0, t.icon * 28, 64, 28, x, y, 64, 28);
}
// 상태이상 아이콘 (UI/statuses.png: 44x16, 잠듦/독/화상/마비/얼음/졸음/동상/기절/포케러스)
const STATUS_ICON = { SLP: 0, PSN: 1, TOX: 1, BRN: 2, PAR: 3, FRZ: 4, FNT: 7 };
function drawStatusIcon(ctx, st, x, y) {
  if (!st || STATUS_ICON[st] === undefined) return;
  drawImg(ctx, 'Graphics/UI/statuses.png', 0, STATUS_ICON[st] * 16, 44, 16, x, y, 44, 16);
}
const TYPE_COLORS = {
  NORMAL: '#A8A77A', FIRE: '#EE8130', WATER: '#6390F0', ELECTRIC: '#F7D02C', GRASS: '#7AC74C', ICE: '#96D9D6',
  FIGHTING: '#C22E28', POISON: '#A33EA1', GROUND: '#E2BF65', FLYING: '#A98FF3', PSYCHIC: '#F95587', BUG: '#A6B91A',
  ROCK: '#B6A136', GHOST: '#735797', DRAGON: '#6F35FC', DARK: '#705746', STEEL: '#B7B7CE', FAIRY: '#D685AD', STELLAR: '#40B5A5'
};
