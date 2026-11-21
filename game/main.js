// ============================================================
// main.js - 게임 루프, 플레이어 데이터, 오버월드, 스크립트, 타이틀/오프닝, 저장
// ============================================================
'use strict';

// ---------------- 플레이어 / 플래그 ----------------
function newPlayer() {
  return {
    name: '레오', gender: 'M', id: rand(65536), money: 3000, badges: [], party: [], boxes: [[], [], [], [], [], [], [], []],
    bag: { POTION: 1 }, seen: {}, caught: {}, flags: {}, defeated: {}, itemsTaken: {},
    map: 'HOME', x: 9, y: 8, dir: 'down', returnPoint: null, lastHeal: { map: 'HOME', x: 9, y: 8, ret: null },
    repel: 0, playTime: 0, started: '', options: loadOptions()
  };
}
function loadOptions() {
  try { const o = JSON.parse(localStorage.getItem('astera_opts') || 'null'); if (o) return o; } catch (e) { }
  return { textSpeed: 1, skin: 1, follower: true, battleShift: true, autoBattleText: false };
}
let Player = newPlayer();
const Flags = {
  has: k => !!Player.flags[k],
  get: k => Player.flags[k],
  set: (k, v = true) => { Player.flags[k] = v; }
};

// ---------------- 저장 ----------------
const SaveSys = {
  get KEY() { return 'astera_save_v1' + (window.Account && Account.user ? '_' + Account.user : ''); },
  exists() { try { return !!localStorage.getItem(this.KEY); } catch (e) { return false; } },
  save() {
    const w = Game.world;
    const p = { ...Player, party: Player.party.map(m => m.toJSON()), boxes: Player.boxes.map(b => b.map(m => m.toJSON())) };
    if (w) { p.map = w.key; p.x = w.player.x; p.y = w.player.y; p.dir = w.player.dir; }
    try { localStorage.setItem(this.KEY, JSON.stringify(p)); } catch (e) { console.error(e); }
    this.saveOptions();
  },
  saveOptions() { try { localStorage.setItem('astera_opts', JSON.stringify(Player.options)); } catch (e) { } },
  load() {
    const p = JSON.parse(localStorage.getItem(this.KEY));
    p.party = p.party.map(Mon.fromJSON);
    p.boxes = p.boxes.map(b => b.map(Mon.fromJSON));
    p.options = { ...loadOptions(), ...(p.options || {}) };
    Player = Object.assign(newPlayer(), p);
    if (Player.options.bgmVol !== undefined) Audio2.vol = Player.options.bgmVol;
    if (Player.options.seVol !== undefined) Audio2.seVol = Player.options.seVol;
  }
};

