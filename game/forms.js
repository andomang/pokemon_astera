// ============================================================
// forms.js - 변신 포켓몬 전부: 폼을 바꾸는 도구, 지니면 바뀌는 폼, 전투 중 자동 변신 특성,
//            울트라버스트, 무한다이맥스, 고대활성·쿼크차지(패러독스), 전설을 잡으면 도구를 주는 스토리
//   * 폼 데이터(SPECIES의 XXX_1 등)와 도구 데이터(ITEMS)는 원래 있었지만, 쓰는 코드가 없어서
//     도구는 사용도 획득도 안 되고 전투 중 변신도 일어나지 않았음 → 이 파일이 전부 이어 붙임
//   * 두 종류의 폼 변화
//       - 필드 폼(유전자쐐기 합체, 스카이폼, 영물폼, 로토무, 지니는 도구 폼 …): species 자체를 바꿔 저장까지 유지
//       - 전투 폼(블레이드폼, 달마모드, 군집, 탈, 무한다이맥스 …): 메가진화처럼 setForm → 전투가 끝나면 revertForm 으로 원래대로
//   * 불러오는 순서: story.js(SCRIPTS·LEGENDS) 와 legendfix.js 다음 (index.html)
// ============================================================
'use strict';

// ---------------- 도구 이름·설명 보정 (영어로 남아 있던 것) ----------------
const FORM_ITEM_KO = {
  METEORITE: ['운석', '테오키스에게 쓰면 노말·어택·디펜스·스피드폼을 차례로 바꿀 수 있는 신비한 운석.'],
  GRISEOUSCORE: ['큰백금옥', '기라티나에게 지니게 하면 오리진폼이 되는 빛나는 구슬.'],
  ADAMANTCRYSTAL: ['큰금강옥', '디아루가에게 지니게 하면 오리진폼이 되는 커다란 보석.'],
  LUSTROUSGLOBE: ['큰백옥', '펄기아에게 지니게 하면 오리진폼이 되는 커다란 보석.'],
  ULTRANECROZIUMZ: ['울트라네크로Z', '합체한 네크로즈마에게 지니게 하면 전투 중 울트라버스트로 진짜 모습을 드러낸다. Z링이 필요하다.'],
  BOOSTERENERGY: ['부스트에너지', '고대활성·쿼크차지 특성을 가진 패러독스 포켓몬에게 지니게 하면, 전투에 나올 때 가장 높은 능력이 오른다. 한 번 쓰면 사라진다.'],
  WELLSPRINGMASK: ['우물의가면', '오거폰에게 지니게 하면 우물의 가면을 쓴 모습(물 타입)이 된다.'],
  HEARTHFLAMEMASK: ['화덕의가면', '오거폰에게 지니게 하면 화덕의 가면을 쓴 모습(불꽃 타입)이 된다.'],
  CORNERSTONEMASK: ['주춧돌의가면', '오거폰에게 지니게 하면 주춧돌의 가면을 쓴 모습(바위 타입)이 된다.'],
  ZRING: ['Z링', 'Z크리스탈의 힘을 끌어내는 신비한 팔찌.'],
  DYNAMAXBAND: ['다이맥스밴드', '포켓몬을 다이맥스·거다이맥스시키는 밴드. 무한다이노의 힘이 깃들면 무한다이맥스도 가능하다.'],
};
for (const k in FORM_ITEM_KO) if (ITEMS[k]) { ITEMS[k].name = FORM_ITEM_KO[k][0]; ITEMS[k].d = FORM_ITEM_KO[k][1]; }
const FORM_TOOL_DESC = {
  DNASPLICERS: '큐레무와 레시라무·제크로무를 합체시키거나 분리한다.',
  NSOLARIZER: '네크로즈마와 솔가레오를 합체시키거나 분리한다.',
  NLUNARIZER: '네크로즈마와 루나아라를 합체시키거나 분리한다.',
  REINSOFUNITY: '버드렉스와 블리자포스·레이스포스를 합체시키거나 분리한다.',
  GRACIDEA: '쉐이미를 스카이폼으로 바꾼다. 밤이 되면 원래대로 돌아간다.',
  REVEALGLASS: '토네로스·볼트로스·랜드로스·러브로스의 화신폼과 영물폼을 바꾼다.',
  PRISONBOTTLE: '후파를 굴레를 벗어난 모습으로 바꾸거나 되돌린다.',
  ROTOMCATALOG: '로토무를 가전제품에 들어간 모습으로 바꾼다.',
  ZYGARDECUBE: '지가르데의 10%·50% 폼과 특성(스웜체인지)을 바꾼다.',
};
for (const k in FORM_TOOL_DESC) if (ITEMS[k]) ITEMS[k].d = FORM_TOOL_DESC[k];
// 폼 연구원 상점 가격 (원래 0원이라 팔 수 없었음)
const FORM_PRICES = { REDNECTAR: 3000, YELLOWNECTAR: 3000, PINKNECTAR: 3000, PURPLENECTAR: 3000, BOOSTERENERGY: 20000 };
for (const k in ITEMS) {
  if (/PLATE$/.test(k) && k !== 'BLANKPLATE' && k !== 'LEGENDPLATE') FORM_PRICES[k] = 10000;
  if (/MEMORY$/.test(k)) FORM_PRICES[k] = 10000;
}
for (const k in FORM_PRICES) if (ITEMS[k]) ITEMS[k].pr = FORM_PRICES[k];

// ---------------- 공통 도구 ----------------
const baseSp = sp => (SPECIES[sp] && SPECIES[sp].base) || sp;
// 같은 종의 폼 중에서 첫 번째 타입이 type 인 것 (아르세우스·실버디)
function formByType(base, type) {
  return Object.keys(SPECIES).find(k => SPECIES[k].base === base && SPECIES[k].form && SPECIES[k].t[0] === type) || base;
}

// 필드 폼 변경: species 자체를 바꿔 저장까지 유지 (잃은 HP는 그대로)
function fieldForm(mon, key) {
  if (!SPECIES[key] || mon.species === key) return false;
  const lost = mon.stats ? mon.stats[0] - mon.hp : 0;
  mon.species = key;
  if (mon.stats) { mon.calcStats(); mon.hp = mon.hp <= 0 ? 0 : clamp(mon.stats[0] - lost, 1, mon.stats[0]); }
  Player.seen[key] = true;
  return true;
}
// 전용 기술 바꾸기: from 을 알고 있으면 to 로 (자리 유지), 모르면 아무것도 안 함
function swapMove(mon, from, to) {
  if (!mon.moves) return false;   // 생성자 안(기술을 정하기 전)에서 도구가 들어올 때
  const mv = mon.moves.find(m => m.id === from);
  if (!mv || !MOVES[to] || mon.knows(to)) return false;
  mv.id = to; mv.pp = MOVES[to].pp; mv.max = MOVES[to].pp;
  return true;
}
function refreshFollower() { if (Game.world) Game.world.setupFollower(false); }

