// ============================================================
// story.js - 신대륙 아스테라: 확장 지역, 균열단 스토리, 체육관 4~8, 사천왕,
//            전설/환상 포켓몬 기믹, 맥스·테라 레이드, 서브 퀘스트, 배틀 타워
// ============================================================
'use strict';

/* ------------------------------------------------------------------
   세계관
   200년 전 바다 밑으로 가라앉았던 대륙 "아스테라"가 시공의 균열과 함께 떠올랐다.
   대륙 중심의 "시원의 결정(테라파고스)"이 모든 시대·모든 지방의 포켓몬을 끌어당겨,
   이곳에서는 1세대부터 9세대까지의 포켓몬과 전설·환상의 포켓몬이 함께 살아간다.
   비밀결사 "균열단"의 보스 제로스는 결정의 힘으로 균열을 완전히 열어
   전설의 포켓몬들을 지배하려 한다.
------------------------------------------------------------------ */

const T_GRUNT_M = 'TEAMROCKET_M', T_GRUNT_F = 'TEAMROCKET_F';
const VILLAIN = '균열단';
const BOSS = { name: '제로스', sprite: 'ROCKETBOSS' };
const ADMIN1 = { name: '헥스', sprite: 'HEX' }, ADMIN2 = { name: '카르마', sprite: 'BURGLAR' };

// 메가스톤 가격 보정
for (const k in ITEMS) if ((ITEMS[k].fl || []).includes('MegaStone') && !ITEMS[k].pr) ITEMS[k].pr = 10000;
const MEGA_STONES = Object.keys(ITEMS).filter(k => (ITEMS[k].fl || []).includes('MegaStone'));
const TM_LIST = Object.keys(ITEMS).filter(k => ITEMS[k].mv && ITEMS[k].pr > 0 && MOVES[ITEMS[k].mv]);

// 지역 폼(알로라/가라르/히스이/팔데아) 랜덤 등장
const REGIONAL = {};
for (const k in SPECIES) { const d = SPECIES[k]; if (d.form && /알로라|가라르|Hisuian|팔데아|Paldean|Galarian|Alolan/.test(d.fname || '')) (REGIONAL[d.base] = REGIONAL[d.base] || []).push(k); }
function regionalForm(sp) { const r = REGIONAL[sp]; return r && chance(0.2) ? pick(r) : sp; }

// ------------------------------------------------------------
// 기존 지역 연결 수정
// ------------------------------------------------------------
MAPS.STAR.exitPos = { north: 15, south: 17 };
MAPS.STAR.exits.north = { to: 'R5' };
MAPS.STAR.npcs = MAPS.STAR.npcs.filter(n => n.id !== 'star_guard');
MAPS.STAR.triggers = [{ x: 14, y: 2, w: 4, h: 2, cond: () => Player.badges.length >= 3 && !Flags.has('zeros1'), run: 'zeros1' }];
MAPS.STAR.npcs.find(n => n.id === 'star_gent').text = ['북쪽 바위산을 넘으면 새로운 마을들이 있다네.', '체육관 배지 8개를 모으면 별빛 리그에 도전할 수 있지.'];
MAPS.R4.exitPos = { south: 11, north: 11 };
MAPS.R4.exits.south = { to: 'MAGMA' };
MAPS.R4.encounters = autoEncounters(['DRAGON', 'FIGHTING', 'ROCK', 'STEEL', 'DARK', 'PSYCHIC'], 52, 58, 404, 20);
MAPS.R4.trainers.forEach((t, i) => { t.team = t.team.map(([s, l]) => [s, l + 22]); t.money *= 3; });
MAPS.R4.trainers[0].team = [['ROSERADE', 55], ['AMPHAROS', 55], ['ESPEON', 56]];
MAPS.R4.trainers[1].team = [['MACHAMP', 55], ['HOUNDOOM', 56], ['GARCHOMP', 57]];
MAPS.R4.trainers[2].team = [['ALAKAZAM', 56], ['GARDEVOIR', 57]];
MAPS.LEAGUE.exitPos = { south: 8 };
// 균열단 조무래기 (2번도로)
MAPS.R2.trainers.push(
  { id: 'r2_grunt1', x: 24, y: 5, sprite: T_GRUNT_M, dir: 'down', sight: 2, cls: VILLAIN + ' 조무래기', name: '조무래기', team: [['ZUBAT', 9], ['POOCHYENA', 10]], money: 300, before: '균열단의 일을 방해하지 마라! 이 숲의 포켓몬은 우리가 데려간다!', after: '크윽... 헥스 님께 보고해야겠다!' },
  { id: 'r2_grunt2', x: 32, y: 8, sprite: T_GRUNT_F, dir: 'up', sight: 1, cls: VILLAIN + ' 조무래기', name: '조무래기', team: [['NIDORANfE', 10], ['GRIMER', 10]], money: 300, before: '어린애가 무슨 일이야? 저리 꺼져!', after: '시원의 결정만 손에 넣으면 이런 건...!' });
// 초록숲: 간부 헥스
MAPS.FOREST.trainers.push({ id: 'f_hex', x: 22, y: 15, sprite: ADMIN1.sprite, dir: 'down', sight: 5, cls: VILLAIN + ' 간부', name: ADMIN1.name, boss: true, iv: 20, bgm: 'HGSS Rocket',
  team: [['GOLBAT', 15], ['KOFFING', 15], ['SNEASEL', 16]], money: 2000,
  before: '흐흥, 균열단의 계획을 방해하는 꼬마가 너구나.\n이 숲에서 "균열의 파편"을 찾고 있었는데... 네가 먼저 쓰러져 줘야겠어!',
  after: '...제법이네. 하지만 우리 보스 제로스 님의 계획은 이미 시작됐어. 시원의 결정이 깨어나면, 모든 전설이 우리 것이 된다고!' });
MAPS.FOREST.specials = [];

// ------------------------------------------------------------
// 신규 지역 생성
// ------------------------------------------------------------
const GYM_NEW = { 4: 'GYM4', 5: 'GYM5', 6: 'GYM6', 7: 'GYM7', 8: 'GYM8' };
const GR_A = ['GOLBAT', 'MUK', 'WEEZING', 'MIGHTYENA', 'SKUNTANK', 'KROOKODILE', 'TOXICROAK', 'SCRAFTY', 'HONCHKROW', 'LIEPARD'];
const GR_B = ['ZUBAT', 'GRIMER', 'KOFFING', 'POOCHYENA', 'STUNKY', 'SANDILE', 'CROAGUNK', 'SCRAGGY', 'MURKROW', 'PURRLOIN'];
function grunt(i, lv, f) { return { sprite: f ? T_GRUNT_F : T_GRUNT_M, cls: VILLAIN + ' 조무래기', name: '조무래기', team: [[GR_A[i % 10], lv], [GR_B[(i + 3) % 10], lv - 1]], before: ['균열단의 앞길을 막는 놈은 용서 못 해!', '시원의 결정은 우리 보스의 것이다!', '전설의 포켓몬을 지배하는 건 우리 균열단이야!'][i % 3], after: ['이, 이럴 수가!', '보스에게 혼나겠다...', '기억해 둬라, 꼬마!'][i % 3] }; }

defineRoute('R5', { name: '5번도로 바위산길', bgm: 'HGSS 136 Route 34', battleBg: 'mountain', w: 30, h: 46, seed: 501, exits: { south: 14, north: 16 }, ground: '.', ground2: 'g', grass: 0.28, trees: 0.1, rocks: 0.02,
  links: { south: { to: 'STAR' }, north: { to: 'PEAK' } },
  enc: autoEncounters(['ROCK', 'FIGHTING', 'GROUND', 'NORMAL'], 30, 35, 5, 18),
  trainers: [
    { sprite: 'HIKER', cls: '등산가', name: '태산', team: [['GRAVELER', 32], ['LARVITAR', 31], ['RHYHORN', 33]], before: '산은 정직하지! 실력도 정직하게 보여 봐!', after: '정상까지 힘내라!' },
    { sprite: 'BLACKBELT', cls: '태권왕', name: '무진', team: [['HITMONCHAN', 33], ['TIMBURR', 32], ['MIENFOO', 33]], before: '바위산마을 체육관에 도전하러 왔나? 날 넘어라!', after: '좋은 주먹이다!' },
    { ...grunt(0, 33), }, { ...grunt(1, 33, true) },
    { sprite: 'CAMPER', cls: '캠프보이', name: '산들', team: [['ROCKRUFF', 32], ['NACLI', 33]], before: '야영하기 딱 좋은 날씨지?', after: '모닥불이나 피워야겠다.' },
  ],
  items: [['HYPERPOTION', 2], ['TM' + '26'], ['REVIVE'], ['HARDSTONE'], ['DOMEFOSSIL'], ['ULTRABALL', 3]] });

defineTown('PEAK', { name: '바위산마을', bgm: 'HGSS 160 Ecruteak City', w: 34, h: 28, seed: 61, exits: { south: 1, north: 1 }, signText: '바위산마을\n강인한 주먹이 단련되는 고지의 마을\n체육관 관장: 강산',
  buildings: [['pc', 'PC'], ['mart', 'MART'], ['gym', 'GYM4'], ['house_green', 'PEAK_HOUSE'], ['house_small', 'PEAK_HOUSE2']],
  links: { south: { to: 'R5' }, north: { to: 'R6' } } });

defineRoute('R6', { name: '6번도로 설원', bgm: 'HGSS 179 Ice Path', battleBg: 'icecave', w: 36, h: 42, seed: 601, exits: { south: 16, north: 18 }, ground: 'w', grass: 0.3, trees: 0.14, water: 0.03, weather: 'snow',
  links: { south: { to: 'PEAK' }, north: { to: 'FROST' } },
  enc: autoEncounters(['ICE', 'STEEL', 'WATER'], 34, 39, 6, 18),
  trainers: [
    { sprite: 'ACETRAINER2_M', cls: '엘리트트레이너', name: '한설', team: [['SNEASEL', 36], ['CETODDLE', 36], ['PILOSWINE', 37]], before: '이 추위를 견딜 수 있겠어?', after: '몸이 뜨거워졌다!' },
    { ...grunt(2, 37), }, { ...grunt(3, 37, true) },
    { sprite: ADMIN2.sprite, cls: VILLAIN + ' 간부', name: ADMIN2.name, boss: true, iv: 22, bgm: 'HGSS Rocket', team: [['CROBAT', 38], ['WEAVILE', 38], ['DRAPION', 39]], gimmick: null,
      before: '헥스를 쓰러뜨린 꼬마가 너냐? 나는 균열단 간부 카르마.\n이 설원 아래 잠든 "얼음의 거인"을 깨우러 왔지!', after: '흥... 오늘은 물러나 주지. 하지만 붉은 구슬과 쪽빛 구슬이 모이면 바다와 대지의 왕도 우리 편이 된다!' },
  ],
  items: [['NEVERMELTICE'], ['MAXREVIVE'], ['ICESTONE'], ['FULLHEAL', 3], ['ARMORFOSSIL']] });

defineTown('FROST', { name: '설원마을', bgm: 'KM_Lavender', w: 34, h: 28, seed: 71, exits: { south: 1, east: 1 }, weather: 'snow', signText: '설원마을\n오로라가 춤추는 북쪽 끝 마을\n체육관 관장: 설아',
  buildings: [['pc', 'PC'], ['mart', 'MART'], ['gym', 'GYM5'], ['house_blue', 'FROST_LAB'], ['house_green', 'FROST_HOUSE']],
  links: { south: { to: 'R6' }, east: { to: 'R7' } } });

defineRoute('R7', { name: '7번도로 사막', bgm: 'HGSS 283 Sinto Ruins', battleBg: 'desert', w: 52, h: 30, seed: 701, exits: { west: 12, east: 14 }, ground: 'y', grass: 0.18, trees: 0.04, rocks: 0.025, weather: 'sand', grassTile: [0, 7],
  links: { west: { to: 'FROST' }, east: { to: 'DUNE' } },
  enc: autoEncounters(['GROUND', 'FIRE', 'BUG', 'ROCK'], 38, 43, 7, 18),
  trainers: [
    { sprite: 'RUINMANIAC', cls: '유적마니아', name: '고고', team: [['SIGILYPH', 40], ['CLAYDOL', 40], ['RUNERIGUS', 41]], before: '이 사막엔 고대의 비석이 잠들어 있다네!', after: '비석의 문자는 "바위의 열쇠"라고 쓰여 있었지...' },
    { ...grunt(4, 41), }, { ...grunt(5, 41, true) },
    { sprite: ADMIN1.sprite, cls: VILLAIN + ' 간부', name: ADMIN1.name, boss: true, iv: 24, bgm: 'HGSS Rocket', team: [['CROBAT', 42], ['WEAVILE', 42], ['SALAZZLE', 42], ['TOXAPEX', 43]],
      before: '또 너야?! 이번엔 안 봐줘. 이 붉은 구슬은 우리 균열단이 쓸 거야!', after: '말도 안 돼... 붉은 구슬을 빼앗기다니!', onWin: async () => { Bag.add('REDORB'); Flags.set('redorb'); Audio2.playME('Key item get'); await say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' 붉은 구슬을 되찾았다!\n(그란돈에게 지니게 하면 원시회귀한다고 한다)'); } },
  ],
  items: [['SOFTSAND'], ['SUNSTONE'], ['FIRESTONE'], ['FULLRESTORE', 2], ['SKULLFOSSIL'], ['CLAWFOSSIL']] });