// ---------------- 게임 루프 ----------------
const Game = {
  canvas: null, ctx: null, tick: 0, ui: [], scene: null, world: null, waiters: [],
  fadeA: 0, flashA: 0, lastT: 0,
  open(win) { return new Promise(res => { win._res = res; this.ui.push(win); }); },
  closeWin(win, v) { const i = this.ui.indexOf(win); if (i >= 0) this.ui.splice(i, 1); Input.consume(); if (win._res) { const r = win._res; win._res = null; r(v); } },
  closeAllUI() { while (this.ui.length) this.closeWin(this.ui[this.ui.length - 1]); },
  waitFrames(n, cb) { this.waiters.push({ n, cb }); },
  async fade(to, n = 14) {
    const from = this.fadeA;
    for (let i = 1; i <= n; i++) { this.fadeA = from + (to - from) * i / n; await frames(1); }
    this.fadeA = to;
  },
  async flash(times = 3) {
    for (let k = 0; k < times; k++) {
      for (let i = 0; i < 6; i++) { this.flashA = i / 5; await frames(1); }
      for (let i = 0; i < 6; i++) { this.flashA = 1 - i / 5; await frames(1); }
    }
    this.flashA = 0;
  },
  speed: 1, acc: 0,
  async frame(now) {
    requestAnimationFrame(t => this.frame(t));
    // 이전 프레임의 스텝을 아직 처리 중이면 이번 프레임은 시간만 쌓고 넘어감 (겹쳐 돌지 않게)
    const dt = Math.min(100, now - (this.lastT || now));
    this.lastT = now;
    this.acc += dt * this.speed;
    if (this._stepping) return;
    this._stepping = true;
    try {
      // 고정 타임스텝(60Hz) + 배속: 프레임이 밀리거나 건너뛰지 않도록 누적 방식
      let steps = 0;
      while (this.acc >= 1000 / 60 && steps < 8 * 4) {
        this.acc -= 1000 / 60; this.step(); steps++;
        // 배속(2배 이상)이면 한 화면 프레임에 스텝이 여러 번 돎.
        // 스텝마다 비동기 스크립트(전투 메시지 등)가 이어서 실행될 틈을 줘야 그 스텝의 키 입력을 볼 수 있음.
        // (예전엔 스텝을 몰아서 돈 뒤에 스크립트가 실행돼 Z 입력이 사라짐 → 4배속에서 "승부를 걸어왔다!"에서 멈춤)
        if (this.waitersWoke && this.acc >= 1000 / 60) await yieldToScripts();
      }
      if (steps) this.draw();
    } finally { this._stepping = false; }
  },
  step() {
    this.tick++;
    Input.beginFrame();
    const ws = this.waiters; this.waiters = [];
    this.waitersWoke = false;
    for (const w of ws) { if (--w.n <= 0) { w.cb(); this.waitersWoke = true; } else this.waiters.push(w); }
    try {
      if (this.ui.length) this.ui[this.ui.length - 1].update();
      if (this.scene && this.scene.update) this.scene.update(this.ui.length === 0);
      if (this.world) Player.playTime += 1 / 60;
    } catch (e) { console.error(e); }
  },
  draw() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (this.scene) this.scene.draw(ctx);
    for (const w of this.ui) w.draw(ctx);
    if (this.fadeA > 0) { ctx.fillStyle = 'rgba(0,0,0,' + this.fadeA + ')'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
    if (this.flashA > 0) { ctx.fillStyle = 'rgba(255,255,255,' + this.flashA + ')'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
  }
};

// 대기 중이던 비동기 스크립트(await frames(...) 뒤 코드)가 끝까지 실행되도록 잠깐 양보
// MessageChannel 메시지는 마이크로태스크(Promise 이어짐)가 모두 끝난 뒤에 도착하므로 setTimeout보다 빠르고 확실함
const _yieldCh = new MessageChannel(); const _yieldQ = [];
_yieldCh.port1.onmessage = () => { const r = _yieldQ.shift(); if (r) r(); };
function yieldToScripts() { return new Promise(r => { _yieldQ.push(r); _yieldCh.port2.postMessage(0); }); }

// ---------------- 캐릭터 ----------------
const DIRS = { down: [0, 1], left: [-1, 0], right: [1, 0], up: [0, -1] };
const DIR_ROW = { down: 0, left: 1, right: 2, up: 3 };
const OPP = { down: 'up', up: 'down', left: 'right', right: 'left' };
class Char {
  constructor(o) {
    Object.assign(this, o);
    this.x = o.x; this.y = o.y; this.px = 0; this.py = 0; // 이동 중 픽셀 오프셋
    this.dir = o.dir || 'down'; this.moving = false; this.anim = 0; this.speed = 2;
    this.ox = o.x; this.oy = o.y; this.timer = 60 + rand(120);
    this.visible = true; this.emote = null;
  }
  get spritePath() {
    if (!this.sprite) return null;
    if (this.follower || this.sprite.startsWith('Graphics/')) return this.sprite;
    return 'Graphics/Characters/' + this.sprite + '.png';
  }
  startMove(dir, speed) {
    this.dir = dir; const [dx, dy] = DIRS[dir];
    this.x += dx; this.y += dy; this.px = -dx * TILE; this.py = -dy * TILE;
    this.moving = true; this.speed = speed || 2;
  }
  update() {
    if (this.moving) {
      const s = this.speed;
      if (this.px) this.px += this.px > 0 ? -s : s;
      if (this.py) this.py += this.py > 0 ? -s : s;
      this.anim += s;
      if (this.px === 0 && this.py === 0) { this.moving = false; }
    } else if (!this.follower) this.anim = 0;
    if (this.follower && !this.moving) this.anim += 0.5;
  }
  draw(ctx, camX, camY) {
    if (!this.visible || !this.sprite) return;
    const im = img(this.spritePath);
    if (!im) return;
    const fw = im.width / 4, fh = im.height / 4;
    const pattern = (this.moving || this.follower) ? Math.floor(this.anim / 16) % 4 : 0;
    const sx = pattern * fw, sy = DIR_ROW[this.dir] * fh;
    const dx = Math.round(this.x * TILE + this.px - camX + 16 - fw / 2);
    const dy = Math.round(this.y * TILE + this.py - camY + 32 - fh + (this.follower ? 8 : 0));
    if (this.aura) { ctx.save(); ctx.filter = 'drop-shadow(0 0 ' + (4 + 3 * Math.sin(Game.tick / 10)) + 'px ' + this.aura + ') drop-shadow(0 0 6px ' + this.aura + ')'; ctx.drawImage(im, sx, sy, fw, fh, dx, dy, fw, fh); ctx.restore(); }
    else ctx.drawImage(im, sx, sy, fw, fh, dx, dy, fw, fh);
    // 말풍선(!) 위치만 기억해 두고, 그리기는 World.draw 맨 마지막에 (벽·지붕 같은 위층 타일에 가려지지 않게)
    this._emoteAt = this.emote ? [dx + fw / 2, dy - 6 + Math.min(0, this.emote.t - 8)] : null;
  }
  drawEmote(ctx) {
    if (!this.emote || !this._emoteAt || !this.visible) return;
    const [ex, ey] = this._emoteAt;
    drawWindow(ctx, ex - 14, ey - 30, 28, 30, CHOICE_SKIN);
    text(ctx, this.emote.c, ex, ey - 26, { size: 22, align: 'center', color: '#e03030', shadow: null });
  }
}

// ---------------- 오버월드 ----------------
class World {
  constructor() {
    this.key = null; this.map = null; this.def = null; this.chars = [];
    this.player = new Char({ x: 0, y: 0, sprite: 'boy_run', isPlayer: true });
    this.follower = null; this.busy = false; this.cam = { x: 0, y: 0 };
    this.mapCache = {}; this.nameShow = 0; this.turnDelay = 0; this.stepCount = 0;
  }
  isInterior(key) { return !!INTERIOR_DEFS[key]; }
  load(key, x, y, dir) {
    this.key = key;
    const interior = this.isInterior(key);
    this.def = interior ? INTERIOR_DEFS[key] : MAPS[key];
    if (!this.mapCache[key]) this.mapCache[key] = interior ? buildInteriorMap(this.def.tmpl) : buildOutdoorMap(this.def);
    this.map = this.mapCache[key];
    this.player.x = x; this.player.y = y; this.player.dir = dir || this.player.dir;
    this.player.px = this.player.py = 0; this.player.moving = false;
    this.player.sprite = Player.gender === 'F' ? 'girl_run' : 'boy_run';
    this.buildEvents();
    this.setupFollower(true);
    this.updateCamera();
    if (this.def.bgm !== null && this.def.bgm !== undefined) Audio2.playBGM(this.def.bgm);
    Player.map = key; Player.x = x; Player.y = y;
    if (!interior || this.def.name !== (this.lastShownName || '')) this.nameShow = 150;
    this.lastShownName = this.def.name;
  }
  buildEvents() {
    const d = this.def;
    this.chars = [];
    for (const n of d.npcs || []) {
      if (n.cond && !n.cond()) continue;
      this.chars.push(new Char({ ...n, kind: 'npc' }));
    }
    for (const t of d.trainers || []) {
      if (t.cond && !t.cond()) continue;
      this.chars.push(new Char({ ...t, sprite: 'trainer_' + t.sprite, kind: 'trainer', data: t }));
    }
    for (const e of d.specials || []) {
      if (e.cond && !e.cond()) continue;
      this.chars.push(new Char({ move: 'still', ...e, kind: 'npc' }));
    }
    for (const it of d.items || []) {
      if (Player.itemsTaken[it.id]) continue;
      this.chars.push(new Char({ ...it, sprite: 'Object ball', kind: 'item', move: 'still' }));
    }
    this.doors = [];
    for (const st of d.stamps || []) {
      if (!st[3]) continue;
      const s = STAMPS[st[0]];
      this.doors.push({ x: st[1] + s.door[0], y: st[2] + s.door[1], to: st[3] });
    }
  }
  refreshEvents() {
    const keep = this.chars;
    this.buildEvents();
    // 위치 유지
    for (const c of this.chars) { const o = keep.find(k => k.id === c.id); if (o) { c.x = o.x; c.y = o.y; c.dir = o.dir; } }
  }
  setupFollower(reset) {
    const lead = Player.party.find(m => !m.fainted);
    if (!lead || Player.options.follower === false) { this.follower = null; return; }
    const path = monSpritePath('Followers', lead.species, lead.shiny);
    if (!path) { this.follower = null; return; }
    if (!this.follower || reset) {
      const [dx, dy] = DIRS[OPP[this.player.dir]];
      let fx = this.player.x + dx, fy = this.player.y + dy;
      if (!this.map.passable(fx, fy, this.player.dir) || this.charAt(fx, fy)) { fx = this.player.x; fy = this.player.y; }
      this.follower = new Char({ x: fx, y: fy, sprite: path, follower: true, dir: this.player.dir });
      this.follower.hiddenUntilMove = fx === this.player.x && fy === this.player.y;
    }
    this.follower.sprite = path; this.follower.mon = lead;
  }
  isExitTile(x, y) {
    const d = this.def; if (!d.exit) return false;
    if (d.exit[0] === x && d.exit[1] === y) return true;
    return (d.exitAlt || []).some(e => e[0] === x && e[1] === y);
  }
  charAt(x, y, exclude) { return this.chars.find(c => c !== exclude && c.visible && !c.gone && (c.x === x && c.y === y)); }
  canMove(c, dir) {
    const [dx, dy] = DIRS[dir];
    const nx = c.x + dx, ny = c.y + dy;
    if (nx < 0 || ny < 0 || nx >= this.map.w || ny >= this.map.h) return false;
    if (!this.map.passable(c.x, c.y, dir) || !this.map.passable(nx, ny, OPP[dir])) return false;
    if (this.charAt(nx, ny, c)) return false;
    if (!c.isPlayer && this.player.x === nx && this.player.y === ny) return false;
    if (!c.isPlayer && this.follower && this.follower.x === nx && this.follower.y === ny) return false;
    if (!c.isPlayer && this.doors.some(d => d.x === nx && d.y === ny)) return false;
    return true;
  }
  updateCamera() {
    const p = this.player;
    const W = this.map.w * TILE, H = this.map.h * TILE;
    let cx = p.x * TILE + p.px + 16 - SCREEN_W / 2, cy = p.y * TILE + p.py + 16 - SCREEN_H / 2;
    cx = W <= SCREEN_W ? (W - SCREEN_W) / 2 : clamp(cx, 0, W - SCREEN_W);
    cy = H <= SCREEN_H ? (H - SCREEN_H) / 2 : clamp(cy, 0, H - SCREEN_H);
    this.cam.x = Math.round(cx); this.cam.y = Math.round(cy);
  }
  update(inputOK) {
    const p = this.player;
    // 캐릭터 업데이트
    const wasMoving = p.moving;
    p.update();
    if (this.follower) this.follower.update();
    for (const c of this.chars) {
      c.update();
      if (c.emote) { c.emote.t++; }
      if (!this.busy && inputOK && !c.moving && c.kind === 'npc') this.npcAI(c);
    }
    if (wasMoving && !p.moving) this.onStepEnd();
    this.updateCamera();
    if (this.nameShow > 0) this.nameShow--;
    if (!inputOK || this.busy || p.moving) return;
    // 메뉴
    if (Input.trig('B') || Input.trig('menu')) { SE.menu(); Game.open(new StartMenu()); return; }
    if (Input.trig('A')) { this.interact(); return; }
    const d = Input.dir();
    if (!d) { this.turnDelay = 0; this.wasWalking = false; return; }
    if (p.dir !== d && Input.pressed[d] && !this.wasWalking) { p.dir = d; this.turnDelay = 3; return; }
    if (this.turnDelay > 0) { this.turnDelay--; if (Input.held[d]) return; return; }
    this.wasWalking = true;
    this.tryMove(d);
  }
  npcAI(c) {
    if (c.move === 'still' || !c.sprite) return;
    if (--c.timer > 0) return;
    c.timer = 90 + rand(150);
    if (c.move === 'look') { c.dir = pick(['down', 'left', 'right', 'up']); return; }
    if (c.move === 'wander') {
      const d = pick(['down', 'left', 'right', 'up']);
      const [dx, dy] = DIRS[d];
      if (Math.abs(c.x + dx - c.ox) > 2 || Math.abs(c.y + dy - c.oy) > 2) { c.dir = d; return; }
      if (this.canMove(c, d)) c.startMove(d, 1); else c.dir = d;
    }
  }
  tryMove(d) {
    const p = this.player; p.dir = d;
    const [dx, dy] = DIRS[d];
    const nx = p.x + dx, ny = p.y + dy;
    // 맵 가장자리 → 연결된 맵
    if (nx < 0 || ny < 0 || nx >= this.map.w || ny >= this.map.h) {
      const side = nx < 0 ? 'west' : nx >= this.map.w ? 'east' : ny < 0 ? 'north' : 'south';
      const ex = this.def.exits && this.def.exits[side];
      if (ex) { this.runScript(() => this.edgeTransfer(side, ex)); return; }
      this.bump(); return;
    }
    // 실내 출구 (아래로 나가기)
    if (d === 'down' && this.isExitTile(nx, ny)) { this.runScript(() => this.exitInterior()); return; }
    // 문
    const door = this.doors.find(o => o.x === nx && o.y === ny);
    if (door && d === 'up') { this.runScript(() => this.enterDoor(door)); return; }
    if (!this.canMove(p, d)) {
      // 따라오는 포켓몬과 위치 교환
      this.bump(); return;
    }
    const run = Input.held.run;
    const oldX = p.x, oldY = p.y;
    p.startMove(d, run ? 4 : 2);
    if (run) p.sprite = Player.gender === 'F' ? 'girl_run' : 'boy_run';
    // 따라오는 포켓몬
    const f = this.follower;
    if (f) {
      if (f.hiddenUntilMove || (f.x === nx && f.y === ny)) { f.x = oldX; f.y = oldY; f.px = f.py = 0; f.hiddenUntilMove = false; f.dir = d; }
      else {
        const fdx = oldX - f.x, fdy = oldY - f.y;
        const fd = fdx > 0 ? 'right' : fdx < 0 ? 'left' : fdy > 0 ? 'down' : 'up';
        if (Math.abs(fdx) + Math.abs(fdy) === 1) f.startMove(fd, run ? 4 : 2);
        else { f.x = oldX; f.y = oldY; f.dir = d; }
      }
    }
  }
  bump() {
    if (!this._bumpT || Game.tick - this._bumpT > 20) { SE.bump(); this._bumpT = Game.tick; }
  }
  onStepEnd() {
    const p = this.player;
    Player.x = p.x; Player.y = p.y;
    this.stepCount++;
    if (Player.repel > 0) { Player.repel--; if (Player.repel === 0) this.runScript(async () => { await say('스프레이의 효과가 사라졌다...'); }); }
    // 실내 출구
    if (this.isExitTile(p.x, p.y)) { this.runScript(() => this.exitInterior()); return; }
    // 트리거
    for (const t of this.def.triggers || []) {
      if (p.x >= t.x && p.x < t.x + t.w && p.y >= t.y && p.y < t.y + t.h && (!t.cond || t.cond())) {
        this.runScript(() => SCRIPTS[t.run](this, t)); return;
      }
    }
    // 트레이너 시선
    if (this.checkTrainers()) return;
    // 배회 전설
    if (this.def.outdoor && this.map.terrain(p.x, p.y) === 2 && typeof roamCheck === 'function' && roamCheck(this)) return;
    // 야생 포켓몬
    if (this.def.encounters && this.map.terrain(p.x, p.y) === 2 && Player.party.some(m => !m.fainted)) {
      if (chance(0.09)) {
        const e = this.def.encounters;
        let sp;
        let special = false;
        if (e.any) {
          // 환상의 풀숲: 조우 1번당 3%는 전설·환상(isSpecial) 중 무작위, 97%는 일반 포켓몬 중 무작위
          // (예전엔 포획률 3 이하만 걸러서 뮤·레쿠쟈 등이 일반 확률로, 메타그로스는 희귀하게 나오던 문제 수정)
          if (!MEADOW_POOL.normal) { MEADOW_POOL.normal = SPECIES_LIST.filter(s => !isSpecial(s)); MEADOW_POOL.special = SPECIES_LIST.filter(s => isSpecial(s)); }
          special = chance(MEADOW_POOL.rate);
          sp = pick(special ? MEADOW_POOL.special : MEADOW_POOL.normal);
        } else {
          const tot = e.list.reduce((a, b) => a + b[1], 0);
          let r = Math.random() * tot;
          for (const [s, w] of e.list) { r -= w; if (r <= 0) { sp = s; break; } }
          sp = sp || e.list[0][0];
        }
        const lv = e.min + rand(e.max - e.min + 1);
        const lead = Player.party.find(m => !m.fainted);
        if (Player.repel > 0 && lead && lv < lead.level) return;
        if (Player.repel > 0 && lead && lv < lead.level) return;
        const fsp = typeof regionalForm === 'function' ? regionalForm(sp) : sp;
        if (special) {
          // 관리자 치트 "야생 포켓몬 안 나옴"이면 전설도 안 나옴
          if (typeof Cheats !== 'undefined' && Cheats.on('noWild')) return;
          // 전설·환상은 전설 전투 연출(음악·대사)로
          const d = SPECIES[sp];
          this.runScript(async () => {
            Audio2.cry(sp);
            await say('...!? 풀숲 깊은 곳에서 엄청난 기운이 느껴진다!');
            await startBattle({ type: 'wild', foe: [makeWild(fsp, lv)], legend: true, bgm: 'HGSS 143 Battle! (Gym Leader Johto)', legendText: '야생의 ' + J.iga(d.name) + ' 모습을 드러냈다!' });
          });
        } else this.runScript(() => wildBattle(fsp, lv));
      }
    }
  }
  checkTrainers() {
    for (const c of this.chars) {
      if (c.kind !== 'trainer' || Player.defeated[c.id]) continue;
      const [dx, dy] = DIRS[c.dir];
      for (let i = 1; i <= (c.sight || 4); i++) {
        const tx = c.x + dx * i, ty = c.y + dy * i;
        if (tx === this.player.x && ty === this.player.y) {
          this.runScript(() => trainerEncounter(this, c, i)); return true;
        }
        if (!this.map.passable(tx, ty, OPP[c.dir]) || this.charAt(tx, ty)) break;
      }
    }
    return false;
  }
  interact() {
    const p = this.player; const [dx, dy] = DIRS[p.dir];
    const fx = p.x + dx, fy = p.y + dy;
    let c = this.charAt(fx, fy);
    if (!c && !this.map.passable(fx, fy, OPP[p.dir])) c = this.charAt(fx + dx, fy + dy); // 카운터 너머
    if (c) { this.runScript(() => this.talkTo(c)); return; }
    if (this.follower && this.follower.x === fx && this.follower.y === fy && !this.follower.hiddenUntilMove) {
      this.runScript(async () => {
        const m = this.follower.mon; Audio2.cry(m.species);
        this.follower.dir = OPP[p.dir];
        const lines = [m.name + J.eunneun(m.name).slice(m.name.length) + ' 즐거운 듯 몸을 흔들고 있다!', m.name + J.eunneun(m.name).slice(m.name.length) + ' 당신을 가만히 바라보고 있다.', m.name + J.eunneun(m.name).slice(m.name.length) + ' 기분이 좋아 보인다!', m.name + J.eunneun(m.name).slice(m.name.length) + ' 주위를 두리번거리고 있다.'];
        if (m.hp < m.maxhp / 3) await say(m.name + J.eunneun(m.name).slice(m.name.length) + ' 지쳐 보인다...');
        else await say(pick(lines));
      });
      return;
    }
    const sign = (this.def.signs || []).find(s => s.x === fx && s.y === fy);
    if (sign) { this.runScript(() => say(sign.text)); return; }
  }
  async talkTo(c) {
    if (c.kind === 'item') {
      Player.itemsTaken[c.id] = true; c.gone = true; c.visible = false;
      const n = c.n || 1;
      Bag.add(c.item, n);
      Audio2.playME('Item get');
      await say(J.eunneun(Player.name) + ' ' + (n > 1 ? itemName(c.item) + ' ' + n + '개를' : J.eulreul(itemName(c.item))) + ' 손에 넣었다!');
      await say(itemName(c.item) + J.eunneun(itemName(c.item)).slice(itemName(c.item).length) + ' 가방의 "' + POCKETS.find(p => p[0] === pocketOf(c.item))[1] + '" 주머니에 넣었다.');
      return;
    }
    if (c.sprite && c.move !== 'still' || c.kind === 'trainer') c.dir = OPP[this.player.dir];
    if (c.kind === 'npc' && c.sprite && c.sprite !== 'Object ball' && c.move === 'still' && !c.fixedDir) c.dir = OPP[this.player.dir];
    if (c.kind === 'trainer') {
      if (Player.defeated[c.id]) { await say(c.data.after); return; }
      await trainerEncounter(this, c, 0); return;
    }
    if (c.script) { await SCRIPTS[c.script](this, c, c.arg); return; }
    if (c.text) await say(c.text);
  }
  runScript(fn) {
    if (this.busy) return;
    this.busy = true;
    Promise.resolve().then(fn).catch(e => console.error(e)).finally(() => { this.busy = false; });
  }
  async edgeTransfer(side, ex) {
    const p = this.player, target = MAPS[ex.to];
    const tm = this.mapCache[ex.to] || (this.mapCache[ex.to] = buildOutdoorMap(target));
    let nx = p.x, ny = p.y;
    const opp = { north: 'south', south: 'north', east: 'west', west: 'east' }[side];
    const me = this.def.exitPos || {}, them = target.exitPos || {};
    let dx = ex.dx, dy = ex.dy;
    if (dx === undefined && me[side] !== undefined && them[opp] !== undefined) { dx = them[opp] - me[side]; dy = dx; }
    if (side === 'north') { nx = p.x + (dx || 0); ny = tm.h - 1; }
    if (side === 'south') { nx = p.x + (dx || 0); ny = 0; }
    if (side === 'east') { nx = 0; ny = p.y + (dy || 0); }
    if (side === 'west') { nx = tm.w - 1; ny = p.y + (dy || 0); }
    nx = clamp(nx, 0, tm.w - 1); ny = clamp(ny, 0, tm.h - 1);
    if (!tm.passable(nx, ny, 'down') && !tm.passable(nx, ny, 'up')) {
      for (let k = 1; k < 6; k++) {
        const horiz = side === 'north' || side === 'south';
        const c1 = horiz ? [nx - k, ny] : [nx, ny - k], c2 = horiz ? [nx + k, ny] : [nx, ny + k];
        if (tm.passable(c1[0], c1[1], 'down') || tm.passable(c1[0], c1[1], 'up')) { [nx, ny] = c1; break; }
        if (tm.passable(c2[0], c2[1], 'down') || tm.passable(c2[0], c2[1], 'up')) { [nx, ny] = c2; break; }
      }
    }
    await Game.fade(1, 8);
    this.load(ex.to, nx, ny, p.dir);
    await Game.fade(0, 8);
  }
  async enterDoor(door) {
    SE.door();
    await Game.fade(1, 10);
    const d = INTERIOR_DEFS[door.to];
    Player.returnPoint = { map: this.key, x: door.x, y: door.y + 1 };
    this.load(door.to, d.exit[0], d.exit[1] - 1, 'up');
    await Game.fade(0, 10);
  }
  async exitInterior() {
    SE.exitDoor();
    await Game.fade(1, 10);
    const r = Player.returnPoint || { map: 'DAWN', x: 5, y: 7 };
    this.load(r.map, r.x, r.y, 'down');
    await Game.fade(0, 10);
  }
  async warpToHeal() {
    await Game.fade(1, 16);
    const h = Player.lastHeal;
    if (h.ret) Player.returnPoint = h.ret;
    this.load(h.map, h.x, h.y, 'up');
    await Game.fade(0, 16);
  }
  draw(ctx) {
    const { x: cx, y: cy } = this.cam;
    const anim = Game.tick;
    this.map.draw(ctx, cx, cy, anim, 'below');
    // 캐릭터 (y 순)
    const list = [...this.chars.filter(c => c.visible && !c.gone)];
    list.push(this.player);
    if (this.follower && !this.follower.hiddenUntilMove) list.push(this.follower);
    list.sort((a, b) => (a.y * TILE + a.py) - (b.y * TILE + b.py) || (a.follower ? -1 : 0));
    for (const c of list) c.draw(ctx, cx, cy);
    this.map.draw(ctx, cx, cy, anim, 'above');
    // 말풍선은 위층 타일보다 위에
    for (const c of list) c.drawEmote(ctx);
    this.drawWeather(ctx, cx, cy);
    // 지역 이름 표시
    if (this.nameShow > 0 && this.def.outdoor !== undefined) {
      const t = this.nameShow, y = t > 130 ? -50 + (150 - t) * 2.5 : (t < 20 ? -50 + t * 2.5 : 0);
      drawImg(ctx, 'Graphics/Windowskins/sign hgss loc.png', 0, 0, 512, 64, 0, y) || drawWindow(ctx, 0, y, 240, 50, CHOICE_SKIN);
      text(ctx, this.def.name, 20, y + 14, { size: 22 });
    } else if (this.nameShow > 0) {
      const t = this.nameShow, y = t > 130 ? -50 + (150 - t) * 2.5 : (t < 20 ? -50 + t * 2.5 : 0);
      drawWindow(ctx, 4, y + 4, 220, 46, CHOICE_SKIN);
      text(ctx, this.def.name, 20, y + 15, { size: 22 });
    }
  }
}

World.prototype.drawWeather = function (ctx, cx, cy) {
  const w = this.def.weather; if (!w) return;
  const t = Game.tick;
  const tile = (path, sx, sy, alpha) => {
    const im = img(path); if (!im) return;
    ctx.save(); ctx.globalAlpha = alpha;
    const ox = ((sx % im.width) + im.width) % im.width, oy = ((sy % im.height) + im.height) % im.height;
    for (let y = -oy; y < SCREEN_H; y += im.height) for (let x = -ox; x < SCREEN_W; x += im.width) ctx.drawImage(im, x, y);
    ctx.restore();
  };
  if (w === 'snow') { ctx.fillStyle = 'rgba(220,235,255,0.12)'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); tile('Graphics/Weather/blizzard_tile.png', cx - t * 2, cy - t * 3, 0.8); }
  if (w === 'sand') { ctx.fillStyle = 'rgba(200,150,70,0.18)'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); tile('Graphics/Weather/fog_tile.png', cx - t * 4, cy - t, 0.35); }
  if (w === 'rain') { ctx.fillStyle = 'rgba(30,40,90,0.18)'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); tile('Graphics/Weather/rain_1.png', cx - t * 3, cy - t * 9, 0.8); }
  if (w === 'fog') tile('Graphics/Fogs/foggy.jpg', cx + t * 0.5, cy, 0.25);
  if (w === 'rift') { ctx.fillStyle = 'rgba(80,0,120,' + (0.15 + 0.05 * Math.sin(t / 30)) + ')'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); tile('Graphics/Fogs/cloud.jpg', cx + t, cy + t * 0.3, 0.18); }
  if (w === 'ash') { ctx.fillStyle = 'rgba(90,40,20,0.15)'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); tile('Graphics/Weather/fog_tile.png', cx + t, cy - t * 2, 0.3); }
  if (w === 'night' || (this.def.outdoor && !isDay() && Player.options.dayNight !== false)) { ctx.fillStyle = 'rgba(20,20,70,0.28)'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
};