// ============================================================
// 1) 지니면 바뀌는 폼 — item 을 바꾸는 순간 자동으로 맞춤 (주기/맡기/불러오기/관리자 수정 모두)
// ============================================================
const PLATE_TYPE = { FISTPLATE: 'FIGHTING', SKYPLATE: 'FLYING', TOXICPLATE: 'POISON', EARTHPLATE: 'GROUND', STONEPLATE: 'ROCK', INSECTPLATE: 'BUG', SPOOKYPLATE: 'GHOST', IRONPLATE: 'STEEL', FLAMEPLATE: 'FIRE', SPLASHPLATE: 'WATER', MEADOWPLATE: 'GRASS', ZAPPLATE: 'ELECTRIC', MINDPLATE: 'PSYCHIC', ICICLEPLATE: 'ICE', DRACOPLATE: 'DRAGON', DREADPLATE: 'DARK', PIXIEPLATE: 'FAIRY' };
const DRIVE_FORM = { SHOCKDRIVE: ['GENESECT_1', 'ELECTRIC'], BURNDRIVE: ['GENESECT_2', 'FIRE'], CHILLDRIVE: ['GENESECT_3', 'ICE'], DOUSEDRIVE: ['GENESECT_4', 'WATER'] };
const MASK_FORM = { WELLSPRINGMASK: ['OGERPON_1', 'WATER'], HEARTHFLAMEMASK: ['OGERPON_2', 'FIRE'], CORNERSTONEMASK: ['OGERPON_3', 'ROCK'] };
// 종(기본형) + 지닌 도구 → 바뀔 폼. null 이면 기본형
function heldFormFor(base, item) {
  switch (base) {
    case 'ZACIAN': return item === 'RUSTEDSWORD' ? 'ZACIAN_1' : null;
    case 'ZAMAZENTA': return item === 'RUSTEDSHIELD' ? 'ZAMAZENTA_1' : null;
    case 'GIRATINA': return item === 'GRISEOUSCORE' || item === 'GRISEOUSORB' ? 'GIRATINA_1' : null;
    case 'DIALGA': return item === 'ADAMANTCRYSTAL' ? 'DIALGA_1' : null;
    case 'PALKIA': return item === 'LUSTROUSGLOBE' ? 'PALKIA_1' : null;
    case 'ARCEUS': return PLATE_TYPE[item] ? formByType('ARCEUS', PLATE_TYPE[item]) : null;
    case 'SILVALLY': return /MEMORY$/.test(item || '') && TYPES[item.replace('MEMORY', '')] ? formByType('SILVALLY', item.replace('MEMORY', '')) : null;
    case 'GENESECT': return DRIVE_FORM[item] ? DRIVE_FORM[item][0] : null;
    case 'OGERPON': return MASK_FORM[item] ? MASK_FORM[item][0] : null;
  }
  return undefined;   // 지니는 도구로 폼이 바뀌는 종이 아님
}
// 지닌 도구에 맞게 폼 맞추기 (검왕·방패왕은 아이언헤드 ↔ 거대한칼·거대한방패도 바꿈)
function syncHeldForm(mon) {
  if (!mon.data || mon.origSpecies) return;   // 전투 폼(메가 등) 중에는 건드리지 않음
  const base = baseSp(mon.species);
  const want = heldFormFor(base, mon._item);
  if (want === undefined) return;
  const key = want || base;
  if (mon.species === key) return;
  fieldForm(mon, key);
  if (base === 'ZACIAN') { if (key === 'ZACIAN_1') swapMove(mon, 'IRONHEAD', 'BEHEMOTHBLADE'); else swapMove(mon, 'BEHEMOTHBLADE', 'IRONHEAD'); }
  if (base === 'ZAMAZENTA') { if (key === 'ZAMAZENTA_1') swapMove(mon, 'IRONHEAD', 'BEHEMOTHBASH'); else swapMove(mon, 'BEHEMOTHBASH', 'IRONHEAD'); }
}
// item 을 접근자로 바꿔 값이 바뀔 때마다 폼을 맞춤 (기존 코드의 mon.item = x 를 고치지 않아도 됨)
Object.defineProperty(Mon.prototype, 'item', {
  get() { return this._item || null; },
  set(v) { this._item = v || null; syncHeldForm(this); },
  configurable: true,
});

// 합체한 상대(유전자쐐기 등)도 저장·불러오기 (fu = 상대 포켓몬 기록)
const _formsToJSON = Mon.prototype.toJSON;
Mon.prototype.toJSON = function () { const o = _formsToJSON.call(this); if (this.fu) o.fu = this.fu; return o; };
const _formsFromJSON = Mon.fromJSON;
Mon.fromJSON = function (o) { const m = _formsFromJSON(o); if (o.fu) m.fu = o.fu; return m; };

