// ============================================================
// evolution.js - 원작(최신작 기준) 진화 조건
//   예전: 레벨 진화만 제대로, 나머지 특수 조건(친밀도·기술·지닌 도구·장소·걸음 수 등)은 전부 "레벨 32"로 대충 처리
//         + 지역 폼(알로라·가라르·히스이·팔데아)은 진화 데이터가 비어 있어 아예 진화 불가
//   지금: 조건마다 원작처럼 판정하고, 필요한 기록(친밀도, 함께 걸은 걸음, 기술 사용 횟수, 급소·반동·받은 데미지)을 쌓음
//   mon.js / battle.js / ui.js / main.js 다음에 불러옴
// ============================================================
'use strict';

const EVO = {
  FRIENDSHIP: 160,          // 친밀도 진화 기준 (8세대 이후 160)
  MOVE_USES: 20,            // 기술 사용 횟수 진화 (분노의주먹·배리어러시·독침천본)
  WALK: 1000,               // 함께 걷기 진화 (빠르모트·공푸리·베라카스)
  // "특별한 장소" 진화 → 최신작처럼 돌로 진화
  LOCATION_ITEM: { Magnetic: 'THUNDERSTONE', MossRock: 'LEAFSTONE', IceRock: 'ICESTONE' }
};

// ── 지역 폼 진화 (원작 기준). 데이터에 없어서 직접 넣음 ──
//   방법 이름은 데이터와 같은 것을 쓰고, 데이터에 없는 조건은 Crit3(한 배틀에 급소 3번) / Damage49(한 배틀에 49 이상 받고 버팀) / Recoil294(반동 누적 294)
const REGIONAL_EVO = {
  RATTATA_1: [['RATICATE_1', 'LevelNight', 20]],
  SANDSHREW_1: [['SANDSLASH_1', 'Item', 'ICESTONE']],
  VULPIX_1: [['NINETALES_1', 'Item', 'ICESTONE']],
  DIGLETT_1: [['DUGTRIO_1', 'Level', 26]],
  MEOWTH_1: [['PERSIAN_1', 'Happiness', null]],
  MEOWTH_2: [['PERRSERKER', 'Level', 28]],
  GEODUDE_1: [['GRAVELER_1', 'Level', 25]],
  GRAVELER_1: [['GOLEM_1', 'Trade', null]],
  PONYTA_1: [['RAPIDASH_1', 'Level', 40]],
  SLOWPOKE_1: [['SLOWBRO_1', 'Item', 'GALARICACUFF'], ['SLOWKING_1', 'Item', 'GALARICAWREATH']],
  FARFETCHD_1: [['SIRFETCHD', 'Crit3', null]],
  GRIMER_1: [['MUK_1', 'Level', 38]],
  MRMIME_1: [['MRRIME', 'Level', 42]],
  CORSOLA_1: [['CURSOLA', 'Level', 38]],
  ZIGZAGOON_1: [['LINOONE_1', 'Level', 20]],
  LINOONE_1: [['OBSTAGOON', 'LevelNight', 35]],
  DARUMAKA_2: [['DARMANITAN_2', 'Item', 'ICESTONE']],
  YAMASK_1: [['RUNERIGUS', 'Damage49', null]],
  VOLTORB_1: [['ELECTRODE_1', 'Item', 'LEAFSTONE']],
  WOOPER_1: [['CLODSIRE', 'Level', 20]],
  QWILFISH_1: [['OVERQWIL', 'LevelUseMoveCount', 'BARBBARRAGE']],
  SNEASEL_1: [['SNEASLER', 'DayHoldItem', 'RAZORCLAW']],
  ZORUA_1: [['ZOROARK_1', 'Level', 30]],
  SLIGGOO_1: [['GOODRA_1', 'LevelRain', 50]],
  BASCULIN_2: [['BASCULEGION', 'Recoil294', null]]
};
// 진화하지 않는 폼 (모자 피카츄, 메가·거다이맥스 등은 그대로 두고 기본 종 진화를 물려받지 않음)
const NO_INHERIT = /^PIKACHU_/;