defineTown('DUNE', { name: '사막도시 모래빛', bgm: 'HGSS 171 Cianwood City', w: 36, h: 28, seed: 81, exits: { west: 1, south: 1 }, ground: '.', signText: '사막도시 모래빛\n오아시스 위에 세워진 고대 도시\n체육관 관장: 모래',
  buildings: [['pc', 'PC'], ['mart', 'MART'], ['gym', 'GYM6'], ['house_small', 'DUNE_TERA'], ['house_blue', 'DUNE_FOSSIL']],
  links: { west: { to: 'R7' }, south: { to: 'R8' } } });

defineRoute('R8', { name: '8번도로 산호해안', bgm: 'KM_Route24', battleBg: 'island', w: 32, h: 50, seed: 801, exits: { north: 16, south: 14 }, ground: 'y', grass: 0.2, trees: 0.06, water: 0.16,
  links: { north: { to: 'DUNE' }, south: { to: 'CORAL' } },
  enc: autoEncounters(['WATER', 'FLYING', 'NORMAL', 'FAIRY'], 42, 47, 8, 18),
  trainers: [
    { sprite: 'SWIMMER_F', cls: '비키니 아가씨', name: '바다', team: [['PRIMARINA', 44], ['LANTURN', 44]], before: '해안에선 수영복이 정장이지!', after: '파도에 휩쓸렸어...' },
    { sprite: 'FISHERMAN', cls: '낚시꾼', name: '강태', team: [['GYARADOS', 45], ['BARRASKEWDA', 45], ['WHISCASH', 44]], before: '월척이다!!', after: '놓친 고기가 더 크지...' },
    { ...grunt(6, 45), },
    { sprite: ADMIN2.sprite, cls: VILLAIN + ' 간부', name: ADMIN2.name, boss: true, iv: 24, bgm: 'HGSS Rocket', team: [['CROBAT', 46], ['WEAVILE', 46], ['DRAPION', 47], ['HYDREIGON', 47]], gimmick: 'tera',
      before: '쪽빛 구슬은 이미 내 손에 있다! 가이오가가 깨어나면 이 대륙은 바다에 잠기겠지!', after: '...졌다. 가져가라. 하지만 보스는 이미 "시원의 탑"으로 향했다.', onWin: async () => { Bag.add('BLUEORB'); Flags.set('blueorb'); Audio2.playME('Key item get'); await say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' 쪽빛 구슬을 되찾았다!\n(가이오가에게 지니게 하면 원시회귀한다고 한다)'); } },
  ],
  items: [['MYSTICWATER'], ['WATERSTONE'], ['SHINYSTONE'], ['MAXELIXIR'], ['COVERFOSSIL'], ['PLUMEFOSSIL']] });

defineTown('CORAL', { name: '산호항구', bgm: 'KM_Vermillion', w: 36, h: 28, seed: 91, exits: { north: 1, east: 1 }, signText: '산호항구\n대륙 탐사선이 처음 닻을 내린 항구\n체육관 관장: 미라',
  buildings: [['pc', 'PC'], ['mart', 'MART'], ['gym', 'GYM7'], ['house_green', 'CORAL_MEGA'], ['house_blue', 'CORAL_HOUSE']],
  links: { north: { to: 'R8' }, east: { to: 'R9' } } });

defineRoute('R9', { name: '9번도로 화산지대', bgm: 'HGSS 162 Burned Tower', battleBg: 'lavacave', w: 54, h: 30, seed: 901, exits: { west: 12, east: 16 }, ground: 'g', grass: 0.2, trees: 0.05, rocks: 0.03, weather: 'ash',
  links: { west: { to: 'CORAL' }, east: { to: 'MAGMA' } },
  enc: autoEncounters(['FIRE', 'DRAGON', 'DARK', 'POISON'], 46, 51, 9, 20),
  trainers: [
    { sprite: 'COOLTRAINER_F', cls: '엘리트트레이너', name: '불새', team: [['CHANDELURE', 48], ['ARCANINE', 48], ['DRAGALGE', 49]], before: '화산의 열기만큼 뜨거운 승부를!', after: '불씨가 꺼졌어...' },
    { ...grunt(7, 49), }, { ...grunt(8, 49, true) },
    { sprite: 'BIKER', cls: '폭주족', name: '광석', team: [['TOXTRICITY', 49], ['SKUNTANK', 49]], before: '부릉부릉~ 비켜!', after: '오토바이 수리나 해야지.' },
  ],
  items: [['CHARCOAL'], ['DRAGONSCALE'], ['RARECANDY', 2], ['JAWFOSSIL'], ['SAILFOSSIL'], ['ROOTFOSSIL'], ['HELIXFOSSIL'], ['OLDAMBER']] });

defineTown('MAGMA', { name: '화산마을 용암', bgm: 'HGSS 184 Bell Tower', w: 36, h: 28, seed: 101, exits: { west: 1, north: 1, east: 1 }, weather: 'ash', signText: '화산마을 용암\n용의 전설이 살아 숨쉬는 마을\n체육관 관장: 용진\n↑ 챔피언로드   → 시원의 길',
  buildings: [['pc', 'PC'], ['mart', 'MART'], ['gym', 'GYM8'], ['house_small', 'MAGMA_ZYGARDE'], ['house_green', 'MAGMA_HOUSE']],
  links: { west: { to: 'R9' }, north: { to: 'R4' }, east: { to: 'ORIGIN' } } });
MAPS.MAGMA.triggers = [{ x: MAPS.MAGMA._cx - 1, y: 2, w: 4, h: 1, cond: () => !(Player.badges.length >= 8 && Flags.has('origin_done')), run: 'magmaGate' }];

defineRoute('ORIGIN', { name: '시원의 길', bgm: 'SWSH Slumbering Weald Shrine', battleBg: 'distortion', w: 42, h: 34, seed: 1101, exits: { west: 13 }, ground: 'g', grass: 0.22, trees: 0.12, water: 0.04, weather: 'rift',
  links: { west: { to: 'MAGMA' } },
  enc: autoEncounters(['DRAGON', 'PSYCHIC', 'GHOST', 'FAIRY', 'STEEL'], 50, 55, 11, 20),
  trainers: [{ ...grunt(9, 53), }, { ...grunt(3, 53, true) }, { ...grunt(5, 54) }],
  items: [['MAXREVIVE', 2], ['FULLRESTORE', 3], ['PPMAX']] });

// ------------------------------------------------------------
// 신규 실내
// ------------------------------------------------------------
Object.assign(INTERIOR_DEFS, {
  GYM4: { tmpl: 'gym1', name: '바위산 체육관', bgm: 'HGSS 162 Burned Tower', battleBg: 'gym', exit: [10, 11],
    npcs: [{ id: 'gym4_leader', x: 10, y: 5, sprite: 'trainer_BLACKBELT', dir: 'down', move: 'still', script: 'gymLeader', arg: 3 }],
    trainers: [{ id: 'gym4_t1', x: 11, y: 7, sprite: 'BLACKBELT2', dir: 'left', sight: 3, cls: '태권왕', name: '돌주먹', team: [['MACHOKE', 34], ['PANGORO', 35]], money: 900, before: '하압!', after: '관장님은 메가진화를 쓴다! 조심해!' }] },
  GYM5: { tmpl: 'gym_ice', name: '설원 체육관', bgm: 'HGSS 179 Ice Path', battleBg: 'icegym', exit: [5, 19],
    npcs: [{ id: 'gym5_leader', x: 5, y: 5, sprite: 'trainer_LASS2', dir: 'down', move: 'still', script: 'gymLeader', arg: 4 }],
    trainers: [{ id: 'gym5_t1', x: 6, y: 12, sprite: 'ACETRAINER2_M', dir: 'left', sight: 2, cls: '스키어', name: '눈꽃', team: [['BEARTIC', 38], ['GLALIE', 38]], money: 1000, before: '미끄러지지 않게 조심해!', after: '관장님은 다이맥스를 쓴다고!' }] },
  GYM6: { tmpl: 'gym3', name: '모래빛 체육관', bgm: 'HGSS 283 Sinto Ruins', battleBg: 'desert', exit: [33, 13],
    npcs: [{ id: 'gym6_leader', x: 5, y: 5, sprite: 'trainer_RUINMANIAC', dir: 'down', move: 'still', script: 'gymLeader', arg: 5 }],
    trainers: [{ id: 'gym6_t1', x: 23, y: 5, sprite: 'HIKER', dir: 'left', sight: 4, cls: '등산가', name: '사구', team: [['DONPHAN', 42], ['GOLURK', 42]], money: 1100, before: '모래 속에 숨은 힘을 보여주마!', after: '관장님은 테라스탈을 쓴다!' },
      { id: 'gym6_t2', x: 13, y: 5, sprite: 'RUINMANIAC', dir: 'left', sight: 4, cls: '유적마니아', name: '미라', team: [['COFAGRIGUS', 42], ['RUNERIGUS', 43]], money: 1100, before: '고대의 저주를 받아라!', after: '저주가 풀렸다...' }] },
  GYM7: { tmpl: 'gym2', name: '산호 체육관', bgm: 'HGSS 141 Goldenrod City', battleBg: 'garden', exit: [10, 10],
    npcs: [{ id: 'gym7_leader', x: 10, y: 4, sprite: 'trainer_AROMALADY', dir: 'down', move: 'still', script: 'gymLeader', arg: 6 }],
    trainers: [{ id: 'gym7_t1', x: 12, y: 7, sprite: 'LASS', dir: 'left', sight: 2, cls: '짧은치마', name: '하트', team: [['CLEFABLE', 46], ['GRANBULL', 46]], money: 1200, before: '요정의 힘은 강하답니다!', after: '관장님은 메가 가디안을 써요!' }] },
  GYM8: { tmpl: 'hall', name: '용암 체육관', bgm: 'HGSS 184 Bell Tower', battleBg: 'lavacave', exit: [15, 20], exitAlt: [[16, 20]],
    npcs: [{ id: 'gym8_leader', x: 15, y: 6, sprite: 'trainer_ACETRAINER_M', dir: 'down', move: 'still', script: 'gymLeader', arg: 7 }],
    trainers: [{ id: 'gym8_t1', x: 13, y: 14, sprite: 'COOLTRAINER_F', dir: 'right', sight: 4, cls: '드래곤조련사', name: '용비', team: [['FLYGON', 50], ['ALTARIA', 50], ['NOIVERN', 51]], money: 1500, before: '용의 숨결을 느껴 봐!', after: '관장님의 듀랄루돈은 거다이맥스한다!' },
      { id: 'gym8_t2', x: 17, y: 10, sprite: 'COOLTRAINER_M', dir: 'left', sight: 4, cls: '드래곤조련사', name: '용석', team: [['HAXORUS', 51], ['SALAMENCE', 51]], money: 1500, before: '여기까지 오다니 대단해!', after: '마지막 시험이다. 힘내라!' }] },
  PEAK_HOUSE: { tmpl: 'house1', name: '민가', bgm: null, exit: [9, 11], npcs: [{ id: 'peak_trader', x: 11, y: 7, sprite: 'NPC 12', dir: 'down', move: 'look', script: 'trader', arg: 0 }] },
  PEAK_HOUSE2: { tmpl: 'house2', name: '민가', bgm: null, exit: [9, 11], npcs: [{ id: 'peak_lore', x: 7, y: 6, sprite: 'trainer_RUINMANIAC', dir: 'right', move: 'look', script: 'lore', arg: 0 }] },
  FROST_LAB: { tmpl: 'lab', name: '다이맥스 연구소', bgm: 'HGSS 158 National Park', exit: [6, 13], npcs: [{ id: 'frost_dyna', x: 9, y: 6, sprite: 'trainer_SCIENTIST', dir: 'down', move: 'look', script: 'dynaLab' }] },
  FROST_HOUSE: { tmpl: 'house2', name: '민가', bgm: null, exit: [9, 11], npcs: [{ id: 'frost_lore', x: 7, y: 6, sprite: 'NPC 09', dir: 'right', move: 'look', script: 'lore', arg: 1 }, { id: 'frost_trader', x: 12, y: 8, sprite: 'NPC 04', dir: 'left', move: 'look', script: 'trader', arg: 1 }] },
  DUNE_TERA: { tmpl: 'house1', name: '테라스탈 연구소', bgm: null, exit: [9, 11], npcs: [{ id: 'dune_tera', x: 11, y: 7, sprite: 'trainer_SCIENTIST', dir: 'down', move: 'look', script: 'teraLab' }] },
  DUNE_FOSSIL: { tmpl: 'house2', name: '화석 복원소', bgm: null, exit: [9, 11], npcs: [{ id: 'dune_fossil', x: 7, y: 6, sprite: 'trainer_SCIENTIST', dir: 'right', move: 'look', script: 'fossil' }, { id: 'dune_lore', x: 12, y: 8, sprite: 'NPC 20', dir: 'left', move: 'look', script: 'lore', arg: 2 }] },
  CORAL_MEGA: { tmpl: 'house1', name: '메가진화 연구소', bgm: null, exit: [9, 11], npcs: [{ id: 'coral_mega', x: 11, y: 7, sprite: 'trainer_GENTLEMAN', dir: 'down', move: 'look', script: 'megaLab' }, { id: 'coral_megashop', x: 7, y: 7, sprite: 'NPC 19', dir: 'right', move: 'still', script: 'megaShop' }] },
  CORAL_HOUSE: { tmpl: 'house2', name: '민가', bgm: null, exit: [9, 11], npcs: [{ id: 'coral_lore', x: 7, y: 6, sprite: 'trainer_SAILOR', dir: 'right', move: 'look', script: 'lore', arg: 3 }, { id: 'coral_reminder', x: 12, y: 8, sprite: 'NPC 11', dir: 'left', move: 'look', script: 'moveReminder' }] },
  MAGMA_ZYGARDE: { tmpl: 'house1', name: '셀 연구소', bgm: null, exit: [9, 11], npcs: [{ id: 'magma_zyg', x: 11, y: 7, sprite: 'trainer_SCIENTIST', dir: 'down', move: 'look', script: 'zygardeLab' }] },
  MAGMA_HOUSE: { tmpl: 'house2', name: '민가', bgm: null, exit: [9, 11], npcs: [{ id: 'magma_lore', x: 7, y: 6, sprite: 'NPC 10', dir: 'right', move: 'look', script: 'lore', arg: 4 }] },
});
INTERIOR_DEFS.CHAMPION.name = '별빛 리그';
INTERIOR_DEFS.CHAMPION.npcs = [
  { id: 'champ_rival', x: 15, y: 6, sprite: 'trainer_COOLTRAINER_M', dir: 'down', move: 'still', script: 'champion' },
  { id: 'e4_1', x: 11, y: 16, sprite: 'trainer_GENTLEMAN', dir: 'right', move: 'still', script: 'elite', arg: 0 },
  { id: 'e4_2', x: 19, y: 16, sprite: 'trainer_CHANNELER', dir: 'left', move: 'still', script: 'elite', arg: 1 },
  { id: 'e4_3', x: 11, y: 11, sprite: 'trainer_ENGINEER', dir: 'right', move: 'still', script: 'elite', arg: 2 },
  { id: 'e4_4', x: 19, y: 11, sprite: 'trainer_ACETRAINER_F', dir: 'left', move: 'still', script: 'elite', arg: 3 },
  { id: 'champ_guide', x: 12, y: 17, sprite: 'NPC 15', dir: 'right', move: 'still', text: ['별빛 리그에 오신 것을 환영합니다!', '사천왕 네 명을 순서대로(왼쪽 아래 → 오른쪽 아래 → 왼쪽 위 → 오른쪽 위) 쓰러뜨리면 챔피언에게 도전할 수 있습니다.'] },
];