// ============================================================
// 2) 가방에서 쓰는 변신 도구
// ============================================================
async function pickPartyMon(msg) {
  const t = await Game.open(new PartyScreen({ mode: 'select', msg }));
  return t < 0 ? null : Player.party[t];
}
// 합체: 도구 → { 기본종, 상대종 → 합체폼, 합체폼 → 새로 배우는 전용기 }
const FUSIONS = {
  DNASPLICERS: { base: 'KYUREM', parts: { RESHIRAM: 'KYUREM_1', ZEKROM: 'KYUREM_2' }, moves: { KYUREM_1: ['ICEBURN', 'FUSIONFLARE'], KYUREM_2: ['FREEZESHOCK', 'FUSIONBOLT'] } },
  NSOLARIZER: { base: 'NECROZMA', parts: { SOLGALEO: 'NECROZMA_1' }, moves: { NECROZMA_1: ['SUNSTEELSTRIKE'] } },
  NLUNARIZER: { base: 'NECROZMA', parts: { LUNALA: 'NECROZMA_2' }, moves: { NECROZMA_2: ['MOONGEISTBEAM'] } },
  REINSOFUNITY: { base: 'CALYREX', parts: { GLASTRIER: 'CALYREX_1', SPECTRIER: 'CALYREX_2' }, moves: { CALYREX_1: ['GLACIALLANCE'], CALYREX_2: ['ASTRALBARRAGE'] } },
};
async function useFusion(id, noteFn) {
  const F = FUSIONS[id];
  const mon = await pickPartyMon('누구에게 사용할까요?');
  if (!mon) return;
  const fusedKeys = Object.values(F.parts);
  // 이미 합체한 상태 → 분리
  if (fusedKeys.includes(mon.species) && mon.fu) {
    if (!(await yesNo(J.eulreul(mon.name) + ' 분리하시겠습니까?'))) return;
    const partner = Mon.fromJSON(mon.fu);
    const learned = F.moves[mon.species] || [];
    mon.fu = null;
    fieldForm(mon, F.base);
    mon.moves = mon.moves.filter(m => !learned.includes(m.id));   // 합체 전용기는 잊음
    if (!mon.moves.length) mon.resetMoves();
    if (Player.party.length < 6) Player.party.push(partner); else Storage.deposit(partner);
    Audio2.se('Battle ability'); refreshFollower();
    await noteFn(J.wagwa(mon.name) + ' ' + J.iga(partner.name) + ' 분리되었다!' + (Player.party.includes(partner) ? '' : ' (' + partner.name + '은(는) 박스로 보냈다)'));
    return;
  }
  if (mon.species !== F.base) { await noteFn('효과가 없을 것 같다.'); return; }
  // 합체할 상대: 파티에 있는 해당 종
  const cands = Player.party.filter(m => m !== mon && F.parts[m.species]);
  if (!cands.length) { await noteFn('합체할 포켓몬(' + Object.keys(F.parts).map(s => SPECIES[s].name).join(' 또는 ') + ')이 파티에 없다.'); return; }
  let partner = cands[0];
  if (cands.length > 1) {
    const k = await Game.open(new ListBox(cands.map(m => m.name + ' Lv.' + m.level).concat(['그만두기']), { title: '합체할 포켓몬' }));
    if (k < 0 || k >= cands.length) return;
    partner = cands[k];
  }
  const key = F.parts[partner.species];
  if (!(await yesNo(J.wagwa(mon.name) + ' ' + J.eulreul(partner.name) + ' 합체시키겠습니까?'))) return;
  mon.fu = partner.toJSON();
  Player.party.splice(Player.party.indexOf(partner), 1);
  Audio2.se('Battle ability');
  fieldForm(mon, key); Player.caught[key] = true;
  refreshFollower();
  await noteFn(J.wagwa(mon.name) + ' ' + J.iga(partner.name) + ' 하나가 되어 ' + J.ro(SPECIES[key].fname || SPECIES[key].name) + ' 변했다!');
  for (const mv of F.moves[key] || []) if (MOVES[mv] && !mon.knows(mv)) await learnMoveFlow(mon, mv, s => say(s));
}
// 두 모습을 오가는 도구: 기본종 → 폼
const TOGGLES = {
  GRACIDEA: { SHAYMIN: 'SHAYMIN_1' },
  REVEALGLASS: { TORNADUS: 'TORNADUS_1', THUNDURUS: 'THUNDURUS_1', LANDORUS: 'LANDORUS_1', ENAMORUS: 'ENAMORUS_1' },
  PRISONBOTTLE: { HOOPA: 'HOOPA_1' },
};
async function useToggle(id, noteFn) {
  const T = TOGGLES[id];
  const mon = await pickPartyMon('누구에게 사용할까요?');
  if (!mon) return;
  const base = baseSp(mon.species), form = T[base];
  if (!form) { await noteFn('효과가 없을 것 같다.'); return; }
  const to = mon.species === form ? base : form;
  if (id === 'GRACIDEA' && to === form && (!isDay() || mon.status === 'FRZ')) { await noteFn(isDay() ? '얼어 있어서 변할 수 없다.' : '밤에는 그라시데아꽃이 피지 않는다... (낮에 다시 써 보자)'); return; }
  fieldForm(mon, to); Audio2.se('Battle ability'); refreshFollower();
  await noteFn(J.eunneun(mon.name) + ' ' + J.ro(SPECIES[to].fname || ('원래 모습')) + ' 변했다!');
}
async function useMeteorite(noteFn) {
  const mon = await pickPartyMon('누구에게 사용할까요?');
  if (!mon) return;
  if (baseSp(mon.species) !== 'DEOXYS') { await noteFn('효과가 없을 것 같다.'); return; }
  const list = ['DEOXYS', 'DEOXYS_1', 'DEOXYS_2', 'DEOXYS_3'].filter(k => SPECIES[k]);
  const k = await Game.open(new ListBox(list.map(s => SPECIES[s].fname || '노말폼').concat(['그만두기']), { title: '테오키스의 모습' }));
  if (k < 0 || k >= list.length) return;
  fieldForm(mon, list[k]); Audio2.se('Battle ability'); refreshFollower();
  await noteFn('운석이 빛났다! ' + J.eunneun(mon.name) + ' ' + J.ro(SPECIES[list[k]].fname || '노말폼') + ' 변했다!');
}
// 로토무: 폼마다 전용기 (이전 전용기를 새 전용기로 바꿈)
const ROTOM_FORMS = [['ROTOM', '보통 로토무', 'THUNDERSHOCK'], ['ROTOM_1', '히트로토무 (전자레인지)', 'OVERHEAT'], ['ROTOM_2', '워시로토무 (세탁기)', 'HYDROPUMP'], ['ROTOM_3', '프로스트로토무 (냉장고)', 'BLIZZARD'], ['ROTOM_4', '스핀로토무 (선풍기)', 'AIRSLASH'], ['ROTOM_5', '커트로토무 (잔디깎기)', 'LEAFSTORM']];
async function useRotomCatalog(noteFn) {
  const mon = await pickPartyMon('누구에게 사용할까요?');
  if (!mon) return;
  if (baseSp(mon.species) !== 'ROTOM') { await noteFn('효과가 없을 것 같다.'); return; }
  const k = await Game.open(new ListBox(ROTOM_FORMS.map(f => f[1]).concat(['그만두기']), { title: '어느 가전제품에 들어갈까?' }));
  if (k < 0 || k >= ROTOM_FORMS.length) return;
  const cur = ROTOM_FORMS.find(f => f[0] === mon.species), nx = ROTOM_FORMS[k];
  fieldForm(mon, nx[0]); Audio2.se('Battle ability'); refreshFollower();
  await noteFn(J.eunneun(mon.name) + ' ' + nx[1].split(' ')[0] + J.ro(nx[1].split(' ')[0]).slice(nx[1].split(' ')[0].length) + ' 변했다!');
  if (cur && cur[2] !== nx[2] && swapMove(mon, cur[2], nx[2])) await noteFn(J.eunneun(mon.name) + ' ' + J.eulreul(moveName(cur[2])) + ' 잊고 ' + J.eulreul(moveName(nx[2])) + ' 배웠다!');
  else if (!mon.knows(nx[2]) && MOVES[nx[2]]) await learnMoveFlow(mon, nx[2], s => say(s));
}
async function useZygardeCube(noteFn) {
  const mon = await pickPartyMon('누구에게 사용할까요?');
  if (!mon) return;
  if (!['ZYGARDE', 'ZYGARDE_1'].includes(mon.species)) { await noteFn('효과가 없을 것 같다.'); return; }
  const pc = mon.ability === 'POWERCONSTRUCT';
  const k = await Game.open(new ListBox(['50% 폼으로', '10% 폼으로', pc ? '특성을 오라브레이크로' : '특성을 스웜체인지로', '그만두기'], { title: '지가르데큐브' }));
  if (k === 0 || k === 1) { fieldForm(mon, k === 0 ? 'ZYGARDE' : 'ZYGARDE_1'); refreshFollower(); await noteFn(J.eunneun(mon.name) + ' ' + (k === 0 ? '50% 폼' : '10% 폼') + '이 되었다!'); }
  else if (k === 2) { mon.abHidden = false; mon.abIdx = pc ? 0 : 1; await noteFn(mon.name + '의 특성이 ' + J.ro(abilityName(mon.ability)) + ' 바뀌었다!' + (pc ? '' : '\n(체력이 절반 이하가 되면 퍼펙트폼으로 변한다)')); }
  if (k >= 0 && k <= 2) Audio2.se('Battle ability');
}
// 꽃꿀: 춤추새 스타일 (쓰면 사라짐)
const NECTAR_FORM = { REDNECTAR: 'ORICORIO', YELLOWNECTAR: 'ORICORIO_1', PINKNECTAR: 'ORICORIO_2', PURPLENECTAR: 'ORICORIO_3' };
async function useNectar(id, noteFn) {
  const mon = await pickPartyMon('누구에게 사용할까요?');
  if (!mon) return;
  if (baseSp(mon.species) !== 'ORICORIO' || mon.species === NECTAR_FORM[id]) { await noteFn('효과가 없을 것 같다.'); return; }
  Bag.remove(id); fieldForm(mon, NECTAR_FORM[id]); Audio2.se('Battle ability'); refreshFollower();
  await noteFn(J.eunneun(mon.name) + ' 꿀을 먹고 ' + J.ro(SPECIES[NECTAR_FORM[id]].fname || '이글이글 스타일') + ' 변했다!');
}
// 가방에서 '사용한다'가 가능한 변신 도구 (ui.js 의 사용 가능 판정과 useItemField 가 참조)
const FORM_FIELD = {};
for (const id in FUSIONS) FORM_FIELD[id] = (note) => useFusion(id, note);
for (const id in TOGGLES) FORM_FIELD[id] = (note) => useToggle(id, note);
for (const id in NECTAR_FORM) FORM_FIELD[id] = (note) => useNectar(id, note);
FORM_FIELD.METEORITE = (note) => useMeteorite(note);
FORM_FIELD.ROTOMCATALOG = (note) => useRotomCatalog(note);
FORM_FIELD.ZYGARDECUBE = (note) => useZygardeCube(note);
const _useItemFieldOrig = useItemField;
useItemField = async function (id, noteFn, bagScreen) {
  if (FORM_FIELD[id]) return FORM_FIELD[id](noteFn, bagScreen);
  return _useItemFieldOrig(id, noteFn, bagScreen);
};
// 스카이폼은 밤이 되면 원래대로 (필드에서 가끔 확인)
let _shayminTick = 0;
const _formsWorldUpdate = World.prototype.update;
World.prototype.update = function (...a) {
  if (++_shayminTick % 600 === 0 && !isDay()) for (const m of Player.party) if (m.species === 'SHAYMIN_1') fieldForm(m, 'SHAYMIN');
  return _formsWorldUpdate.apply(this, a);
};