// 이 포켓몬의 진화 목록 (지역 폼 → 위 표, 그 외 폼은 기본 종 것을 물려받되 같은 폼으로)
function evoList(mon) {
  const sp = mon.species, d = SPECIES[sp];
  if (REGIONAL_EVO[sp]) return REGIONAL_EVO[sp];
  let list = d.evo || [];
  if (d.form && !list.length && !NO_INHERIT.test(sp)) {
    const base = sp.replace(/_\d+$/, ''), idx = sp.slice(base.length);
    list = (SPECIES[base] && SPECIES[base].evo || []).map(([t, m, p]) => {
      const tf = t + idx;   // 같은 폼 번호의 진화형이 있고 폼 이름이 같으면 그쪽으로 (예: 모래 도롱충이 → 모래 도롱마담)
      return [SPECIES[tf] && SPECIES[tf].fname === d.fname ? tf : t, m, p];
    });
  }
  // "None"(지역 폼 전용 진화)은 기본 종에서는 진화하지 않음
  return list.filter(e => e[1] !== 'None' && e[1] !== 'Event');
}

// 지금 날씨가 비인지 (필드 날씨)
function isRaining() { const w = Game.world; return !!(w && w.def && w.def.weather === 'rain'); }
// 파티에 이 포켓몬 말고 악 타입이 있는지
function darkInParty(self) { return Player.party.some(m => m !== self && !m.fainted && m.types.includes('DARK')); }