// ------------------------------------------------------------
// 체육관 관장 4~8, 기존 관장 기믹 추가
// ------------------------------------------------------------
GYM_LEADERS[2].team = [['KADABRA', 28], ['KIRLIA', 28], ['MEDICHAM', 29], ['ESPEON', 31, { tera: 'PSYCHIC' }]];
GYM_LEADERS[2].gimmick = 'tera';
GYM_LEADERS[2].onWin = async () => { await say(['테라스탈... 보셨나요? 이 대륙의 결정이 주는 힘이에요.', '산호항구, 설원마을, 사막도시의 연구소에서 그 힘을 다루는 법을 알려줄 거예요.'], { speaker: '루나' }); };
GYM_LEADERS[1].onWin = async () => { await say(['한별 박사님의 조수가 포켓몬센터에서 기다리고 있어요.', '"메가링"이라는 걸 전해 준다더군요.'], { speaker: '해나' }); };
GYM_LEADERS.push(
  { name: '강산', cls: '체육관 관장', sprite: 'BLACKBELT', badge: '주먹 배지', bgm: 'HGSS 143 Battle! (Gym Leader Johto)', money: 5000, gimmick: 'mega',
    team: [['HITMONLEE', 36], ['BRELOOM', 36], ['HARIYAMA', 37], ['LUCARIO', 39, { item: 'LUCARIONITE' }]], reward: 'LUCARIONITE', rewardN: 1,
    before: '나는 바위산 체육관 관장 강산!\n몸과 마음, 그리고 메가진화의 유대로 싸운다!', after: '훌륭하다! 너의 유대가 나보다 강했다.\n주먹 배지를 받아라!' },
  { name: '설아', cls: '체육관 관장', sprite: 'LASS2', badge: '서리 배지', bgm: 'HGSS 143 Battle! (Gym Leader Johto)', money: 6000, gimmick: 'dyna',
    team: [['ABOMASNOW', 40], ['FROSMOTH', 40], ['ARCTOZOLT', 41], ['LAPRAS', 43, { gmaxF: true }]], reward: 'DYNAMAXCANDY', rewardN: 3,
    before: '어서 와요. 설원 체육관 관장 설아예요.\n거대해진 포켓몬의 힘, 감당할 수 있겠어요?', after: '눈보라가 그쳤네요... 당신의 승리예요.\n서리 배지를 드릴게요.' },
  { name: '모래', cls: '체육관 관장', sprite: 'RUINMANIAC', badge: '사구 배지', bgm: 'HGSS 143 Battle! (Gym Leader Johto)', money: 7000, gimmick: 'tera',
    team: [['HIPPOWDON', 44], ['KROOKODILE', 44], ['SANDACONDA', 45], ['GARCHOMP', 47, { tera: 'GROUND' }]], reward: 'GROUNDTERASHARD', rewardN: 50,
    before: '나는 모래빛 체육관 관장 모래.\n고대 문명이 남긴 결정의 빛, 테라스탈을 보여 주지!', after: '사막의 모래처럼 내 자존심이 흩어지는군.\n사구 배지를 가져가게.' },
  { name: '미라', cls: '체육관 관장', sprite: 'AROMALADY', badge: '요정 배지', bgm: 'HGSS 143 Battle! (Gym Leader Johto)', money: 8000, gimmick: 'mega',
    team: [['SYLVEON', 48], ['AZUMARILL', 48], ['HATTERENE', 49], ['GARDEVOIR', 51, { item: 'GARDEVOIRITE' }]], reward: 'GARDEVOIRITE', rewardN: 1,
    before: '산호 체육관에 온 걸 환영해요♪\n요정과 메가진화의 아름다운 하모니를 들려줄게요!', after: '정말 멋진 승부였어요!\n요정 배지를 받아 주세요.' },
  { name: '용진', cls: '체육관 관장', sprite: 'ACETRAINER_M', badge: '용린 배지', bgm: 'HGSS 143 Battle! (Gym Leader Johto)', money: 10000, gimmick: 'dyna',
    team: [['DRAGONITE', 52], ['HYDREIGON', 52], ['GOODRA', 53], ['KINGDRA', 53], ['DURALUDON', 55, { gmaxF: true }]], reward: 'DRAGONFANG', rewardN: 1,
    before: '마지막 체육관까지 왔군. 나는 용진.\n용의 피가 흐르는 이 마을의 수호자다. 전력으로 와라!', after: '...용들이 너를 인정했다.\n용린 배지를 받아라. 이제 시원의 길로 가서 균열단을 막아 다오!' },
);
const ELITES = [
  { name: '흑요', cls: '사천왕', sprite: 'GENTLEMAN', gimmick: 'tera', team: [['HONCHKROW', 57], ['ZOROARK', 57], ['KINGAMBIT', 58], ['TYRANITAR', 59, { tera: 'DARK' }]], before: '어둠은 모든 빛을 삼키지. 나는 사천왕 흑요.', after: '빛이... 어둠을 이겼군.' },
  { name: '유령', cls: '사천왕', sprite: 'CHANNELER', gimmick: 'mega', team: [['MISMAGIUS', 58], ['DRAGAPULT', 58], ['CHANDELURE', 59], ['GENGAR', 60, { item: 'GENGARITE' }]], before: '후후후... 영혼들이 네 패배를 속삭이고 있어.', after: '영혼들이... 너를 축복하고 있어.' },
  { name: '강철', cls: '사천왕', sprite: 'ENGINEER', gimmick: 'dyna', team: [['SKARMORY', 59], ['EXCADRILL', 59], ['CORVIKNIGHT', 60, { gmaxF: true }], ['COPPERAJAH', 61, { gmaxF: true }]], before: '강철처럼 단단한 의지! 사천왕 강철이다!', after: '내 강철이 녹다니...' },
  { name: '천룡', cls: '사천왕', sprite: 'ACETRAINER_F', gimmick: 'mega', team: [['FLYGON', 60], ['BAXCALIBUR', 60], ['DRAGONITE', 61], ['GARCHOMP', 62, { item: 'GARCHOMPITE' }]], before: '사천왕 최강, 천룡. 용의 정점을 보여주마.', after: '챔피언이 기다린다. 가라.' },
];
const _rivalTeam = rivalTeam;
rivalTeam = function (stage) {
  const s = RIVAL_COUNTER[Flags.get('starterId') || 'BULBASAUR'];
  if (stage === 25) return [['PIDGEOT', 33], ['UMBREON', 34], ['LUCARIO', 34], [RIVAL_EVO[s][1], 36]];
  if (stage === 4) return [['PIDGEOT', 63, { item: 'PIDGEOTITE' }], ['UMBREON', 63], ['LUCARIO', 64], ['GARCHOMP', 64], ['GYARADOS', 64, { tera: 'DRAGON' }], [RIVAL_EVO[s][1], 66, { gmaxF: true }]];
  return _rivalTeam(stage);
};
shopStock = function () {
  const b = Player.badges.length;
  const s = ['POKEBALL', 'POTION', 'ANTIDOTE', 'PARALYZEHEAL', 'AWAKENING', 'BURNHEAL', 'ICEHEAL', 'ESCAPEROPE', 'REPEL'];
  if (b >= 1) s.push('GREATBALL', 'SUPERPOTION', 'SUPERREPEL', 'FULLHEAL', 'NETBALL', 'QUICKBALL');
  if (b >= 2) s.push('HYPERPOTION', 'REVIVE', 'FIRESTONE', 'WATERSTONE', 'THUNDERSTONE', 'LEAFSTONE', 'MOONSTONE', 'DUSKBALL', 'TIMERBALL');
  if (b >= 3) s.push('ULTRABALL', 'MAXPOTION', 'FULLRESTORE', 'MAXREPEL', 'SUNSTONE', 'SHINYSTONE', 'DUSKSTONE', 'DAWNSTONE', 'ICESTONE', 'LINKINGCORD', 'ETHER', 'ELIXIR');
  if (b >= 4) s.push(...TM_LIST.slice(0, 10 + (b - 4) * 12));
  if (b >= 6) s.push('MAXREVIVE', 'MAXETHER', 'MAXELIXIR', 'LEFTOVERS');
  return [...new Set(s)].filter(i => ITEMS[i]);
};