// ============================================================
// 3) 전투 중 자동 변신 (특성) + 울트라버스트 + 무한다이맥스 + 패러독스 특성
// ============================================================
// 전투 폼 바꾸기: key 가 원래 종이면 되돌림, 아니면 setForm (전투가 끝나면 revertForm 으로 원래대로)
Object.assign(Battle.prototype, {
  async formShift(b, key, msg) {
    const m = b.mon, side = b === this.p ? 'p' : 'f';
    if (!SPECIES[key] || m.species === key) return false;
    await preload([monSpritePath(side === 'p' ? 'Back' : 'Front', key, m.shiny)].filter(Boolean));
    const s = this.sprites[side];
    s.flash = true; Audio2.se('Battle ability');
    for (let i = 0; i < 8; i++) await frames(2);
    const orig = m.origSpecies || m.species;
    if (key === orig) {   // 원래 모습으로
      const lost = m.stats[0] - m.hp;
      m.species = orig; m.origSpecies = null; m.calcStats();
      if (m.dynaMul) { m.stats[0] *= m.dynaMul; }
      m.hp = m.hp <= 0 ? 0 : clamp(m.stats[0] - lost, 1, m.stats[0]);
    } else {
      const mul = m.dynaMul; if (mul) m.stats[0] = Math.round(m.stats[0] / mul);   // 다이맥스 배수를 잠시 빼고 바꿈
      m.setForm(key);
      if (mul) { m.stats[0] *= mul; }
    }
    s.flash = false; this.disp[side].hp = m.hp; Audio2.cry(key);
    if (msg) await this.say(msg);
    return true;
  },
});