// 트레이너 팀 생성: [종, 레벨, {item, gmaxF, tera, moves}]
function buildTeam(team, iv = 15) {
  return team.map(([s, l, o]) => {
    const m = makeTrainerMon(s, l, iv);
    if (o) { if (o.moves) { m.moves = o.moves.map(Mon.makeMove); } Object.assign(m, { ...o, moves: m.moves }); }
    return m;
  });
}

// 캐릭터를 목표 지점까지 걷게 함
async function walkTo(w, c, x, y, speed = 2) {
  let guard = 50;
  while ((c.x !== x || c.y !== y) && guard-- > 0) {
    const d = c.x < x ? 'right' : c.x > x ? 'left' : c.y < y ? 'down' : 'up';
    c.startMove(d, speed);
    while (c.moving) await frames(1);
  }
}
async function walkSteps(c, dir, n, speed = 2) {
  for (let i = 0; i < n; i++) { c.startMove(dir, speed); while (c.moving) await frames(1); }
}
async function emote(c, ch = '!') {
  c.emote = { c: ch, t: 0 }; SE.exclaim();
  await frames(40); c.emote = null;
}

// ---------------- 전투 시작 ----------------
async function battleTransition() {
  await Game.flash(2);
  for (let i = 0; i <= 16; i++) { Game.fadeA = i / 16; await frames(1); }
}
async function startBattle(o) {
  const w = Game.world;
  const mapBGM = w && w.def.bgm;
  Audio2.playBGM(o.bgm || (o.type === 'wild' ? 'HGSS Battle' : 'Battle trainer'));
  await battleTransition();
  const b = new Battle({ ...o, bg: o.bg || (w && w.def.battleBg) || 'field' });
  // 필요한 이미지 미리 로드
  const pre = ['Graphics/Battlebacks/' + b.bg + '_bg.png', 'Graphics/UI/Battle/databox_normal.png', 'Graphics/UI/Battle/databox_normal_foe.png', 'Graphics/UI/Battle/overlay_message.png', 'Graphics/UI/Battle/overlay_command.png', 'Graphics/UI/Battle/cursor_command.png', 'Graphics/UI/Battle/overlay_hp.png'];
  o.foe.forEach(m => pre.push(monSpritePath('Front', m.species, m.shiny)));
  Player.party.forEach(m => pre.push(monSpritePath('Back', m.species, m.shiny)));
  if (o.trainer) pre.push('Graphics/Trainers/' + o.trainer.sprite + '.png');
  await preload(pre.filter(Boolean));
  Game.scene = b;
  await Game.fade(0, 10);
  const result = await b.run();
  await Game.fade(1, 16);
  Game.scene = w;
  Audio2.stopBGM();
  Game.fadeA = 0;
  // 전투 후 진화
  for (const [mon, evo] of b.evolveQueue) {
    if (!mon.fainted && mon.evolutionTarget('level') === evo) await Game.open(new EvolutionScene(mon, evo));
  }
  if (result === 'lose') {
    if (o.canLose) { Player.party.forEach(m => m.heal()); }
    else {
      Game.fadeA = 1;
      Player.party.forEach(m => m.heal());
      await w.warpToHeal();
      Audio2.playBGM(mapBGM);
      await say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' 서둘러 포켓몬을 회복시킬 수 있는 곳으로 돌아왔다...');
      w.setupFollower(true);
      return result;
    }
  }
  if (w) { Audio2.playBGM(w.def.bgm || mapBGM); w.setupFollower(false); w.updateCamera(); }
  return result;
}
// 환상의 풀숲 출현 풀 (처음 쓸 때 만듦). rate = 조우 1번당 전설·환상 확률
const MEADOW_POOL = { rate: 0.03, normal: null, special: null };
async function wildBattle(species, level) {
  const mon = makeWild(species, level);
  return await startBattle({ type: 'wild', foe: [mon] });
}
async function trainerEncounter(w, c, dist) {
  const t = c.data;
  if (dist > 0) {
    await emote(c, '!');
    // 플레이어 앞까지 걸어옴
    await walkSteps(c, c.dir, dist - 1, 2);
  }
  w.player.dir = OPP[c.dir];
  await say(t.before, { speaker: t.cls + ' ' + t.name });
  const foe = buildTeam(t.team, t.iv || 10);
  const r = await startBattle({ type: 'trainer', foe, bgm: t.bgm, trainer: { name: t.name, cls: t.cls, sprite: t.sprite, money: t.money, afterBattle: t.after, gimmick: t.gimmick, leader: t.boss } });
  if (r === 'win' && t.onWin) await t.onWin(w, c);
  if (r === 'win') Player.defeated[c.id] = true;
  return r;
}

