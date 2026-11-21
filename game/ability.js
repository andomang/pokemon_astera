// ============================================================
// ability.js - 특성 시스템 + Z기술
// ============================================================
'use strict';
const ABILITIES = GD.abilities || {};
const abilityName = a => (ABILITIES[a] && ABILITIES[a].name) || a || '없음';

// 개체의 특성: abIdx(일반 특성 번호) / abHidden(숨겨진 특성)
Object.defineProperty(Mon.prototype, 'ability', {
  get() {
    const d = this.data, ab = d.ab || [], hab = d.hab || [];
    if (this.abHidden && hab.length) return hab[0];
    if (!ab.length) return null;
    return ab[(this.abIdx || 0) % ab.length];
  }
});
const _monInit = Mon.prototype.calcStats;
const _monToJSON = Mon.prototype.toJSON;
Mon.prototype.toJSON = function () { const o = _monToJSON.call(this); o.ai = this.abIdx || 0; o.ah = !!this.abHidden; return o; };
const _monFrom = Mon.fromJSON;
Mon.fromJSON = function (o) { const m = _monFrom(o); m.abIdx = o.ai !== undefined ? o.ai : rand(2); m.abHidden = !!o.ah; return m; };
// 새 개체에 특성 배정 (생성자 이후 호출)
function rollAbility(m) { if (m.abIdx === undefined) { m.abIdx = rand(2); m.abHidden = chance(1 / 40); } return m; }
const _MonCls = Mon;
Mon = class extends _MonCls { constructor(...a) { super(...a); rollAbility(this); } };
Mon.fromJSON = function (o) { const m = _monFrom(o); m.abIdx = o.ai !== undefined ? o.ai : rand(2); m.abHidden = !!o.ah; return m; };
Mon.makeMove = _MonCls.makeMove;

