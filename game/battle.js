// ============================================================
// battle.js - 턴제 배틀 (야생/트레이너), 포획, 경험치, 기술 효과
// ============================================================
'use strict';

const STAGE_KEYS = ['atk', 'def', 'spa', 'spd', 'spe', 'acc', 'eva'];
const STAGE_NAMES = { atk: '공격', def: '방어', spa: '특수공격', spd: '특수방어', spe: '스피드', acc: '명중률', eva: '회피율' };
const STAT_TOKEN = { Attack: ['atk'], Atk: ['atk'], Defense: ['def'], Def: ['def'], SpAtk: ['spa'], SpDef: ['spd'], Speed: ['spe'], Spd: ['spe'], Accuracy: ['acc'], Acc: ['acc'], Evasion: ['eva'], Eva: ['eva'], MainStats: ['atk', 'def', 'spa', 'spd', 'spe'] };
const BALL_MOD = { POKEBALL: 1, GREATBALL: 1.5, ULTRABALL: 2, MASTERBALL: 255, PREMIERBALL: 1, NETBALL: 1, DUSKBALL: 1.5, QUICKBALL: 2, LUXURYBALL: 1, HEALBALL: 1 };
const ANIM_BY_TYPE = {
  NORMAL: '003-Attack01', FIGHTING: '004-Attack02', FIRE: '015-Fire01', ICE: '016-Ice01', ELECTRIC: '017-Thunder01',
  WATER: '018-Water01', DARK: '022-Darkness01', GHOST: '022-Darkness01', POISON: '022-Darkness01', PSYCHIC: '023-Burst01',
  DRAGON: '023-Burst01', FAIRY: '023-Burst01', GRASS: '003-Attack01', BUG: '003-Attack01', ROCK: '030-Explosion01',
  GROUND: '030-Explosion01', STEEL: '007-Weapon02', FLYING: '008-Weapon03', STELLAR: '023-Burst01'
};

function typeEffect(atkType, defTypes) {
  let m = 1;
  for (const d of defTypes) {
    const t = TYPES[d]; if (!t) continue;
    if (t.i.includes(atkType)) return 0;
    if (t.w.includes(atkType)) m *= 2;
    if (t.r.includes(atkType)) m *= 0.5;
  }
  return m;
}
function stageMul(s) { return s >= 0 ? (2 + s) / 2 : 2 / (2 - s); }
function accStageMul(s) { return s >= 0 ? (3 + s) / 3 : 3 / (3 - s); }

class Battler {
  constructor(mon, side) { this.mon = mon; this.side = side; this.reset(); }
  reset() { this.st = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }; this.v = {}; }
  get name() { return this.side === 'foe' ? (this.isWild ? '야생 ' : '상대 ') + this.mon.name : this.mon.name; }
  speed() {
    let s = this.mon.stats[5] * stageMul(this.st.spe);
    if (this.mon.status === 'PAR') s *= 0.5;
    return s;
  }
}