// --- 기술 쓰기 전후: 블레이드폼 전환, 스텝폼, 그대로삼키기, 유대변화, 전용기 타입(심판의뭉치 등) ---
const SIG_TYPE_MOVES = { JUDGMENT: 'ARCEUS', MULTIATTACK: 'SILVALLY', TECHNOBLAST: 'GENESECT', IVYCUDGEL: 'OGERPON' };
function sigMoveType(mon, moveId) {
  const owner = SIG_TYPE_MOVES[moveId]; if (!owner || baseSp(mon.species) !== owner) return null;
  if (owner === 'GENESECT') return DRIVE_FORM[mon.item] ? DRIVE_FORM[mon.item][1] : null;
  if (owner === 'OGERPON') return MASK_FORM[mon.item] ? MASK_FORM[mon.item][1] : null;
  return mon.data.t[0];   // 아르세우스·실버디: 지금 폼의 타입
}
const _formsUseMove = Battle.prototype.useMove;
Battle.prototype.useMove = async function (user, target, moveId, slot) {
  const m = user.mon, md = MOVES[moveId];
  // 킬가르도: 공격하면 블레이드폼, 킹실드를 쓰면 실드폼
  if (this.ab(user) === 'STANCECHANGE' && md && !user.dyna) {
    if (md.c !== 2 && m.species === 'AEGISLASH') await this.formShift(user, 'AEGISLASH_1', '[' + user.name + '의 배틀스위치] 블레이드폼으로 바뀌었다!');
    else if (moveId === 'KINGSSHIELD' && m.species === 'AEGISLASH_1') await this.formShift(user, 'AEGISLASH', '[' + user.name + '의 배틀스위치] 실드폼으로 바뀌었다!');
  }
  // 심판의뭉치·멀티어택·테크노버스터·덩굴곤봉: 지닌 도구(폼)의 타입으로
  const st = sigMoveType(m, moveId), oldT = md && md.t;
  if (st && md) md.t = st;
  const tgtAlive = target && !target.mon.fainted;
  try { await _formsUseMove.call(this, user, target, moveId, slot); }
  finally { if (st && md) md.t = oldT; }
  if (m.fainted) return;
  // 메로엣타: 옛노래를 쓰면 보이스폼 ↔ 스텝폼
  if (moveId === 'RELICSONG' && baseSp(m.species) === 'MELOETTA') await this.formShift(user, m.species === 'MELOETTA' ? 'MELOETTA_1' : 'MELOETTA', J.eunneun(user.name) + ' ' + (m.species === 'MELOETTA' ? '스텝폼' : '보이스폼') + '으로 바뀌었다!');
  // 윽우지: 파도타기·다이빙을 쓰면 먹이를 문다 (체력 절반 초과 = 삼킨 모습, 이하 = 피카츄를 문 모습)
  if ((moveId === 'SURF' || moveId === 'DIVE') && this.ab(user) === 'GULPMISSILE' && m.species === 'CRAMORANT') await this.formShift(user, m.hp > m.maxhp / 2 ? 'CRAMORANT_1' : 'CRAMORANT_2', J.eunneun(user.name) + ' 먹이를 입에 물었다!');
  // 개굴닌자(유대변화): 상대를 쓰러뜨리면 지우개굴닌자
  if (tgtAlive && target.mon.fainted && this.ab(user) === 'BATTLEBOND' && m.species === 'GRENINJA_1') await this.formShift(user, 'GRENINJA_2', '[' + user.name + '의 유대변화] 트레이너와의 유대가 깊어져 지우개굴닌자가 되었다!');
};

// --- 맞기 직전: 탈(따라큐), 아이스페이스(빙큐보), 그대로삼키기 반격 ---
const _formsCalcDamage = Battle.prototype.calcDamage;
Battle.prototype.calcDamage = function (user, target, md, f) {
  const ta = this.ab(target), tm = target.mon;
  if (ta === 'DISGUISE' && tm.species === 'MIMIKYU' && md.c !== 2 && !target.v.disguised) {
    target.v.disguised = 'bust';   // 맞은 뒤(damage) 들킨 모습으로
    return { dmg: Math.max(1, Math.floor(tm.maxhp / 8)), crit: false };
  }
  if (ta === 'ICEFACE' && tm.species === 'EISCUE' && md.c === 0) { target.v.iceface = 'break'; return { dmg: 0, crit: false }; }
  return _formsCalcDamage.call(this, user, target, md, f);
};
const _formsDamage = Battle.prototype.damage;
Battle.prototype.damage = async function (b, dmg, eff) {
  const r = await _formsDamage.call(this, b, dmg, eff);
  if (b.v.disguised === 'bust') { b.v.disguised = true; await this.say('[' + b.name + '의 탈] 탈이 대신 공격을 받아 주었다!'); await this.formShift(b, 'MIMIKYU_1', b.name + '의 정체가 드러났다!'); }
  if (b.v.iceface === 'break') { b.v.iceface = null; await this.formShift(b, 'EISCUE_1', '[' + b.name + '의 아이스페이스] 얼굴의 얼음이 깨져 나이스페이스가 되었다!'); }
  // 윽우지: 먹이를 문 채 맞으면 공격한 상대에게 뱉음
  const cm = b.mon.species;
  if (!b.mon.fainted && (cm === 'CRAMORANT_1' || cm === 'CRAMORANT_2') && this._actor && this._actor !== b && dmg > 0 && eff !== undefined) {
    const o = this._actor;
    await this.formShift(b, 'CRAMORANT', '[' + b.name + '의 그대로삼키기] 물고 있던 먹이를 뱉었다!');
    if (!o.mon.fainted) { await _formsDamage.call(this, o, Math.max(1, Math.floor(o.mon.maxhp / 4))); if (cm === 'CRAMORANT_1') await this.changeStages(o, ['def'], -1, true); else await this.inflict(o, 'PAR'); }
  }
  return r;
};

// --- 등장할 때: 군집, 리미터실드, 각오의 모습(케르디오), 히어로(돌핀맨), 테라파고스, 날씨폼, 패러독스, 전기 필드 ---
function shieldsCore(m) { return 'MINIOR_' + (7 + (m.ivs.reduce((a, b) => a + b, 0) % 7)); }
const _formsOnEntry = Battle.prototype.onEntry;
Battle.prototype.onEntry = async function (side) {
  const b = this[side], m = b.mon, a = this.ab(b);
  // 무한다이노 보스: 무한다이맥스 상태로 등장 (전설 '무한다이노' 전투)
  if (side === 'f' && this.o.legend && m.species === 'ETERNATUS' && this.o.eternamax) {
    await this.formShift(b, 'ETERNATUS_1', null);
    m.dynaMul = 2; m.stats[0] *= 2; m.hp *= 2; this.disp.f.hp = m.hp;
    this.sprites.f.glow = '#ff2040'; this.sprites.f.scale = 1.4;
    await this.say(J.eunneun(m.name) + ' 붉은 소용돌이 속에서 무한다이맥스했다!\n하늘을 뒤덮는 거대한 힘이 느껴진다!');
  }
  if (m.species === 'KELDEO' && m.knows('SECRETSWORD')) await this.formShift(b, 'KELDEO_1', J.eunneun(b.name) + ' 각오를 다졌다! 각오의 모습이 되었다!');
  if (a === 'ZEROTOHERO' && m.species === 'PALAFIN' && m._hero) await this.formShift(b, 'PALAFIN_1', '[' + b.name + '의 마이티체인지] 히어로가 되어 돌아왔다!');
  if (a === 'TERASHIFT' && m.species === 'TERAPAGOS') await this.formShift(b, 'TERAPAGOS_1', '[' + b.name + '의 테라체인지] 테라스탈폼으로 변했다!');
  await _formsOnEntry.call(this, side);
  if (m.fainted || this[side] !== b) return;
  await this.formAbilityCheck(b, true);
  if (this.ab(b) === 'HADRONENGINE' && !(this.terrain && this.terrain.type === 'ELECTRIC')) { await this.abPop(b); this.terrain = { type: 'ELECTRIC', turns: 5 }; await this.say('발밑에 전기가 흐르기 시작했다! (일렉트릭필드)'); }
  await this.paradoxCheck(b);
  const o = this[side === 'p' ? 'f' : 'p']; if (o && !o.mon.fainted) await this.paradoxCheck(o);
};

