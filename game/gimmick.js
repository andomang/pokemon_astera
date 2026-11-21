// ============================================================
// gimmick.js - 메가진화, 다이맥스/거다이맥스, 테라스탈, 원시회귀, 날씨
// ============================================================
'use strict';

const MAX_MOVE_BY_TYPE = {
  NORMAL: 'MAXSTRIKE', FIGHTING: 'MAXKNUCKLE', FLYING: 'MAXAIRSTREAM', POISON: 'MAXOOZE', GROUND: 'MAXQUAKE', ROCK: 'MAXROCKFALL',
  BUG: 'MAXFLUTTERBY', GHOST: 'MAXPHANTASM', STEEL: 'MAXSTEELSPIKE', FIRE: 'MAXFLARE', WATER: 'MAXGEYSER', GRASS: 'MAXOVERGROWTH',
  ELECTRIC: 'MAXLIGHTNING', PSYCHIC: 'MAXMINDSTORM', ICE: 'MAXHAILSTORM', DRAGON: 'MAXWYRMWIND', DARK: 'MAXDARKNESS', FAIRY: 'MAXSTARFALL'
};
// 다이맥스 기술 부가효과: [대상('self'|'foe'|'weather'|'heal'), 값]
const MAX_EFFECT = {
  MAXSTRIKE: ['foe', ['spe'], -1], MAXKNUCKLE: ['self', ['atk'], 1], MAXAIRSTREAM: ['self', ['spe'], 1], MAXOOZE: ['self', ['spa'], 1],
  MAXQUAKE: ['self', ['spd'], 1], MAXSTEELSPIKE: ['self', ['def'], 1], MAXFLUTTERBY: ['foe', ['spa'], -1], MAXPHANTASM: ['foe', ['def'], -1],
  MAXWYRMWIND: ['foe', ['atk'], -1], MAXDARKNESS: ['foe', ['spd'], -1], MAXFLARE: ['weather', 'SUN'], MAXGEYSER: ['weather', 'RAIN'],
  MAXROCKFALL: ['weather', 'SAND'], MAXHAILSTORM: ['weather', 'HAIL'], MAXOVERGROWTH: ['heal'], MAXLIGHTNING: ['heal'], MAXMINDSTORM: ['heal'], MAXSTARFALL: ['heal']
};
const WEATHER_NAME = { SUN: '햇살이 강해졌다!', RAIN: '비가 내리기 시작했다!', SAND: '모래바람이 불기 시작했다!', HAIL: '싸라기눈이 내리기 시작했다!', HSUN: '햇살이 아주 강해졌다!', HRAIN: '강한 비가 내리기 시작했다!' };
const WEATHER_END = { SUN: '햇살이 약해졌다.', RAIN: '비가 그쳤다.', SAND: '모래바람이 가라앉았다.', HAIL: '싸라기눈이 그쳤다.' };
const WEATHER_IMG = { RAIN: 'rain_1', HRAIN: 'rain_2', SAND: 'sandstorm_1', HAIL: 'hail_1' };

const MAX_KO = { MAXSTRIKE: '다이어택', MAXKNUCKLE: '다이너클', MAXAIRSTREAM: '다이제트', MAXOOZE: '다이애시드', MAXQUAKE: '다이어스', MAXROCKFALL: '다이록', MAXFLUTTERBY: '다이웜', MAXPHANTASM: '다이할로우', MAXSTEELSPIKE: '다이스틸', MAXFLARE: '다이번', MAXGEYSER: '다이스트림', MAXOVERGROWTH: '다이그래스', MAXLIGHTNING: '다이썬더', MAXMINDSTORM: '다이사이코', MAXHAILSTORM: '다이아이스', MAXWYRMWIND: '다이드라군', MAXDARKNESS: '다이아크', MAXSTARFALL: '다이페어리', MAXGUARD: '다이월',
  GMAXWILDFIRE: '거다이옥염', GMAXVINELASH: '거다이편달', GMAXCANNONADE: '거다이포격', GMAXVOLTCRASH: '거다이만뢰', GMAXGOLDRUSH: '거다이금화', GMAXBEFUDDLE: '거다이혼란', GMAXMALODOR: '거다이악취', GMAXFINALE: '거다이케이크', GMAXRESONANCE: '거다이선율', GMAXWINDRAGE: '거다이풍격', GMAXSTEELSURGE: '거다이강철', GMAXSTONESURGE: '거다이암석', GMAXREPLENISH: '거다이농사', GMAXCHISTRIKE: '거다이회심격', GMAXONEBLOW: '거다이일격', GMAXRAPIDFLOW: '거다이연격', GMAXDEPLETION: '거다이감쇠', GMAXGRAVITAS: '거다이천도', GMAXTERROR: '거다이영그림자', GMAXSNOOZE: '거다이하품', GMAXMELTDOWN: '거다이용해', GMAXFOAMBURST: '거다이거품', GMAXCENTIFERNO: '거다이백화', GMAXSANDBLAST: '거다이사진', GMAXCUDDLE: '거다이포옹', GMAXSMITE: '거다이천벌', GMAXSWEETNESS: '거다이감로', GMAXTARTNESS: '거다이산격', GMAXSTUNSHOCK: '거다이감전', GMAXHYDROSNIPE: '거다이저격', GMAXFIREBALL: '거다이화염구', GMAXDRUMSOLO: '거다이난타', GMAXVOLCALITH: '거다이분석' };