// ---------------- 스크립트 ----------------
const SCRIPTS = {
  async blockNoStarter(w) {
    await say('잠깐! 포켓몬 없이 풀숲에 들어가면 위험해!\n한별 박사님 연구소에 먼저 들러 보렴!', { speaker: '마을 사람' });
    await walkSteps(w.player, 'down', 1);
  },
  async leagueGuard(w, c) {
    if (Player.badges.length >= 3) { await say('배지 3개를 확인했습니다!\n챔피언로드로 가는 길을 열어 드리죠. 행운을 빌어요!', { speaker: '경비원' }); Flags.set('guard_ok'); return; }
    await say('이 앞은 챔피언로드입니다.\n배지를 3개 이상 가진 트레이너만 지나갈 수 있어요.\n(현재 배지: ' + Player.badges.length + '개)', { speaker: '경비원' });
    if (c && c.kind !== 'npc') await walkSteps(w.player, 'down', 1);
  },
  async mom(w) {
    if (!Flags.has('starter')) {
      await say(['일어났구나, ' + Player.name + '!', '오늘 한별 박사님이 연구소로 오라고 하셨지?\n마을 남쪽 큰 건물이 연구소란다.', '카이는 벌써 나갔다더라. 서두르렴!'], { speaker: '엄마' });
      return;
    }
    await say('어머, 돌아왔구나! 조금 쉬었다 가렴.', { speaker: '엄마' });
    await Game.fade(1, 12);
    Player.party.forEach(m => m.heal());
    await Audio2.playME('Pkmn healing');
    await Game.fade(0, 12);
    await say('포켓몬들이 모두 건강해졌어! 힘내렴, ' + Player.name + '!', { speaker: '엄마' });
  },
  async professor(w) {
    const P = '한별 박사';
    if (!Flags.has('starter')) {
      if (!Flags.has('met_prof')) {
        Flags.set('met_prof');
        await say(['오, ' + Player.name + '! 기다리고 있었단다.', '나는 이 아스테라 지방의 포켓몬을 연구하는 한별이야.', '오늘부터 너도 포켓몬 트레이너가 되는 거란다!', '저기 테이블 위에 몬스터볼이 3개 있지?\n마음에 드는 포켓몬을 한 마리 골라 보렴!'], { speaker: P });
      } else await say('테이블 위의 몬스터볼에서 한 마리를 골라 보렴!', { speaker: P });
      return;
    }
    if (!Flags.has('pokedex')) { await SCRIPTS.givePokedex(w); return; }
    const n = Object.keys(Player.caught).length;
    if (Flags.has('champion')) await say(['챔피언이 되다니, 정말 대단하구나!', '리그 서쪽의 "환상의 풀숲"에는 전 세계의 포켓몬이 나타난다고 해.', '도감을 ' + SPECIES_LIST.length + '마리 모두 채워 보렴! 지금 ' + n + '마리야.'], { speaker: P });
    else await say(['도감은 잘 채우고 있니? 지금 ' + n + '마리를 잡았구나!', n < 10 ? '풀숲에서 포켓몬을 약하게 만든 뒤 몬스터볼을 던지면 잡을 수 있어.' : '훌륭해! 계속 힘내렴!'], { speaker: P });
  },
  async givePokedex(w) {
    const P = '한별 박사';
    await say(['좋아, 포켓몬과도 사이가 좋아 보이는구나!', '그럼 이걸 받으렴. 최신형 포켓몬 도감이야!'], { speaker: P });
    Audio2.playME('Key item get');
    await say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' 포켓몬 도감을 받았다!');
    Flags.set('pokedex');
    Bag.add('POKEBALL', 5);
    await say(['그리고 몬스터볼 5개도 줄게.', '도감을 채우는 것, 그리고 각 마을 체육관 관장을 이겨 배지를 모으는 것!', '배지 3개를 모으면 별빛 리그에 도전할 수 있단다.', '자, 1번도로를 지나 물보라시티로 가 보렴!'], { speaker: P });
  },
  async labRival(w) {
    if (!Flags.has('starter')) await say(['왔냐, ' + Player.name + '? 늦었잖아!', '박사님이 포켓몬을 주신대! 먼저 골라. 난 어른스러우니까.'], { speaker: RIVAL_NAME });
    else await say('흥, 다음엔 꼭 이긴다!', { speaker: RIVAL_NAME });
  },
  async starterBall(w, c, i) {
    const sp = STARTERS[i];
    const d = SPECIES[sp];
    const viewer = new MonViewer(sp);
    Game.ui.push(viewer);
    Audio2.cry(sp);
    const yes = await yesNo(d.t.map(typeName).join('/') + ' 타입의 ' + J.eulreul(d.name) + ' 고르겠니?', { speaker: '한별 박사' });
    Game.ui.splice(Game.ui.indexOf(viewer), 1);
    if (!yes) return;
    const mon = new Mon(sp, 5, { ot: Player.name, metMap: '한별 연구소', shiny: false });
    mon.ot = Player.name;
    Player.party.push(mon);
    Player.seen[sp] = true; Player.caught[sp] = true;
    Flags.set('starter'); Flags.set('starterId', sp);
    Audio2.playME('Pkmn get');
    await say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' 한별 박사에게서 ' + J.eulreul(d.name) + ' 받았다!');
    if (await yesNo(d.name + '에게 이름을 붙여 주겠니?')) { const n = await promptName(d.name + '의 이름', d.name); if (n && n !== d.name) mon.nickname = n; }
    w.refreshEvents(); w.setupFollower(true);
    // 라이벌
    const rival = w.chars.find(x => x.id === 'lab_rival');
    const rs = RIVAL_COUNTER[sp];
    await say('그럼 난 이 녀석으로 할게! ' + SPECIES[rs].name + ', 너로 정했다!', { speaker: RIVAL_NAME });
    await say(['잠깐, ' + Player.name + '!', '포켓몬을 받았으니 한 판 붙어 보자고!'], { speaker: RIVAL_NAME });
    if (rival) rival.dir = 'right';
    const foe = rivalTeam(1).map(([s, l]) => makeTrainerMon(s, l, 5));
    const r = await startBattle({ type: 'trainer', foe, trainer: { name: RIVAL_NAME, cls: '라이벌', sprite: 'COOLTRAINER_M', money: 300, afterBattle: '쳇, 제법인데?' }, bgm: 'XY Rival', canLose: true });
    if (r === 'win') await say('쳇... 처음이니까 봐준 거야!', { speaker: RIVAL_NAME });
    else await say('하하! 역시 내가 더 강하지!', { speaker: RIVAL_NAME });
    Player.party.forEach(m => m.heal());
    await say(['좋아, 난 먼저 간다! 리그에서 보자고, ' + Player.name + '!'], { speaker: RIVAL_NAME });
    if (rival) { await walkTo(w, rival, rival.x, rival.y + 1); await walkTo(w, rival, 6, rival.y); await walkTo(w, rival, 6, 12); rival.visible = false; }
    Flags.set('rival1');
    w.refreshEvents();
    await SCRIPTS.givePokedex(w);
  },
  async nurse(w, c) {
    const N = '간호순';
    const r = await ask('포켓몬센터에 어서 오세요!\n포켓몬을 회복시켜 드릴까요?', ['맡긴다', '그만둔다'], { speaker: N });
    if (r !== 0) { await say('또 오세요!', { speaker: N }); return; }
    await say('그럼 포켓몬을 잠시 맡겨 주세요.', { speaker: N, auto: 20 });
    c.dir = 'left';
    Audio2.stopBGM();
    await Audio2.playME('Pkmn healing');
    Player.party.forEach(m => m.heal());
    c.dir = 'down';
    Player.lastHeal = { map: 'PC', x: 7, y: 4, ret: Player.returnPoint };
    if (w.def.bgm) Audio2.playBGM(w.def.bgm); else if (Player.returnPoint) Audio2.playBGM(MAPS[Player.returnPoint.map].bgm);
    await say(['기다리셨습니다! 맡기신 포켓몬은 모두 건강해졌어요.', '또 오세요!'], { speaker: N });
    w.setupFollower(false);
  },
  async pcBox(w) {
    Audio2.se('PC open');
    await say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' PC의 전원을 켰다.', { auto: 20 });
    while (true) {
      const r = await ask('무엇을 하시겠습니까?', ['포켓몬 맡기기', '포켓몬 데려가기', '그만두기']);
      if (r === 0) {
        if (Player.party.length <= 1) { await say('마지막 포켓몬은 맡길 수 없어요!'); continue; }
        const i = await Game.open(new PartyScreen({ mode: 'select', msg: '맡길 포켓몬을 고르세요.' }));
        if (i < 0) continue;
        if (Player.party.filter((m, k) => k !== i && !m.fainted).length === 0) { await say('싸울 수 있는 포켓몬이 남지 않게 돼요!'); continue; }
        const m = Player.party.splice(i, 1)[0];
        const b = Storage.deposit(m);
        Audio2.se('GUI storage put down');
        await say(J.eulreul(m.name) + ' 박스 ' + (b + 1) + '에 맡겼다.');
        w.setupFollower(true);
      } else if (r === 1) {
        await Game.open(new BoxScreen('withdraw'));
        w.setupFollower(false);
      } else break;
    }
    Audio2.se('PC close');
  },
  async shop(w) {
    const S = '점원';
    while (true) {
      const r = await ask('어서 오세요! 무엇을 도와드릴까요?', ['사러 왔다', '팔러 왔다', '아무것도 아니다'], { speaker: S });
      if (r === 0) await Game.open(new ShopScreen(shopStock()));
      else if (r === 1) {
        while (true) {
          const id = await Game.open(new BagScreen({ mode: 'sell' }));
          if (!id) break;
          const price = Math.floor(ITEMS[id].pr / 2);
          if (pocketOf(id) === 8 || price <= 0) { await say('그건 살 수 없어요.', { speaker: S }); continue; }
          const q = await Game.open(new QuantityBox(Bag.count(id), price));
          if (q > 0) { Bag.remove(id, q); Player.money += price * q; Audio2.se('Mart buy item'); await say(J.eulreul(itemName(id)) + ' 팔고 ' + (price * q) + '원을 받았다!'); }
        }
      } else { await say('또 오세요!', { speaker: S }); break; }
    }
  },
  async gymLeader(w, c, i) {
    const L = GYM_LEADERS[i];
    if (Player.badges.includes(L.badge)) {
      await say(['다시 보니 반갑군.', '네가 리그에서 어디까지 갈지 기대하고 있다.'], { speaker: L.name });
      return;
    }
    await say(L.before.split('\n'), { speaker: L.name });
    const foe = buildTeam(L.team, 20);
    const r = await startBattle({ type: 'trainer', foe, trainer: { name: L.name, cls: L.cls, sprite: L.sprite, money: L.money, leader: true, gimmick: L.gimmick, afterBattle: L.after.split('\n')[0] }, bgm: L.bgm });
    if (r !== 'win') return;
    Player.badges.push(L.badge);
    Audio2.playME('Badge get');
    await say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' ' + L.name + '에게서 ' + J.eulreul(L.badge) + ' 받았다!');
    Bag.add(L.reward, L.rewardN);
    await say(L.after.split('\n').slice(1).concat(['이것도 받아 두렴. 여행에 도움이 될 거야.']), { speaker: L.name });
    Audio2.playME('Item get');
    await say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' ' + itemName(L.reward) + ' ' + L.rewardN + '개를 받았다!');
    if (Player.badges.length === 1) await say('배지가 있으면 프렌들리숍에서 더 좋은 물건을 살 수 있다고!', { speaker: L.name });
    if (L.onWin) await L.onWin(w);
  },
  async rival2(w) {
    const P = w.player;
    const rival = new Char({ id: 'rival2', x: P.x + 3, y: P.y, sprite: 'trainer_COOLTRAINER_M', dir: 'left', kind: 'npc', move: 'still' });
    w.chars.push(rival);
    await emote(rival, '!');
    P.dir = 'right';
    await say(['여어, ' + Player.name + '! 숲은 무사히 빠져나왔나 보네.', '나도 꽤 강해졌다고. 확인해 볼래?'], { speaker: RIVAL_NAME });
    const foe = rivalTeam(2).map(([s, l]) => makeTrainerMon(s, l, 12));
    const r = await startBattle({ type: 'trainer', foe, trainer: { name: RIVAL_NAME, cls: '라이벌', sprite: 'COOLTRAINER_M', money: 1200, afterBattle: '큭... 제법인데?' }, bgm: 'XY Rival' });
    Flags.set('rival2');
    if (r === 'win') {
      await say(['좋아, 인정해 주지. 하지만 리그에서는 내가 이긴다!', '먼저 간다!'], { speaker: RIVAL_NAME });
      await walkSteps(rival, 'right', 4, 4);
    }
    w.chars.splice(w.chars.indexOf(rival), 1);
  },
  async champion(w, c) {
    if (Flags.has('champion')) { await say(['다음엔 내가 이길 거야, 챔피언님.', '또 붙자고!'], { speaker: RIVAL_NAME }); return; }
    await say(['드디어 왔구나, ' + Player.name + '.', '나는 너보다 먼저 리그에 도착해서 사천왕을 모두 꺾었어.', '지금 이 순간부터 내가 바로 아스테라의 챔피언이다!', '...하지만 진짜 챔피언이 누군지는 지금 정해지겠지.', '덤벼라, ' + Player.name + '!'], { speaker: '챔피언 ' + RIVAL_NAME });
    const foe = rivalTeam(3).map(([s, l]) => makeTrainerMon(s, l, 25));
    const r = await startBattle({ type: 'trainer', foe, trainer: { name: RIVAL_NAME, cls: '챔피언', sprite: 'COOLTRAINER_M', money: 10000, leader: true, afterBattle: '...내가 졌다. 네가 진짜 챔피언이야.' }, bgm: 'SM Champion' });
    if (r !== 'win') return;
    await say(['...후. 분하지만 인정할게.', '너랑 너의 포켓몬들, 정말 최고였어.', '자, 명예의 전당으로 가자. 박사님도 기다리고 계실 거야.'], { speaker: RIVAL_NAME });
    Flags.set('champion');
    await hallOfFame();
    w.refreshEvents();
  },
  async giftEevee(w) {
    if (Flags.has('gift_eevee')) { await say('이브이는 잘 지내니? 진화의 돌을 쓰면 여러 모습으로 진화한단다.', { speaker: '낚시꾼' }); return; }
    await say(['이 마을에 온 걸 환영하네!', '사실 바닷가에서 이브이를 보살피고 있었는데,\n나보다는 젊은 트레이너와 여행하는 게 좋을 것 같구나.'], { speaker: '낚시꾼' });
    if (!await yesNo('이브이를 데려가 주겠나?')) { await say('그런가... 마음이 바뀌면 또 오게.', { speaker: '낚시꾼' }); return; }
    const m = new Mon('EEVEE', 10, { ot: Player.name }); m.ot = Player.name; m.metMap = '물보라시티';
    givePokemon(m);
    Flags.set('gift_eevee');
    Audio2.playME('Pkmn get');
    await say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' 이브이를 받았다!');
  },
  async moveReminder(w) {
    await say(['나는 기술 떠올리기 아가씨!', '포켓몬이 잊어버린 기술을 다시 떠올리게 해 줄게.'], { speaker: '아가씨' });
    const i = await Game.open(new PartyScreen({ mode: 'select', msg: '누구의 기술을 떠올릴까요?' }));
    if (i < 0) return;
    const m = Player.party[i];
    const list = [...new Set(m.data.mv.filter(([l, mv]) => l <= m.level && MOVES[mv] && !m.knows(mv)).map(x => x[1]))];
    if (!list.length) { await say(m.name + J.eunneun(m.name).slice(m.name.length) + ' 떠올릴 기술이 없는 것 같아.', { speaker: '아가씨' }); return; }
    const k = await Game.open(new ListBox(list.map(moveName).concat(['그만두기']), { title: '떠올릴 기술' }));
    if (k < 0 || k >= list.length) return;
    await learnMoveFlow(m, list[k], s => say(s));
  },
  async moveTutorHeal(w) { return SCRIPTS.moveReminder(w); },
  async nameRater(w) {
    await say(['나는 이름 평가 아저씨... 아니, 브리더란다.', '포켓몬의 이름을 바꿔 주지.'], { speaker: '브리더' });
    const i = await Game.open(new PartyScreen({ mode: 'select', msg: '누구의 이름을 바꿀까요?' }));
    if (i < 0) return;
    const m = Player.party[i];
    if (m.ot && m.ot !== Player.name) { await say('이 포켓몬은 다른 사람이 키운 아이구나. 이름을 바꿀 수 없어.', { speaker: '브리더' }); return; }
    const n = await promptName(m.name + '의 새 이름', m.name);
    if (n) { m.nickname = n === m.data.name ? null : n; await say('좋아! 이제부터 이 아이는 ' + J.ro(m.name) + ' 불릴 거야!', { speaker: '브리더' }); }
  },
  async fossilGift(w) {
    if (Flags.has('gift_dragon')) { await say('그 포켓몬은 잘 크고 있니? 강하게 키워 주렴.', { speaker: '연구원' }); return; }
    await say(['자네가 체육관 관장들을 이긴 트레이너인가?', '연구소에서 보호하던 희귀한 포켓몬이 있는데,\n자네라면 잘 키울 수 있을 것 같군.'], { speaker: '연구원' });
    if (Player.badges.length < 2) { await say('...음, 배지를 2개 이상 모으면 다시 오게.', { speaker: '연구원' }); return; }
    const sp = pick(['DRATINI', 'LARVITAR', 'BAGON', 'BELDUM', 'GIBLE', 'DEINO', 'GOOMY', 'JANGMOO', 'DREEPY', 'FRIGIBAX']);
    const m = new Mon(sp, 25, { ot: Player.name }); m.ot = Player.name; m.metMap = '별빛시티';
    givePokemon(m);
    Flags.set('gift_dragon');
    Audio2.playME('Pkmn get');
    await say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' ' + J.eulreul(m.name) + ' 받았다!');
  },
  async dexRating(w) {
    const n = Object.keys(Player.caught).length;
    const msg = n < 10 ? '아직 시작 단계구나. 풀숲을 많이 돌아다녀 보렴.' : n < 30 ? '꽤 열심히 모으고 있구나!' : n < 60 ? '정말 대단해! 진화도 시켜 보렴.' : n < 151 ? '이 정도면 박사님도 놀라시겠어!' : '전설의 트레이너가 따로 없구나!';
    await say(['포켓몬 도감을 보여 주겠니?', '어디 보자... ' + n + '마리를 잡았구나.', msg], { speaker: '아가씨' });
  },
};
function givePokemon(m) {
  Player.seen[m.species] = true; Player.caught[m.species] = true;
  if (Player.party.length < 6) Player.party.push(m);
  else Storage.deposit(m);
  if (Game.world) Game.world.setupFollower(false);
}