{
  // 주의: ability.js가 Mon을 하위 클래스로 바꿔 끼움(Mon = class extends 원래Mon).
  //   저장 기록에서 불러온 포켓몬은 "원래 Mon"으로 만들어지므로, 하위 클래스 prototype에 붙이면 불러온 포켓몬엔 없음
  //   → 원래 클래스(evolutionTarget을 직접 가진 prototype)에 붙여야 새로 만든 것·불러온 것 모두 적용됨
  //   (예전에 하위 클래스에 붙여서 "lead.evoRec is not a function" → 야생·트레이너·기술 사용이 멈췄음)
  let M = Mon.prototype;
  while (M && !Object.prototype.hasOwnProperty.call(M, 'evolutionTarget')) M = Object.getPrototypeOf(M);
  M = M || Mon.prototype;
  /**
   * 진화 대상 확인 (원작 조건)
   *   trigger 'level': 레벨업할 때 / 'item': 도구를 썼을 때(item = 도구 ID)
   *   찾으면 this._evoInfo 에 방법을 남겨 둠 → 진화 후 처리(지닌 도구 소모 등)에 사용
   */
  M.evolutionTarget = function (trigger, item) {
    const g = this.gender, day = isDay(), x = this.evoRec();
    for (const [target, method, param] of evoList(this)) {
      if (!SPECIES[target]) continue;
      const ok = () => { this._evoInfo = { target, method, param }; return target; };
      if (trigger === 'item') {
        if (method === 'Item' && param === item) return ok();
        if (method === 'ItemMale' && param === item && g === 'M') return ok();
        if (method === 'ItemFemale' && param === item && g === 'F') return ok();
        if (method === 'ItemDay' && param === item && day) return ok();
        if (method === 'ItemNight' && param === item && !day) return ok();
        if (method === 'LocationFlag' && EVO.LOCATION_ITEM[param] === item) return ok();
        // 통신교환 진화 → 연결의끈 (지닌 도구가 필요한 교환 진화도 연결의끈으로)
        if (item === 'LINKINGCORD' && /^Trade/.test(method)) return ok();
        continue;
      }
      // ── 레벨업 진화 ──
      const lvOk = typeof param === 'number' ? this.level >= param : true;
      switch (method) {
        case 'Level': if (lvOk) return ok(); break;
        case 'LevelMale': if (lvOk && g === 'M') return ok(); break;
        case 'LevelFemale': if (lvOk && g === 'F') return ok(); break;
        case 'LevelDay': if (lvOk && day) return ok(); break;
        case 'LevelNight': if (lvOk && !day) return ok(); break;
        case 'LevelRain': if (lvOk && isRaining()) return ok(); break;
        case 'LevelDarkInParty': if (lvOk && darkInParty(this)) return ok(); break;
        case 'AttackGreater': if (lvOk && this.stats[1] > this.stats[2]) return ok(); break;
        case 'DefenseGreater': if (lvOk && this.stats[2] > this.stats[1]) return ok(); break;
        case 'AtkDefEqual': if (lvOk && this.stats[1] === this.stats[2]) return ok(); break;
        case 'Silcoon': if (lvOk && (this.ivs[0] % 2) === 0) return ok(); break;   // 개체 성격값 대신 HP 개체값으로 반반
        case 'Cascoon': if (lvOk && (this.ivs[0] % 2) === 1) return ok(); break;
        case 'Ninjask': if (lvOk) return ok(); break;                              // 아이스크 진화 시 껍질몬은 아래에서 따로
        case 'Happiness': if (this.happiness >= EVO.FRIENDSHIP) return ok(); break;
        case 'HappinessDay': if (this.happiness >= EVO.FRIENDSHIP && day) return ok(); break;
        case 'HappinessNight': if (this.happiness >= EVO.FRIENDSHIP && !day) return ok(); break;
        case 'HappinessMoveType': if (this.happiness >= EVO.FRIENDSHIP && this.moves.some(mv => MOVES[mv.id] && MOVES[mv.id].t === param)) return ok(); break;
        case 'HasMove': if (this.moves.some(mv => mv.id === param)) return ok(); break;
        case 'HasInParty': if (Player.party.some(m => m !== this && m.species === param)) return ok(); break;
        case 'HoldItem': if (this.item === param) return ok(); break;               // 교환 대신 지닌 채 레벨업 (도구는 사라짐)
        case 'DayHoldItem': if (this.item === param && day) return ok(); break;
        case 'NightHoldItem': if (this.item === param && !day) return ok(); break;
        case 'Beauty': if (this.item === 'PRISMSCALE') return ok(); break;          // 빈티나: 고운비늘을 지닌 채 레벨업
        case 'LevelWalk': if ((x.walk || 0) >= (param || EVO.WALK)) return ok(); break;
        case 'LevelUseMoveCount': if (((x.uses || {})[param] || 0) >= EVO.MOVE_USES) return ok(); break;
        case 'CollectItems': if (Bag.count(param) >= 999) return ok(); break;       // 타부자고: 모으령의코인 999개
        case 'Crit3': if (x.crit3) return ok(); break;
        case 'Damage49': if (x.dmg49) return ok(); break;
        case 'Recoil294': if ((x.recoil || 0) >= 294) return ok(); break;
      }
    }
    this._evoInfo = null;
    return null;
  };

  // 진화용 기록 (저장됨)
  M.evoRec = function () { if (!this.evx) this.evx = {}; return this.evx; };

  // 레벨업 친밀도: 원작처럼 낮을수록 많이 오름 (+5 / +3 / +2), 평온의방울이면 1.5배
  const _levelUp = M.levelUp;
  M.levelUp = function () {
    const before = this.happiness;
    const r = _levelUp.call(this);
    const base = before < 100 ? 5 : before < 200 ? 3 : 2;
    this.happiness = Math.min(255, before + Math.floor(base * (this.item === 'SOOTHEBELL' ? 1.5 : 1)));
    return r;
  };

  // 저장/불러오기에 진화 기록 포함
  const _toJSON = M.toJSON;
  M.toJSON = function () { const o = _toJSON.call(this); if (this.evx && Object.keys(this.evx).length) o.evx = this.evx; return o; };
  const _fromJSON = Mon.fromJSON;
  Mon.fromJSON = function (o) { const m = _fromJSON(o); if (o.evx) m.evx = o.evx; return m; };
}

// ── 진화 후 처리: 지닌 도구·코인 소모, 껍질몬 ──
{
  const E = EvolutionScene.prototype;
  const _run = E.run;
  E.run = async function () {
    const mon = this.mon, info = mon._evoInfo, before = mon.species;
    const r = await _run.call(this);
    if (mon.species === before || !info) return r;
    if (/HoldItem$/.test(info.method) || info.method === 'Beauty') mon.item = null;
    if (info.method === 'CollectItems') Bag.remove(info.param, 999);
    if (info.method === 'Recoil294' && mon.gender === 'F' && SPECIES.BASCULEGION_1) mon.species = 'BASCULEGION_1', mon.calcStats();
    // 아이스크로 진화할 때 파티에 빈자리와 몬스터볼이 있으면 껍질몬이 생김
    if (info.method === 'Ninjask' && Player.party.length < 6 && Bag.count('POKEBALL') > 0 && SPECIES.SHEDINJA) {
      Bag.remove('POKEBALL', 1);
      const s = new Mon('SHEDINJA', mon.level, { ivs: mon.ivs.slice(), nature: mon.nature, shiny: mon.shiny });
      s.ot = mon.ot; s.metMap = mon.metMap;
      Player.party.push(s); Player.seen.SHEDINJA = Player.caught.SHEDINJA = true;
      await say('몬스터볼 안에 무언가가 들어 있다...!\n' + Player.name + '은(는) 껍질몬을 손에 넣었다!');
    }
    mon.evx = {};   // 쌓아 둔 진화 기록 초기화
    return r;
  };
}

