// ============================================================
// mon.js - 포켓몬 개체 (능력치/경험치/기술/진화)
// ============================================================
'use strict';

const STAT_NAMES = ['HP', '공격', '방어', '특수공격', '특수방어', '스피드'];
const NATURES = ['노력', '외로움', '용감', '고집', '개구쟁이', '대담', '온순', '무사태평', '장난꾸러기', '촐랑', '겁쟁이', '성급', '성실', '명랑', '천진난만', '조심', '의젓', '냉정', '수줍음', '덜렁', '차분', '얌전', '건방', '신중', '변덕'];
// 성격 보정 순서: 공격, 방어, 스피드, 특공, 특방 → 내부 스탯 인덱스
const NATURE_STAT = [1, 2, 5, 3, 4];
function natureMod(nature, statIdx) {
  const inc = NATURE_STAT[Math.floor(nature / 5)], dec = NATURE_STAT[nature % 5];
  if (inc === dec) return 1;
  if (statIdx === inc) return 1.1;
  if (statIdx === dec) return 0.9;
  return 1;
}

function expForLevel(rate, n) {
  if (n <= 1) return 0;
  const n3 = n * n * n;
  switch (rate) {
    case 'Fast': return Math.floor(4 * n3 / 5);
    case 'Slow': return Math.floor(5 * n3 / 4);
    case 'Parabolic': return Math.max(0, Math.floor(6 / 5 * n3 - 15 * n * n + 100 * n - 140));
    case 'Erratic':
      if (n <= 50) return Math.floor(n3 * (100 - n) / 50);
      if (n <= 68) return Math.floor(n3 * (150 - n) / 100);
      if (n <= 98) return Math.floor(n3 * Math.floor((1911 - 10 * n) / 3) / 500);
      return Math.floor(n3 * (160 - n) / 100);
    case 'Fluctuating':
      if (n <= 15) return Math.floor(n3 * (Math.floor((n + 1) / 3) + 24) / 50);
      if (n <= 36) return Math.floor(n3 * (n + 14) / 50);
      return Math.floor(n3 * (Math.floor(n / 2) + 32) / 50);
    default: return n3; // Medium
  }
}
const GENDER_RATE = { AlwaysMale: 0, FemaleOneEighth: 0.125, Female25Percent: 0.25, Female50Percent: 0.5, Female75Percent: 0.75, FemaleSevenEighths: 0.875, AlwaysFemale: 1 };
const isDay = () => { const h = new Date().getHours(); return h >= 6 && h < 18; };