// 큰 목록 선택창
class ListBox extends Win {
  constructor(items, opt = {}) { super(); this.items = items; this.opt = opt; this.i = 0; this.top = 0; }
  update() {
    const n = this.items.length;
    if (Input.rep('up')) { this.i = (this.i + n - 1) % n; SE.cursor(); }
    if (Input.rep('down')) { this.i = (this.i + 1) % n; SE.cursor(); }
    if (this.i < this.top) this.top = this.i;
    if (this.i >= this.top + 7) this.top = this.i - 6;
    if (Input.trig('A')) { SE.ok(); this.close(this.i); }
    if (Input.trig('B')) { SE.cancel(); this.close(-1); }
  }
  draw(ctx) {
    const x = 240, y = 8, w = 264, h = Math.min(7, this.items.length) * 34 + 60;
    drawWindow(ctx, x, y, w, h, CHOICE_SKIN);
    if (this.opt.title) text(ctx, this.opt.title, x + 20, y + 12, { size: 20, color: '#3060c0' });
    for (let k = 0; k < 7; k++) {
      const i = this.top + k; if (i >= this.items.length) break;
      text(ctx, this.items[i], x + 40, y + 44 + k * 34, { size: 22 });
      if (i === this.i) drawCursorArrow(ctx, x + 16, y + 46 + k * 34);
    }
  }
}
// 스타터 미리보기 창
class MonViewer extends Win {
  constructor(sp) { super(); this.sp = sp; }
  draw(ctx) {
    drawWindow(ctx, 156, 30, 200, 200, CHOICE_SKIN);
    drawMonSprite(ctx, 'Front', this.sp, false, 256, 206, 2, Game.tick);
  }
}