class Battle {
  constructor(o) {
    this.o = o;
    this.wild = o.type === 'wild';
    this.trainer = o.trainer || null;
    this.foeParty = o.foe;
    this.bg = o.bg || 'field';
    this.tick = 0;
    this.msgText = ''; this.msgShown = 0;
    this.p = null; this.f = null;
    this.sprites = { p: { x: 0, y: 0, alpha: 1, scale: 1, visible: false, flash: false }, f: { x: 0, y: 0, alpha: 1, scale: 1, visible: false, flash: false } };
    this.disp = { p: { hp: 0, exp: 0 }, f: { hp: 0 } };
    this.trainerSlide = { p: 0, f: 0, showP: true, showF: !this.wild, pFrame: 0 };
    this.boxes = { p: false, f: false };
    this.anim = null; this.ball = null;
    this.participants = new Set();
    this.runAttempts = 0;
    this.result = null;
    this.evolveQueue = [];
    this.moneyGain = 0;
    this.leaderPotion = this.trainer && this.trainer.leader ? 1 : 0;
    this.intro = 0;
    this.gimmickInit();
  }
  // ---------- 그리기 ----------
  update() { this.tick++; }
  draw(ctx) {
    const t = this.tick;
    drawImg(ctx, 'Graphics/Battlebacks/' + this.bg + '_bg.png', 0, 0) || (ctx.fillStyle = '#8cc8f0', ctx.fillRect(0, 0, 512, 288));
    if (this.o.raid === 'dyna') { ctx.fillStyle = 'rgba(200,0,60,' + (0.12 + 0.06 * Math.sin(t / 15)) + ')'; ctx.fillRect(0, 0, 512, 288); }
    if (this.o.legend) { ctx.fillStyle = 'rgba(40,0,80,0.18)'; ctx.fillRect(0, 0, 512, 288); }
    // 바닥 그림자(베이스)
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(384, 176, 92, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(128, 300, 120, 24, 0, 0, Math.PI * 2); ctx.fill();
    // 상대 포켓몬
    const fs = this.sprites.f;
    if (this.f && fs.visible) {
      drawMonSprite(ctx, 'Front', this.f.mon.species, this.f.mon.shiny, 384 + fs.x, 182 + fs.y, 2 * fs.scale, t, { alpha: fs.alpha, flash: fs.flash, glow: fs.glow, sizeMul: this.sizeMul(this.f.mon, 'Front', 2 * fs.scale, fs.scale > 1.2 ? 250 : 210) });
    }
    // 상대 트레이너
    if (this.trainerSlide.showF && this.trainer) {
      const p = 'Graphics/Trainers/' + this.trainer.sprite + '.png';
      const im = img(p);
      if (im) { const fw = im.height; ctx.drawImage(im, 0, 0, fw, fw, 384 - fw / 2 + this.trainerSlide.f, 182 - fw - 8, fw, fw); }
    }
    // 내 포켓몬
    const ps = this.sprites.p;
    if (this.p && ps.visible) {
      drawMonSprite(ctx, 'Back', this.p.mon.species, this.p.mon.shiny, 128 + ps.x, 312 + ps.y, 2.6 * ps.scale, t, { alpha: ps.alpha, flash: ps.flash, glow: ps.glow, sizeMul: this.sizeMul(this.p.mon, 'Back', 2.6 * ps.scale, ps.scale > 1.2 ? 270 : 250) });
    }
    // 내 트레이너 뒷모습
    if (this.trainerSlide.showP) {
      const p = 'Graphics/Trainers/' + (Player.gender === 'F' ? 'POKEMONTRAINER_May_back' : 'POKEMONTRAINER_Brendan_back') + '.png';
      const im = img(p);
      if (im) { const fw = im.height, n = Math.floor(im.width / fw); ctx.drawImage(im, (this.trainerSlide.pFrame % n) * fw, 0, fw, fw, 128 - fw / 2 + this.trainerSlide.p, 288 - fw + 8, fw, fw); }
    }
    // 몬스터볼 연출
    if (this.ball) {
      const b = this.ball;
      drawImg(ctx, 'Graphics/Items/' + b.item + '.png', 0, 0, 48, 48, b.x - 16, b.y - 16, 32, 32);
    }
    // 기술 애니메이션
    if (this.anim) {
      const a = this.anim; const im = img('Graphics/Animations/' + a.sheet + '.png');
      if (im) {
        const cols = Math.max(1, Math.floor(im.width / 192)), rows = Math.max(1, Math.floor(im.height / 192));
        const n = cols * rows, f = Math.floor(a.t / 2);
        if (f < n) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.9;
          ctx.drawImage(im, (f % cols) * 192, Math.floor(f / cols) * 192, 192, 192, a.x - 96, a.y - 96, 192, 192);
          ctx.restore();
        }
      }
    }
    this.drawWeather(ctx);
    // 데이터 박스
    if (this.boxes.f && this.f) this.drawFoeBox(ctx);
    if (this.boxes.p && this.p) this.drawPlayerBox(ctx);
    // 메시지창
    drawImg(ctx, 'Graphics/UI/Battle/overlay_message.png', 0, 288);
    if (this.msgText) {
      const lines = wrapText(ctx, this.msgText.slice(0, this.msgShown), 452, 24);
      lines.slice(-2).forEach((l, i) => text(ctx, l, 32, 306 + i * 32, { size: 24, color: '#505058', shadow: '#d0d0c8' }));
    }
    // 상대 파티 볼 표시(트레이너전)
    if (this.trainer && this.showLineup) {
      this.foeParty.forEach((m, i) => drawImg(ctx, 'Graphics/UI/Battle/icon_ball' + (m.fainted ? '_faint' : (m.status ? '_status' : '')) + (m.status && !m.fainted ? '.PNG' : '.png'), 0, 0, 30, 30, 20 + i * 30, 100, 30, 30));
    }
  }
  sizeMul(mon, kind, sc = 2, cap = 210) {
    const p = monSpritePath(kind, mon.species, mon.shiny); const im = p && img(p);
    if (!im) return 1;
    return im.height * sc > cap ? cap / (im.height * sc) : 1;
  }
  drawHpBar(ctx, x, y, w, hp, max) {
    const r = clamp(hp / max, 0, 1);
    const row = r > 0.5 ? 0 : (r > 0.2 ? 1 : 2);
    const im = img('Graphics/UI/Battle/overlay_hp.png');
    const fw = Math.min(w, Math.ceil(w * r));
    if (im && fw > 0) ctx.drawImage(im, 0, row * 6, Math.min(im.width, fw), 6, x, y, fw, 6);
  }
  // 이름·성별·레벨 한 줄: 레벨은 오른쪽 끝(right)에 맞추고, 이름은 남는 폭에 맞춰 자동 축소
  drawNameRow(ctx, m, left, right, y) {
    const lv = 'Lv' + m.level;
    const lvW = textW(ctx, lv, 19);
    // 그림자(+2px)까지 상자 안에 들어가도록 2px 여유
    text(ctx, lv, right - 2, y + 1, { size: 19, align: 'right', color: '#404040', shadow: '#d8d8d0' });
    const genderW = m.gender !== 'N' ? 20 : 0;
    const nameMax = Math.max(40, right - lvW - 10 - genderW - left);
    const nw = textFit(ctx, m.name, left, y, nameMax, { size: 22, color: '#404040', shadow: '#d8d8d0' });
    if (m.gender !== 'N') text(ctx, m.gender === 'M' ? '♂' : '♀', left + nw + 3, y, { size: 20, color: m.gender === 'M' ? '#3070f0' : '#f05050', shadow: null });
  }
  drawFoeBox(ctx) {
    const m = this.f.mon, bx = -4, by = 40;
    drawImg(ctx, 'Graphics/UI/Battle/databox_normal_foe.png', bx, by);
    // 상대 상자는 오른쪽 위가 비스듬히 잘린 모양이라 흰 영역이 약 232px에서 끝남
    this.drawNameRow(ctx, m, bx + 22, bx + 228, by + 8);
    drawStatusIcon(ctx, m.status, bx + 24, by + 36);
    this.drawHpBar(ctx, bx + 118, by + 40, 96, this.disp.f.hp, m.maxhp);
    if (this.wild && Player.caught[baseOf(m.species)]) drawImg(ctx, 'Graphics/UI/Battle/icon_own.png', bx + 6, by + 36);
    this.drawMarks(ctx, this.f, bx + 196, by + 34);
  }
  drawPlayerBox(ctx) {
    const m = this.p.mon, bx = 252, by = 198;
    drawImg(ctx, 'Graphics/UI/Battle/databox_normal.png', bx, by);
    this.drawNameRow(ctx, m, bx + 42, bx + 250, by + 8);
    drawStatusIcon(ctx, m.status, bx + 42, by + 37);
    this.drawHpBar(ctx, bx + 136, by + 40, 96, this.disp.p.hp, m.maxhp);
    textFit(ctx, Math.ceil(this.disp.p.hp) + '/' + m.maxhp, bx + 150, by + 50, 82, { size: 19, color: '#404040', shadow: '#d8d8d0' });
    const im = img('Graphics/UI/Battle/overlay_exp.png');
    if (im) ctx.drawImage(im, 0, 0, im.width, im.height, bx + 40, by + 74, Math.floor(192 * clamp(this.disp.p.exp, 0, 1)), 4);
    this.drawMarks(ctx, this.p, bx + 2, by + 34);
  }
  drawMarks(ctx, b, x, y) {
    const m = b.mon, d = SPECIES[m.species];
    if (m.origSpecies && (d.mega || d.megamove)) drawImg(ctx, 'Graphics/UI/Battle/icon_mega.png', x, y);
    if (b.dyna) text(ctx, b.dyna > 99 ? 'MAX' : 'D' + b.dyna, x, y, { size: 16, color: '#ff4060', shadow: '#300' });
    if (m.teraOn) { ctx.fillStyle = TYPE_COLORS[m.tera] || '#fff'; ctx.beginPath(); ctx.moveTo(x + 10, y); ctx.lineTo(x + 20, y + 9); ctx.lineTo(x + 10, y + 18); ctx.lineTo(x, y + 9); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke(); }
  }
  // ---------- 연출 헬퍼 ----------
  async say(s, wait = true) {
    const all = wrapText(Game.ctx, s, 452, 24);
    if (all.length > 2) {
      for (let i = 0; i < all.length; i += 2) await this.say1(all.slice(i, i + 2).join(' '), i + 2 >= all.length ? wait : true);
      return;
    }
    return this.say1(s, wait);
  }
  async say1(s, wait = true) {
    this.msgText = s; this.msgShown = 0;
    const speed = [1, 2, 4][Player.options.textSpeed ?? 1];
    while (this.msgShown < s.length) {
      this.msgShown = Math.min(s.length, this.msgShown + speed);
      await frames(1);
      if (Input.trig('A') || Input.trig('B')) { this.msgShown = s.length; Input.consume(); }
    }
    if (wait) {
      const auto = Player.options.autoBattleText;
      let n = 0;
      while (true) {
        await frames(1); n++;
        if (Input.trig('A') || Input.trig('B') || (auto && n > 50)) { Input.consume(); break; }
      }
    } else await frames(20);
  }
  async tweenHP(side, to) {
    const d = this.disp[side];
    const from = d.hp, steps = Math.max(10, Math.min(40, Math.abs(from - to)));
    for (let i = 1; i <= steps; i++) { d.hp = from + (to - from) * i / steps; await frames(1); }
    d.hp = to;
  }
  async shake(side) {
    const s = this.sprites[side];
    for (let i = 0; i < 6; i++) { s.visible = i % 2 === 1; await frames(3); }
    s.visible = true;
  }
  async playAnim(type, targetSide, category) {
    const sheet = type === 'MEGA' ? 'GEN8- MegaEvolution' : category === 2 ? '028-State01' : (ANIM_BY_TYPE[type] || '003-Attack01');
    if (type === 'MEGA') category = 2;
    const tgt = category === 2 ? (targetSide) : targetSide;
    const x = tgt === 'f' ? 384 : 128, y = tgt === 'f' ? 130 : 250;
    // 공격자가 앞으로 살짝 이동
    const att = this.sprites[tgt === 'f' ? 'p' : 'f'];
    if (category !== 2) { for (let i = 0; i < 4; i++) { att.x += tgt === 'f' ? 6 : -6; await frames(1); } for (let i = 0; i < 4; i++) { att.x -= tgt === 'f' ? 6 : -6; await frames(1); } }
    if (!imgReady('Graphics/Animations/' + sheet + '.png')) { await frames(8); }
    const im = img('Graphics/Animations/' + sheet + '.png');
    const n = im ? Math.min(20, Math.floor(im.width / 192) * Math.floor(im.height / 192)) : 6;
    this.anim = { sheet, x, y, t: 0 };
    for (let i = 0; i < n * 2; i++) { this.anim.t = i; await frames(1); }
    this.anim = null;
  }
  async sendOut(side, mon, first) {
    const b = new Battler(mon, side === 'p' ? 'player' : 'foe');
    b.isWild = this.wild && side === 'f';
    if (side === 'p') { this.p = b; this.participants.add(Player.party.indexOf(mon)); }
    else { this.f = b; this.participants = new Set(this.p ? [Player.party.indexOf(this.p.mon)] : []); Player.seen[baseOf(mon.species)] = true; }
    const s = this.sprites[side];
    this.disp[side].hp = mon.hp;
    if (side === 'p') this.disp.p.exp = mon.expProgress();
    // 볼에서 나오기
    s.visible = true; s.scale = 0.1; s.alpha = 1; s.x = 0; s.y = 0; s.flash = true;
    Audio2.se('Battle recall', 0.8);
    for (let i = 1; i <= 10; i++) { s.scale = i / 10; await frames(1); }
    s.flash = false;
    s.glow = mon.teraOn ? TYPE_COLORS[mon.tera] : null;
    Audio2.cry(mon.species);
    this.boxes[side] = true;
    await frames(20);
    await this.onEntry(side);
  }
  async recall(side) {
    const s = this.sprites[side];
    Audio2.se('Battle recall', 0.8);
    s.flash = true;
    for (let i = 10; i >= 0; i--) { s.scale = i / 10; await frames(1); }
    s.visible = false; s.flash = false; s.scale = 1;
    this.boxes[side] = false;
  }
  async faintAnim(side) {
    const s = this.sprites[side];
    if (this[side].dyna) { this[side].dyna = 0; const m = this[side].mon; if (m.dynaMul) { m.stats[0] = Math.round(m.stats[0] / m.dynaMul); m.dynaMul = 0; } s.scale = 1; }
    s.glow = null;
    Audio2.cry(this[side].mon.species, 0.8);
    await frames(25);
    Audio2.se('Pkmn faint', 0.8);
    for (let i = 0; i < 16; i++) { s.y += 8; s.alpha = 1 - i / 16; await frames(1); }
    s.visible = false; s.alpha = 1; s.y = 0;
    this.boxes[side] = false;
  }
  // ---------- 메인 흐름 ----------
  async run() {
    Player.seen = Player.seen || {};
    this.foeParty.forEach(m => m.calcStats());
    // 등장 연출
    this.trainerSlide.p = -300; this.trainerSlide.f = 300;
    const fs = this.sprites.f;
    if (this.wild) { fs.visible = true; fs.x = 300; }
    for (let i = 0; i < 30; i++) {
      this.trainerSlide.p = -300 + 300 * (i + 1) / 30;
      this.trainerSlide.f = 300 - 300 * (i + 1) / 30;
      if (this.wild) fs.x = 300 - 300 * (i + 1) / 30;
      await frames(1);
    }
    fs.x = 0;
    if (this.wild) {
      const w = this.foeParty[0];
      this.f = new Battler(w, 'foe'); this.f.isWild = true;
      this.disp.f.hp = w.hp; Player.seen[baseOf(w.species)] = true;
      Audio2.cry(w.species);
      if (w.shiny) { fs.flash = true; await frames(8); fs.flash = false; }
      this.boxes.f = true;
      if (this.o.legend) await this.say(this.o.legendText || ('전설의 포켓몬 ' + J.iga(w.name) + ' 모습을 드러냈다!'));
      else if (this.o.raid) await this.say((this.o.raid === 'dyna' ? '맥스 레이드 배틀! ' : '테라 레이드 배틀! ') + J.iga(w.name) + ' 나타났다!');
      else await this.say('앗! 야생의 ' + J.iga(w.name) + ' 튀어나왔다!' + (w.shiny ? ' (반짝반짝 빛나고 있다!)' : ''));
      await this.onEntry('f');
    } else {
      this.showLineup = true;
      await this.say(this.trainer.cls + ' ' + J.iga(this.trainer.name) + ' 승부를 걸어왔다!');
      this.showLineup = false;
      const first = this.foeParty[0];
      for (let i = 0; i < 20; i++) { this.trainerSlide.f += 12; await frames(1); }
      this.trainerSlide.showF = false;
      await this.say(this.trainer.cls + ' ' + J.eunneun(this.trainer.name) + ' ' + J.eulreul(first.name) + ' 내보냈다!', false);
      await this.sendOut('f', first);
    }
    // 내 포켓몬 내보내기
    const lead = Player.party.find(m => !m.fainted);
    for (let i = 1; i <= 4; i++) { this.trainerSlide.pFrame = i; await frames(4); }
    for (let i = 0; i < 20; i++) { this.trainerSlide.p -= 14; await frames(1); }
    this.trainerSlide.showP = false;
    await this.say('가랏! ' + lead.name + '!', false);
    await this.sendOut('p', lead);
    // 턴 루프
    while (!this.result) {
      const act = await this.chooseAction();
      if (act === null) continue;
      await this.doTurn(act);
    }
    await this.finish();
    return this.result;
  }
  async chooseAction() {
    // 반동/기 모으기 중이면 자동 행동
    if (this.p.v.recharge) return { type: 'recharge' };
    if (this.p.v.charging) return { type: 'move', move: this.p.v.charging };
    this.msgText = J.eunneun(this.p.mon.name) + ' 무엇을 할까?';
    this.msgShown = this.msgText.length;
    const cmd = await Game.open(new BattleCommandMenu(this));
    if (cmd === 0) {
      const usable = this.p.mon.moves.filter(m => m.pp > 0);
      if (!usable.length) { await this.say(this.p.mon.name + '에게는 쓸 수 있는 기술이 없다!'); return { type: 'move', move: 'STRUGGLE' }; }
      const mi = await Game.open(new FightMenu(this));
      if (mi < 0) return null;
      const mv = this.p.mon.moves[mi];
      if (mv.pp <= 0) { await this.say('기술의 남은 포인트가 없다!'); return null; }
      if (this.p.v.disabled === mv.id) { await this.say('그 기술은 봉인되어 있다!'); return null; }
      return { type: 'move', move: mv.id, slot: mi, gimmick: this.pendingGimmick || null };
    }
    if (cmd === 1) { // 포켓몬
      const idx = await Game.open(new PartyScreen({ mode: 'battle', battle: this }));
      if (idx < 0) return null;
      return { type: 'switch', idx };
    }
    if (cmd === 2) { // 가방
      const res = await Game.open(new BagScreen({ mode: 'battle', battle: this }));
      if (!res) return null;
      return { type: 'item', ...res };
    }
    if (cmd === 3) {
      if (!this.wild) { await this.say('안 돼! 트레이너와의 승부에서 도망칠 수 없다!'); return null; }
      return { type: 'run' };
    }
    return null;
  }
  foeChooseMove() {
    const f = this.f;
    if (f.v.recharge) return { type: 'recharge' };
    if (f.v.charging) return { type: 'move', move: f.v.charging };
    // 관장: 체력이 낮으면 고급상처약 사용
    if (this.leaderPotion > 0 && f.mon.hp < f.mon.maxhp * 0.3 && f.mon.hp > 0) { this.leaderPotion--; return { type: 'foeitem' }; }
    const usable = f.mon.moves.filter(m => m.pp > 0 && MOVES[m.id]);
    if (!usable.length) return { type: 'move', move: 'STRUGGLE' };
    if (this.wild) return { type: 'move', move: pick(usable).id };
    let best = null, bestS = -1;
    for (const m of usable) {
      const md = MOVES[m.id];
      let s;
      if (md.c !== 2) {
        const eff = typeEffect(md.t, this.types(this.p));
        const stab = this.stab(f, md.t);
        s = Math.max(md.p, 40) * eff * stab * (md.a ? md.a / 100 : 1);
      } else {
        s = 15;
        if (/Sleep|Paralyze|Poison|Burn|Confuse/.test(md.f) && !this.p.mon.status) s = 45;
        if (/^Raise/.test(md.f)) s = 25;
        if (/^Heal/.test(md.f)) s = f.mon.hp < f.mon.maxhp / 2 ? 80 : 0;
      }
      s *= 0.75 + Math.random() * 0.5;
      if (s > bestS) { bestS = s; best = m; }
    }
    return { type: 'move', move: best.id };
  }
  async doTurn(pAct) {
    const fAct = this.foeChooseMove();
    if (pAct.gimmick) { await this.applyGimmick('p', pAct.gimmick); this.pendingGimmick = null; }
    const tg = this.trainer && this.trainer.gimmick;
    if (tg && !this.used.f[tg] && fAct.type === 'move' && this.f.mon === this.foeParty[this.foeParty.length - 1]) {
      if (tg !== 'mega' || megaFormFor(this.f.mon)) await this.applyGimmick('f', tg);
    }
    const prio = (a, b) => {
      b = a === pAct ? this.p : this.f;
      if (a.type === 'move') { if (b && b.dyna) return MOVES[a.move] && MOVES[a.move].c === 2 ? 4 : 0; return (MOVES[a.move] ? MOVES[a.move].pr : 0); }
      if (a.type === 'recharge') return 0;
      return 7;
    };
    const pp = prio(pAct, this.p), fp = prio(fAct, this.f);
    let order;
    if (pp !== fp) order = pp > fp ? ['p', 'f'] : ['f', 'p'];
    else {
      const ps = this.p.speed() * this.abSpeed(this.p), fsp = this.f.speed() * this.abSpeed(this.f);
      order = ps > fsp ? ['p', 'f'] : (ps < fsp ? ['f', 'p'] : (chance(0.5) ? ['p', 'f'] : ['f', 'p']));
    }
    const acts = { p: pAct, f: fAct };
    this.turnOrder = order;
    // 이 턴에 행동을 고른 포켓몬 (먼저 맞고 쓰러져 다음 포켓몬이 나오면, 새로 나온 포켓몬이 앞 포켓몬의 기술을 쓰지 않게)
    const chooser = { p: this.p, f: this.f };
    for (const side of order) {
      if (this.result) return;
      const me = this[side], other = this[side === 'p' ? 'f' : 'p'];
      if (!me || me.mon.fainted) continue;
      if (me !== chooser[side] && acts[side].type !== 'switch') continue;
      const a = acts[side];
      if (a.type === 'run') { if (await this.tryRun()) return; continue; }
      if (a.type === 'switch') { await this.playerSwitch(a.idx); continue; }
      if (a.type === 'item') { await this.useItem(a); if (this.result) return; continue; }
      if (a.type === 'foeitem') {
        await this.say(this.trainer.cls + ' ' + J.eunneun(this.trainer.name) + ' 고급상처약을 사용했다!');
        Audio2.se('Use item in party');
        const to = Math.min(me.mon.maxhp, me.mon.hp + 200); me.mon.hp = to; await this.tweenHP('f', to);
        continue;
      }
      if (a.type === 'recharge') { me.v.recharge = false; await this.say(J.eunneun(me.name) + ' 공격의 반동으로 움직일 수 없다!'); continue; }
      await this.useMove(me, other, a.move, a.slot);
      if (await this.checkFaints()) return;
    }
    if (this.result) return;
    await this.endOfTurn();
    await this.checkFaints();
  }
  async tryRun() {
    this.runAttempts++;
    const ps = this.p.mon.stats[5], fs = this.f.mon.stats[5];
    const odds = Math.floor(ps * 128 / Math.max(1, fs)) + 30 * this.runAttempts;
    if (ps >= fs || odds > rand(256)) {
      Audio2.se('Battle flee');
      await this.say('무사히 도망쳤다!');
      this.result = 'run';
      return true;
    }
    await this.say('도망칠 수 없었다!');
    return false;
  }
  async playerSwitch(idx) {
    const mon = Player.party[idx];
    if (this.p.dyna) await this.endDynamax('p');
    if (this.ab(this.p) === 'NATURALCURE') this.p.mon.status = null;
    if (this.ab(this.p) === 'REGENERATOR') this.p.mon.hp = Math.min(this.p.mon.maxhp, this.p.mon.hp + Math.floor(this.p.mon.maxhp / 3));
    await this.say(this.p.mon.name + ', 돌아와!', false);
    await this.recall('p');
    this.p.reset();
    await this.say('가랏! ' + mon.name + '!', false);
    await this.sendOut('p', mon);
  }
  async useItem(a) {
    const it = ITEMS[a.item];
    if (it.fl.includes('PokeBall')) { await this.throwBall(a.item); return; }
    // 회복 아이템 (대상 a.target)
    const mon = Player.party[a.target];
    await this.say(J.eunneun(Player.name) + ' ' + J.eulreul(itemName(a.item)) + ' 사용했다!');
    const isActive = this.p.mon === mon;
    const before = mon.hp;
    const msg = applyMedicine(mon, a.item);
    Bag.remove(a.item, 1);
    if (isActive && mon.hp !== before) await this.tweenHP('p', mon.hp);
    if (msg) await this.say(msg);
  }
  async throwBall(item) {
    Bag.remove(item, 1);
    await this.say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' ' + J.eulreul(itemName(item)) + ' 던졌다!', false);
    if (!this.wild) {
      this.ball = { item, x: 140, y: 250 }; Audio2.se('Battle throw');
      for (let i = 0; i < 20; i++) { this.ball.x += 12; this.ball.y -= 6 - i * 0.4; await frames(1); }
      this.ball = null;
      await this.say('트레이너가 볼을 쳐냈다!'); await this.say('남의 포켓몬을 뺏으면 도둑이야!');
      return;
    }
    const target = this.f.mon;
    // 포획 계산 (3세대식)
    const rate = SPECIES[target.species].cr;
    let bm = BALL_MOD[item] || 1;
    const stBonus = (target.status === 'SLP' || target.status === 'FRZ') ? 2 : (target.status ? 1.5 : 1);
    const a = Math.floor(((3 * target.maxhp - 2 * target.hp) * rate * bm) / (3 * target.maxhp) * stBonus);
    let shakes = 0;
    if (bm >= 255 || a >= 255) shakes = 4;
    else {
      const b = Math.floor(1048560 / Math.sqrt(Math.sqrt(16711680 / Math.max(1, a))));
      for (shakes = 0; shakes < 4; shakes++) if (rand(65536) >= b) break;
    }
    // 연출: 던지기
    Audio2.se('Battle throw');
    this.ball = { item, x: 140, y: 250 };
    const sx = 140, sy = 250, ex = 384, ey = 120;
    for (let i = 1; i <= 24; i++) {
      const t = i / 24; this.ball.x = sx + (ex - sx) * t; this.ball.y = sy + (ey - sy) * t - Math.sin(t * Math.PI) * 90; await frames(1);
    }
    Audio2.se('Battle ball hit');
    const fs = this.sprites.f; fs.flash = true;
    for (let i = 10; i >= 0; i--) { fs.scale = i / 10; await frames(1); }
    fs.visible = false; fs.flash = false;
    Audio2.se('Battle jump to ball');
    for (let i = 0; i < 16; i++) { this.ball.y += 3; await frames(1); }
    Audio2.se('Battle ball drop');
    await frames(20);
    for (let s = 0; s < Math.min(3, shakes); s++) {
      Audio2.se('Battle ball shake');
      for (let i = 0; i < 12; i++) { this.ball.x = ex + Math.sin(i / 12 * Math.PI * 2) * 6; await frames(1); }
      this.ball.x = ex; await frames(24);
    }
    if (shakes >= 4) {
      Audio2.se('Battle catch click');
      await frames(20);
      this.boxes.f = false;
      Audio2.stopBGM();
      Audio2.playME('Battle capture success');
      await this.say('신난다! ' + J.eulreul(target.name) + ' 붙잡았다!');
      this.ball = null;
      target.revertForm(); target.ball = item; target.ot = Player.name; target.metMap = Game.world ? Game.world.def.name : '';
      target.metLevel = target.level;
      const isNew = !Player.caught[baseOf(target.species)];
      Player.caught[baseOf(target.species)] = true; Player.seen[baseOf(target.species)] = true;
      if (isNew) await this.say(target.name + '의 데이터가 포켓몬 도감에 새로 등록되었다!');
      // 경험치도 획득
      await this.awardExp(true);
      const nick = await askYesNoBattle(this, '잡은 ' + target.name + '에게 이름을 붙이겠습니까?');
      if (nick) { const n = await promptName(target.data.name + '의 이름', target.data.name); if (n && n !== target.data.name) target.nickname = n; }
      if (Player.party.length < 6) { Player.party.push(target); }
      else { const bi = Storage.deposit(target); await this.say(target.name + J.eunneun(target.name).slice(target.name.length) + ' PC의 박스 ' + (bi + 1) + '(으)로 전송되었다!'); }
      this.result = 'caught';
      return;
    }
    // 실패: 튀어나옴
    this.ball = null;
    fs.visible = true; fs.flash = true;
    Audio2.se('Battle recall');
    for (let i = 1; i <= 10; i++) { fs.scale = i / 10; await frames(1); }
    fs.flash = false;
    await this.say(['안 돼! 포켓몬이 볼에서 나와 버렸다!', '아앗! 잡았다고 생각했는데!', '아쉽다! 조금만 더하면 잡을 수 있었는데!', '젠장! 거의 잡았는데!'][Math.min(3, shakes)]);
  }
  // ---------- 기술 사용 ----------
  async useMove(user, target, moveId, slot) {
    const side = user === this.p ? 'p' : 'f', tside = side === 'p' ? 'f' : 'p';
    let md = MOVES[moveId] || MOVES.STRUGGLE;
    const mon = user.mon;
    user.v.flinchable = true; this._actor = user;
    // 행동 불능 체크
    if (mon.status === 'SLP') {
      mon.sleepTurns--;
      if (mon.sleepTurns > 0) { await this.say(user.name + J.eunneun(user.name).slice(user.name.length) + ' 쿨쿨 잠들어 있다.'); return; }
      mon.status = null; await this.say(user.name + J.eunneun(user.name).slice(user.name.length) + ' 눈을 떴다!');
    }
    if (mon.status === 'FRZ') {
      if (chance(0.2) || md.t === 'FIRE') { mon.status = null; await this.say(user.name + '의 얼음이 녹았다!'); }
      else { await this.say(user.name + J.eunneun(user.name).slice(user.name.length) + ' 얼어버려서 움직일 수 없다!'); return; }
    }
    if (user.v.flinch && this.ab(user) !== 'INNERFOCUS') { user.v.flinch = false; await this.say(user.name + J.eunneun(user.name).slice(user.name.length) + ' 풀이 죽어 움직일 수 없었다!'); return; }
    if (user.v.confuse > 0) {
      user.v.confuse--;
      if (user.v.confuse === 0) await this.say(user.name + '의 혼란이 풀렸다!');
      else {
        await this.say(user.name + J.eunneun(user.name).slice(user.name.length) + ' 혼란에 빠져 있다!');
        if (chance(1 / 3)) {
          const dmg = Math.max(1, Math.floor(Math.floor(Math.floor(2 * mon.level / 5 + 2) * 40 * (mon.stats[1] * stageMul(user.st.atk)) / (mon.stats[2] * stageMul(user.st.def))) / 50) + 2);
          await this.say('영문도 모른 채 자신을 공격했다!');
          await this.damage(user, dmg);
          return;
        }
      }
    }
    if (mon.status === 'PAR' && chance(0.25)) { await this.say(user.name + J.eunneun(user.name).slice(user.name.length) + ' 몸이 저려서 움직일 수 없다!'); return; }
    // PP 소모
    if (moveId !== 'STRUGGLE' && !user.v.charging) {
      const mv = mon.moves.find(m => m.id === moveId);
      if (mv) mv.pp = Math.max(0, mv.pp - 1);
    }
    let f = md.f || 'None';
    if (user.dyna && moveId !== 'STRUGGLE') { md = maxMoveData(mon, moveId); f = md.f; }
    else if (user.zArm && moveId !== 'STRUGGLE') { const z = zMoveData(mon, moveId); if (z) { md = z; f = z.f; user.zArm = false; this.sprites[side].glow = mon.teraOn ? TYPE_COLORS[mon.tera] : null; Audio2.se('Battle ability'); await Game.flash(1); } }
    await this.say(user.name + '의 ' + md.name + '!', false);
    // 2턴 기술
    if (/^TwoTurnAttack/.test(f) && !user.v.charging) {
      user.v.charging = moveId;
      await this.say(user.name + J.eunneun(user.name).slice(user.name.length) + ' 힘을 모으기 시작했다!');
      return;
    }
    user.v.charging = null;
    // 방어
    if (target.v.protect && md.tg !== 'User' && md.tg !== 'UserSide' && md.tg !== 'BothSides' && !/IgnoreProtections|RemoveProtections/.test(f)) {
      await this.say(target.name + J.eunneun(target.name).slice(target.name.length) + ' 공격으로부터 몸을 지켰다!');
      return;
    }
    const selfTarget = md.tg === 'User' || md.tg === 'UserSide' || md.tg === 'BothSides' || md.tg === 'UserAndAllies';
    // 명중 판정
    if (md.a > 0 && !selfTarget) {
      let acc = md.a * accStageMul(clamp(user.st.acc - target.st.eva, -6, 6));
      if (this.ab(user) === 'COMPOUNDEYES') acc *= 1.3;
      if (this.ab(user) === 'HUSTLE' && md.c === 0) acc *= 0.8;
      if (this.ab(user) === 'NOGUARD' || this.ab(target) === 'NOGUARD') acc = 999;
      if (f === 'OHKO') acc = mon.level >= target.mon.level ? 30 + mon.level - target.mon.level : 0;
      if (Math.random() * 100 >= acc) {
        await this.say('그러나 ' + target.name + '에게는 맞지 않았다!');
        if (/^CrashDamage/.test(f)) { await this.say(user.name + J.eunneun(user.name).slice(user.name.length) + ' 기세 좋게 땅에 부딪혔다!'); await this.damage(user, Math.floor(mon.maxhp / 2)); }
        return;
      }
    }
    if (!selfTarget && await this.abilityImmune(user, target, md)) return;
    // 변화 기술
    if (md.c === 2) {
      await this.playAnim(md.t, selfTarget ? side : tside, 2);
      const ok = await this.statusEffect(user, target, md, f);
      if (!ok) await this.say('그러나 실패했다!');
      return;
    }
    // 공격 기술
    if (this.weatherMod(md.t) === 0) { await this.say(md.t === 'FIRE' ? '강한 비에 불꽃 공격이 사그라들었다!' : '아주 강한 햇살에 물 공격이 증발했다!'); return; }
    const eff = typeEffect(md.t, this.types(target));
    if (eff === 0) { await this.say(target.name + '에게는 효과가 없는 것 같다...'); return; }
    let hits = 1;
    if (/^HitTwoTimes/.test(f)) hits = 2;
    else if (/^HitThreeTimes/.test(f)) hits = 3;
    else if (/^HitTwoToFiveTimes/.test(f)) hits = this.ab(user) === 'SKILLLINK' ? 5 : [2, 2, 2, 3, 3, 3, 4, 5][rand(8)];
    let total = 0, hitCount = 0, crit = false;
    for (let h = 0; h < hits; h++) {
      if (target.mon.fainted) break;
      await this.playAnim(md.t, tside, md.c);
      const r = this.calcDamage(user, target, md, f);
      crit = r.crit;
      total += await this.damage(target, r.dmg, eff);
      hitCount++;
      if (r.crit) await this.say('급소에 맞았다!');
    }
    if (eff > 1) await this.say('효과가 굉장했다!');
    else if (eff < 1) await this.say('효과가 별로인 듯하다...');
    if (hits > 1) await this.say(hitCount + '번 맞았다!');
    // 추가 효과
    if (f === 'MaxMove') { await this.applyMaxEffect(user, target, md.key); return; }
    await this.afterDamage(user, target, md, f, total);
  }
  calcDamage(user, target, md, f) {
    const L = user.mon.level;
    if (f === 'FixedDamageUserLevel') return { dmg: L, crit: false };
    if (f === 'FixedDamageHalfTargetHP') return { dmg: Math.max(1, Math.floor(target.mon.hp / 2)), crit: false };
    if (f === 'FixedDamage20') return { dmg: 20, crit: false };
    if (f === 'FixedDamage40') return { dmg: 40, crit: false };
    if (f === 'OHKO') return { dmg: target.mon.hp, crit: false };
    let P = md.p;
    if (f === 'PowerHigherWithUserHP') P = Math.max(1, Math.floor(150 * user.mon.hp / user.mon.maxhp));
    else if (f === 'PowerLowerWithUserHP') { const r = Math.floor(48 * user.mon.hp / user.mon.maxhp); P = r <= 1 ? 200 : r <= 4 ? 150 : r <= 9 ? 100 : r <= 16 ? 80 : r <= 32 ? 40 : 20; }
    else if (f === 'PowerHigherWithTargetWeight') { const w = target.mon.data.w; P = w >= 2000 ? 120 : w >= 1000 ? 100 : w >= 500 ? 80 : w >= 250 ? 60 : w >= 100 ? 40 : 20; }
    else if (P <= 1) P = 60;
    P = Math.floor(P * this.abAttackMod(user, target, md, P));
    const phys = md.c === 0;
    let critStage = (md.fl.includes('HighCriticalHitRate') ? 1 : 0) + (user.v.focus ? 2 : 0) + (this.ab(user) === 'SUPERLUCK' ? 1 : 0);
    let crit = f === 'AlwaysCriticalHit' || Math.random() < [1 / 24, 1 / 8, 1 / 2, 1][Math.min(3, critStage)];
    if (['BATTLEARMOR', 'SHELLARMOR'].includes(this.ab(target))) crit = false;
    let aS = phys ? user.st.atk : user.st.spa, dS = phys ? target.st.def : target.st.spd;
    if (crit) { aS = Math.max(0, aS); dS = Math.min(0, dS); }
    if (/IgnoreTargetDefSpDefEvaStatStages/.test(f)) dS = 0;
    const A = (phys ? user.mon.stats[1] : user.mon.stats[3]) * stageMul(aS);
    const D = ((phys || f === 'UseTargetDefenseInsteadOfTargetSpDef') ? target.mon.stats[2] : target.mon.stats[4]) * stageMul(dS);
    let dmg = Math.floor(Math.floor(Math.floor(2 * L / 5 + 2) * P * A / Math.max(1, D)) / 50) + 2;
    if (crit) dmg = Math.floor(dmg * (this.ab(user) === 'SNIPER' ? 2.25 : 1.5));
    dmg = Math.floor(dmg * (85 + rand(16)) / 100);
    dmg = Math.floor(dmg * this.stab(user, md.t));
    dmg = Math.floor(dmg * this.weatherMod(md.t));
    dmg = Math.floor(dmg * typeEffect(md.t, this.types(target)));
    if (phys && user.mon.status === 'BRN' && this.ab(user) !== 'GUTS') dmg = Math.floor(dmg / 2);
    dmg = Math.floor(dmg * this.abDefenseMod(user, target, md, typeEffect(md.t, this.types(target))));
    if (target.v.screen && !crit) dmg = Math.floor(dmg * 0.66);
    return { dmg: Math.max(1, dmg), crit };
  }
  async damage(b, dmg, eff = 1) {
    const side = b === this.p ? 'p' : 'f';
    if (b.v.endure && dmg >= b.mon.hp) dmg = b.mon.hp - 1;
    if (this.ab(b) === 'STURDY' && b.mon.hp >= b.mon.maxhp && dmg >= b.mon.hp && b.mon.hp > 1) { dmg = b.mon.hp - 1; b.v.sturdyMsg = true; }
    dmg = Math.min(dmg, b.mon.hp);
    b.mon.hp -= dmg;
    Audio2.se(eff > 1 ? 'Battle damage super' : (eff < 1 ? 'Battle damage weak' : 'Battle damage normal'));
    await this.shake(side);
    await this.tweenHP(side, b.mon.hp);
    if (b.v.sturdyMsg) { b.v.sturdyMsg = false; await this.abPop(b, J.eunneun(b.name) + ' 공격을 버텼다!'); }
    return dmg;
  }
  async heal(b, amt) {
    const side = b === this.p ? 'p' : 'f';
    amt = Math.min(amt, b.mon.maxhp - b.mon.hp);
    if (amt <= 0) return 0;
    b.mon.hp += amt;
    await this.tweenHP(side, b.mon.hp);
    return amt;
  }
  async changeStages(b, stats, n, silentFail) {
    let any = false;
    const ba = this.ab(b), fromFoe = n < 0 && this._actor && this._actor !== b;
    if (fromFoe && ['CLEARBODY', 'WHITESMOKE', 'FULLMETALBODY'].includes(ba)) { await this.abPop(b, b.name + '의 능력은 떨어지지 않는다!'); return false; }
    if (fromFoe && ba === 'HYPERCUTTER') stats = stats.filter(s => s !== 'atk');
    if (fromFoe && ba === 'KEENEYE') stats = stats.filter(s => s !== 'acc');
    if (fromFoe && (ba === 'DEFIANT' || ba === 'COMPETITIVE')) setTimeout(() => { }, 0), b.v.defiant = ba;
    if (n > 0 && ba === 'CONTRARY') n = -n; else if (n < 0 && ba === 'CONTRARY') n = -n;
    if (ba === 'SIMPLE') n *= 2;
    for (const k of stats) {
      const cur = b.st[k];
      const nv = clamp(cur + n, -6, 6);
      const nm = STAGE_NAMES[k];
      if (nv === cur) { if (!silentFail) await this.say(b.name + '의 ' + nm + J.eunneun(nm).slice(nm.length) + ' 더 이상 ' + (n > 0 ? '올라가지 않는다!' : '떨어지지 않는다!')); continue; }
      b.st[k] = nv; any = true;
      Audio2.se(n > 0 ? 'Battle ability' : 'Battle damage weak', 0.6);
      const deg = Math.abs(n) >= 3 ? '매우 크게 ' : (Math.abs(n) === 2 ? '크게 ' : '');
      await this.say(b.name + '의 ' + J.iga(nm) + ' ' + deg + (n > 0 ? '올라갔다!' : '떨어졌다!'));
    }
    if (any && b.v.defiant) { const k = b.v.defiant === 'DEFIANT' ? 'atk' : 'spa'; b.v.defiant = null; await this.abPop(b); const sa = this._actor; this._actor = null; await this.changeStages(b, [k], 2); this._actor = sa; }
    return any;
  }
  async inflict(b, st, fromStatusMove) {
    const m = b.mon, t = m.types;
    if (m.fainted) return false;
    if (st === 'CONFUSE') {
      if (b.v.confuse > 0) { if (fromStatusMove) await this.say(b.name + J.eunneun(b.name).slice(b.name.length) + ' 이미 혼란에 빠져 있다!'); return false; }
      b.v.confuse = 2 + rand(4); await this.say(b.name + J.eunneun(b.name).slice(b.name.length) + ' 혼란에 빠졌다!'); return true;
    }
    const ia = this.ab(b), imm = AB_STATUS_IMMUNE[ia];
    if (imm && imm.includes(st)) { if (fromStatusMove || st !== 'FLINCH') await this.abPop(b, b.name + '에게는 효과가 없다!'); return false; }
    if (st === 'FLINCH') { b.v.flinch = true; return true; }
    if (m.status) { if (fromStatusMove) await this.say(b.name + J.eunneun(b.name).slice(b.name.length) + ' 이미 상태 이상이다!'); return false; }
    if ((st === 'PSN' || st === 'TOX') && (t.includes('POISON') || t.includes('STEEL'))) return false;
    if (st === 'BRN' && t.includes('FIRE')) return false;
    if (st === 'PAR' && t.includes('ELECTRIC')) return false;
    if (st === 'FRZ' && t.includes('ICE')) return false;
    m.status = st;
    if (st === 'SLP') m.sleepTurns = 2 + rand(3);
    if (st === 'TOX') b.v.toxic = 1;
    const msgs = { PSN: '독에 걸렸다!', TOX: '맹독을 입었다!', BRN: '화상을 입었다!', PAR: '마비되어 기술이 나오기 어려워졌다!', SLP: '잠들어 버렸다!', FRZ: '얼어붙었다!' };
    await this.say(b.name + J.eunneun(b.name).slice(b.name.length) + ' ' + msgs[st]);
    return true;
  }
  statusFromCode(f) {
    if (/BadPoisonTarget/.test(f)) return 'TOX';
    if (/PoisonTarget/.test(f)) return 'PSN';
    if (/BurnTarget/.test(f)) return 'BRN';
    if (/ParalyzeTarget/.test(f)) return 'PAR';
    if (/SleepTarget/.test(f)) return 'SLP';
    if (/FreezeTarget/.test(f)) return 'FRZ';
    if (/ConfuseTarget/.test(f)) return 'CONFUSE';
    if (/FlinchTarget/.test(f)) return 'FLINCH';
    return null;
  }
  parseStatCode(f) {
    const m = f.match(/^(Raise|Lower)(User|Target)([A-Za-z]+?)(\d)$/);
    if (!m) return null;
    const stats = [];
    const re = /(MainStats|SpAtk|SpDef|Attack|Atk|Defense|Def|Speed|Spd|Accuracy|Acc|Evasion|Eva)/g;
    let t; while ((t = re.exec(m[3]))) stats.push(...STAT_TOKEN[t[1]]);
    if (!stats.length) return null;
    return { who: m[2], stats, n: (m[1] === 'Raise' ? 1 : -1) * parseInt(m[4]) };
  }
  async statusEffect(user, target, md, f) {
    const sc = this.parseStatCode(f);
    if (sc) return await this.changeStages(sc.who === 'User' ? user : target, sc.stats, sc.n);
    const st = this.statusFromCode(f);
    if (st) {
      if (typeEffect(md.t, this.types(target)) === 0 && md.t !== 'NORMAL') { await this.say(target.name + '에게는 효과가 없는 것 같다...'); return true; }
      const ok = await this.inflict(target, st, true);
      if (/RaiseTarget/.test(f) && ok) await this.changeStages(target, [/SpAtk/.test(f) ? 'spa' : 'atk'], 2);
      return ok || /ConfuseTarget/.test(f) && false;
    }
    if (/^HealUser(HalfOfTotalHP|DependingOnWeather|DependingOnSandstorm)/.test(f) || f === 'HealUserHalfOfTotalHP') {
      if (user.mon.hp >= user.mon.maxhp) { await this.say(user.name + '의 체력은 이미 가득 찼다!'); return true; }
      await this.heal(user, Math.ceil(user.mon.maxhp / 2)); await this.say(user.name + '의 체력이 회복되었다!'); return true;
    }
    if (f === 'HealUserFullyAndFallAsleep') {
      if (user.mon.hp >= user.mon.maxhp) return false;
      user.mon.status = 'SLP'; user.mon.sleepTurns = 3;
      await this.heal(user, user.mon.maxhp); await this.say(user.name + J.eunneun(user.name).slice(user.name.length) + ' 잠들어서 건강해졌다!'); return true;
    }
    if (/^ProtectUser/.test(f)) {
      const n = user.v.protectCount || 0;
      if (Math.random() >= 1 / Math.pow(3, n)) { user.v.protectCount = 0; return false; }
      user.v.protect = true; user.v.protectCount = n + 1;
      await this.say(user.name + J.eunneun(user.name).slice(user.name.length) + ' 방어 태세에 들어갔다!'); return true;
    }
    if (f === 'StartLeechSeedTarget') {
      if (target.v.seeded || target.mon.types.includes('GRASS')) return false;
      target.v.seeded = true; await this.say(target.name + '에게 씨앗을 심었다!'); return true;
    }
    if (f === 'ResetAllBattlersStatStages') { this.p.reset(); this.f.reset(); await this.say('모든 능력 변화가 원래대로 돌아왔다!'); return true; }
    if (/StartUserSide(Physical|Special)?Damage|StartWeakenDamageAgainstUserSide|Reflect|LightScreen/.test(f) || md.name === '리플렉터' || md.name === '빛의장막') {
      user.v.screen = 5; await this.say(user.name + '의 주위에 벽이 생겼다!'); return true;
    }
    if (f === 'RaiseUserCriticalHitRate2' || f === 'RaiseUserCriticalHitRate') { user.v.focus = true; await this.say(user.name + J.eunneun(user.name).slice(user.name.length) + ' 기합이 들어갔다!'); return true; }
    if (f === 'UserEnduresFaintingThisTurn') { user.v.endure = true; await this.say(user.name + J.eunneun(user.name).slice(user.name.length) + ' 버티기 태세에 들어갔다!'); return true; }
    if (f === 'DisableTargetLastMoveUsed' && target.v.lastMove) { target.v.disabled = target.v.lastMove; await this.say(target.name + '의 ' + J.eulreul(moveName(target.v.lastMove)) + ' 봉인했다!'); return true; }
    if (f === 'CureUserPartyStatus') { Player.party.forEach(m => m.status = null); await this.say('동료의 상태 이상이 나았다!'); return true; }
    if (f === 'UserMakeSubstitute') { if (user.mon.hp <= user.mon.maxhp / 4) return false; await this.damage(user, Math.floor(user.mon.maxhp / 4)); user.v.endure = true; await this.say(user.name + '의 대타가 나타났다!'); return true; }
    if (f === 'SwitchOutTargetStatusMove' && this.wild) { await this.say(target.name + J.eunneun(target.name).slice(target.name.length) + ' 도망쳐 버렸다!'); this.result = 'run'; return true; }
    if (f === 'None' && md.p === 0) { await this.say('하지만 아무 일도 일어나지 않았다!'); return true; }
    if (/^Raise|^Lower/.test(f)) {
      // 다중 단계 등 파싱 실패 시 공격 1단계
      return await this.changeStages(/User/.test(f) ? user : target, ['atk'], /Raise/.test(f) ? 1 : -1);
    }
    await this.say('하지만 아무 일도 일어나지 않았다!');
    return true;
  }
  async afterDamage(user, target, md, f, dealt) {
    if (dealt > 0) await this.abContact(user, target, md);
    // 흡수
    if (/HealUserByHalfOfDamageDone/.test(f) && dealt > 0) { if (await this.heal(user, Math.max(1, Math.floor(dealt / 2)))) await this.say(target.name + '의 체력을 흡수했다!'); }
    if (/HealUserByThreeQuartersOfDamageDone/.test(f) && dealt > 0) { if (await this.heal(user, Math.max(1, Math.floor(dealt * 3 / 4)))) await this.say(target.name + '의 체력을 흡수했다!'); }
    // 반동
    let recoil = 0;
    if (/RecoilQuarterOfDamageDealt/.test(f)) recoil = dealt / 4;
    else if (/RecoilThirdOfDamageDealt/.test(f)) recoil = dealt / 3;
    else if (/RecoilHalfOfDamageDealt/.test(f)) recoil = dealt / 2;
    if (md.f === undefined && md === MOVES.STRUGGLE) recoil = user.mon.maxhp / 4;
    if (['ROCKHEAD', 'MAGICGUARD'].includes(this.ab(user)) && md !== MOVES.STRUGGLE) recoil = 0;
    if (recoil > 0 && !user.mon.fainted) { await this.say(user.name + J.eunneun(user.name).slice(user.name.length) + ' 반동으로 데미지를 입었다!'); await this.damage(user, Math.max(1, Math.floor(recoil))); }
    if (/^UserFaintsExplosive|UserFaints/.test(f)) { await this.damage(user, user.mon.hp); }
    if (f === 'AttackAndSkipNextTurn') user.v.recharge = true;
    if (/^BindTarget/.test(f) && !target.mon.fainted && !target.v.bound) { target.v.bound = 4 + rand(2); await this.say(target.name + J.eunneun(target.name).slice(target.name.length) + ' 조임을 당했다!'); }
    if (/MultiTurnAttackConfuseUserAtEnd/.test(f) && chance(0.4)) await this.inflict(user, 'CONFUSE');
    // 부가 효과
    if (target.mon.fainted && !/User/.test(f)) return;
    let ch = md.ec > 0 ? md.ec / 100 : 1;
    if (this.ab(user) === 'SERENEGRACE') ch *= 2;
    if (this.ab(user) === 'SHEERFORCE' && md.ec > 0) ch = 0;
    if (this.ab(target) === 'SHIELDDUST' && md.ec > 0) ch = 0;
    const st = this.statusFromCode(f);
    if (st && chance(ch)) {
      if (st === 'FLINCH') { if (this.turnOrder && this.turnOrder[0] === (user === this.p ? 'p' : 'f')) target.v.flinch = true; }
      else await this.inflict(target, st);
    }
    const sc = this.parseStatCode(f);
    if (sc && chance(ch)) {
      const b = sc.who === 'User' ? user : target;
      if (!b.mon.fainted) await this.changeStages(b, sc.stats, sc.n, true);
    }
    if (f === 'LowerUserDefSpDef1' && !user.mon.fainted) await this.changeStages(user, ['def', 'spd'], -1, true);
  }
  async endOfTurn() {
    await this.weatherEndTurn();
    for (const side of ['p', 'f']) {
      const b = this[side]; if (!b || b.mon.fainted) continue;
      if (b.dyna > 0 && b.dyna < 99 && --b.dyna === 0) await this.endDynamax(side);
      await this.abEndTurn(b);
      if (b.mon.item === 'LEFTOVERS' && b.mon.hp < b.mon.maxhp) { if (await this.heal(b, Math.max(1, Math.floor(b.mon.maxhp / 16)))) await this.say(b.name + J.eunneun(b.name).slice(b.name.length) + ' 먹다남은음식으로 조금 회복했다.'); }
    }
    for (const side of ['p', 'f']) {
      const b = this[side]; if (!b || b.mon.fainted) continue;
      b.v.protect = false; b.v.endure = false; b.v.flinch = false;
      if (b.v.screen) b.v.screen--;
      const m = b.mon;
      if (this.ab(b) === 'MAGICGUARD') { if (b.v.seeded) b.v.seeded = false; continue; }
      if (this.ab(b) === 'POISONHEAL' && (m.status === 'PSN' || m.status === 'TOX')) { if (await this.heal(b, Math.floor(m.maxhp / 8))) await this.abPop(b, '독으로 체력을 회복했다!'); continue; }
      if (m.status === 'BRN') { await this.say(b.name + J.eunneun(b.name).slice(b.name.length) + ' 화상 데미지를 입었다!'); await this.damage(b, Math.max(1, Math.floor(m.maxhp / 16))); }
      else if (m.status === 'PSN') { await this.say(b.name + J.eunneun(b.name).slice(b.name.length) + ' 독에 의한 데미지를 입었다!'); await this.damage(b, Math.max(1, Math.floor(m.maxhp / 8))); }
      else if (m.status === 'TOX') { b.v.toxic = (b.v.toxic || 1); await this.say(b.name + J.eunneun(b.name).slice(b.name.length) + ' 독에 의한 데미지를 입었다!'); await this.damage(b, Math.max(1, Math.floor(m.maxhp * b.v.toxic / 16))); b.v.toxic++; }
      if (m.fainted) continue;
      if (b.v.seeded) {
        const o = this[side === 'p' ? 'f' : 'p'];
        const d = await this.damage(b, Math.max(1, Math.floor(m.maxhp / 8)));
        await this.say('씨뿌리기가 ' + b.name + '의 체력을 빼앗는다!');
        if (o && !o.mon.fainted) await this.heal(o, d);
      }
      if (m.fainted) continue;
      if (b.v.bound > 0) {
        b.v.bound--;
        if (b.v.bound === 0) await this.say(b.name + J.eunneun(b.name).slice(b.name.length) + ' 조이기에서 풀려났다!');
        else { await this.say(b.name + J.eunneun(b.name).slice(b.name.length) + ' 조이기 데미지를 입고 있다!'); await this.damage(b, Math.max(1, Math.floor(m.maxhp / 8))); }
      }
    }
  }
  // 기절 처리. 배틀이 끝나면 true
  async checkFaints() {
    if (this.f && this.f.mon.fainted && this.boxes.f !== 'gone') {
      await this.faintAnim('f');
      await this.say(this.f.name + J.eunneun(this.f.name).slice(this.f.name.length) + ' 쓰러졌다!');
      this.boxes.f = 'gone';
      if (this.p && !this.p.mon.fainted && ['MOXIE', 'CHILLINGNEIGH', 'GRIMNEIGH', 'BEASTBOOST'].includes(this.ab(this.p))) { await this.abPop(this.p); await this.changeStages(this.p, [this.ab(this.p) === 'GRIMNEIGH' ? 'spa' : 'atk'], 1, true); }
      if (this.o.raid) { await this.raidCatch(); return true; }
      await this.awardExp(false);
      if (this.result) return true;
    }
    if (this.p && this.p.mon.fainted && this.sprites.p.visible) {
      await this.faintAnim('p');
      await this.say(this.p.mon.name + J.eunneun(this.p.mon.name).slice(this.p.mon.name.length) + ' 쓰러졌다!');
      this.participants.delete(Player.party.indexOf(this.p.mon));
      if (!Player.party.some(m => !m.fainted)) {
        await this.say(Player.name + '에게는 싸울 수 있는 포켓몬이 없다!');
        if (!this.wild) {
          const lose = Math.min(Player.money, Math.floor(Player.money / 2));
          Player.money -= lose;
          await this.say(this.trainer.name + '에게 ' + lose + '원을 건네주었다...');
        }
        await this.say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' 눈앞이 캄캄해졌다!');
        this.result = 'lose';
        return true;
      }
      const idx = await Game.open(new PartyScreen({ mode: 'battle', battle: this, forced: true }));
      const mon = Player.party[idx];
      this.p.reset();
      await this.say('가랏! ' + mon.name + '!', false);
      await this.sendOut('p', mon);
    }
    if (this.boxes.f === 'gone') {
      // 다음 상대
      const next = this.foeParty.find(m => !m.fainted);
      if (!next) {
        if (this.wild) { this.result = 'win'; return true; }
        await this.trainerDefeated();
        return true;
      }
      // 교체 여부 질문
      if (Player.options.battleShift !== false && Player.party.filter(m => !m.fainted).length > 1) {
        const yes = await askYesNoBattle(this, this.trainer.cls + ' ' + J.eunneun(this.trainer.name) + ' ' + J.eulreul(next.name) + ' 내보내려 하고 있다. 포켓몬을 교체하겠습니까?');
        if (yes) {
          const idx = await Game.open(new PartyScreen({ mode: 'battle', battle: this }));
          if (idx >= 0) await this.playerSwitch(idx);
        }
      }
      await this.say(this.trainer.cls + ' ' + J.eunneun(this.trainer.name) + ' ' + J.eulreul(next.name) + ' 내보냈다!', false);
      this.f = null;
      await this.sendOut('f', next);
    }
    return false;
  }
  async trainerDefeated() {
    Audio2.stopBGM();
    Audio2.playBGM(this.trainer.leader ? 'Battle victory leader' : 'Battle victory trainer');
    this.trainerSlide.showF = true; this.trainerSlide.f = 200;
    for (let i = 0; i < 20; i++) { this.trainerSlide.f -= 10; await frames(1); }
    await this.say(this.trainer.cls + ' ' + J.wagwa(this.trainer.name) + '의 승부에서 이겼다!');
    if (this.trainer.afterBattle) for (const l of [].concat(this.trainer.afterBattle)) await this.say(l);
    const money = this.trainer.money || 100;
    Player.money += money;
    await this.say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' 상금으로 ' + money + '원을 손에 넣었다!');
    this.result = 'win';
  }
  // 경험치 분배
  async awardExp(fromCatch) {
    const foe = this.f.mon;
    const parts = [...this.participants].filter(i => Player.party[i] && !Player.party[i].fainted);
    const receivers = new Set(parts);
    Player.party.forEach((m, i) => { if (!m.fainted) receivers.add(i); }); // 모던 학습장치: 파티 전원이 경험치를 얻음
    let groupMsg = false;
    if (!receivers.size) return;
    const b = foe.data.exp, L = foe.level;
    for (const i of receivers) {
      const mon = Player.party[i];
      if (mon.level >= 100) continue;
      const isPart = parts.includes(i);
      const Lp = mon.level;
      let exp = (b * L / 5) * (this.wild ? 1 : 1.5) * Math.pow((2 * L + 10) / (L + Lp + 10), 2.5) + 1;
      if (!isPart) exp *= 0.8;
      if (mon.ot && mon.ot !== Player.name) exp *= 1.5;
      if (Player.party.length) exp *= 1;
      exp = Math.max(1, Math.floor(exp));
      if (isPart) await this.say(mon.name + J.eunneun(mon.name).slice(mon.name.length) + ' ' + exp + ' 경험치를 얻었다!');
      else if (!groupMsg) { groupMsg = true; await this.say('함께한 포켓몬들도 경험치를 얻었다!'); }
      await this.gainExp(mon, exp);
    }
  }
  async gainExp(mon, exp) {
    const active = this.p && this.p.mon === mon;
    let remaining = exp;
    if (active) Audio2.se('Pkmn exp gain', 0.5);
    while (remaining > 0 && mon.level < 100) {
      const need = mon.expAt(mon.level + 1) - mon.exp;
      const step = Math.min(need, remaining);
      const from = mon.expProgress();
      mon.exp += step; remaining -= step;
      if (active) {
        const to = mon.exp >= mon.expAt(mon.level + 1) ? 1 : mon.expProgress();
        for (let i = 1; i <= 16; i++) { this.disp.p.exp = from + (to - from) * i / 16; await frames(1); }
      }
      if (mon.exp >= mon.expAt(mon.level + 1)) {
        const old = mon.levelUp();
        if (active) { this.disp.p.hp = mon.hp; this.disp.p.exp = 0; Audio2.se('Pkmn level up'); }
        else Audio2.se('Pkmn level up');
        await this.say(mon.name + '의 레벨이 ' + mon.level + J.ro(String(mon.level)).slice(String(mon.level).length) + ' 올랐다!');
        await Game.open(new LevelUpWindow(mon, old));
        for (const mv of mon.movesLearnedAt(mon.level)) await learnMoveFlow(mon, mv, s => this.say(s), this);
        const evo = mon.evolutionTarget('level');
        if (evo && !this.evolveQueue.some(e => e[0] === mon)) this.evolveQueue.push([mon, evo]);
      }
    }
    if (active) this.disp.p.exp = mon.expProgress();
  }
  async raidCatch() {
    await this.awardExp(false);
    const ball = ['ULTRABALL', 'GREATBALL', 'POKEBALL', 'PREMIERBALL', 'MASTERBALL'].find(b => Bag.count(b) > 0);
    const target = this.f.mon;
    if (!ball) { await this.say('몬스터볼이 없어서 잡을 수 없었다...'); this.result = 'win'; return; }
    const yes = await askYesNoBattle(this, J.eulreul(target.name) + ' 잡으시겠습니까? (' + itemName(ball) + ' 사용)');
    if (!yes) { this.result = 'win'; return; }
    Bag.remove(ball, 1);
    target.revertForm(); target.hp = target.maxhp; target.status = null; target.teraOn = false;
    this.ball = { item: ball, x: 384, y: 150 };
    Audio2.se('Battle ball shake'); await frames(30); Audio2.se('Battle catch click');
    this.ball = null; Audio2.stopBGM(); Audio2.playME('Battle capture success');
    await this.say('신난다! ' + J.eulreul(target.name) + ' 붙잡았다!');
    target.ball = ball; target.ot = Player.name; target.metMap = Game.world ? Game.world.def.name : ''; target.metLevel = target.level;
    Player.caught[baseOf(target.species)] = true; Player.seen[baseOf(target.species)] = true;
    if (Player.party.length < 6) Player.party.push(target); else { const bi = Storage.deposit(target); await this.say(J.eunneun(target.name) + ' 박스 ' + (bi + 1) + '(으)로 전송되었다!'); }
    this.result = 'caught';
  }
  async finish() {
    // 전투 종료 후 처리
    Player.party.forEach(m => m.revertForm());
    this.foeParty.forEach(m => m.revertForm());
    Player.party.forEach(m => { if (m.status === 'CONFUSE') m.status = null; });
    if (this.result === 'win' && this.wild) {
      Audio2.stopBGM(); Audio2.playBGM('Battle victory wild');
      await frames(30);
    }
    if (this.result === 'win' && this.o.payDay) Player.money += this.o.payDay;
    await frames(10);
  }
}