Object.assign(Battle.prototype, {
  // HP·날씨에 따라 모습이 바뀌는 특성 (등장할 때와 턴 끝마다)
  async formAbilityCheck(b, entry) {
    const m = b.mon, a = this.ab(b); if (!a || m.fainted) return;
    const half = m.hp <= m.maxhp / 2;
    if (a === 'SCHOOLING' && m.level >= 20) {
      const school = m.hp > m.maxhp / 4;
      if (school && m.species === 'WISHIWASHI') await this.formShift(b, 'WISHIWASHI_1', '[' + b.name + '의 어군] 무리를 지었다!');
      else if (!school && m.species === 'WISHIWASHI_1') await this.formShift(b, 'WISHIWASHI', '[' + b.name + '의 어군] 무리가 흩어졌다!');
    }
    if (a === 'ZENMODE' && !entry) {
      const map = { DARMANITAN: 'DARMANITAN_1', DARMANITAN_2: 'DARMANITAN_3' };
      const back = { DARMANITAN_1: 'DARMANITAN', DARMANITAN_3: 'DARMANITAN_2' };
      if (half && map[m.species]) await this.formShift(b, map[m.species], '[' + b.name + '의 달마모드] 달마모드가 되었다!');
      else if (!half && back[m.species]) await this.formShift(b, back[m.species], '[' + b.name + '의 달마모드] 원래 모습으로 돌아왔다!');
    }
    if (a === 'SHIELDSDOWN') {
      if (half && m.species === 'MINIOR') await this.formShift(b, shieldsCore(m), '[' + b.name + '의 리미터실드] 껍질이 벗겨져 코어가 드러났다!');
      else if (!half && /^MINIOR_/.test(m.species)) await this.formShift(b, 'MINIOR', '[' + b.name + '의 리미터실드] 다시 껍질을 둘렀다!');
    }
    if (a === 'POWERCONSTRUCT' && !entry && half && (m.species === 'ZYGARDE' || m.species === 'ZYGARDE_1') && !b.v.constructed) {
      b.v.constructed = true;
      await this.say('셀들의 목소리가 들린다...!');
      await this.formShift(b, 'ZYGARDE_2', '[' + b.name + '의 스웜체인지] 셀이 모여 퍼펙트폼이 되었다!');
    }
    if (a === 'FORECAST' && baseSp(m.species) === 'CASTFORM') {
      const w = this.weather && this.weather.type;
      const key = /SUN/.test(w || '') ? 'CASTFORM_1' : /RAIN/.test(w || '') ? 'CASTFORM_2' : w === 'HAIL' ? 'CASTFORM_3' : 'CASTFORM';
      if (m.species !== key) await this.formShift(b, key, '[' + b.name + '의 기분파] 날씨에 맞춰 모습이 바뀌었다!');
    }
    if (a === 'HUNGERSWITCH' && !entry && baseSp(m.species) === 'MORPEKO') await this.formShift(b, m.species === 'MORPEKO' ? 'MORPEKO_1' : 'MORPEKO', '[' + b.name + '의 꼬르륵스위치] ' + (m.species === 'MORPEKO' ? '배고파서 배고픈 모양이 되었다!' : '배부른 모양으로 돌아왔다!'));
  },
  // 고대활성(쾌청) / 쿼크차지(일렉트릭필드) / 부스트에너지: 가장 높은 능력 하나가 오름
  async paradoxCheck(b) {
    const a = this.ab(b), m = b.mon;
    if (!['PROTOSYNTHESIS', 'QUARKDRIVE'].includes(a) || m.fainted) return;
    const sun = /SUN/.test((this.weather && this.weather.type) || ''), elec = this.terrain && this.terrain.type === 'ELECTRIC';
    const env = (a === 'PROTOSYNTHESIS' && sun) || (a === 'QUARKDRIVE' && elec);
    if (b.v.paradox !== undefined) { if (b.v.paradoxSrc === 'env' && !env) { delete b.v.paradox; await this.say(b.name + '의 ' + abilityName(a) + ' 효과가 사라졌다!'); } return; }
    let src = env ? 'env' : null;
    if (!src && m.item === 'BOOSTERENERGY') { src = 'booster'; m._item = null; }   // 폼 동기화 없이 소모만
    if (!src) return;
    const keys = ['atk', 'def', 'spa', 'spd', 'spe'];
    let best = 1; for (let i = 1; i <= 5; i++) if (m.stats[i] * stageMul(b.st[keys[i - 1]]) > m.stats[best] * stageMul(b.st[keys[best - 1]])) best = i;
    b.v.paradox = best; b.v.paradoxSrc = src;
    await this.abPop(b, (src === 'booster' ? '부스트에너지를 사용해 ' : '') + b.name + '의 ' + STAT_NAMES[best] + J.iga(STAT_NAMES[best]).slice(STAT_NAMES[best].length) + ' 올라갔다!');
  },
});
// 패러독스·오리진 특성 배수: 공격 쪽은 위력, 방어 쪽은 데미지, 스피드
const _formsAtkMod = Battle.prototype.abAttackMod;
Battle.prototype.abAttackMod = function (user, target, md, P) {
  let mul = _formsAtkMod.call(this, user, target, md, P);
  const phys = md.c === 0, pv = user.v.paradox;
  if ((pv === 1 && phys) || (pv === 3 && !phys)) mul *= 1.3;
  if (this.ab(user) === 'ORICHALCUMPULSE' && phys && /SUN/.test((this.weather && this.weather.type) || '')) mul *= 1.33;
  if (this.ab(user) === 'HADRONENGINE' && !phys && this.terrain && this.terrain.type === 'ELECTRIC') mul *= 1.33;
  if (md.t === 'ELECTRIC' && this.terrain && this.terrain.type === 'ELECTRIC') mul *= 1.3;
  return mul;
};
const _formsDefMod = Battle.prototype.abDefenseMod;
Battle.prototype.abDefenseMod = function (user, target, md, eff) {
  let mul = _formsDefMod.call(this, user, target, md, eff);
  const pv = target.v.paradox;
  if ((pv === 2 && md.c === 0) || (pv === 4 && md.c === 1)) mul /= 1.3;
  return mul;
};
const _formsSpeed = Battle.prototype.abSpeed;
Battle.prototype.abSpeed = function (b) { return _formsSpeed.call(this, b) * (b.v.paradox === 5 ? 1.5 : 1); };

// --- 턴 끝: HP 폼 특성, 날씨폼, 전기 필드 시간, 무한다이맥스 시간 ---
const _formsEndOfTurn = Battle.prototype.endOfTurn;
Battle.prototype.endOfTurn = async function () {
  await _formsEndOfTurn.call(this);
  if (this.terrain && --this.terrain.turns <= 0) { this.terrain = null; await this.say('발밑의 전기가 사라졌다.'); }
  for (const side of ['p', 'f']) {
    const b = this[side]; if (!b || b.mon.fainted) continue;
    await this.formAbilityCheck(b, false);
    await this.paradoxCheck(b);
    if (b.etmax && --b.etmax <= 0) await this.endEternamax(side);
  }
};