// ---------------- 명예의 전당 & 엔딩 ----------------
async function hallOfFame() {
  await Game.fade(1, 30);
  const hof = new HallOfFameScene();
  const prev = Game.scene;
  Game.scene = hof;
  Audio2.playBGM('B2W2 214 PWT Victor!');
  await Game.fade(0, 30);
  await hof.run();
  await Game.fade(1, 40);
  Game.scene = new CreditsScene();
  await Game.fade(0, 30);
  await Game.scene.run();
  await Game.fade(1, 30);
  Game.scene = prev;
  Player.party.forEach(m => m.heal());
  Player.lastHeal = { map: 'PC', x: 7, y: 4, ret: { map: 'LEAGUE', x: 15, y: 8 } };
  Game.world.load('LEAGUE', 9, 8, 'down');
  await Game.fade(0, 30);
  await say(['축하합니다! 아스테라 지방의 새로운 챔피언이 탄생했습니다!', '리그 서쪽 "환상의 풀숲"으로 가는 길이 열렸습니다.\n전국의 모든 포켓몬이 당신을 기다리고 있어요!']);
  if (await yesNo('지금까지의 모험을 기록하겠습니까?')) { SaveSys.save(); Audio2.se('GUI save choice'); await say('레포트에 기록했다!'); }
}
class HallOfFameScene {
  constructor() { this.shown = []; this.t = 0; }
  update() { this.t++; }
  async run() {
    for (const m of Player.party) {
      this.cur = m; Audio2.cry(m.species);
      for (let i = 0; i < 120; i++) await frames(1);
      this.shown.push(m); this.cur = null;
    }
    this.final = true;
    await waitA();
  }
  draw(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 384); g.addColorStop(0, '#1a1040'); g.addColorStop(1, '#6a4a10');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 384);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(255,230,150,' + (0.3 + 0.7 * Math.abs(Math.sin(this.t / 30 + i))) + ')'; ctx.fillRect((i * 131) % 512, (i * 71) % 260, 3, 3); }
    drawImg(ctx, 'Graphics/UI/Hall of Fame/bg.png', 0, 0);
    const all = this.shown.slice();
    all.forEach((m, i) => drawMonSprite(ctx, 'Front', m.species, m.shiny, 64 + i * 78, this.final ? 220 : 120, this.final ? 1 : 0.8, this.t));
    if (this.cur) {
      drawMonSprite(ctx, 'Front', this.cur.species, this.cur.shiny, 256, 270, 2, this.t);
      drawWindow(ctx, 96, 300, 320, 70, CHOICE_SKIN);
      text(ctx, this.cur.name + '  Lv.' + this.cur.level, 256, 312, { size: 24, align: 'center' });
      text(ctx, this.cur.data.t.map(typeName).join(' / '), 256, 340, { size: 18, align: 'center' });
    }
    if (this.final) {
      drawWindow(ctx, 40, 290, 432, 80, CHOICE_SKIN);
      text(ctx, '명예의 전당 입성을 축하합니다!', 256, 302, { size: 24, align: 'center' });
      text(ctx, '챔피언 ' + Player.name + '  ' + new Date().toLocaleDateString('ko-KR'), 256, 336, { size: 20, align: 'center' });
    }
  }
}
class CreditsScene {
  constructor() { this.y = 400; this.t = 0; }
  update() { this.t++; }
  async run() {
    const lines = this.lines = ['포켓몬스터 아스테라', '', '— 나만의 모험 —', '', '플레이어', Player.name, '', '함께한 포켓몬', ...Player.party.map(m => m.name + ' (Lv.' + m.level + ')'), '', '그래픽 · 사운드 · 데이터', 'Pokemon Another Red 에셋', 'Pokémon Essentials', '', '세계 설계 · 프로그래밍', '아스테라 엔진 (HTML5)', '', '그리고 플레이해 준 당신에게', '감사합니다!', '', '', 'THE END'];
    const total = lines.length * 40 + 400;
    while (this.y > -total + 200) { this.y -= 0.8; if (Input.held.A) this.y -= 4; await frames(1); }
    await waitA();
  }
  draw(ctx) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 512, 384);
    const sp = SPECIES_LIST[Math.floor(this.t / 90) % SPECIES_LIST.length];
    ctx.globalAlpha = 0.35; drawMonSprite(ctx, 'Front', sp, false, 256, 300, 2, this.t); ctx.globalAlpha = 1;
    (this.lines || []).forEach((l, i) => text(ctx, l, 256, this.y + i * 40, { size: i === 0 ? 30 : 22, align: 'center', ...WHITE_TEXT }));
  }
}