// ---------------- 배틀 특성 효과 ----------------
const AB_TYPE_IMMUNE = { LEVITATE: ['GROUND'], FLASHFIRE: ['FIRE'], WATERABSORB: ['WATER'], VOLTABSORB: ['ELECTRIC'], LIGHTNINGROD: ['ELECTRIC'], STORMDRAIN: ['WATER'], SAPSIPPER: ['GRASS'], MOTORDRIVE: ['ELECTRIC'], DRYSKIN: ['WATER'], EARTHEATER: ['GROUND'], WELLBAKEDBODY: ['FIRE'] };
const AB_STATUS_IMMUNE = { IMMUNITY: ['PSN', 'TOX'], LIMBER: ['PAR'], INSOMNIA: ['SLP'], VITALSPIRIT: ['SLP'], SWEETVEIL: ['SLP'], WATERVEIL: ['BRN'], WATERBUBBLE: ['BRN'], MAGMAARMOR: ['FRZ'], OWNTEMPO: ['CONFUSE'], INNERFOCUS: ['FLINCH'], PURIFYINGSALT: ['PSN', 'TOX', 'PAR', 'SLP', 'BRN', 'FRZ'], COMATOSE: ['PSN', 'TOX', 'PAR', 'SLP', 'BRN', 'FRZ'] };
const PINCH = { BLAZE: 'FIRE', TORRENT: 'WATER', OVERGROW: 'GRASS', SWARM: 'BUG' };
Object.assign(Battle.prototype, {
  ab(b) { return b && b.mon && !b.mon.fainted ? b.mon.ability : null; },
  async abPop(b, extra) {
    const t = '[' + b.name + '의 ' + abilityName(b.mon.ability) + ']' + (extra ? ' ' + extra : '');
    await this.say(t, !!extra);
  },
  async abilityEntry(side) {
    const b = this[side], o = this[side === 'p' ? 'f' : 'p'], a = this.ab(b);
    if (!a) return;
    if (a === 'INTIMIDATE' && o && !o.mon.fainted) { await this.abPop(b); this._actor = b; await this.changeStages(o, ['atk'], -1, false); this._actor = null; }
    const wx = { DRIZZLE: 'RAIN', DROUGHT: 'SUN', SANDSTREAM: 'SAND', SNOWWARNING: 'HAIL', ORICHALCUMPULSE: 'SUN' }[a];
    if (wx && !(this.weather && this.weather.type === wx)) { await this.abPop(b); await this.setWeather(wx); }
    if (a === 'PRESSURE') await this.abPop(b, J.eunneun(b.name) + ' 프레셔를 발산하고 있다!');
    if (a === 'UNNERVE') await this.abPop(b, '상대는 긴장해서 나무열매를 먹을 수 없게 되었다!');
    if (a === 'MOLDBREAKER' || a === 'TERAVOLT' || a === 'TURBOBLAZE') await this.abPop(b, J.eunneun(b.name) + ' 틀을 깨는 힘을 지녔다!');
    if (a === 'DOWNLOAD' && o) { await this.abPop(b); await this.changeStages(b, [o.mon.stats[2] < o.mon.stats[4] ? 'atk' : 'spa'], 1); }
    if (a === 'INTREPIDSWORD') { await this.abPop(b); await this.changeStages(b, ['atk'], 1); }
    if (a === 'DAUNTLESSSHIELD') { await this.abPop(b); await this.changeStages(b, ['def'], 1); }
  },
  // 타입 무효 특성 (흡수 포함). true면 기술이 무효화됨
  async abilityImmune(user, target, md) {
    const a = this.ab(target);
    if (!a || md.c === 2 && !['WATER', 'ELECTRIC', 'GRASS', 'FIRE'].includes(md.t)) return false;
    if (['MOLDBREAKER', 'TERAVOLT', 'TURBOBLAZE'].includes(this.ab(user))) return false;
    if (a === 'WONDERGUARD' && md.c !== 2 && typeEffect(md.t, this.types(target)) <= 1) { await this.abPop(target, '효과가 없는 것 같다...'); return true; }
    const im = AB_TYPE_IMMUNE[a];
    if (!im || !im.includes(md.t)) return false;
    if (['WATERABSORB', 'VOLTABSORB', 'DRYSKIN', 'EARTHEATER'].includes(a)) { await this.abPop(target); if (!(await this.heal(target, Math.floor(target.mon.maxhp / 4)))) await this.say(target.name + '의 체력은 이미 가득 찼다!'); else await this.say(target.name + '의 체력이 회복되었다!'); return true; }
    if (['LIGHTNINGROD', 'STORMDRAIN'].includes(a)) { await this.abPop(target); await this.changeStages(target, ['spa'], 1); return true; }
    if (a === 'SAPSIPPER') { await this.abPop(target); await this.changeStages(target, ['atk'], 1); return true; }
    if (a === 'MOTORDRIVE') { await this.abPop(target); await this.changeStages(target, ['spe'], 1); return true; }
    if (a === 'FLASHFIRE') { target.v.flashFire = true; await this.abPop(target, '불꽃의 위력이 올라갔다!'); return true; }
    if (a === 'WELLBAKEDBODY') { await this.abPop(target); await this.changeStages(target, ['def'], 2); return true; }
    await this.abPop(target, target.name + '에게는 효과가 없는 것 같다...');
    return true;
  },
  // 공격 측 위력/능력치 보정 (곱해서 반환)
  abAttackMod(user, target, md, P) {
    const a = this.ab(user), phys = md.c === 0; let m = 1;
    if (PINCH[a] === md.t && user.mon.hp <= user.mon.maxhp / 3) m *= 1.5;
    if ((a === 'HUGEPOWER' || a === 'PUREPOWER') && phys) m *= 2;
    if (a === 'GUTS' && user.mon.status && phys) m *= 1.5;
    if (a === 'HUSTLE' && phys) m *= 1.5;
    if (a === 'TECHNICIAN' && P <= 60) m *= 1.5;
    if (a === 'IRONFIST' && md.fl.includes('Punching')) m *= 1.2;
    if (a === 'STRONGJAW' && md.fl.includes('Biting')) m *= 1.5;
    if (a === 'TOUGHCLAWS' && md.fl.includes('Contact')) m *= 1.3;
    if (a === 'SHEERFORCE' && md.ec > 0) m *= 1.3;
    if (a === 'SOLARPOWER' && !phys && this.weather && /SUN/.test(this.weather.type)) m *= 1.5;
    if (user.v.flashFire && md.t === 'FIRE') m *= 1.5;
    if ((a === 'AERILATE' || a === 'PIXILATE' || a === 'REFRIGERATE' || a === 'GALVANIZE') && md.t === 'NORMAL') m *= 1.2;
    if (a === 'STEELWORKER' && md.t === 'STEEL') m *= 1.5;
    if (a === 'TRANSISTOR' && md.t === 'ELECTRIC') m *= 1.3;
    if (a === 'DRAGONSMAW' && md.t === 'DRAGON') m *= 1.5;
    if (a === 'ROCKYPAYLOAD' && md.t === 'ROCK') m *= 1.5;
    if (a === 'SHARPNESS' && /Slic/.test(md.f || '')) m *= 1.5;
    if (a === 'ANALYTIC' && this.turnOrder && this.turnOrder[1] === (user === this.p ? 'p' : 'f')) m *= 1.3;
    return m;
  },
  abDefenseMod(user, target, md, eff) {
    const a = this.ab(target); let m = 1;
    if (['MOLDBREAKER', 'TERAVOLT', 'TURBOBLAZE'].includes(this.ab(user))) return 1;
    if (a === 'THICKFAT' && (md.t === 'FIRE' || md.t === 'ICE')) m *= 0.5;
    if (a === 'HEATPROOF' && md.t === 'FIRE') m *= 0.5;
    if (a === 'WATERBUBBLE' && md.t === 'FIRE') m *= 0.5;
    if (a === 'PURIFYINGSALT' && md.t === 'GHOST') m *= 0.5;
    if ((a === 'FILTER' || a === 'SOLIDROCK' || a === 'PRISMARMOR') && eff > 1) m *= 0.75;
    if ((a === 'MULTISCALE' || a === 'SHADOWSHIELD') && target.mon.hp >= target.mon.maxhp) m *= 0.5;
    if (a === 'FURCOAT' && md.c === 0) m *= 0.5;
    if (a === 'ICESCALES' && md.c === 1) m *= 0.5;
    if (a === 'FLUFFY' && md.fl.includes('Contact')) m *= 0.5;
    if (a === 'DRYSKIN' && md.t === 'FIRE') m *= 1.25;
    if (a === 'MARVELSCALE' && target.mon.status && md.c === 0) m *= 0.67;
    return m;
  },
  abSpeed(b) {
    const a = this.ab(b), w = this.weather && this.weather.type;
    if (a === 'SWIFTSWIM' && /RAIN/.test(w || '')) return 2;
    if (a === 'CHLOROPHYLL' && /SUN/.test(w || '')) return 2;
    if (a === 'SANDRUSH' && w === 'SAND') return 2;
    if (a === 'SLUSHRUSH' && w === 'HAIL') return 2;
    if (a === 'QUICKFEET' && b.mon.status) return 1.5;
    if (a === 'UNBURDEN' && b.v.unburden) return 2;
    return 1;
  },
  async abContact(user, target, md) {
    if (!md.fl || !md.fl.includes('Contact') || user.mon.fainted) return;
    const a = this.ab(target) || (target.mon.fainted ? target.mon.ability : null);
    if ((a === 'ROUGHSKIN' || a === 'IRONBARBS') && this.ab(user) !== 'MAGICGUARD') { await this.abPop(target); await this.damage(user, Math.max(1, Math.floor(user.mon.maxhp / 8))); }
    const st = { STATIC: 'PAR', FLAMEBODY: 'BRN', POISONPOINT: 'PSN', EFFECTSPORE: pick(['PSN', 'PAR', 'SLP']) }[a];
    if (st && chance(0.3) && !user.mon.status) { await this.abPop(target); await this.inflict(user, st); }
    if (a === 'CUTECHARM' && chance(0.3)) { await this.abPop(target); await this.inflict(user, 'CONFUSE'); }
    if (a === 'GOOEY' || a === 'TANGLINGHAIR') { await this.abPop(target); await this.changeStages(user, ['spe'], -1, true); }
  },
  async abEndTurn(b) {
    const a = this.ab(b), m = b.mon; if (!a) return;
    if (a === 'SPEEDBOOST' && b.st.spe < 6) { await this.abPop(b); await this.changeStages(b, ['spe'], 1); }
    if (a === 'MOODY') { await this.abPop(b); const k = pick(['atk', 'def', 'spa', 'spd', 'spe']); await this.changeStages(b, [k], 2, true); }
    if ((a === 'RAINDISH' && /RAIN/.test(this.weather && this.weather.type || '')) || (a === 'ICEBODY' && this.weather && this.weather.type === 'HAIL')) { if (await this.heal(b, Math.floor(m.maxhp / 16))) await this.abPop(b, '체력을 조금 회복했다.'); }
    if (a === 'SHEDSKIN' && m.status && chance(0.33)) { m.status = null; await this.abPop(b, '상태 이상이 나았다!'); }
    if (a === 'HYDRATION' && m.status && /RAIN/.test(this.weather && this.weather.type || '')) { m.status = null; await this.abPop(b, '상태 이상이 나았다!'); }
  },
});