// --- 교체: 돌핀맨은 한 번 물러나면 히어로, 무한다이맥스는 끝남 ---
const _formsPlayerSwitch = Battle.prototype.playerSwitch;
Battle.prototype.playerSwitch = async function (idx) {
  const b = this.p;
  if (b && b.etmax) await this.endEternamax('p');
  if (b && this.ab(b) === 'ZEROTOHERO' && b.mon.species === 'PALAFIN') b.mon._hero = true;
  return _formsPlayerSwitch.call(this, idx);
};
const _formsFinish = Battle.prototype.finish;
Battle.prototype.finish = async function () {
  for (const m of [...Player.party, ...this.foeParty]) delete m._hero;
  // 퍼펙트폼(스웜체인지)·지우개굴닌자 등 전투 폼은 revertForm 이 되돌림
  return _formsFinish.call(this);
};

// --- 울트라버스트 / 무한다이맥스 (전투 메뉴의 Q 버튼 기믹) ---
GIMMICK_NAME.ultra = '울트라버스트';
GIMMICK_NAME.etmax = '무한다이맥스';
const _formsAvail = Battle.prototype.availableGimmicks;
Battle.prototype.availableGimmicks = function () {
  const out = _formsAvail.call(this), m = this.p.mon, u = this.used.p;
  if (this.p.dyna || this.p.etmax || m.teraOn) return out;
  if (!u.ultra && (m.species === 'NECROZMA_1' || m.species === 'NECROZMA_2') && m.item === 'ULTRANECROZIUMZ' && Bag.count('ZRING')) out.push('ultra');
  if (!u.dyna && m.species === 'ETERNATUS' && Bag.count('DYNAMAXBAND') && Flags.has('eternamax')) out.push('etmax');
  return out;
};
const _formsApplyGimmick = Battle.prototype.applyGimmick;
Battle.prototype.applyGimmick = async function (side, g) {
  const b = this[side], m = b.mon;
  if (g === 'ultra') {
    this.used[side].ultra = true;
    await this.say(m.name + '의 몸에서 빛이 넘쳐흐른다!', false);
    await this.playAnim('MEGA', side, 'mega');
    await this.formShift(b, 'NECROZMA_3', J.eunneun(m.name) + ' 울트라버스트로 진짜 모습, 울트라네크로즈마가 되었다!');
    return;
  }
  if (g === 'etmax') {
    this.used[side].dyna = true;
    const who = side === 'p' ? Player.name : '';
    await this.say(who + J.eunneun(who).slice(who.length) + ' 다이맥스밴드에 무한다이노의 힘을 모았다!', false);
    await this.formShift(b, 'ETERNATUS_1', null);
    b.etmax = 3; this.sprites[side].glow = '#ff2040';
    for (let i = 1; i <= 20; i++) { this.sprites[side].scale = 1 + 0.4 * i / 20; await frames(1); }
    await this.say(J.eunneun(m.name) + ' 무한다이맥스했다! (3턴 동안)');
    return;
  }
  await _formsApplyGimmick.call(this, side, g);
  // 테라파고스: 테라스탈하면 스텔라폼
  if (g === 'tera' && baseSp(m.species) === 'TERAPAGOS' && this.ab(b) === 'TERASHIFT') { m.tera = 'STELLAR'; await this.formShift(b, 'TERAPAGOS_2', J.eunneun(b.name) + ' 스텔라폼이 되었다!'); }
};
Battle.prototype.endEternamax = async function (side) {
  const b = this[side]; b.etmax = 0;
  for (let i = 0; i < 15; i++) { this.sprites[side].scale = 1.4 - 0.4 * i / 15; await frames(1); }
  this.sprites[side].scale = 1; this.sprites[side].glow = null;
  if (!b.mon.fainted) await this.formShift(b, 'ETERNATUS', b.name + '의 무한다이맥스가 끝났다!');
};