// 배틀 중 예/아니오
async function askYesNoBattle(battle, q) {
  await battle.say(q, false);
  const r = await Game.open(new ChoiceBox(['예', '아니오'], { x: 380, y: 196, cancel: 1 }));
  return r === 0;
}

// 회복 아이템 적용 → 메시지 반환 (실패 시 null)
function medicineUsable(mon, item) {
  const id = item;
  if (['REVIVE', 'MAXREVIVE'].includes(id)) return mon.fainted;
  if (mon.fainted) return false;
  const hpItems = { POTION: 20, SUPERPOTION: 60, HYPERPOTION: 120, MAXPOTION: 9999, FRESHWATER: 30, SODAPOP: 50, LEMONADE: 70, MOOMOOMILK: 100, ORANBERRY: 10, SITRUSBERRY: 30 };
  if (id === 'FULLRESTORE') return mon.hp < mon.maxhp || !!mon.status;
  if (hpItems[id]) return mon.hp < mon.maxhp;
  const cure = { ANTIDOTE: ['PSN', 'TOX'], PARALYZEHEAL: ['PAR'], AWAKENING: ['SLP'], BURNHEAL: ['BRN'], ICEHEAL: ['FRZ'], FULLHEAL: ['PSN', 'TOX', 'PAR', 'SLP', 'BRN', 'FRZ'] };
  if (cure[id]) return cure[id].includes(mon.status);
  if (['ETHER', 'MAXETHER', 'ELIXIR', 'MAXELIXIR'].includes(id)) return mon.moves.some(m => m.pp < m.max);
  return false;
}
function applyMedicine(mon, id) {
  const hpItems = { POTION: 20, SUPERPOTION: 60, HYPERPOTION: 120, MAXPOTION: 9999, FRESHWATER: 30, SODAPOP: 50, LEMONADE: 70, MOOMOOMILK: 100, ORANBERRY: 10, SITRUSBERRY: 30 };
  if (id === 'REVIVE' || id === 'MAXREVIVE') {
    mon.hp = id === 'REVIVE' ? Math.floor(mon.maxhp / 2) : mon.maxhp; mon.status = null;
    return mon.name + J.eunneun(mon.name).slice(mon.name.length) + ' 기운을 되찾았다!';
  }
  if (id === 'FULLRESTORE') { const a = mon.maxhp - mon.hp; mon.hp = mon.maxhp; mon.status = null; return mon.name + '의 체력이 ' + a + ' 회복되었다!'; }
  if (hpItems[id]) { const a = Math.min(hpItems[id], mon.maxhp - mon.hp); mon.hp += a; return mon.name + '의 체력이 ' + a + ' 회복되었다!'; }
  if (['ANTIDOTE', 'PARALYZEHEAL', 'AWAKENING', 'BURNHEAL', 'ICEHEAL', 'FULLHEAL'].includes(id)) { mon.status = null; return mon.name + J.eunneun(mon.name).slice(mon.name.length) + ' 건강해졌다!'; }
  if (id === 'ETHER' || id === 'MAXETHER') { const m = mon.moves.find(x => x.pp < x.max); if (m) m.pp = id === 'ETHER' ? Math.min(m.max, m.pp + 10) : m.max; return moveName(m.id) + '의 PP가 회복되었다!'; }
  if (id === 'ELIXIR' || id === 'MAXELIXIR') { mon.moves.forEach(m => m.pp = id === 'ELIXIR' ? Math.min(m.max, m.pp + 10) : m.max); return mon.name + '의 PP가 회복되었다!'; }
  return null;
}