// ── 배틀 중 기록: 기술 사용 횟수 / 급소 / 받은 데미지 / 반동 / 기절 시 친밀도 감소 ──
{
  const B = Battle.prototype;
  const _use = B.useMove;
  B.useMove = function (user, target, moveId, slot) {
    if (user === this.p && user.mon && moveId) { const x = user.mon.evoRec(); x.uses = x.uses || {}; x.uses[moveId] = (x.uses[moveId] || 0) + 1; }
    return _use.call(this, user, target, moveId, slot);
  };
  const _calc = B.calcDamage;
  B.calcDamage = function (user, target, md, f) {
    const r = _calc.call(this, user, target, md, f);
    if (r && r.crit && user === this.p) user.mon._bCrit = (user.mon._bCrit || 0) + 1;
    return r;
  };
  const _dmg = B.damage;
  B.damage = async function (b, dmg, eff) {
    const hp0 = b.mon.hp;
    const r = await _dmg.call(this, b, dmg, eff);
    if (b === this.p) {
      const lost = Math.max(0, hp0 - b.mon.hp);
      b.mon._bDmg = (b.mon._bDmg || 0) + lost;
      if (b.mon.fainted && hp0 > 0) b.mon.happiness = Math.max(0, b.mon.happiness - 1);   // 기절하면 친밀도 -1
    }
    return r;
  };
  const _after = B.afterDamage;
  B.afterDamage = async function (user, target, md, f, dealt) {
    const hp0 = user.mon.hp;
    const r = await _after.call(this, user, target, md, f, dealt);
    // 반동 기술로 깎인 HP (기절하지 않았을 때만 누적)
    if (user === this.p && /Recoil/.test(f || '') && !user.mon.fainted && hp0 > user.mon.hp) {
      const x = user.mon.evoRec(); x.recoil = (x.recoil || 0) + (hp0 - user.mon.hp);
    }
    return r;
  };
}
// 배틀 시작/끝: 한 배틀 안의 급소·데미지 집계
{
  const _start = startBattle;
  // eslint-disable-next-line no-global-assign
  startBattle = async function (o) {
    Player.party.forEach(m => { m._bCrit = 0; m._bDmg = 0; });
    const r = await _start(o);
    for (const m of Player.party) {
      const x = m.evoRec();
      if ((m._bCrit || 0) >= 3) x.crit3 = true;                 // 가라르 파오리: 한 배틀에 급소 3번
      if ((m._bDmg || 0) >= 49 && !m.fainted) x.dmg49 = true;   // 가라르 데스마스: 49 이상 받고도 버팀
      m._bCrit = 0; m._bDmg = 0;
    }
    return r;
  };
}

// ── 필드: 함께 걷기(선두 포켓몬) + 걸음 친밀도 ──
{
  const W = World.prototype;
  const _step = W.onStepEnd;
  W.onStepEnd = function () {
    const lead = Player.party.find(m => !m.fainted);
    if (lead) { const x = lead.evoRec(); x.walk = (x.walk || 0) + 1; }
    // 128걸음마다 파티 전원 친밀도 +1 (평온의방울 +2)
    this._friendSteps = (this._friendSteps || 0) + 1;
    if (this._friendSteps >= 128) {
      this._friendSteps = 0;
      Player.party.forEach(m => { if (!m.fainted) m.happiness = Math.min(255, m.happiness + (m.item === 'SOOTHEBELL' ? 2 : 1)); });
    }
    return _step.apply(this, arguments);
  };
}

// ── 비 오는 길: 미끄네일 → 미끄래곤(비 오는 곳에서 Lv.50) 진화가 가능하도록 해안 도로에 비 ──
if (MAPS.R8 && !MAPS.R8.weather) MAPS.R8.weather = 'rain';
window.EVO = EVO; window.evoList = evoList;