// ============================================================
// 4) 얻는 경로: 전설을 잡으면 관련 도구 + 폼 연구원(옛 기록도 한 번에 정리, 상점)
// ============================================================
// 전설 → [도구 목록, 이야기]
const LEGEND_ITEMS = {
  ZACIAN: [['RUSTEDSWORD'], '자시안이 물고 있던 낡은 검이 바닥에 떨어졌다. 녹슬었지만 영웅의 기운이 남아 있다...'],
  ZAMAZENTA: [['RUSTEDSHIELD'], '자마젠타가 지키던 낡은 방패가 남아 있었다. 녹슬었지만 왕의 기운이 남아 있다...'],
  KYUREM: [['DNASPLICERS'], '큐레무의 얼음 속에서 두 개의 쐐기가 빛난다. 진실과 이상을 하나로 잇는 도구 같다!'],
  NECROZMA: [['NSOLARIZER', 'NLUNARIZER', 'ULTRANECROZIUMZ'], '네크로즈마가 흩뿌린 빛 속에서 두 개의 장치와 빛나는 Z크리스탈을 발견했다!'],
  CALYREX: [['REINSOFUNITY'], '버드렉스가 은빛 고삐를 건네주었다. 애마와 다시 하나가 되기 위한 고삐다.'],
  SHAYMIN: [['GRACIDEA'], '쉐이미가 머물던 자리에 감사의 꽃이 피었다.'],
  TORNADUS: [['REVEALGLASS'], '바람이 그친 자리에 진실을 비추는 거울이 남아 있었다.'],
  THUNDURUS: [['REVEALGLASS'], '번개가 그친 자리에 진실을 비추는 거울이 남아 있었다.'],
  LANDORUS: [['REVEALGLASS'], '대지의 신이 남긴 진실을 비추는 거울을 발견했다.'],
  ENAMORUS: [['REVEALGLASS'], '사랑의 신이 남긴 진실을 비추는 거울을 발견했다.'],
  HOOPA: [['PRISONBOTTLE'], '후파의 힘을 봉인하던 항아리를 손에 넣었다.'],
  DEOXYS: [['METEORITE'], '테오키스가 떨어진 자리에서 빛나는 운석 조각을 주웠다.'],
  GIRATINA: [['GRISEOUSCORE'], '반전세계의 문 앞에 빛나는 큰백금옥이 떨어져 있었다.'],
  DIALGA: [['ADAMANTCRYSTAL'], '시간의 신전에 커다란 금강옥이 빛나고 있었다.'],
  PALKIA: [['LUSTROUSGLOBE'], '공간의 신전에 커다란 백옥이 빛나고 있었다.'],
  ARCEUS: [Object.keys(PLATE_TYPE), '창조의 제단 주변에 17장의 플레이트가 흩어져 있었다! 모두 주웠다.'],
  GENESECT: [Object.keys(DRIVE_FORM), '게노세크트의 등에서 4개의 카세트가 떨어졌다.'],
  OGERPON: [Object.keys(MASK_FORM), '오거폰이 아끼던 세 개의 가면을 맡기고 갔다.'],
  ZYGARDE: [['ZYGARDECUBE'], '셀들을 담아 두는 지가르데큐브를 손에 넣었다.'],
  ROTOM: [['ROTOMCATALOG'], '로토무가 좋아하는 가전제품 카탈로그를 손에 넣었다.'],
};
const ownsFormItem = id => Bag.count(id) > 0 || [...Player.party, ...Player.boxes.flat()].some(m => m.item === id);
// 잡은 전설의 도구를 아직 못 받았으면 줌. 받은 게 있으면 true
async function grantFormItems(sp, speaker) {
  const L = LEGEND_ITEMS[sp];
  if (!L || Flags.has('fi_' + sp) || !Player.caught[sp]) return false;
  Flags.set('fi_' + sp);
  const give = L[0].filter(id => ITEMS[id] && !ownsFormItem(id));
  if (!give.length) return false;
  await say(L[1], speaker ? { speaker } : undefined);
  give.forEach(id => Bag.add(id));
  Audio2.playME('Key item get');
  await say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' ' + give.map(itemName).join(', ') + J.eulreul(itemName(give[give.length - 1])).slice(itemName(give[give.length - 1]).length) + ' 손에 넣었다!');
  return true;
}
// 전설을 잡은 직후 도구 지급 + 무한다이노는 무한다이맥스의 힘
const _formsLegend = SCRIPTS.legend;
SCRIPTS.legend = async function (w, c, id) {
  const L = LEGEND_BY_ID[id];
  const before = !!Player.caught[L.sp];
  await _formsLegend.call(this, w, c, id);
  if (before || !Player.caught[L.sp]) return;
  await grantFormItems(L.sp);
  if (L.sp === 'ETERNATUS' && !Flags.has('eternamax')) {
    Flags.set('eternamax'); Audio2.playME('Key item get');
    await say(['무한다이노의 붉은 에너지가 다이맥스밴드로 흘러들어 왔다...!', '이제 무한다이노와 함께라면 전투 중에 "무한다이맥스"를 쓸 수 있다! (다이맥스밴드 필요)']);
  }
};
// 무한다이노 전설전: 레이드 다이맥스 대신 무한다이맥스 보스로
if (LEGEND_BY_ID.ETERNATUS) { LEGEND_BY_ID.ETERNATUS.raid = null; LEGEND_BY_ID.ETERNATUS.hint = '검과 방패가 모일 때 무한의 거대한 힘이 눈을 뜬다. (자시안·자마젠타 포획)'; }
const _formsStartBattle = startBattle;
startBattle = async function (o) {
  if (o && o.legend && o.foe && o.foe[0] && o.foe[0].species === 'ETERNATUS') o = { ...o, eternamax: true, bgm: 'SWSH Battle' };
  return _formsStartBattle(o);
};
// 지가르데 셀 10개로 받은 지가르데: 스웜체인지 특성 + 큐브
const _formsZygLab = SCRIPTS.zygardeLab;
SCRIPTS.zygardeLab = async function (w) {
  const had = Flags.has('zyg_gift');
  await _formsZygLab.call(this, w);
  if (!had && Flags.has('zyg_gift')) {
    const z = [...Player.party, ...Player.boxes.flat()].find(m => m.species === 'ZYGARDE' && m.ot === Player.name);
    if (z) { z.abHidden = false; z.abIdx = 1; }
    await grantFormItems('ZYGARDE', '셀 연구원');
  }
};

// 폼 연구원: 셀 연구소 왼쪽 자리 — 옛 기록(이미 잡은 전설)의 도구 정리, 춤추새 꿀·플레이트·메모리·부스트에너지 상점,
//            엔딩 후 타입:널 선물
if (INTERIOR_DEFS.MAGMA_ZYGARDE) INTERIOR_DEFS.MAGMA_ZYGARDE.npcs.push({ id: 'magma_form', x: 7, y: 7, sprite: 'trainer_SCIENTIST', dir: 'right', move: 'look', script: 'formResearch' });
Object.assign(SCRIPTS, {
  async formResearch(w) {
    const S = '폼 연구원';
    await say(['나는 포켓몬의 "모습 바꾸기"를 연구하고 있어.', '전설의 포켓몬 중에는 특별한 도구로 모습이 바뀌는 녀석들이 많지.\n유전자쐐기, 녹슨 검, 비추는거울... 잡은 전설이 있으면 관련 도구를 찾아 줄게!'], { speaker: S });
    let any = false;
    for (const sp of Object.keys(LEGEND_ITEMS)) if (await grantFormItems(sp, S)) any = true;
    if (Player.caught.ETERNATUS && !Flags.has('eternamax')) { Flags.set('eternamax'); any = true; await say('무한다이노를 데리고 있구나! 다이맥스밴드에 무한다이맥스의 힘을 넣어 줄게.', { speaker: S }); }
    if (!any) await say('지금은 찾아 줄 도구가 없어. 전설을 더 만나 보렴!', { speaker: S });
    if (Flags.has('champion') && !Flags.has('typenull_gift') && SPECIES.TYPENULL) {
      await say(['챔피언이 되었다니 대단해! 연구용으로 보호하던 포켓몬을 맡길게.', '타입:널이야. 친해지면 실버디로 진화하고, 메모리를 지니게 하면 타입이 바뀌지.'], { speaker: S });
      const m = new Mon('TYPENULL', 40, { ot: Player.name }); m.ot = Player.name; m.metMap = '셀 연구소';
      givePokemon(m); Flags.set('typenull_gift'); Audio2.playME('Pkmn get');
      await say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' 타입:널을 받았다!');
    }
    const stock = ['REDNECTAR', 'YELLOWNECTAR', 'PINKNECTAR', 'PURPLENECTAR']
      .concat(Player.caught.ARCEUS ? Object.keys(PLATE_TYPE) : [])
      .concat(Player.caught.TYPENULL || Player.caught.SILVALLY ? Object.keys(ITEMS).filter(k => /MEMORY$/.test(k)) : [])
      .concat(Flags.has('portal_seen') ? ['BOOSTERENERGY'] : [])
      .filter(k => ITEMS[k] && ITEMS[k].pr > 0);
    if (await yesNo('폼 연구 물품을 사 갈래?')) await Game.open(new ShopScreen(stock));
  },
});