for (const k in MAX_KO) if (MOVES[k]) MOVES[k].name = MAX_KO[k];
function maxPower(md) {
  const bp = md.p > 1 ? md.p : 60;
  const low = md.t === 'FIGHTING' || md.t === 'POISON';
  const tbl = low ? [[40, 70], [50, 75], [60, 80], [70, 85], [100, 90], [140, 95], [999, 100]] : [[40, 90], [50, 100], [60, 110], [70, 120], [100, 130], [140, 140], [999, 150]];
  for (const [lim, p] of tbl) if (bp <= lim) return p;
  return 100;
}
// 다이맥스 상태에서 사용할 기술 데이터 생성
function maxMoveData(mon, moveId) {
  const md = MOVES[moveId];
  if (!md) return null;
  if (md.c === 2) return { ...MOVES.MAXGUARD, key: 'MAXGUARD', f: 'ProtectUser', a: 0 };
  let key = MAX_MOVE_BY_TYPE[md.t] || 'MAXSTRIKE';
  const g = SPECIES[mon.species] && SPECIES[mon.species].gmax;
  if (g && MOVES[g] && MOVES[g].t === md.t) key = g;
  const base = MOVES[key] || md;
  return { ...base, key, t: md.t, c: md.c, p: maxPower(md), a: 0, f: 'MaxMove', ec: 0, fl: [], gmax: key.startsWith('GMAX') };
}
function megaFormFor(mon) {
  if (mon.origSpecies) return null;
  if (mon.item && FORM_INDEX.mega[mon.species + '|' + mon.item]) return FORM_INDEX.mega[mon.species + '|' + mon.item];
  if (mon.species === 'RAYQUAZA' && mon.knows('DRAGONASCENT')) return FORM_INDEX.mega['RAYQUAZA|DRAGONASCENT'];
  return null;
}
function canDynamax(mon) { return !mon.origSpecies && !(SPECIES[mon.species].fl || []).includes('CannotDynamax'); }