// ---------------- 타이틀 ----------------
class TitleScene {
  constructor() { this.t = 0; this.menu = null; this.parade = []; this.next = 0; }
  update() {
    this.t++;
    if (this.t >= this.next) {
      this.next = this.t + 70;
      this.parade.push({ sp: pick(SPECIES_LIST), x: 560, y: 250 + rand(60) });
      if (this.parade.length > 8) this.parade.shift();
    }
    for (const p of this.parade) p.x -= 1.2;
  }
  draw(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 384);
    g.addColorStop(0, '#0b1640'); g.addColorStop(0.6, '#2a3f8f'); g.addColorStop(1, '#79a7e8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 384);
    // 별
    for (let i = 0; i < 60; i++) { const x = (i * 97) % 512, y = (i * 53) % 220; ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.7 * Math.abs(Math.sin(this.t / 40 + i))) + ')'; ctx.fillRect(x, y, 2, 2); }
    drawImg(ctx, 'Graphics/Battlebacks/field_bg.png', 0, 0, 512, 288, 0, 220, 512, 164);
    for (const p of this.parade) drawMonSprite(ctx, 'Front', p.sp, false, p.x, p.y + 60, 1.2, this.t);
    text(ctx, '포켓몬스터', 256, 40, { size: 30, align: 'center', color: '#f8d030', shadow: '#a05010' });
    text(ctx, '아스테라', 256, 76, { size: 56, align: 'center', color: '#ffffff', shadow: '#3050c0' });
    text(ctx, '— 별빛 지방의 모험 —', 256, 140, { size: 20, align: 'center', color: '#c8d8ff', shadow: '#102050' });
    if (!this.menu && Math.floor(this.t / 30) % 2) text(ctx, 'Z 또는 Enter 키를 눌러 주세요', 256, 190, { size: 20, align: 'center', ...WHITE_TEXT });
  }
}