// ------------------------------------------------------------
// 전설 / 환상의 포켓몬
// ------------------------------------------------------------
const caughtAll = (...l) => l.every(s => Player.caught[s]);
const hourNow = () => new Date().getHours();
const isNight = () => hourNow() >= 20 || hourNow() < 6;
const leadType = t => { const m = Player.party.find(x => !x.fainted); return m && m.types.includes(t); };
// map: 배치 지역, cond: 출현 조건, hint: 조건 미충족 시 안내
const LEGENDS = [
  // --- 본편 진행 중 만날 수 있는 전설 ---
  { sp: 'ARTICUNO', lv: 45, map: 'R6', cond: () => Player.badges.length >= 5, hint: '차가운 기운이 맴돈다... (배지 5개 이상)' },
  { sp: 'REGICE', lv: 45, map: 'R6', cond: () => leadType('ICE'), hint: '고대 비석: "얼음의 마음을 가진 자가 선두에 설 때 거인은 깨어난다" (얼음 타입을 선두로)' },
  { sp: 'ZAPDOS', lv: 48, map: 'R7', cond: () => Player.badges.length >= 6, hint: '모래폭풍 속에서 번개가 친다... (배지 6개 이상)' },
  { sp: 'REGIROCK', lv: 48, map: 'R7', cond: () => leadType('ROCK'), hint: '고대 비석: "바위의 마음을 가진 자가 선두에 설 때 거인은 깨어난다" (바위 타입을 선두로)' },
  { sp: 'LATIAS', lv: 50, map: 'R8', cond: () => isDay(), hint: '', hideIf: () => !isDay() },
  { sp: 'LATIOS', lv: 50, map: 'R8', cond: () => isNight(), hint: '', hideIf: () => !isNight() },
  { sp: 'MOLTRES', lv: 50, map: 'R9', cond: () => Player.badges.length >= 7, hint: '불꽃의 날개가 화산 위를 맴돈다... (배지 7개 이상)' },
  { sp: 'REGISTEEL', lv: 50, map: 'R9', cond: () => leadType('STEEL'), hint: '고대 비석: "강철의 마음을 가진 자가 선두에 설 때 거인은 깨어난다" (강철 타입을 선두로)' },
  { sp: 'HEATRAN', lv: 52, map: 'R9', cond: () => Player.badges.length >= 8, hint: '용암 아래에서 무언가가 꿈틀거린다... (배지 8개)' },
  { sp: 'CELEBI', lv: 40, map: 'FOREST', at: [14, 11], cond: () => Flags.has('gsball'), hint: '오래된 사당이다. "시간을 넘는 방울"을 바치는 자리가 있다... (GS볼 필요)', mythical: true },
  { sp: 'VOLCANION', lv: 55, map: 'MAGMA', cond: () => Player.badges.length >= 8, hint: '증기가 뿜어져 나온다... (배지 8개)', mythical: true },
  // --- 엔딩 후: 균열 지대 ---
  { sp: 'KYOGRE', lv: 70, map: 'RIFT_SEA', cond: () => !!Bag.count('BLUEORB') || Player.party.some(m => m.item === 'BLUEORB'), hint: '깊은 바다가 무언가를 기다린다... (쪽빛 구슬 필요)', primal: true },
  { sp: 'GROUDON', lv: 70, map: 'RIFT_SEA', cond: () => !!Bag.count('REDORB') || Player.party.some(m => m.item === 'REDORB'), hint: '대지가 뜨겁게 들끓는다... (붉은 구슬 필요)', primal: true },
  { sp: 'RAYQUAZA', lv: 70, map: 'RIFT_SKY', cond: () => caughtAll('KYOGRE', 'GROUDON'), hint: '하늘의 왕은 바다와 대지의 왕이 진정될 때 내려온다. (가이오가·그란돈 포획)' },
  { sp: 'DEOXYS', lv: 65, map: 'RIFT_SKY', cond: () => caughtAll('RAYQUAZA'), hint: '운석의 파편이 빛나고 있다... (레쿠쟈 포획 후)', mythical: true },
  { sp: 'LUGIA', lv: 70, map: 'RIFT_SKY', cond: () => isNight(), hint: '은빛 날개는 밤에만 나타난다. (밤 20시~6시)' },
  { sp: 'HOOH', lv: 70, map: 'RIFT_SKY', cond: () => isDay(), hint: '무지갯빛 날개는 낮에만 나타난다. (낮 6시~18시)' },
  { sp: 'TORNADUS', lv: 65, map: 'RIFT_SKY' }, { sp: 'THUNDURUS', lv: 65, map: 'RIFT_SKY' },
  { sp: 'LANDORUS', lv: 65, map: 'RIFT_SKY', cond: () => caughtAll('TORNADUS', 'THUNDURUS'), hint: '바람과 번개를 다스린 자에게 풍요의 신이 나타난다.' },
  { sp: 'ENAMORUS', lv: 65, map: 'RIFT_SKY', cond: () => caughtAll('LANDORUS'), hint: '세 신을 만난 뒤 사랑의 신이 찾아온다.' },
  { sp: 'XERNEAS', lv: 70, map: 'RIFT_SKY' }, { sp: 'YVELTAL', lv: 70, map: 'RIFT_SKY' },
  { sp: 'ZYGARDE', lv: 70, map: 'RIFT_SKY', cond: () => caughtAll('XERNEAS', 'YVELTAL'), hint: '생명과 파괴의 균형이 맞을 때 질서가 깨어난다.' },
  { sp: 'DIALGA', lv: 72, map: 'RIFT_TIME' }, { sp: 'PALKIA', lv: 72, map: 'RIFT_TIME' },
  { sp: 'GIRATINA', lv: 72, map: 'RIFT_TIME', cond: () => caughtAll('DIALGA', 'PALKIA'), hint: '시간과 공간의 신을 모두 만났을 때 반전세계의 문이 열린다.' },
  { sp: 'ARCEUS', lv: 80, map: 'RIFT_TIME', cond: () => caughtAll('DIALGA', 'PALKIA', 'GIRATINA'), hint: '창조의 제단. "시간·공간·반물질의 신을 거느린 자만이 알을 볼 수 있다"', mythical: true },
  { sp: 'UXIE', lv: 60, map: 'RIFT_TIME' }, { sp: 'MESPRIT', lv: 60, map: 'RIFT_TIME' }, { sp: 'AZELF', lv: 60, map: 'RIFT_TIME' },
  { sp: 'JIRACHI', lv: 60, map: 'RIFT_TIME', cond: () => isNight(), hint: '별에 소원을 비는 시간은 밤뿐이다. (밤 20시~6시)', mythical: true },
  { sp: 'DARKRAI', lv: 65, map: 'RIFT_TIME', cond: () => isNight(), hint: '악몽은 밤에만 찾아온다.', mythical: true, hideIf: () => !isNight() },
  { sp: 'CRESSELIA', lv: 65, map: 'RIFT_TIME', cond: () => isDay(), hint: '초승달의 빛은 낮의 균열에서 빛난다.', hideIf: () => !isDay() },
  { sp: 'SHAYMIN', lv: 55, map: 'RIFT_TIME', mythical: true }, { sp: 'VICTINI', lv: 55, map: 'RIFT_TIME', mythical: true },
  { sp: 'RESHIRAM', lv: 72, map: 'RIFT_TRUTH' }, { sp: 'ZEKROM', lv: 72, map: 'RIFT_TRUTH' },
  { sp: 'KYUREM', lv: 72, map: 'RIFT_TRUTH', cond: () => caughtAll('RESHIRAM', 'ZEKROM'), hint: '진실과 이상이 만날 때 공허한 얼음이 깨어난다.' },
  { sp: 'COBALION', lv: 62, map: 'RIFT_TRUTH' }, { sp: 'TERRAKION', lv: 62, map: 'RIFT_TRUTH' }, { sp: 'VIRIZION', lv: 62, map: 'RIFT_TRUTH' },
  { sp: 'KELDEO', lv: 60, map: 'RIFT_TRUTH', cond: () => caughtAll('COBALION', 'TERRAKION', 'VIRIZION'), hint: '세 성검사를 만난 뒤 어린 성검사가 찾아온다.', mythical: true },
  { sp: 'MELOETTA', lv: 60, map: 'RIFT_TRUTH', mythical: true }, { sp: 'GENESECT', lv: 60, map: 'RIFT_TRUTH', mythical: true },
  { sp: 'SOLGALEO', lv: 72, map: 'RIFT_ALOLA', cond: () => isDay(), hint: '태양의 사자는 낮에 나타난다.' }, { sp: 'LUNALA', lv: 72, map: 'RIFT_ALOLA', cond: () => isNight(), hint: '달의 박쥐는 밤에 나타난다.' },
  { sp: 'NECROZMA', lv: 75, map: 'RIFT_ALOLA', cond: () => caughtAll('SOLGALEO', 'LUNALA'), hint: '태양과 달을 모두 얻었을 때 빛을 삼키는 자가 나타난다.' },
  { sp: 'TAPUKOKO', lv: 60, map: 'RIFT_ALOLA' }, { sp: 'TAPULELE', lv: 60, map: 'RIFT_ALOLA' }, { sp: 'TAPUBULU', lv: 60, map: 'RIFT_ALOLA' }, { sp: 'TAPUFINI', lv: 60, map: 'RIFT_ALOLA' },
  { sp: 'MAGEARNA', lv: 60, map: 'RIFT_ALOLA', mythical: true }, { sp: 'MARSHADOW', lv: 60, map: 'RIFT_ALOLA', mythical: true }, { sp: 'ZERAORA', lv: 60, map: 'RIFT_ALOLA', mythical: true },
  { sp: 'ZACIAN', lv: 72, map: 'RIFT_GALAR' }, { sp: 'ZAMAZENTA', lv: 72, map: 'RIFT_GALAR' },
  { sp: 'ETERNATUS', lv: 75, map: 'RIFT_GALAR', cond: () => caughtAll('ZACIAN', 'ZAMAZENTA'), hint: '검과 방패가 모일 때 무한의 거대한 힘이 눈을 뜬다.', raid: 'dyna' },
  { sp: 'REGIELEKI', lv: 65, map: 'RIFT_GALAR' }, { sp: 'REGIDRAGO', lv: 65, map: 'RIFT_GALAR' },
  { sp: 'REGIGIGAS', lv: 72, map: 'RIFT_GALAR', cond: () => caughtAll('REGIROCK', 'REGICE', 'REGISTEEL'), hint: '바위·얼음·강철의 거인을 모두 거느리면 왕이 깨어난다.' },
  { sp: 'CALYREX', lv: 70, map: 'RIFT_GALAR', cond: () => caughtAll('GLASTRIER') || caughtAll('SPECTRIER'), hint: '왕은 애마를 데려온 자 앞에 나타난다. (블리자포스 또는 레이스포스)' },
  { sp: 'GLASTRIER', lv: 68, map: 'RIFT_GALAR' }, { sp: 'SPECTRIER', lv: 68, map: 'RIFT_GALAR' },
  { sp: 'KUBFU', lv: 60, map: 'RIFT_GALAR' }, { sp: 'ZARUDE', lv: 60, map: 'RIFT_GALAR', mythical: true },
  { sp: 'KORAIDON', lv: 72, map: 'RIFT_PALDEA' }, { sp: 'MIRAIDON', lv: 72, map: 'RIFT_PALDEA' },
  { sp: 'WOCHIEN', lv: 65, map: 'RIFT_PALDEA' }, { sp: 'CHIENPAO', lv: 65, map: 'RIFT_PALDEA' }, { sp: 'TINGLU', lv: 65, map: 'RIFT_PALDEA' }, { sp: 'CHIYU', lv: 65, map: 'RIFT_PALDEA' },
  { sp: 'OKIDOGI', lv: 66, map: 'RIFT_PALDEA' }, { sp: 'MUNKIDORI', lv: 66, map: 'RIFT_PALDEA' }, { sp: 'FEZANDIPITI', lv: 66, map: 'RIFT_PALDEA' },
  { sp: 'OGERPON', lv: 68, map: 'RIFT_PALDEA', raid: 'tera' },
  { sp: 'PECHARUNT', lv: 70, map: 'RIFT_PALDEA', cond: () => caughtAll('OKIDOGI', 'MUNKIDORI', 'FEZANDIPITI'), hint: '세 충신을 모두 모으면 그들의 주인이 찾아온다.', mythical: true },
  { sp: 'MEWTWO', lv: 75, map: 'RIFT_ORIGIN', hint: '' },
  { sp: 'MEW', lv: 60, map: 'RIFT_ORIGIN', cond: () => caughtAll('MEWTWO'), hint: '분홍빛 그림자가 스쳐 지나갔다... (뮤츠 포획 후)', mythical: true, wander: true },
  { sp: 'HOOPA', lv: 65, map: 'RIFT_ORIGIN', mythical: true }, { sp: 'DIANCIE', lv: 65, map: 'RIFT_ORIGIN', mythical: true, raid: 'tera' },
  { sp: 'MANAPHY', lv: 50, map: 'RIFT_ORIGIN', mythical: true }, { sp: 'MELTAN', lv: 50, map: 'RIFT_ORIGIN', mythical: true },
  { sp: 'ENTEI', lv: 65, map: 'RIFT_ORIGIN' }, { sp: 'RAIKOU', lv: 65, map: 'RIFT_ORIGIN' }, { sp: 'SUICUNE', lv: 65, map: 'RIFT_ORIGIN' },
];
LEGENDS.forEach(l => { l.id = l.sp; });
const LEGEND_BY_ID = {}; LEGENDS.forEach(l => LEGEND_BY_ID[l.id] = l);
// 배회하는 전설 (본편 배지 5개 이후 풀숲 어디서나)
const ROAMERS = ['ENTEI', 'RAIKOU', 'SUICUNE', 'LATIAS', 'LATIOS', 'TORNADUS', 'THUNDURUS', 'MOLTRES', 'ZAPDOS', 'ARTICUNO', 'CRESSELIA'].filter(s => SPECIES[s]);
function roamCheck(w) {
  if (Player.badges.length < 5 || !chance(1 / 220)) return false;
  const left = ROAMERS.filter(s => !Player.caught[s]);
  if (!left.length) return false;
  const sp = pick(left);
  w.runScript(async () => {
    Audio2.cry(sp);
    await say('...!? 풀숲이 거세게 흔들린다!');
    await startBattle({ type: 'wild', foe: [new Mon(sp, 45 + Player.badges.length * 2)], legend: true, bgm: 'HGSS 143 Battle! (Gym Leader Johto)', legendText: '배회하던 ' + J.iga(SPECIES[sp].name) + ' 앞을 가로막았다!' });
  });
  return true;
}