class Mon {
  constructor(species, level, opts = {}) {
    this.species = species;
    this.level = clamp(level, 1, 100);
    this.nickname = opts.nickname || null;
    this.ivs = opts.ivs || [0, 0, 0, 0, 0, 0].map(() => rand(32));
    this.nature = opts.nature !== undefined ? opts.nature : rand(25);
    this.shiny = opts.shiny !== undefined ? opts.shiny : chance((typeof Bag !== 'undefined' && Bag.count && Bag.count('SHINYCHARM')) ? 1 / 128 : 1 / 512);
    const gr = GENDER_RATE[this.data.g];
    this.gender = gr === undefined ? 'N' : (Math.random() < gr ? 'F' : 'M');
    this.exp = expForLevel(this.data.gr, this.level);
    this.status = null; this.sleepTurns = 0;
    this.ball = opts.ball || 'POKEBALL';
    this.ot = opts.ot || null;
    this.happiness = this.data ? 70 : 70;
    this.metMap = opts.metMap || null; this.metLevel = this.level;
    this.item = opts.item || null;
    this.gmaxF = opts.gmax !== undefined ? opts.gmax : (!!FORM_INDEX.gmax[species] && chance(0.08));
    const tf = (this.data.fl || []).find(f => /^TeraType_/.test(f));
    this.tera = opts.tera || (tf ? tf.slice(9) : (chance(0.08) ? pick(Object.keys(TYPES).filter(t => t !== 'STELLAR')) : pick(this.data.t)));
    this.moves = [];
    if (opts.moves) opts.moves.forEach(m => this.moves.push(Mon.makeMove(m)));
    else this.resetMoves();
    this.calcStats();
    this.hp = this.stats[0];
  }
  static makeMove(id) { const m = MOVES[id]; return { id, pp: m ? m.pp : 10, max: m ? m.pp : 10 }; }
  get data() { return SPECIES[this.species]; }
  get name() { return this.nickname || this.data.name; }
  get types() { return this.data.t; }
  get fainted() { return this.hp <= 0; }
  get maxhp() { return this.stats[0]; }
  resetMoves() {
    const learned = [];
    for (const [lv, mv] of this.data.mv) {
      if (lv > this.level || !MOVES[mv]) continue;
      const i = learned.indexOf(mv);
      if (i >= 0) learned.splice(i, 1);
      learned.push(mv);
    }
    this.moves = learned.slice(-4).map(Mon.makeMove);
    if (!this.moves.length) this.moves = [Mon.makeMove('TACKLE')];
  }
  calcStats() {
    const bs = this.data.bs, L = this.level;
    this.stats = bs.map((b, i) => {
      if (i === 0) return this.species === 'SHEDINJA' ? 1 : Math.floor((2 * b + this.ivs[i]) * L / 100) + L + 10;
      return Math.floor((Math.floor((2 * b + this.ivs[i]) * L / 100) + 5) * natureMod(this.nature, i));
    });
  }
  expAt(lv) { return expForLevel(this.data.gr, lv); }
  expProgress() {
    if (this.level >= 100) return 1;
    const a = this.expAt(this.level), b = this.expAt(this.level + 1);
    return clamp((this.exp - a) / (b - a), 0, 1);
  }
  // 레벨업 시 새로 배우는 기술
  movesLearnedAt(lv) { return this.data.mv.filter(([l, m]) => l === lv && MOVES[m]).map(([, m]) => m); }
  knows(mv) { return this.moves.some(m => m.id === mv); }
  heal() {
    this.calcStats(); this.hp = this.stats[0]; this.status = null; this.sleepTurns = 0;
    this.moves.forEach(m => m.pp = m.max);
  }
  levelUp() {
    const oldStats = this.stats.slice();
    const oldMax = this.stats[0];
    this.level++;
    this.calcStats();
    if (!this.fainted) this.hp += this.stats[0] - oldMax;
    this.happiness = Math.min(255, this.happiness + 3);
    return oldStats;
  }
  // 진화 대상 확인. trigger: 'level' | 'item' (itemId)
  evolutionTarget(trigger, item) {
    for (const [target, method, param] of this.data.evo) {
      if (!SPECIES[target]) continue;
      const g = this.gender;
      if (trigger === 'item') {
        if (method === 'Item' && param === item) return target;
        if (method === 'ItemMale' && param === item && g === 'M') return target;
        if (method === 'ItemFemale' && param === item && g === 'F') return target;
        if (method === 'ItemDay' && param === item && isDay()) return target;
        if (method === 'ItemNight' && param === item && !isDay()) return target;
        if (item === 'LINKINGCORD' && /^Trade/.test(method)) return target;
        continue;
      }
      // 레벨업으로 진화
      if (/^Happiness/.test(method)) {
        if (this.level < 20) continue;
        if (method === 'HappinessDay' && !isDay()) continue;
        if (method === 'HappinessNight' && isDay()) continue;
        if (method === 'HappinessMale' && g !== 'M') continue;
        if (method === 'HappinessFemale' && g !== 'F') continue;
        return target;
      }
      if (typeof param === 'number' && /Level|Attack|Defense|AtkDef|Silcoon|Cascoon|Ninjask/.test(method)) {
        if (this.level < param) continue;
        if (method === 'LevelMale' && g !== 'M') continue;
        if (method === 'LevelFemale' && g !== 'F') continue;
        if (method === 'LevelDay' && !isDay()) continue;
        if (method === 'LevelNight' && isDay()) continue;
        const s = this.stats;
        if (method === 'AttackGreater' && !(s[1] > s[2])) continue;
        if (method === 'DefenseGreater' && !(s[2] > s[1])) continue;
        if (method === 'AtkDefEqual' && s[1] !== s[2]) continue;
        if (method === 'Silcoon' && this.ivs[0] % 2) continue;
        if (method === 'Cascoon' && !(this.ivs[0] % 2)) continue;
        return target;
      }
      // 특수 조건(기술 보유, 장소 등)은 레벨 32에서 진화하도록 단순화
      if (/HasMove|Location|Region|Event|Beauty|Shed|Party|Item(Day|Night)?Hold|HoldItem|Tea|Collect|Walk|Recoil|Defeat|Critical|Damage|Battle|Gender/.test(method)) {
        if (this.level >= 32) return target;
      }
    }
    return null;
  }
  evolve(target) {
    const hpLost = this.stats[0] - this.hp;
    this.species = target;
    this.calcStats();
    this.hp = Math.max(this.fainted ? 0 : 1, this.stats[0] - hpLost);
  }
  // 배틀 중 폼 변화(메가/거다이맥스/원시회귀) 되돌리기
  setForm(key) {
    if (!this.origSpecies) this.origSpecies = this.species;
    const hpLost = this.stats[0] - this.hp;
    this.species = key; this.calcStats(); this.hp = clamp(this.stats[0] - hpLost, this.hp > 0 ? 1 : 0, this.stats[0]);
  }
  revertForm() {
    if (this.dynaMul) { this.stats[0] = Math.round(this.stats[0] / this.dynaMul); this.hp = Math.ceil(this.hp / this.dynaMul); this.dynaMul = 0; }
    if (this.origSpecies) { const r = this.hp / Math.max(1, this.stats[0]); this.species = this.origSpecies; this.origSpecies = null; this.calcStats(); this.hp = this.hp > 0 ? Math.max(1, Math.round(this.stats[0] * r)) : 0; }
    this.teraOn = false;
  }
  toJSON() {
    return { it: this.item, gm: this.gmaxF, tr: this.tera, s: this.origSpecies || this.species, l: this.level, n: this.nickname, iv: this.ivs, na: this.nature, sh: this.shiny, g: this.gender, e: this.exp, st: this.status, sl: this.sleepTurns, b: this.ball, ot: this.ot, hp: this.hp, h: this.happiness, mm: this.metMap, ml: this.metLevel, mv: this.moves };
  }
  static fromJSON(o) {
    const m = new Mon(o.s, o.l, { ivs: o.iv, nature: o.na, shiny: o.sh, nickname: o.n, moves: [] });
    // 관리자 페이지에서 만든/고친 기록은 일부 값이 빠져 있을 수 있음 → 빠진 값은 생성 시 기본값 유지
    if (o.g) m.gender = o.g;
    // 경험치가 없거나 레벨과 맞지 않으면(관리자가 레벨만 바꾼 경우) 그 레벨의 시작 경험치로
    const lo = expForLevel(m.data.gr, m.level), hi = m.level >= 100 ? Infinity : expForLevel(m.data.gr, m.level + 1);
    m.exp = (typeof o.e === 'number' && o.e >= lo && o.e < hi) ? o.e : lo;
    m.status = o.st; m.sleepTurns = o.sl || 0; m.ball = o.b; m.ot = o.ot;
    m.happiness = o.h || 70; m.metMap = o.mm; m.metLevel = o.ml;
    m.item = o.it || null; if (o.gm !== undefined) m.gmaxF = o.gm; if (o.tr) m.tera = o.tr;
    m.moves = (o.mv || []).filter(x => MOVES[x.id]);
    if (!m.moves.length) m.resetMoves();
    m.calcStats(); m.hp = typeof o.hp === 'number' ? clamp(o.hp, 0, m.stats[0]) : m.stats[0];   // HP 값이 없으면 가득
    return m;
  }
}

// 야생 포켓몬 생성: 해당 레벨의 기술로
function makeWild(species, level) { return new Mon(species, level); }
// 트레이너 포켓몬: 개체값 고정(조금 강하게)
function makeTrainerMon(species, level, ivBase = 15) {
  return new Mon(species, level, { ivs: [0, 0, 0, 0, 0, 0].map(() => ivBase + rand(32 - ivBase)), shiny: false });
}
// 진화 전 형태 찾기 (도감 진화 표시용)
const PREVO = {};
for (const sp of SPECIES_LIST) for (const e of SPECIES[sp].evo) if (!PREVO[e[0]]) PREVO[e[0]] = sp;
function evoStage(s) { let n = 0; while (PREVO[s] && n < 3) { s = PREVO[s]; n++; } return n; }