// ---------------- 배틀 확장 ----------------
Object.assign(Battle.prototype, {
  gimmickInit() {
    this.used = { p: {}, f: {} };
    this.weather = null;
  },
  // 플레이어가 지금 쓸 수 있는 기믹 목록
  availableGimmicks() {
    const m = this.p.mon, u = this.used.p, out = [];
    if (this.p.dyna || m.teraOn) return out;
    if (!u.mega && Bag.count('MEGARING') && megaFormFor(m)) out.push('mega');
    if (!u.dyna && Bag.count('DYNAMAXBAND') && canDynamax(m) && !m.origSpecies) out.push('dyna');
    if (!u.tera && Bag.count('TERAORB')) out.push('tera');
    return out;
  },
  types(b) {
    if (b.mon.teraOn && b.mon.tera !== 'STELLAR') return [b.mon.tera];
    return b.mon.types;
  },
  stab(b, type) {
    const m = b.mon, orig = m.types.includes(type);
    if (m.teraOn) {
      if (m.tera === 'STELLAR') return orig ? 2 : 1.2;
      if (m.tera === type) return orig ? 2 : 1.5;
    }
    if (orig && m.ability === 'ADAPTABILITY') return 2;
    return orig ? 1.5 : 1;
  },
  async applyGimmick(side, g) {
    const b = this[side], m = b.mon, s = this.sprites[side];
    this.used[side][g] = true;
    const who = side === 'p' ? Player.name : (this.trainer ? this.trainer.name : '');
    if (g === 'mega') {
      const key = megaFormFor(m); if (!key) return;
      const stone = m.item ? itemName(m.item) : '용의 기운';
      await this.say(m.name + '의 ' + J.iga(stone) + ' ' + who + '의 키스톤에 반응했다!', false);
      s.flash = true; Audio2.se('Battle ability');
      await this.playAnim('MEGA', side, 'mega');
      m.setForm(key); s.flash = false;
      this.disp[side].hp = m.hp; Audio2.cry(key);
      await this.say(J.eunneun(SPECIES[m.origSpecies].name) + ' ' + J.ro(SPECIES[key].fname || ('메가' + SPECIES[key].name)) + ' 메가진화했다!');
    } else if (g === 'dyna') {
      await this.say(m.name + ', 돌아와!', false);
      await this.recall(side);
      await this.say(who + J.eunneun(who).slice(who.length) + ' 다이맥스 밴드에 힘을 모았다!', false);
      const gk = m.gmaxF && FORM_INDEX.gmax[m.species];
      if (gk) m.setForm(gk);
      m.dynaMul = 2; m.stats[0] *= 2; m.hp *= 2; b.dyna = 3;
      Audio2.se('Battle ability');
      s.visible = true; s.scale = 0.2; s.glow = '#ff2040';
      for (let i = 1; i <= 30; i++) { s.scale = 0.2 + 1.3 * i / 30; await frames(1); }
      this.boxes[side] = true; this.disp[side].hp = m.hp;
      Audio2.cry(m.species);
      await this.say(J.eunneun(m.name) + ' ' + (gk ? '거다이맥스' : '다이맥스') + '했다!');
    } else if (g === 'tera') {
      Audio2.se('Battle ability');
      s.flash = true;
      for (let i = 0; i < 20; i++) { s.glow = i % 4 < 2 ? '#ffffff' : (TYPE_COLORS[m.tera] || '#fff'); await frames(2); }
      s.flash = false;
      m.teraOn = true; s.glow = TYPE_COLORS[m.tera] || '#fff';
      await this.say(J.eunneun(m.name) + ' 테라스탈하여 ' + typeName(m.tera) + ' 타입이 되었다!');
    }
  },
  async endDynamax(side) {
    const b = this[side], m = b.mon, s = this.sprites[side];
    b.dyna = 0;
    if (m.dynaMul) { m.stats[0] = Math.round(m.stats[0] / m.dynaMul); m.hp = Math.ceil(m.hp / m.dynaMul); m.dynaMul = 0; }
    if (m.origSpecies && SPECIES[m.species].gmax) { const o = m.origSpecies; m.origSpecies = null; m.species = o; m.calcStats(); m.hp = Math.min(m.hp, m.stats[0]); }
    for (let i = 0; i < 20; i++) { s.scale = 1.5 - 0.5 * i / 20; await frames(1); }
    s.scale = 1; s.glow = m.teraOn ? TYPE_COLORS[m.tera] : null;
    this.disp[side].hp = m.hp;
    if (!m.fainted) await this.say(m.name + '의 다이맥스가 끝났다!');
  },
  async setWeather(w, turns = 5) {
    if (this.weather && (this.weather.type === 'HSUN' || this.weather.type === 'HRAIN') && !w.startsWith('H')) return;
    this.weather = { type: w, turns };
    await this.say(WEATHER_NAME[w]);
  },
  weatherMod(type) {
    const w = this.weather && this.weather.type;
    if (!w) return 1;
    if ((w === 'SUN' || w === 'HSUN') && type === 'FIRE') return 1.5;
    if ((w === 'SUN') && type === 'WATER') return 0.5;
    if (w === 'HSUN' && type === 'WATER') return 0;
    if ((w === 'RAIN' || w === 'HRAIN') && type === 'WATER') return 1.5;
    if (w === 'RAIN' && type === 'FIRE') return 0.5;
    if (w === 'HRAIN' && type === 'FIRE') return 0;
    return 1;
  },
  async weatherEndTurn() {
    const w = this.weather; if (!w) return;
    if (w.turns < 99 && --w.turns <= 0) { this.weather = null; await this.say(WEATHER_END[w.type] || '날씨가 원래대로 돌아왔다.'); return; }
    if (w.type === 'SAND' || w.type === 'HAIL') {
      for (const side of ['p', 'f']) {
        const b = this[side]; if (!b || b.mon.fainted) continue;
        const t = this.types(b);
        if (w.type === 'SAND' && t.some(x => ['ROCK', 'GROUND', 'STEEL'].includes(x))) continue;
        if (w.type === 'HAIL' && t.includes('ICE')) continue;
        await this.say(b.name + J.eunneun(b.name).slice(b.name.length) + (w.type === 'SAND' ? ' 모래바람에 휘말렸다!' : ' 싸라기눈을 맞았다!'));
        await this.damage(b, Math.max(1, Math.floor(b.mon.maxhp / 16)));
      }
    }
  },
  // 원시회귀 / 등장 시 효과
  async onEntry(side) {
    const b = this[side], m = b.mon;
    const primal = { KYOGRE: ['BLUEORB', 'HRAIN'], GROUDON: ['REDORB', 'HSUN'] }[m.species];
    if (primal && (m.item === primal[0] || (side === 'f' && this.o.primal))) {
      const key = Object.keys(SPECIES).find(k => SPECIES[k].base === m.species && SPECIES[k].form === 1);
      if (key) {
        this.sprites[side].flash = true; Audio2.se('Battle ability');
        await this.playAnim('MEGA', side, 'mega');
        m.setForm(key); this.sprites[side].flash = false; this.disp[side].hp = m.hp;
        Audio2.cry(m.species);
        await this.say(J.eunneun(m.name) + ' 원시회귀했다! 원시의 모습을 되찾았다!');
        await this.setWeather(primal[1], 99);
      }
    }
    if (side === 'f' && this.o.raid === 'tera' && !m.teraOn) { m.teraOn = true; this.sprites.f.glow = TYPE_COLORS[m.tera]; await this.say(J.eunneun(m.name) + ' ' + typeName(m.tera) + ' 테라스탈 결정으로 빛나고 있다!'); }
    if (side === 'f' && this.o.raid === 'dyna' && !b.dyna) {
      const gk = m.gmaxF && FORM_INDEX.gmax[m.species]; if (gk) m.setForm(gk);
      m.dynaMul = 3; m.stats[0] *= 3; m.hp *= 3; b.dyna = 999; this.sprites.f.glow = '#ff2040'; this.sprites.f.scale = 1.5; this.disp.f.hp = m.hp;
      await this.say(J.eunneun(m.name) + ' 붉은 빛을 내뿜으며 ' + (gk ? '거다이맥스' : '다이맥스') + '하고 있다!');
    }
    await this.abilityEntry(side);
  },
  drawWeather(ctx) {
    const w = this.weather && this.weather.type; if (!w) return;
    const tint = { SUN: 'rgba(255,200,60,0.15)', HSUN: 'rgba(255,120,20,0.25)', RAIN: 'rgba(40,60,140,0.18)', HRAIN: 'rgba(20,30,110,0.3)', SAND: 'rgba(180,140,60,0.25)', HAIL: 'rgba(220,240,255,0.2)' }[w];
    ctx.fillStyle = tint; ctx.fillRect(0, 0, 512, 288);
    const im = WEATHER_IMG[w] && img('Graphics/Weather/' + WEATHER_IMG[w] + '.png');
    if (im) {
      const off = (this.tick * 4) % im.height, offx = (this.tick * 2) % im.width;
      for (let y = -im.height; y < 288; y += im.height) for (let x = -im.width; x < 512; x += im.width) ctx.drawImage(im, x + offx, y + off);
    }
  },
  async applyMaxEffect(user, target, key) {
    const e = MAX_EFFECT[key] || MAX_EFFECT[MAX_MOVE_BY_TYPE[MOVES[key] ? MOVES[key].t : 'NORMAL']];
    if (!e) return;
    if (e[0] === 'self' && !user.mon.fainted) await this.changeStages(user, e[1], e[2], true);
    if (e[0] === 'foe' && !target.mon.fainted) await this.changeStages(target, e[1], e[2], true);
    if (e[0] === 'weather') await this.setWeather(e[1]);
    if (e[0] === 'heal' && !user.mon.fainted) { if (await this.heal(user, Math.floor(user.mon.maxhp / 8))) await this.say(user.name + '의 체력이 조금 회복되었다!'); }
    if (key.startsWith('GMAX') && !target.mon.fainted) { await this.say(target.name + J.eunneun(target.name).slice(target.name.length) + ' 거다이맥스의 여파에 휘말렸다!'); await this.damage(target, Math.max(1, Math.floor(target.mon.maxhp / 8))); }
  },
});