// 균열 지대 (엔딩 후)
const RIFTS = [
  ['RIFT_SKY', '균열 지대: 하늘의 기둥', ['FLYING', 'DRAGON', 'FAIRY'], 'HGSS 184 Bell Tower', 'flowery'],
  ['RIFT_SEA', '균열 지대: 태고의 바다', ['WATER', 'GROUND'], 'Surfing', 'oceanroute'],
  ['RIFT_TIME', '균열 지대: 시공의 신전', ['PSYCHIC', 'STEEL', 'GHOST'], 'DPPT 133 Distortion World', 'distortion'],
  ['RIFT_TRUTH', '균열 지대: 진실과 이상의 탑', ['DRAGON', 'FIRE', 'ELECTRIC', 'FIGHTING'], 'BW Champion', 'mountain'],
  ['RIFT_ALOLA', '균열 지대: 일륜월륜의 제단', ['PSYCHIC', 'FAIRY', 'BUG', 'ELECTRIC'], 'SM 111 Po Town', 'island'],
  ['RIFT_GALAR', '균열 지대: 잠든 숲과 왕관 설원', ['STEEL', 'ICE', 'FAIRY', 'DARK'], 'SWSH Slumbering Weald Shrine', 'forest'],
  ['RIFT_PALDEA', '균열 지대: 에어리어 제로', ['DRAGON', 'GRASS', 'POISON', 'DARK'], 'SV Battle', 'jungle'],
  ['RIFT_ORIGIN', '균열 지대: 기원의 동굴', ['PSYCHIC', 'NORMAL', 'GHOST', 'DARK'], 'Arceus', 'cave1'],
];
RIFTS.forEach(([key, name, types, bgm, bg], i) => {
  const d = defineRoute(key, { name, bgm, battleBg: bg, w: 40, h: 34, seed: 2000 + i * 17, exits: { south: 19, west: 16 }, ground: i % 2 ? '.' : 'g', grass: 0.32, trees: 0.12, water: key === 'RIFT_SEA' ? 0.2 : 0.03, weather: 'rift',
    enc: autoEncounters(types, 55, 65, 3000 + i, 24), items: [['RARECANDY', 2], ['PPMAX'], [pick(MEGA_STONES)]] });
  const [hx, hy] = d._hub;
  d.spawn = [hx, hy];
  d._spots = d._spots.filter(p => !(Math.abs(p.x - hx - 1) <= 1 && Math.abs(p.y - hy + 1) <= 1));
  d.specials = [{ id: key + '_portal', x: hx + 1, y: hy - 1, sprite: 'Graphics/Characters/Followers/' + (SPECIES.PORYGONZ ? 'PORYGONZ' : 'PORYGON') + '.png', follower: true, aura: '#c060ff', script: 'riftReturn' }];
});

function occupied(d, x, y) { return [...(d.trainers || []), ...(d.specials || []), ...(d.items || []), ...(d.npcs || [])].some(e => e.x === x && e.y === y); }
// 전설 배치 (지역의 길가 지점에 순서대로)
const _spotUse = {};
for (const L of LEGENDS) {
  const d = MAPS[L.map]; if (!d || !SPECIES[L.sp]) continue;
  let pos = L.at;
  if (!pos) {
    const sp = (d._spots || []).filter(p => !occupied(d, p.x, p.y)); d._spots = sp; const i = _spotUse[L.map] = (_spotUse[L.map] || 0) + 1;
    const s = sp[(i * 7 + 3) % Math.max(1, sp.length)];
    pos = s ? [s.x, s.y] : [4 + i, 4];
    if (s) sp.splice((i * 7 + 3) % sp.length, 1);
  }
  L.x = pos[0]; L.y = pos[1];
  d.specials = d.specials || [];
  d.specials.push({ id: 'lg_' + L.id, x: L.x, y: L.y, sprite: 'Graphics/Characters/Followers/' + L.sp + '.png', follower: true, dir: 'down',
    aura: L.mythical ? '#ff80e0' : '#ffe060', script: 'legend', arg: L.id, cond: () => !Player.caught[L.sp] && !(L.hideIf && L.hideIf()) });
}