// ---------------- Z기술 ----------------
const Z_KO = {};
for (const k in ITEMS) {
  const it = ITEMS[k];
  if ((it.fl || []).includes('ZCrystal')) {
    const t = MOVES[it.mv] && MOVES[it.mv].t;
    it.name = (t && TYPES[t] ? TYPES[t].name : '') + 'Z' + (/(PIKA|ALORA|EEVI|SNORL|MEWN|DECID|INCIN|PRIMAR|LYCAN|MIMIK|KOMMON|TAPUN|SOLGAN|LUNAL|MARSHAD|ULTRANECROZ)/.test(k) ? '(전용)' : '');
    it.d = '지니게 하면 ' + (t ? typeName(t) : '') + ' 타입 기술을 Z기술로 바꿀 수 있는 Z크리스탈. Z링이 필요하다.';
    if (!it.pr) it.pr = 15000;
    it.pk = 1;
  }
}
const Z_CRYSTALS = Object.keys(ITEMS).filter(k => (ITEMS[k].fl || []).includes('ZCrystal') && !ITEMS[k].name.includes('전용'));
if (ITEMS.ZRING) { ITEMS.ZRING.name = 'Z링'; ITEMS.ZRING.d = 'Z크리스탈의 힘을 끌어내는 신비한 팔찌.'; }
function zPower(bp) { const t = [[55, 100], [65, 120], [75, 140], [85, 160], [95, 175], [100, 180], [110, 185], [125, 190], [130, 195]]; for (const [l, p] of t) if (bp <= l) return p; return 200; }
function zMoveData(mon, moveId) {
  const md = MOVES[moveId], it = ITEMS[mon.item];
  if (!md || !it || !(it.fl || []).includes('ZCrystal') || md.c === 2) return null;
  const z = MOVES[it.mv]; if (!z || z.t !== md.t) return null;
  return { ...md, key: it.mv, name: 'Z ' + md.name, p: Math.max(z.p > 1 ? z.p : 0, zPower(md.p > 1 ? md.p : 60)), a: 0, f: 'None', ec: 0, fl: [], zmove: true };
}
function canZ(mon) { return !!ITEMS[mon.item] && (ITEMS[mon.item].fl || []).includes('ZCrystal') && mon.moves.some(m => zMoveData(mon, m.id)); }
GIMMICK_NAME.z = 'Z파워';
const _avail = Battle.prototype.availableGimmicks;
Battle.prototype.availableGimmicks = function () {
  const out = _avail.call(this);
  if (!this.used.p.z && !this.p.dyna && Bag.count('ZRING') && canZ(this.p.mon)) out.push('z');
  return out;
};
const _applyG = Battle.prototype.applyGimmick;
Battle.prototype.applyGimmick = async function (side, g) {
  if (g !== 'z') return _applyG.call(this, side, g);
  this.used[side].z = true;
  const b = this[side];
  b.zArm = true; this.sprites[side].glow = '#ffe040';
  Audio2.se('Battle ability');
  await this.say(J.iga(b.name) + ' Z파워를 몸에 둘렀다!');
};