// 새 기술 배우기 흐름 (전투/필드 공용)
async function learnMoveFlow(mon, mv, sayFn, battle) {
  if (mon.knows(mv)) return;
  const mn = moveName(mv);
  if (mon.moves.length < 4) {
    mon.moves.push(Mon.makeMove(mv));
    Audio2.se('Pkmn move learnt');
    await sayFn(mon.name + J.eunneun(mon.name).slice(mon.name.length) + ' 새로 ' + J.eulreul(mn) + ' 배웠다!');
    return;
  }
  while (true) {
    await sayFn(mon.name + J.eunneun(mon.name).slice(mon.name.length) + ' ' + J.eulreul(mn) + ' 배우고 싶어 한다...');
    await sayFn('하지만 ' + mon.name + J.eunneun(mon.name).slice(mon.name.length) + ' 기술을 4개 알고 있다. 다른 기술을 잊게 하겠습니까?', false);
    const yn = await Game.open(new ChoiceBox(['예', '아니오'], { x: 380, y: 196, cancel: 1 }));
    if (yn === 0) {
      const idx = await Game.open(new SummaryScreen([mon], 0, { learn: mv }));
      if (idx >= 0 && idx < 4) {
        const old = moveName(mon.moves[idx].id);
        mon.moves[idx] = Mon.makeMove(mv);
        await sayFn('1, 2, 그리고... 짠! ' + mon.name + J.eunneun(mon.name).slice(mon.name.length) + ' ' + J.eulreul(old) + ' 깨끗이 잊었다!');
        Audio2.se('Pkmn move learnt');
        await sayFn('그리고 새로 ' + J.eulreul(mn) + ' 배웠다!');
        return;
      }
    }
    await sayFn(J.eulreul(mn) + ' 배우는 것을 포기하겠습니까?', false);
    const g = await Game.open(new ChoiceBox(['예', '아니오'], { x: 380, y: 196, cancel: 1 }));
    if (g === 0) { await sayFn(mon.name + J.eunneun(mon.name).slice(mon.name.length) + ' ' + J.eulreul(mn) + ' 배우지 않았다!'); return; }
  }
}