// 맥스 레이드 / 테라 레이드 둥지 (매일 바뀜)
const DENS = [
  ['R5', 'dyna'], ['R5', 'tera'], ['R6', 'dyna'], ['R6', 'tera'], ['R7', 'dyna'], ['R7', 'tera'], ['R8', 'dyna'], ['R8', 'tera'], ['R9', 'dyna'], ['R9', 'tera'],
  ['ORIGIN', 'dyna'], ['MEADOW', 'tera'], ['RIFT_GALAR', 'dyna'], ['RIFT_PALDEA', 'tera'], ['R3', 'tera'], ['FOREST', 'dyna'],
];
const GMAX_SPECIES = Object.keys(FORM_INDEX.gmax).filter(s => !isSpecial(s));
function todayKey() { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
function denInfo(i) {
  const [map, type] = DENS[i];
  const R = seededRng(todayKey() * 31 + i * 977);
  const enc = MAPS[map].encounters;
  let sp, lv = enc ? enc.max + 5 : 50;
  if (type === 'dyna' && R() < 0.45) sp = GMAX_SPECIES[Math.floor(R() * GMAX_SPECIES.length)];
  else {
    const list = enc && enc.list ? enc.list.map(e => e[0]) : SPECIES_LIST.filter(s => !isSpecial(s));
    sp = list[Math.floor(R() * list.length)];
    // 레이드는 최종 진화형이 나오기 쉽게
    for (let k = 0; k < 2; k++) { const ev = SPECIES[sp].evo.filter(e => SPECIES[e[0]] && !SPECIES[e[0]].form); if (ev.length && R() < 0.7) sp = ev[Math.floor(R() * ev.length)][0]; }
  }
  const tera = type === 'tera' ? Object.keys(TYPES).filter(t => t !== 'STELLAR')[Math.floor(R() * 18)] : null;
  return { map, type, sp, lv: Math.max(25, lv), tera, gmax: type === 'dyna' && !!FORM_INDEX.gmax[sp] };
}
DENS.forEach(([map, type], i) => {
  const d = MAPS[map]; if (!d) return;
  let x, y;
  const sp = d._spots;
  const sp2 = sp && sp.filter(p => !occupied(d, p.x, p.y));
  if (sp2 && sp2.length) { const s = sp2[(i * 13) % sp2.length]; sp.splice(sp.indexOf(s), 1); x = s.x; y = s.y; }
  else { const free = []; d.rows.forEach((r, yy) => [...r].forEach((c, xx) => { if (c === ',' && xx > 3 && yy > 3 && xx < r.length - 4 && yy < d.rows.length - 4) free.push([xx, yy]); })); const f = free[(i * 37) % free.length] || [5, 5]; x = f[0]; y = f[1]; }
  d.specials = d.specials || [];
  d.specials.push({ id: 'den_' + i, x, y, sprite: null, follower: true, dir: 'down', script: 'den', arg: i, denIndex: i,
    cond: () => Flags.get('den_' + i) !== todayKey() && (type === 'dyna' ? Player.badges.length >= 5 : Player.badges.length >= 6) });
});
// 둥지 스프라이트는 매일 바뀌므로 로드 시 지정
const _buildEvents = World.prototype.buildEvents;
World.prototype.buildEvents = function () {
  _buildEvents.call(this);
  for (const c of this.chars) {
    if (c.denIndex !== undefined) {
      const info = denInfo(c.denIndex);
      c.sprite = monSpritePath('Followers', info.sp, false) || 'Graphics/Characters/Object ball.png';
      c.aura = info.type === 'dyna' ? '#ff2050' : (TYPE_COLORS[info.tera] || '#fff');
    }
    if (c.id && c.id.startsWith('lg_') && LEGEND_BY_ID[c.arg] && LEGEND_BY_ID[c.arg].wander) {
      const d = this.def, R = Math.random;
      for (let k = 0; k < 50; k++) { const x = 3 + Math.floor(R() * (this.map.w - 6)), y = 3 + Math.floor(R() * (this.map.h - 6)); if (this.map.passable(x, y, 'down') && d.rows[y][x] !== '~' && d.rows[y][x] !== 'T') { c.x = x; c.y = y; break; } }
    }
  }
};

// 지가르데 셀 (10개) & GS볼 & 화석
const CELL_MAPS = ['R5', 'R5', 'R6', 'R6', 'R7', 'R7', 'R8', 'R8', 'R9', 'ORIGIN'];
CELL_MAPS.forEach((m, i) => {
  const d = MAPS[m]; let s = d._items && d._items.splice((i * 5 + 1) % Math.max(1, d._items.length), 1)[0];
  while (s && [...(d.trainers || []), ...(d.specials || []), ...(d.items || [])].some(e => e.x === s.x && e.y === s.y)) s = d._items.shift();
  if (!s) return;
  d.specials = d.specials || [];
  d.specials.push({ id: 'cell_' + i, x: s.x, y: s.y, sprite: 'Object ball', aura: '#30ff60', script: 'cell', arg: i, cond: () => !Flags.has('cell_' + i) });
});
{ const d = MAPS.R5; const s = d._items.splice(2, 1)[0] || { x: 5, y: 10 }; d.specials.push({ id: 'gsball', x: s.x, y: s.y, sprite: 'Object ball', aura: '#ffd040', script: 'gsball', cond: () => !Flags.has('gsball') }); }
const FOSSILS = { HELIXFOSSIL: 'OMANYTE', DOMEFOSSIL: 'KABUTO', OLDAMBER: 'AERODACTYL', ROOTFOSSIL: 'LILEEP', CLAWFOSSIL: 'ANORITH', SKULLFOSSIL: 'CRANIDOS', ARMORFOSSIL: 'SHIELDON', COVERFOSSIL: 'TIRTOUGA', PLUMEFOSSIL: 'ARCHEN', JAWFOSSIL: 'TYRUNT', SAILFOSSIL: 'AMAURA' };

// 엔딩 후 이동 안내원, 배틀 타워
MAPS.MEADOW.specials = (MAPS.MEADOW.specials || []).concat([{ id: 'rift_guide', x: 19, y: 8, sprite: 'trainer_SCIENTIST', dir: 'left', script: 'riftGuide', cond: () => Flags.has('champion') }]);
MAPS.LEAGUE.specials = (MAPS.LEAGUE.specials || []).concat([{ id: 'tower_master', x: 15, y: 9, sprite: 'trainer_GENTLEMAN', dir: 'down', script: 'tower', cond: () => Flags.has('champion') }]);
// 시원의 길: 보스 & 테라파고스
{
  const d = MAPS.ORIGIN, [hx, hy] = d._hub;
  d.trainers.push({ id: 'origin_boss', x: hx, y: hy - 2, dir: 'down', sight: 5, sprite: BOSS.sprite, cls: VILLAIN + ' 보스', name: BOSS.name, boss: true, iv: 31, bgm: 'CYRUS', gimmick: 'dyna',
    cond: () => !Flags.has('origin_done'),
    team: [['HONCHKROW', 53], ['WEAVILE', 53], ['HYDREIGON', 54, { tera: 'DARK' }], ['KINGAMBIT', 55], ['TYRANITAR', 57, { item: 'TYRANITARITE' }], ['GRIMMSNARL', 57, { gmaxF: true }]],
    before: '드디어 왔군, 꼬마.\n나는 균열단의 보스 제로스.\n이 대륙 아래에 잠든 "시원의 결정" 테라파고스... 그 힘이면 시공의 균열을 완전히 열 수 있다.\n모든 시대의 전설이 나를 따르게 될 것이다! 방해한다면 짓밟아 주마!',
    after: '...내가, 졌다고? 아니... 결정이... 결정이 폭주한다!',
    onWin: async (w, c) => { await SCRIPTS.terapagos(w, c); } });
  d.specials = d.specials || [];
  d.specials.push({ id: 'origin_crystal', x: hx, y: hy - 4, sprite: 'Graphics/Characters/Followers/TERAPAGOS.png', follower: true, aura: '#a0f0ff', script: 'terapagosAltar', cond: () => !Player.caught.TERAPAGOS && Flags.has('origin_done') });
}
// 라이벌 3차전 (바위산마을 북쪽)
MAPS.PEAK.triggers = [{ x: MAPS.PEAK._cx - 1, y: 3, w: 4, h: 1, cond: () => Flags.has('rival2') && !Flags.has('rival3') && Player.badges.length >= 4, run: 'rival3' }];
// 메가링 조수 (불씨마을 센터 앞), 각 마을 연구원/주민
{
  const [x, y] = freeSpotNear('EMBER', 6, 9);
  MAPS.EMBER.npcs.push({ id: 'ember_aide', x, y, sprite: 'trainer_SCIENTIST', dir: 'down', move: 'look', script: 'megaAide', cond: () => !Flags.has('megaring') });
}
const TOWN_NPCS = {
  PEAK: [['NPC 01', ['바위산 체육관 관장 강산 님은 루카리오와 메가진화를 한대!', '메가진화를 하려면 메가링과 메가스톤이 필요해.']], ['NPC 13', ['요즘 균열단이라는 수상한 녀석들이 산을 오르내리고 있어...']]],
  FROST: [['NPC 07', ['설원마을 북쪽 연구소에서 다이맥스 밴드를 나눠 준대!', '붉은 빛을 내뿜는 둥지에선 다이맥스한 포켓몬이 기다리고 있어.']], ['NPC 22', ['6번도로의 얼음 비석... 얼음 타입을 앞장세우면 무슨 일이 생긴대.']]],
  DUNE: [['NPC 18', ['테라스탈 연구소에서 테라스탈 오브를 받을 수 있어.', '빛나는 결정 위의 포켓몬을 쓰러뜨리면 테라피스를 얻을 수 있지!']], ['NPC 03', ['사막에 고대 비석이 있다던데... 바위 타입 포켓몬을 데려가 봐.']]],
  CORAL: [['trainer_SAILOR', ['200년 전 이 대륙은 바다 밑에 잠들어 있었다네.', '균열이 열리던 날, 하늘에 수많은 전설의 그림자가 보였지.']], ['NPC 08', ['메가진화 연구소에선 메가스톤을 팔고 있어!']]],
  MAGMA: [['NPC 10', ['동쪽 "시원의 길" 끝에 균열단 보스가 들어갔다는 소문이야!', '챔피언로드는 배지 8개와 균열단 사건을 해결해야 열린대.']], ['NPC 16', ['용진 관장님의 듀랄루돈은 거대해진다고!']]],
};
for (const k in TOWN_NPCS) {
  const d = MAPS[k]; d.npcs = d.npcs || [];
  TOWN_NPCS[k].forEach(([spr, text], i) => {
    const [x, y] = freeSpotNear(k, d._cx + (i ? 5 : -4), d._streets[0] + 3 + i);
    d.npcs.push({ id: k + '_npc' + i, x, y, sprite: spr, dir: 'down', move: 'wander', text });
  });
}

// 아스테라 대륙의 전승 (각 마을의 이야기 NPC)
const LORE = [
  ['200년 전, 아스테라 대륙은 "대균열"과 함께 바다 밑으로 가라앉았다네.', '그 중심에는 모든 시대를 비추는 결정, "시원의 결정"이 있었다고 하지.', '결정은 다른 시대, 다른 땅의 포켓몬을 끌어당겼어. 그래서 이 대륙엔 모든 포켓몬이 함께 산다네.'],
  ['설원의 전설을 아니? 얼음의 거인 레지아이스는 얼음의 마음을 가진 자에게만 깨어난대.', '바위의 거인은 사막에, 강철의 거인은 화산에 잠들어 있다고 해.', '세 거인을 모두 거느리면... 그들의 왕이 눈을 뜬다는 전설도 있지.'],
  ['붉은 구슬과 쪽빛 구슬. 각각 그란돈과 가이오가의 원시의 힘을 깨우는 열쇠야.', '균열단이 그 구슬을 노리고 있다던데... 걱정이야.', '참, 화석을 가져오면 내 동료가 복원해 줄 거야.'],
  ['내가 탔던 탐사선이 처음 이 대륙에 닿았을 때, 하늘이 갈라져 있었어.', '균열 너머로 은빛 날개와 무지갯빛 날개가 동시에 날아오르더군.', '챔피언이 되면 "환상의 풀숲"의 연구원이 균열 지대로 안내해 줄 거야.'],
  ['용암 마을의 용들은 시원의 결정을 지키는 수호자였어.', '결정이 깨어나면 "스텔라" 테라스탈의 빛이 대륙을 뒤덮는다고 하지.', '부디 그 힘이 나쁜 사람 손에 넘어가지 않기를...'],
];

// 교환 (게임 내 교환)
const TRADES = [
  { want: 'FIGHTING', give: 'SCYTHER', nick: '사마돌이', lv: 35, text: '격투 타입 포켓몬과 내 스라크를 교환하지 않겠나?' },
  { want: 'ICE', give: 'LAPRAS', nick: '라프라', lv: 38, text: '얼음 타입 포켓몬이 있으면 내 라프라스와 바꿔 줄게! 거다이맥스 인자도 있어!', gmax: true },
];

// ------------------------------------------------------------
// 스크립트
// ------------------------------------------------------------
Object.assign(SCRIPTS, {
  async legend(w, c, id) {
    const L = LEGEND_BY_ID[id];
    if (L.cond && !L.cond()) { Audio2.cry(L.sp, 0.5); await say(L.hint || '알 수 없는 기운이 느껴진다... 아직 때가 아닌 것 같다.'); return; }
    if (!Player.party.some(m => !m.fainted)) { await say('싸울 수 있는 포켓몬이 없다!'); return; }
    Audio2.cry(L.sp);
    await emote(c, '!');
    const d = SPECIES[L.sp];
    await say((L.mythical ? '환상의 포켓몬 ' : '전설의 포켓몬 ') + J.iga(d.name) + ' 이쪽을 바라보고 있다...\n' + d.cat + ' 포켓몬의 압도적인 기운이 느껴진다!');
    if (!(await yesNo('승부를 거시겠습니까?'))) return;
    const mon = new Mon(L.sp, L.lv, { shiny: chance(1 / 100) });
    if (L.sp === 'ETERNATUS') mon.gmaxF = false;
    const r = await startBattle({ type: 'wild', foe: [mon], legend: true, primal: L.primal, raid: L.raid, bgm: L.bgm || (L.mythical ? 'Arceus' : 'HGSS 143 Battle! (Gym Leader Johto)'), legendText: (L.mythical ? '환상의 ' : '전설의 ') + J.iga(d.name) + ' 덤벼들었다!' });
    if (r === 'caught') { Flags.set('legend_' + id); w.refreshEvents(); }
    else if (r === 'win') await say(J.eunneun(d.name) + ' 빛 속으로 사라졌다... 하지만 다시 나타날 것 같은 기운이 남아 있다.');
  },
  async den(w, c, i) {
    const info = denInfo(i);
    const d = SPECIES[info.sp];
    await say(info.type === 'dyna' ? '둥지에서 붉은 빛이 솟구치고 있다! 안에 ' + J.iga(d.name) + ' 보인다!' + (info.gmax ? '\n(거다이맥스 인자를 가진 것 같다!)' : '') : typeName(info.tera) + ' 테라 결정이 빛나고 있다! 결정 속에 ' + J.iga(d.name) + ' 있다!');
    if (info.type === 'dyna' && !Bag.count('DYNAMAXBAND')) await say('(다이맥스 밴드가 있으면 이쪽도 다이맥스로 맞설 수 있다.)');
    if (info.type === 'tera' && !Bag.count('TERAORB')) await say('(테라스탈 오브가 있으면 이쪽도 테라스탈로 맞설 수 있다.)');
    if (!(await yesNo('레이드 배틀에 도전하시겠습니까?'))) return;
    const mon = new Mon(info.sp, info.lv, { gmax: info.gmax, tera: info.tera || undefined, shiny: chance(1 / 200) });
    const r = await startBattle({ type: 'wild', foe: [mon], raid: info.type, bgm: info.type === 'dyna' ? 'SWSH Battle' : 'SV Battle', bg: info.type === 'dyna' ? 'cave2' : undefined });
    if (r === 'win' || r === 'caught') {
      Flags.set('den_' + i, todayKey());
      if (info.type === 'tera') { const sh = (info.tera || 'NORMAL') + 'TERASHARD'; if (ITEMS[sh]) { Bag.add(sh, 10); await say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' ' + itemName(sh) + ' 10개를 손에 넣었다!'); } }
      else { Bag.add('DYNAMAXCANDY', 1); Bag.add(pick(['RARECANDY', 'MAXREVIVE', 'ULTRABALL', 'PPUP']), 1); await say('레이드 보상으로 다이맥스사탕 등을 손에 넣었다!'); }
      Player.money += 3000; await say('상금 3000원도 받았다!');
      w.refreshEvents();
    }
  },
  async cell(w, c, i) {
    Flags.set('cell_' + i); c.visible = false; c.gone = true;
    Player.flags.cells = (Player.flags.cells || 0) + 1;
    Audio2.playME('Item get');
    await say('초록빛으로 빛나는 작은 생명체를 주웠다!\n지가르데 셀을 손에 넣었다! (' + Player.flags.cells + '/10)');
  },
  async gsball(w, c) {
    Flags.set('gsball'); c.visible = false; c.gone = true;
    Audio2.playME('Key item get');
    await say(['금빛과 은빛으로 빛나는 이상한 볼을 발견했다!', 'GS볼을 손에 넣었다!', '(초록숲의 오래된 사당에 바치면 무슨 일이 일어날지도...)']);
  },
  async lore(w, c, i) { await say(LORE[i], { speaker: '이야기꾼' }); },
  async trader(w, c, i) {
    const T = TRADES[i], k = 'trade_' + i;
    if (Flags.has(k)) { await say('교환한 ' + SPECIES[T.give].name + '... 아니, ' + T.nick + '는 잘 지내나?', { speaker: '교환 상대' }); return; }
    if (!(await yesNo(T.text, { speaker: '교환 상대' }))) return;
    const idx = await Game.open(new PartyScreen({ mode: 'select', msg: typeName(T.want) + ' 타입 포켓몬을 고르세요.' }));
    if (idx < 0) return;
    const m = Player.party[idx];
    if (!m.types.includes(T.want)) { await say('그건 ' + typeName(T.want) + ' 타입이 아니잖아!', { speaker: '교환 상대' }); return; }
    if (Player.party.length <= 1) { await say('마지막 포켓몬은 교환할 수 없어!'); return; }
    const nm = new Mon(T.give, Math.max(T.lv, m.level), { nickname: T.nick, ot: '교환상대', gmax: !!T.gmax });
    nm.ot = '교환상대'; nm.metMap = '교환';
    Player.party[idx] = nm; Player.caught[T.give] = Player.seen[T.give] = true;
    Flags.set(k);
    Audio2.playME('Pkmn get');
    await say(J.eulreul(m.name) + ' 보내고 ' + J.eulreul(T.nick) + ' 받았다!\n(다른 사람이 키운 포켓몬은 경험치를 더 많이 얻는다)');
    w.setupFollower(true);
  },
  async megaAide(w, c) {
    const s = { BULBASAUR: 'VENUSAURITE', CHARMANDER: 'CHARIZARDITEX', SQUIRTLE: 'BLASTOISINITE' }[Flags.get('starterId')] || 'VENUSAURITE';
    if (Player.badges.length < 2) { await say(['한별 박사님의 조수예요!', '체육관 배지를 2개 모으면 박사님이 맡긴 물건을 드릴게요.'], { speaker: '조수' }); return; }
    await say(['기다렸어요! 박사님이 이걸 전해 주라고 하셨어요.', '이 대륙의 결정에 반응하는 신비한 팔찌, "메가링"이에요!'], { speaker: '조수' });
    Bag.add('MEGARING'); Audio2.playME('Key item get');
    await say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' 메가링을 손에 넣었다!');
    Bag.add(s); Bag.add('LUCARIONITE');
    await say(['그리고 스타팅 포켓몬의 메가스톤 "' + itemName(s) + '"와 "루카리오나이트"도요!', '메가스톤을 포켓몬에게 지니게 한 뒤, 배틀에서 기술을 고를 때 Q키를 누르면 메가진화할 수 있어요!', '메가진화는 한 배틀에 한 번! 포켓몬과의 유대를 믿으세요.'], { speaker: '조수' });
    Flags.set('megaring'); w.refreshEvents();
  },
  async dynaLab(w) {
    if (!Bag.count('DYNAMAXBAND')) {
      await say(['오! 체육관 배지를 모으는 트레이너로군.', '나는 다이맥스 현상을 연구하는 학자네.', '이 대륙의 "가라르 입자"가 모이는 둥지에서는 포켓몬이 거대해지지!', '이 다이맥스 밴드를 주겠네.'], { speaker: '다이맥스 박사' });
      Bag.add('DYNAMAXBAND'); Audio2.playME('Key item get');
      await say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' 다이맥스 밴드를 손에 넣었다!');
      await say(['기술을 고를 때 Q키로 "다이맥스"를 선택하면 3턴 동안 거대해지고, 기술이 다이맥스 기술로 바뀌네.', '거다이맥스 인자를 가진 포켓몬은 특별한 모습과 거다이맥스 기술을 쓰지!', '각 도로의 붉게 빛나는 둥지(맥스 레이드)에 도전해 보게. 매일 다른 포켓몬이 나타난다네.'], { speaker: '다이맥스 박사' });
      return;
    }
    const n = Player.party.filter(m => m.gmaxF).length;
    await say(['다이맥스사탕은 다이맥스 레벨을 올려 주는 귀한 사탕이지.', '거다이맥스 인자를 가진 포켓몬이 파티에 ' + n + '마리 있군!'], { speaker: '다이맥스 박사' });
    if (Bag.count('DYNAMAXCANDY') >= 3 && await yesNo('다이맥스사탕 3개로 포켓몬에게 거다이맥스 인자를 심어 줄까? (거다이맥스 가능 종만)', { speaker: '다이맥스 박사' })) {
      const i = await Game.open(new PartyScreen({ mode: 'select', msg: '누구에게?' }));
      if (i >= 0) { const m = Player.party[i]; if (!FORM_INDEX.gmax[m.species]) await say('이 포켓몬은 거다이맥스할 수 없는 종이네.'); else { Bag.remove('DYNAMAXCANDY', 3); m.gmaxF = true; Audio2.se('Pkmn level up'); await say(m.name + '에게 거다이맥스 인자가 생겼다!'); } }
    }
  },
  async teraLab(w) {
    if (!Bag.count('TERAORB')) {
      await say(['테라스탈 연구소에 온 걸 환영해요!', '이 대륙의 결정 에너지를 포켓몬에게 입히면, 보석처럼 빛나며 "테라스탈 타입"으로 바뀌어요.', '이 테라스탈 오브를 드릴게요!'], { speaker: '테라 박사' });
      Bag.add('TERAORB'); Audio2.playME('Key item get');
      await say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' 테라스탈 오브를 손에 넣었다!');
      await say(['기술을 고를 때 Q키로 "테라스탈"을 고르세요. 한 배틀에 한 번이에요.', '원래 타입과 같은 테라 타입이면 자속 보정이 2배가 돼요!', '빛나는 결정(테라 레이드)을 이기면 테라피스를 얻을 수 있어요. 50개를 모아 가방에서 쓰면 테라 타입을 바꿀 수 있답니다.'], { speaker: '테라 박사' });
      return;
    }
    await say('지금 파티의 테라 타입: ' + Player.party.map(m => m.name + '(' + typeName(m.tera) + ')').join(', '), { speaker: '테라 박사' });
  },
  async megaLab(w) {
    const got = Player.flags.megaGift || 0, can = Math.max(0, Player.badges.length - 3);
    await say(['나는 메가진화를 연구하는 신사일세.', '메가진화는 트레이너와 포켓몬의 유대가 메가스톤과 키스톤에 공명할 때 일어나지.'], { speaker: '메가 연구가' });
    if (!Bag.count('MEGARING')) { await say('...자네, 메가링이 없군. 불씨마을의 한별 박사 조수를 찾아가 보게.', { speaker: '메가 연구가' }); return; }
    if (got < can) {
      const own = Object.keys(Player.bag);
      const stones = MEGA_STONES.filter(s => !own.includes(s));
      const give = []; for (let k = got; k < can && stones.length; k++) give.push(stones.splice(rand(stones.length), 1)[0]);
      give.forEach(s => Bag.add(s));
      Player.flags.megaGift = can;
      Audio2.playME('Item get');
      await say('배지에 대한 축하로 메가스톤을 주지: ' + give.map(itemName).join(', '), { speaker: '메가 연구가' });
    } else await say('배지를 더 모으면 또 메가스톤을 주겠네. 옆의 가게에서도 살 수 있다네.', { speaker: '메가 연구가' });
  },
  async megaShop(w) { await say('메가스톤 전문점이에요! 하나에 10000원이랍니다.', { speaker: '점원' }); await Game.open(new ShopScreen(MEGA_STONES)); },
  async fossil(w) {
    const have = Object.keys(FOSSILS).filter(f => Bag.count(f));
    await say(['여기는 화석 복원소. 고대 포켓몬을 되살리는 곳이야.'], { speaker: '화석 박사' });
    if (!have.length) { await say('화석을 찾으면 가져와! 각 도로에 묻혀 있을 거야.', { speaker: '화석 박사' }); return; }
    const k = await Game.open(new ListBox(have.map(itemName).concat(['그만두기']), { title: '복원할 화석' }));
    if (k < 0 || k >= have.length) return;
    const f = have[k], sp = FOSSILS[f];
    Bag.remove(f);
    await say('좋아, 복원을 시작하지... 위잉... 위이잉...', { speaker: '화석 박사' });
    const m = new Mon(sp, 30, { ot: Player.name }); m.ot = Player.name; m.metMap = '화석 복원';
    givePokemon(m); Audio2.playME('Pkmn get');
    await say(itemName(f) + '에서 ' + J.iga(SPECIES[sp].name) + ' 되살아났다!');
  },
  async zygardeLab(w) {
    const n = Player.flags.cells || 0;
    await say(['나는 지가르데 셀을 연구하고 있어.', '초록빛으로 빛나는 셀이 대륙 곳곳(5~9번도로, 시원의 길)에 흩어져 있대.', '지금 ' + n + '/10개를 모았구나!'], { speaker: '셀 연구원' });
    if (n >= 10 && !Flags.has('zyg_gift')) {
      await say('10개가 모였어! 셀들이 하나로 합쳐진다...!', { speaker: '셀 연구원' });
      const m = new Mon('ZYGARDE', 50, { ot: Player.name }); m.ot = Player.name; m.metMap = '셀 연구소';
      givePokemon(m); Flags.set('zyg_gift'); Audio2.playME('Pkmn get');
      await say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' 지가르데를 받았다!');
    }
  },
  async magmaGate(w) {
    if (Player.badges.length < 8) await say('챔피언로드는 배지 8개를 모은 트레이너만 지나갈 수 있습니다. (현재 ' + Player.badges.length + '개)', { speaker: '경비원' });
    else await say('지금 동쪽 "시원의 길"에서 균열단 사건이 일어나고 있어요! 대륙이 위험해요. 사건이 해결될 때까지 리그는 폐쇄입니다.', { speaker: '경비원' });
    await walkSteps(w.player, 'down', 1);
  },
  async zeros1(w) {
    const P = w.player;
    const boss = new Char({ id: 'zeros', x: P.x, y: P.y - 3, sprite: 'trainer_' + BOSS.sprite, dir: 'down', kind: 'npc', move: 'still' });
    if (!w.map.passable(boss.x, boss.y, 'down')) boss.y = P.y - 2;
    w.chars.push(boss);
    Audio2.playBGM('CYRUS');
    await emote(boss, '!');
    P.dir = 'up';
    await say(['...네가 우리 균열단의 일을 방해했다는 꼬마인가.', '나는 균열단의 보스, 제로스.', '이 대륙이 왜 바다 위로 떠올랐는지 아나? 대륙 중심에 잠든 "시원의 결정"이 깨어나고 있기 때문이다.', '결정이 완전히 깨어나면 시공의 균열이 열리고, 모든 시대의 전설이 이곳으로 쏟아져 들어온다.', '그 힘을 다스리는 것은 바로 나다. ...애송이는 북쪽 산에서 배지나 모으고 있어라.'], { speaker: VILLAIN + ' 보스 ' + BOSS.name });
    await walkSteps(boss, 'up', 3, 4);
    w.chars.splice(w.chars.indexOf(boss), 1);
    Flags.set('zeros1');
    Audio2.playBGM(w.def.bgm);
    await say('(균열단을 막으려면 체육관 배지를 모으며 대륙 깊숙이 나아가야 한다!)');
  },
  async terapagos(w, c) {
    Flags.set('origin_done');
    c.visible = false; c.gone = true;
    await Game.flash(3);
    Audio2.cry('TERAPAGOS');
    await say(['쿠구구구구...!!', '대지가 흔들리며 땅속에서 무지갯빛 결정이 솟아올랐다!', '시원의 결정... 테라파고스가 눈을 떴다!']);
    await say(['안 돼... 결정이 내 말을 듣지 않아... 으아악!'], { speaker: BOSS.name });
    await say('테라파고스가 폭주하고 있다! 진정시켜야 한다!');
    const mon = new Mon('TERAPAGOS', 60, { tera: 'STELLAR' });
    const r = await startBattle({ type: 'wild', foe: [mon], raid: 'tera', legend: true, bgm: 'B2W2 212 PWT Final Round!', legendText: '스텔라의 빛을 두른 테라파고스가 덤벼들었다!' });
    await say(['...빛이 잦아들었다.', r === 'caught' ? '테라파고스가 당신을 주인으로 인정했다!' : '테라파고스가 조용히 잠들었다. (시원의 길 결정 앞에서 다시 만날 수 있다)']);
    await say(['...내가 졌군. 결정은 지배하는 것이 아니었어. 함께 걷는 것이었다.', '균열단은 오늘로 해산한다. 챔피언로드로 가라, 꼬마. 너라면...'], { speaker: BOSS.name });
    await say('균열단 사건이 해결되었다! 이제 화산마을 북쪽 챔피언로드가 열렸다!');
    w.refreshEvents();
  },
  async terapagosAltar(w) {
    if (!(await yesNo('결정 속에서 테라파고스가 잠들어 있다. 깨우시겠습니까?'))) return;
    const r = await startBattle({ type: 'wild', foe: [new Mon('TERAPAGOS', 60, { tera: 'STELLAR' })], raid: 'tera', legend: true, bgm: 'B2W2 212 PWT Final Round!' });
    w.refreshEvents();
  },
  async rival3(w) {
    const P = w.player;
    const rival = new Char({ id: 'rival3', x: P.x, y: P.y - 3, sprite: 'trainer_COOLTRAINER_M', dir: 'down', kind: 'npc', move: 'still' });
    w.chars.push(rival); await emote(rival, '!'); P.dir = 'up';
    await walkSteps(rival, 'down', 2);
    await say(['여어, ' + Player.name + '! 균열단 녀석들과 싸우고 있다며?', '나도 녀석들을 몇 명 혼내 줬지. 그런데 말이야... 내 포켓몬, 메가진화도 할 수 있게 됐다고!', '어디 한번 붙어 보자!'], { speaker: RIVAL_NAME });
    const r = await startBattle({ type: 'trainer', foe: buildTeam(rivalTeam(25), 18), trainer: { name: RIVAL_NAME, cls: '라이벌', sprite: 'COOLTRAINER_M', money: 4000, afterBattle: '역시 너구나...!', gimmick: 'tera' }, bgm: 'XY Rival' });
    Flags.set('rival3');
    await say(['다음은 리그다. 거기선 절대 안 진다!'], { speaker: RIVAL_NAME });
    await walkSteps(rival, 'up', 4, 4);
    w.chars.splice(w.chars.indexOf(rival), 1);
  },
  async elite(w, c, i) {
    const E = ELITES[i];
    if (Flags.has('e4_' + i)) { await say('다음 사천왕이 기다리고 있다.', { speaker: E.name }); return; }
    if (i > 0 && !Flags.has('e4_' + (i - 1))) { await say('먼저 앞의 사천왕을 쓰러뜨리고 오너라.', { speaker: E.name }); return; }
    await say(E.before, { speaker: E.cls + ' ' + E.name });
    const r = await startBattle({ type: 'trainer', foe: buildTeam(E.team, 25), trainer: { name: E.name, cls: E.cls, sprite: E.sprite, money: 12000, leader: true, gimmick: E.gimmick, afterBattle: E.after }, bgm: 'XY Champion' });
    if (r === 'win') { Flags.set('e4_' + i); if (i === 3) await say('사천왕을 모두 쓰러뜨렸다! 챔피언이 기다린다!'); }
  },
  async champion(w, c) {
    if (Flags.has('champion')) { await say(['다음엔 내가 이길 거야, 챔피언님.', '또 붙자고!'], { speaker: RIVAL_NAME }); return; }
    if (![0, 1, 2, 3].every(i => Flags.has('e4_' + i))) { await say(['여기까지 왔구나, ' + Player.name + '.', '사천왕을 모두 이기고 와라. 기다리고 있을게.'], { speaker: '챔피언 ' + RIVAL_NAME }); return; }
    await say(['드디어 왔구나, ' + Player.name + '.', '균열단 사건, 들었어. 넌 정말... 대륙을 구했구나.', '하지만 여기선 봐주지 않아. 나는 아스테라 대륙 최초의 챔피언, 카이다!', '메가진화, 다이맥스, 테라스탈... 이 대륙의 모든 힘으로 덤벼라!'], { speaker: '챔피언 ' + RIVAL_NAME });
    const r = await startBattle({ type: 'trainer', foe: buildTeam(rivalTeam(4), 28), trainer: { name: RIVAL_NAME, cls: '챔피언', sprite: 'COOLTRAINER_M', money: 30000, leader: true, gimmick: 'dyna', afterBattle: '...내가 졌다. 네가 진짜 챔피언이야.' }, bgm: 'SM Champion' });
    if (r !== 'win') { [0, 1, 2, 3].forEach(i => delete Player.flags['e4_' + i]); return; }
    await say(['...후. 분하지만 인정할게.', '너랑 너의 포켓몬들, 정말 최고였어.', '자, 명예의 전당으로 가자.'], { speaker: RIVAL_NAME });
    Flags.set('champion');
    await hallOfFame();
    w.refreshEvents();
  },
  async riftGuide(w) {
    await say(['챔피언이 된 걸 축하해요! 저는 균열 관측원이에요.', '시원의 결정이 깨어난 뒤로, 대륙 곳곳에 "균열 지대"가 생겼어요.', '그곳엔 모든 시대의 전설과 환상의 포켓몬이 나타나요. 데려다 드릴까요?'], { speaker: '균열 관측원' });
    const list = RIFTS.map(r => r[1].replace('균열 지대: ', ''));
    const k = await Game.open(new ListBox(list.concat(['그만두기']), { title: '균열 지대' }));
    if (k < 0 || k >= RIFTS.length) return;
    const key = RIFTS[k][0];
    Player.riftReturn = { map: 'MEADOW', x: w.player.x, y: w.player.y };
    await Game.fade(1, 20); Audio2.se('warp.mp3');
    w.load(key, MAPS[key].spawn[0], MAPS[key].spawn[1], 'down');
    await Game.fade(0, 20);
    const here = LEGENDS.filter(l => l.map === key);
    await say('균열 지대 도착! 이곳의 전설: ' + here.map(l => (Flags.has('legend_' + l.id) ? '✓' : '') + SPECIES[l.sp].name).join(', '));   // ✓ = 여기서 잡은 전설
  },
  async riftReturn(w) {
    if (!(await yesNo('균열 포털이다. 환상의 풀숲으로 돌아가시겠습니까?'))) return;
    const r = Player.riftReturn || { map: 'MEADOW', x: 19, y: 9 };
    await Game.fade(1, 20); Audio2.se('warp.mp3');
    w.load(r.map, r.x, r.y + 1, 'down');
    await Game.fade(0, 20);
  },
  async tower(w) {
    await say(['배틀 타워에 어서 오게! 3대3 연승 도전이라네.', '상대는 모두 레벨 50 이상의 강자들. 연승할수록 상금이 커진다네!', '현재 최고 기록: ' + (Player.flags.towerBest || 0) + '연승'], { speaker: '타워 관리인' });
    if (!(await yesNo('도전하시겠습니까? (배틀 사이에 회복은 없습니다)'))) return;
    let streak = 0;
    const pool = SPECIES_LIST.filter(s => !isSpecial(s) && !SPECIES[s].evo.length && SPECIES[s].bs.reduce((a, b) => a + b, 0) >= 450);
    const classes = [['ACETRAINER_M', '엘리트트레이너'], ['ACETRAINER_F', '엘리트트레이너'], ['VETERAN', '베테랑'], ['GENTLEMAN', '신사'], ['BLACKBELT', '태권왕'], ['PSYCHIC_F', '초능력자'], ['COOLTRAINER_M', '엘리트트레이너'], ['BEAUTY', '아가씨']];
    while (true) {
      const [spr, cls] = pick(classes.filter(c => c[0] !== 'VETERAN'));
      const lv = 50 + Math.min(20, streak * 2);
      const team = [0, 1, 2].map(() => [pick(pool), lv]);
      const gm = pick([null, 'mega', 'dyna', 'tera']);
      const r = await startBattle({ type: 'trainer', foe: buildTeam(team, 25), trainer: { name: '도전자' + (streak + 1), cls, sprite: spr, money: 2000 * (streak + 1), gimmick: gm === 'mega' ? null : gm, afterBattle: '대단하군!' }, bgm: 'FRONTIER', canLose: true });
      if (r !== 'win') break;
      streak++;
      Player.flags.towerBest = Math.max(Player.flags.towerBest || 0, streak);
      if (!(await yesNo(streak + '연승 중! 계속 도전하시겠습니까?'))) break;
    }
    Player.party.forEach(m => m.heal());
    await say(['수고했네! 이번 기록: ' + streak + '연승.', '포켓몬들은 회복시켜 두었다네.'], { speaker: '타워 관리인' });
  },
});
// 박사: 이로치 부적
const _prof = SCRIPTS.professor;
SCRIPTS.professor = async function (w) {
  await _prof(w);
  const n = Object.keys(Player.caught).length;
  if (n >= 150 && !Bag.count('SHINYCHARM') && ITEMS.SHINYCHARM) {
    await say(['도감이 벌써 ' + n + '마리나...! 이건 내 감사의 선물이란다.'], { speaker: '한별 박사' });
    Bag.add('SHINYCHARM'); Audio2.playME('Key item get');
    await say(Player.name + J.eunneun(Player.name).slice(Player.name.length) + ' 빛나는부적을 받았다! (색이 다른 포켓몬을 만나기 쉬워진다)');
  }
};
// 오프닝 (신대륙 스토리)
introFlow = async function () {
  await Game.fade(1, 20);
  Player = newPlayer();
  Player.started = new Date().toLocaleDateString('ko-KR');
  const sc = new IntroScene(); Game.scene = sc;
  Audio2.playBGM('HGSS 158 National Park');
  await Game.fade(0, 20);
  const P = { speaker: '한별 박사' };
  await say(['안녕! 포켓몬스터의 세계에 온 것을 환영한다!', '나는 한별. "아스테라 대륙 탐사대"의 대장을 맡고 있는 포켓몬 박사란다.'], P);
  sc.show = 'mon'; Audio2.cry('EEVEE');
  await say(['반 년 전, 거대한 "시공의 균열"과 함께 바다 위로 새로운 대륙이 떠올랐어.', '그게 바로 이 아스테라 대륙이지.', '놀랍게도 이곳에는 관동부터 팔데아까지... 모든 지방, 모든 세대의 포켓몬이 함께 살고 있단다.', '심지어 전설로만 전해지던 포켓몬과 환상의 포켓몬까지 목격되고 있지.', '메가진화, 다이맥스, 테라스탈... 각 지방의 신비한 현상도 이 대륙에선 모두 일어난단다.'], P);
  sc.show = 'gender';
  const g = await ask('자, 너에 대해 알려 주겠니?\n너는 남자니? 여자니?', ['남자', '여자'], { speaker: '한별 박사', cancel: null });
  Player.gender = g === 1 ? 'F' : 'M';
  sc.show = 'player';
  await say('그래, 이름은 뭐라고 하니?', P);
  Player.name = await promptName('당신의 이름은?', Player.gender === 'F' ? '하나' : '레오', 7);
  await say([Player.name + '! 좋은 이름이구나!', '너는 탐사대 기지가 있는 "새벽마을"에 막 이사 왔지.', '이웃집 카이도 오늘 트레이너가 될 거란다. 둘은 좋은 라이벌이 되겠지.', '그런데 요즘, 대륙의 비밀을 노리는 "균열단"이라는 녀석들이 수상하게 움직이고 있어...', '자, ' + Player.name + '! 아무도 모르는 대륙에서 너만의 이야기가 시작된다!'], P);
  await Game.fade(1, 30);
  startWorld('HOME', 10, 6, 'down');
  await Game.fade(0, 30);
  await say('...!\n(오늘은 탐사대장 한별 박사님께 포켓몬을 받기로 한 날이다!)');
};