async function titleFlow() {
  const title = new TitleScene();
  Game.scene = title; Game.world = null;
  Audio2.playBGM('Title');
  await Game.fade(0, 20);
  await waitA();
  Audio2.unlock();
  Audio2.playBGM('Title');
  while (true) {
    const opts = SaveSys.exists() ? ['이어서 하기', '처음부터', '조작 방법'] : ['처음부터', '조작 방법'];
    title.menu = true;
    const r = await Game.open(new ChoiceBox(opts, { x: 176, y: 200, w: 160 }));
    const k = opts[r];
    if (k === '조작 방법') {
      await say(['방향키: 이동 / Shift 누른 채 이동: 달리기', 'Z·Space·Enter: 결정, 말 걸기\nX·Esc: 취소, 메뉴 열기', 'Q/E: PC 박스 넘기기\n메뉴의 "저장"으로 언제든 기록할 수 있습니다.']);
      continue;
    }
    if (k === '이어서 하기') {
      try { SaveSys.load(); } catch (e) { console.error(e); await say('저장 데이터를 불러오지 못했습니다.'); continue; }
      await Game.fade(1, 20);
      startWorld(Player.map, Player.x, Player.y, Player.dir);
      await Game.fade(0, 20);
      return;
    }
    if (k === '처음부터') {
      if (SaveSys.exists() && !(await yesNo('이전 기록이 있습니다. 새로 시작하면 덮어쓰게 됩니다. 계속할까요?'))) continue;
      await introFlow();
      return;
    }
  }
}

class IntroScene {
  constructor() { this.t = 0; this.show = 'prof'; }
  update() { this.t++; }
  draw(ctx) {
    drawImg(ctx, 'Graphics/Pictures/introbg.png', 0, 0) || (ctx.fillStyle = '#7ab', ctx.fillRect(0, 0, 512, 384));
    if (this.show === 'prof') drawImg(ctx, 'Graphics/Trainers/PROFESSOR.png', 0, 0, 128, 128, 192, 70, 128, 128);
    if (this.show === 'mon') drawMonSprite(ctx, 'Front', 'EEVEE', false, 256, 200, 2, this.t);
    if (this.show === 'gender') {
      const b = img('Graphics/Trainers/POKEMONTRAINER_Brendan.png'), g = img('Graphics/Trainers/POKEMONTRAINER_May.png');
      if (b) ctx.drawImage(b, 0, 0, b.height, b.height, 90, 60, 128, 128);
      if (g) ctx.drawImage(g, 0, 0, g.height, g.height, 294, 60, 128, 128);
    }
    if (this.show === 'player') {
      const p = img('Graphics/Trainers/' + (Player.gender === 'F' ? 'POKEMONTRAINER_May' : 'POKEMONTRAINER_Brendan') + '.png');
      if (p) ctx.drawImage(p, 0, 0, p.height, p.height, 192, 70, 128, 128);
    }
  }
}
async function introFlow() {
  await Game.fade(1, 20);
  Player = newPlayer();
  Player.started = new Date().toLocaleDateString('ko-KR');
  const sc = new IntroScene(); Game.scene = sc;
  Audio2.playBGM('HGSS 158 National Park');
  await Game.fade(0, 20);
  const P = { speaker: '한별 박사' };
  await say(['안녕! 포켓몬스터의 세계에 온 것을 환영한다!', '나는 한별. 모두들 포켓몬 박사라고 부르지.'], P);
  sc.show = 'mon'; Audio2.cry('EEVEE');
  await say(['이 세계에는 포켓몬스터, 줄여서 포켓몬이라 불리는\n신기한 생명체들이 살고 있단다.', '사람들은 포켓몬과 함께 놀고, 일하고,\n때로는 승부를 겨루며 살아가고 있지.', '나는 이 별빛이 쏟아지는 "아스테라 지방"의\n포켓몬을 연구하고 있단다.'], P);
  sc.show = 'gender';
  const g = await ask('그럼 너에 대해 알려 주겠니?\n너는 남자니? 여자니?', ['남자', '여자'], { speaker: '한별 박사', cancel: null });
  Player.gender = g === 1 ? 'F' : 'M';
  sc.show = 'player';
  await say('그래, 이름은 뭐라고 하니?', P);
  const name = await promptName('당신의 이름은?', Player.gender === 'F' ? '하나' : '레오', 7);
  Player.name = name;
  await say([Player.name + '! 좋은 이름이구나!', '이웃집에 사는 카이는 너의 오랜 친구이자 라이벌이지.', Player.name + '! 지금부터 너만의 포켓몬 이야기가 시작된다!', '꿈과 모험과 포켓몬의 세계로! 렛츠 고!'], P);
  await Game.fade(1, 30);
  startWorld('HOME', 10, 6, 'down');
  await Game.fade(0, 30);
  await say('...!\n(오늘은 한별 박사님께 포켓몬을 받기로 한 날이다!)');
}
function startWorld(key, x, y, dir) {
  const w = Game.world = new World();
  Game.scene = w;
  w.load(key, x, y, dir);
}

// ---------------- 시작 ----------------
async function boot() {
  Game.canvas = document.getElementById('screen');
  Game.ctx = Game.canvas.getContext('2d');
  Input.init();
  const fit = () => {
    if (Game.noFit) return;
    const pw = document.getElementById('side') && document.getElementById('side').offsetWidth || 0;
    const s = Math.max(1, Math.min((innerWidth - pw - 16) / SCREEN_W, (innerHeight - 24) / SCREEN_H));
    const k = s >= 2 ? Math.floor(s) : s;
    Game.canvas.style.width = SCREEN_W * k + 'px'; Game.canvas.style.height = SCREEN_H * k + 'px';
  };
  addEventListener('resize', fit); fit();
  Player.options = loadOptions();
  if (Player.options.bgmVol !== undefined) Audio2.vol = Player.options.bgmVol;
  if (Player.options.seVol !== undefined) Audio2.seVol = Player.options.seVol;
  Game.fadeA = 1;
  requestAnimationFrame(t => Game.frame(t));
  await Promise.race([loadFonts(), sleep(3000)]);
  await preload(['Graphics/Windowskins/choice 1.png', 'Graphics/Windowskins/speech hgss 1.png', 'Graphics/Battlebacks/field_bg.png', 'Graphics/UI/sel_arrow.png']);
  // 개발용: ?map=키&x=&y= 로 바로 시작, ?view=키 로 맵 전체 보기
  const q = new URLSearchParams(location.search);
  if (q.get('test')) { await devStart(q); return; }
  if (q.get('view')) { devView(q.get('view')); return; }
  titleFlow();
}
window.addEventListener('load', boot);