// ------------------------------------------------------------
// 타운맵 & 공중날기
// ------------------------------------------------------------
const MAP_NODES = {
  DAWN: [70, 330], R1: [70, 288], SPRAY: [70, 246], R2: [130, 246], FOREST: [190, 246], EMBER: [250, 246], R3: [250, 204], STAR: [250, 162],
  R5: [250, 122], PEAK: [250, 82], R6: [250, 46], FROST: [310, 36], R7: [370, 36], DUNE: [430, 46], R8: [430, 98], CORAL: [430, 150],
  R9: [430, 204], MAGMA: [430, 262], ORIGIN: [482, 262], R4: [370, 300], LEAGUE: [310, 336], MEADOW: [230, 336],
};
const TOWNS = ['DAWN', 'SPRAY', 'EMBER', 'STAR', 'PEAK', 'FROST', 'DUNE', 'CORAL', 'MAGMA', 'LEAGUE'];
const _load = World.prototype.load;
World.prototype.load = function (key, x, y, dir) { Player.visited = Player.visited || {}; Player.visited[key] = true; return _load.call(this, key, x, y, dir); };
function flySpot(key) {
  const d = MAPS[key];
  const pc = (d.stamps || []).find(s => s[0] === 'pc');
  if (pc) return [pc[1] + STAMPS.pc.door[0], pc[2] + STAMPS.pc.door[1] + 1];
  if (key === 'DAWN') return [5, 7];
  return [Math.floor(d.rows[0].length / 2), Math.floor(d.rows.length / 2)];
}
class TownMapScreen extends Win {
  constructor(fly) {
    super(); this.fly = fly;
    const cur = Game.world && (MAPS[Game.world.key] ? Game.world.key : (Player.returnPoint && Player.returnPoint.map));
    this.keys = Object.keys(MAP_NODES);
    this.i = Math.max(0, this.keys.indexOf(cur)); this.cur = cur;
  }
  update() {
    const n = this.keys.length;
    if (Input.rep('right') || Input.rep('down')) { this.i = (this.i + 1) % n; SE.cursor(); }
    if (Input.rep('left') || Input.rep('up')) { this.i = (this.i + n - 1) % n; SE.cursor(); }
    if (Input.trig('B')) { SE.cancel(); this.close(null); }
    if (Input.trig('A')) {
      const k = this.keys[this.i];
      if (this.fly && TOWNS.includes(k) && Player.visited && Player.visited[k]) { SE.ok(); this.close(k); }
      else SE.buzz();
    }
  }
  draw(ctx) {
    drawImg(ctx, 'Graphics/UI/Town Map/bg.png', 0, 0) || (ctx.fillStyle = '#244', ctx.fillRect(0, 0, 512, 384));
    ctx.fillStyle = 'rgba(10,40,90,0.55)'; ctx.fillRect(0, 0, 512, 384);
    // 바다/대륙 실루엣
    ctx.fillStyle = 'rgba(90,170,90,0.55)';
    ctx.beginPath(); ctx.ellipse(270, 190, 250, 175, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3;
    for (const k in MAP_NODES) for (const side in (MAPS[k].exits || {})) {
      const t = MAPS[k].exits[side].to; if (!MAP_NODES[t]) continue;
      ctx.beginPath(); ctx.moveTo(...MAP_NODES[k]); ctx.lineTo(...MAP_NODES[t]); ctx.stroke();
    }
    const vis = Player.visited || {};
    for (const k in MAP_NODES) {
      const [x, y] = MAP_NODES[k], town = TOWNS.includes(k);
      ctx.fillStyle = vis[k] ? (town ? '#f8d030' : '#f0f0f0') : '#707070';
      if (town) ctx.fillRect(x - 7, y - 7, 14, 14); else { ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); }
      if (k === this.cur && Math.floor(Game.tick / 15) % 2) drawImg(ctx, 'Graphics/UI/Town Map/player_POKEMONTRAINER_' + (Player.gender === 'F' ? 'Leaf' : 'Red') + '.png', 0, 0, 16, 16, x - 8, y - 22, 16, 16) || (ctx.fillStyle = '#f33', ctx.fillRect(x - 4, y - 18, 8, 8));
    }
    const k = this.keys[this.i], [x, y] = MAP_NODES[k];
    drawImg(ctx, 'Graphics/UI/Town Map/cursor.png', 0, 0, 32, 32, x - 16, y - 16, 32, 32) || (ctx.strokeStyle = '#f33', ctx.strokeRect(x - 12, y - 12, 24, 24));
    drawWindow(ctx, 4, 344, 504, 38, CHOICE_SKIN);
    const name = vis[k] ? MAPS[k].name : '???';
    text(ctx, (this.fly ? '[날아갈 마을 선택] ' : '') + name + (k === this.cur ? '  ◀ 현재 위치' : ''), 18, 352, { size: 20 });
    text(ctx, '아스테라 대륙', 492, 8, { size: 22, align: 'right', ...WHITE_TEXT });
  }
}
async function flyTo(key) {
  const w = Game.world;
  Audio2.se('Fly');
  await Game.fade(1, 20);
  const [x, y] = flySpot(key);
  w.load(key, x, y, 'down');
  await Game.fade(0, 20);
}
// 시작 메뉴에 지도/공중날기 추가
Object.defineProperty(StartMenu.prototype, 'items', {
  get() {
    const a = [];
    if (Flags.has('pokedex')) a.push(['포켓몬 도감', 'dex']);
    if (Player.party.length) a.push(['포켓몬', 'party']);
    a.push(['가방', 'bag'], ['지도', 'map']);
    if (Player.badges.length >= 3) a.push(['공중날기', 'fly']);
    a.push([Player.name, 'card'], ['저장', 'save'], ['설정', 'options'], ['닫기', 'close']);
    return a;
  }
});
const _smRun = StartMenu.prototype.run;
StartMenu.prototype.run = async function (k) {
  if (k === 'map') { await Game.open(new TownMapScreen(false)); return; }
  if (k === 'fly') {
    if (!Game.world || !Game.world.def.outdoor) { await say('여기서는 날 수 없다!'); return; }
    const dest = await Game.open(new TownMapScreen(true));
    if (dest) { this.close(); Game.world.busy = true; try { await flyTo(dest); } finally { Game.world.busy = false; } }
    return;
  }
  return _smRun.call(this, k);
};
