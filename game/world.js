// ============================================================
// world.js - 아스테라 지방: 맵 레이아웃, NPC, 트레이너, 스토리 이벤트
// ============================================================
'use strict';

// 범례: T 나무 / . 풀밭 / , 풀숲(야생) / = 흙길 / - 포장길 / ~ 바다 / f 꽃 / b 덤불 / R 바위 / p 꽃덤불 / s 표지판
// 행 길이가 짧으면 '.'로 채움. 너비는 가장 긴 행 기준.
function row(inner, side = 'TT') { return side + inner + side; }

const MAPS = {};

// ------------------------------------------------------------
// 새벽마을 (시작 마을)
// ------------------------------------------------------------
MAPS.DAWN = {
  name: '새벽마을', bgm: 'HGSS 104 New Bark Town', battleBg: 'field', outdoor: true,
  rows: [
    'TTTTTTTTTTT==TTTTTTTTTTT',
    'TTTTTTTTTTT==TTTTTTTTTTT',
    'TT.........==.........TT',
    'TT.........==.........TT',
    'TT.........==.........TT',
    'TT.........==.........TT',
    'TT.........==.........TT',
    'TT..===============...TT',
    'TT..===============...TT',
    'TT.....==s.......ff...TT',
    'TT.....==..........ff.TT',
    'TT.....==.............TT',
    'TT.....==.............TT',
    'TT.....==.............TT',
    'TTp....==.............TT',
    'TT.....=========......TT',
    'TT.....=========....b.TT',
    'TTff..................TT',
    '~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~',
  ],
  stamps: [['house_green', 3, 3, 'HOME'], ['house_blue', 15, 3, 'RIVAL_HOME'], ['lab', 10, 11, 'LAB']],
  exits: { north: { to: 'R1', dx: 0 } },
  signs: [{ x: 9, y: 9, text: '새벽마을\n새로운 모험이 시작되는 곳' }],
  npcs: [
    { id: 'dawn_girl', x: 6, y: 12, sprite: 'NPC 05', dir: 'down', move: 'wander', text: ['바다 냄새가 참 좋지?', '한별 박사님의 연구소는 마을 남쪽에 있어.'] },
    { id: 'dawn_boy', x: 19, y: 13, sprite: 'NPC 03', dir: 'left', move: 'look', text: ['포켓몬과 함께라면 어디든 갈 수 있대!'] },
  ],
  triggers: [
    { x: 11, y: 2, w: 2, h: 1, cond: () => !Flags.has('starter'), run: 'blockNoStarter' },
  ],
};

// ------------------------------------------------------------
// 1번도로
// ------------------------------------------------------------
MAPS.R1 = {
  name: '1번도로', bgm: 'HGSS 109 Route 29', battleBg: 'field', outdoor: true,
  rows: [
    'TTTTTTTTTTT==TTTTTTTTTTT',
    'TTTTTTTTTTT==TTTTTTTTTTT',
    'TT,,,,,,...==....,,,,,TT',
    'TT,,,,,,...==....,,,,,TT',
    'TT,,,,,,...==....,,,,,TT',
    'TT.........==.........TT',
    'TT...b.....==.....b...TT',
    'TTTTTTTT...==...TTTTTTTT',
    'TTTTTTTT...==...TTTTTTTT',
    'TT.........==.........TT',
    'TT..,,,,,,.==.,,,,,,..TT',
    'TT..,,,,,,.==.,,,,,,..TT',
    'TT..,,,,,,.==.,,,,,,..TT',
    'TT.........==.........TT',
    'TT.......s.==.........TT',
    'TTTTT......==......TTTTT',
    'TTTTT......==......TTTTT',
    'TT...,,,,,.==.....R...TT',
    'TT...,,,,,.==.........TT',
    'TT...,,,,,.==..ff.....TT',
    'TT.........==..ff.....TT',
    'TT.p.......==.........TT',
    'TTTTTTT....==....TTTTTTT',
    'TTTTTTT....==....TTTTTTT',
    'TT.........==.........TT',
    'TT,,,,,....==....,,,,,TT',
    'TT,,,,,....==....,,,,,TT',
    'TT,,,,,....==....,,,,,TT',
    'TT.........==.........TT',
    'TT...b.....==.....b...TT',
    'TT.........==.........TT',
    'TTTTTTTTTTT==TTTTTTTTTTT',
    'TTTTTTTTTTT==TTTTTTTTTTT',
  ],
  exits: { south: { to: 'DAWN', dx: 0 }, north: { to: 'SPRAY', dx: 6 } },
  signs: [{ x: 9, y: 14, text: '1번도로\n↑ 물보라시티   ↓ 새벽마을' }],
  encounters: { min: 2, max: 5, list: [['PIDGEY', 20], ['RATTATA', 20], ['SENTRET', 12], ['BIDOOF', 12], ['LILLIPUP', 10], ['YUNGOOS', 8], ['SKWOVET', 8], ['LECHONK', 6], ['FLETCHLING', 3], ['WOOLOO', 3]] },
  trainers: [
    { id: 'r1_youngster', x: 14, y: 18, sprite: 'YOUNGSTER', dir: 'left', sight: 4, cls: '반바지 꼬마', name: '민수', team: [['RATTATA', 4], ['PIDGEY', 4]], money: 60, before: '눈이 마주쳤다! 승부다!', after: '으앗, 졌다...' },
    { id: 'r1_lass', x: 5, y: 9, sprite: 'LASS', dir: 'right', sight: 4, cls: '짧은치마', name: '지은', team: [['LILLIPUP', 5]], money: 80, before: '내 귀여운 포켓몬을 봐!', after: '귀여움만으로는 안 되는구나.' },
  ],
  items: [{ id: 'r1_potion', x: 21, y: 20, item: 'POTION' }, { id: 'r1_ball', x: 2, y: 29, item: 'POKEBALL', n: 2 }],
};

// ------------------------------------------------------------
// 물보라시티 (체육관 1: 바위)
// ------------------------------------------------------------
MAPS.SPRAY = {
  name: '물보라시티', bgm: 'HGSS 113 Cherrygrove City', battleBg: 'field', outdoor: true,
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TT............................TT',
    'TT............................TT',
    'TT............................TT',
    'TT............................TT',
    'TT............................TT',
    'TT............................TT',
    'TT..------------------------..TT',
    'TT..------------------------..TT',
    'TT..--...........--.......--..TT',
    'TT..--...........--.......--..TT',
    'TT..--...........--.......------',
    'TT..--....ff.....--.......------',
    'TT..--...........--.......--..TT',
    'TT..--...........--...........TT',
    'TT..--...........--...........TT',
    'TT..--------------------......TT',
    'TT..--------------------......TT',
    'TT...............--..s........TT',
    'TTp..............--...........TT',
    '~~~~~~~~~~~~~...--...........fTT',
    '~~~~~~~~~~~~~...--..........ffTT',
    '~~~~~~~~~~~~~~..--............TT',
    '~~~~~~~~~~~~~~~TT--TTTTTTTTTTTTT',
    '~~~~~~~~~~~~~~~TT--TTTTTTTTTTTTT',
  ],
  signGround: '-',
  stamps: [['pc', 6, 3, 'PC'], ['mart', 13, 4, 'MART'], ['gym', 20, 2, 'GYM1'], ['house_small', 7, 12, 'SPRAY_HOUSE'], ['house_green', 21, 12, 'SPRAY_HOUSE2']],
  exits: { south: { to: 'R1', dx: -6 }, east: { to: 'R2', dy: -6 } },
  signs: [{ x: 21, y: 19, text: '물보라시티\n파도 소리가 들리는 항구 도시\n물보라 체육관 관장: 단단' }],
  npcs: [
    { id: 'spray_sailor', x: 12, y: 20, sprite: 'trainer_SAILOR', dir: 'down', move: 'look', text: ['바다 건너에는 아직 아무도 모르는 포켓몬이 산다더군.'] },
    { id: 'spray_girl', x: 26, y: 16, sprite: 'NPC 07', dir: 'left', move: 'wander', text: ['체육관 관장 단단 씨는 바위 타입 전문가야.', '물이나 풀 타입 기술이 잘 통한대!'] },
    { id: 'spray_oldman', x: 10, y: 9, sprite: 'NPC 10', dir: 'down', move: 'look', text: ['포켓몬 센터에서는 포켓몬을 무료로 회복시켜 준단다.', 'PC로 포켓몬을 맡길 수도 있지.'] },
  ],
};

// ------------------------------------------------------------
// 2번도로 (가로)
// ------------------------------------------------------------
MAPS.R2 = {
  name: '2번도로', bgm: 'KM_Route3', battleBg: 'fieldroute', outdoor: true,
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TT.....,,,,,,.....TTTT......,,,,,,....TT',
    'TT.....,,,,,,.....TTTT......,,,,,,....TT',
    'TT..b..,,,,,,..............~~~~,,,....TT',
    'TT.............,,,,,......~~~~~~......TT',
    '==================,,,,,==================',
    '==================,,,,,==================',
    'TT.....s.......,,,,,,.....~~~~~.......TT',
    'TT......................,.............TT',
    'TT..,,,,,,.......TTTT......,,,,,,,....TT',
    'TT..,,,,,,.......TTTT......,,,,,,,..p.TT',
    'TT..,,,,,,..R....TTTT......,,,,,,,....TT',
    'TT......................ff............TT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  exits: { west: { to: 'SPRAY', dy: 6 }, east: { to: 'FOREST', dy: 0 } },
  signs: [{ x: 7, y: 8, text: '2번도로\n← 물보라시티   → 초록숲' }],
  encounters: { min: 5, max: 9, list: [['CATERPIE', 12], ['WEEDLE', 12], ['NIDORANfE', 10], ['NIDORANmA', 10], ['PATRAT', 10], ['POOCHYENA', 10], ['ZIGZAGOON', 10], ['SHINX', 8], ['PIKACHU', 4], ['EEVEE', 2], ['RALTS', 3], ['STARLY', 9]] },
  trainers: [
    { id: 'r2_bug', x: 13, y: 3, sprite: 'BUGCATCHER', dir: 'down', sight: 4, cls: '곤충채집 소년', name: '준호', team: [['CATERPIE', 7], ['WEEDLE', 7], ['METAPOD', 8]], money: 90, before: '내 벌레 포켓몬 컬렉션을 보여주지!', after: '벌레들아, 수고했어...' },
    { id: 'r2_camper', x: 22, y: 9, sprite: 'CAMPER', dir: 'up', sight: 3, cls: '캠프보이', name: '태양', team: [['NIDORANmA', 8], ['ZIGZAGOON', 9]], money: 150, before: '캠핑 중에 심심했는데 잘 됐다!', after: '텐트로 돌아가야겠다.' },
    { id: 'r2_picnic', x: 31, y: 12, sprite: 'PICNICKER', dir: 'left', sight: 4, cls: '피크닉걸', name: '소라', team: [['NIDORANfE', 9], ['SHINX', 9]], money: 150, before: '도시락 먹기 전에 한 판!', after: '배가 고파서 진 거야!' },
  ],
  items: [{ id: 'r2_antidote', x: 3, y: 12, item: 'ANTIDOTE' }, { id: 'r2_super', x: 36, y: 2, item: 'SUPERPOTION' }, { id: 'r2_expshare', x: 23, y: 4, item: 'EXPSHARE' }],
};

// ------------------------------------------------------------
// 초록숲
// ------------------------------------------------------------
MAPS.FOREST = {
  name: '초록숲', bgm: 'KM_ViridianForest', battleBg: 'forest', outdoor: true,
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TT,,,,,,TT.......,,,,,,,,,,,TT',
    'TT,,,,,,TT.......,,,,,,,,,,,TT',
    'TT,,..,,TT..TTT..,,TTTTTT,,,TT',
    'TT,,..,,TT..TTT..,,TTTTTT,,,TT',
    '====..,,....TTT..,,TT..TT,,,TT',
    '====..,,....TTT..,,TT..TT,,,TT',
    'TT,,..,,TTTTTTT..,,TT..TT,,,TT',
    'TT,,..,,TTTTTTT..,,TT..TT,,,TT',
    'TT,,.....,,,,,,..,,,,..,,,,,TT',
    'TT,,.....,,,,,,..,,,,..,,,,,TT',
    'TTTTTT..TTTTTT,,TTTTTT..TTTTTT',
    'TTTTTT..TTTTTT,,TTTTTT..TTTTTT',
    'TT,,,,..,,,,TT,,TT,,,,..,,,,TT',
    'TT,,,,..,,,,TT,,TT,,,,..,,,,TT',
    'TT,,,,..,,,,TT,,,,,,,,..,,,,TT',
    'TT,,,,..,,,,TT,,,,,,,,..,,,,TT',
    'TT..TTTTTT,,TTTTTTTTTT..TT..TT',
    'TT..TTTTTT,,TTTTTTTTTT..TT..TT',
    'TT..,,,,,,,,,,,,,,,,,,......TT',
    'TT..,,,,,,,,,,,,,,,,,,......TT',
    'TT..TT,,TTTT..TTTT,,,,TT..====',
    'TT..TT,,TTTT..TTTT,,,,TT..====',
    'TT....,,....,,....,,,,TT....TT',
    'TT....,,....,,....,,,,TT....TT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  exits: { west: { to: 'R2', dy: 0 }, east: { to: 'EMBER', dy: -14 } },
  encounters: { min: 7, max: 12, list: [['CATERPIE', 10], ['METAPOD', 8], ['WEEDLE', 10], ['KAKUNA', 8], ['ODDISH', 8], ['PARAS', 7], ['VENONAT', 7], ['HOOTHOOT', 7], ['BUDEW', 6], ['SEWADDLE', 6], ['PIKACHU', 5], ['NYMBLE', 5], ['SKIDDO', 5], ['FOMANTIS', 4], ['PETILIL', 4]] },
  trainers: [
    { id: 'f_bug1', x: 10, y: 3, sprite: 'BUGCATCHER', dir: 'down', sight: 3, cls: '곤충채집 소년', name: '하늘', team: [['KAKUNA', 10], ['BEEDRILL', 12]], money: 120, before: '숲은 벌레 포켓몬의 천국이야!', after: '독침이 통하지 않다니!' },
    { id: 'f_ranger', x: 22, y: 10, sprite: 'POKEMONRANGER_F', dir: 'left', sight: 4, cls: '포켓몬레인저', name: '나래', team: [['ODDISH', 11], ['HOOTHOOT', 11], ['SKIDDO', 12]], money: 300, before: '숲을 지키는 것이 나의 임무!', after: '훌륭한 실력이네.' },
    { id: 'f_bug2', x: 6, y: 21, sprite: 'BUGCATCHER', dir: 'right', sight: 4, cls: '곤충채집 소년', name: '도윤', team: [['PARAS', 11], ['VENONAT', 12], ['NYMBLE', 12]], money: 130, before: '포켓몬 교환 말고 승부하자!', after: '끝까지 응원해줘서 고마워, 얘들아.' },
  ],
  items: [{ id: 'f_ball', x: 27, y: 2, item: 'GREATBALL', n: 2 }, { id: 'f_revive', x: 2, y: 24, item: 'REVIVE' }, { id: 'f_leaf', x: 22, y: 6, item: 'LEAFSTONE' }],
};

// ------------------------------------------------------------
// 불씨마을 (체육관 2: 물)
// ------------------------------------------------------------
MAPS.EMBER = {
  name: '불씨마을', bgm: 'HGSS 133 Azalea Town', battleBg: 'field', outdoor: true,
  rows: [
    'TTTTTTTTTTTTT==TTTTTTTTTTTTT',
    'TTTTTTTTTTTTT==TTTTTTTTTTTTT',
    'TT...........==...........TT',
    'TT...........==...........TT',
    'TT...........==...........TT',
    'TT...........==...........TT',
    'TT...........==...........TT',
    'TT...........==...........TT',
    '=================.........TT',
    '=================.........TT',
    'TT.....=========..........TT',
    'TT.....==.....============TT',
    'TT.....==.....============TT',
    'TT...s.==...............=.TT',
    'TT.....==...............=.TT',
    'TT.....==...............=.TT',
    'TT.....==.....ff........=.TT',
    'TTp....==...............=.TT',
    'TT.....===================TT',
    'TT.....===================TT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  stamps: [['pc', 3, 3, 'PC'], ['mart', 17, 4, 'MART'], ['gym', 16, 13, 'GYM2'], ['house_blue', 9, 13, 'EMBER_HOUSE']],
  exits: { west: { to: 'FOREST', dy: 14 }, north: { to: 'R3', dx: -2 } },
  triggers: [{ x: 1, y: 8, w: 3, h: 2, cond: () => Flags.has('rival1') && !Flags.has('rival2'), run: 'rival2' }],
  signs: [{ x: 5, y: 13, text: '불씨마을\n꺼지지 않는 열정의 마을\n불씨 체육관 관장: 해나' }],
  npcs: [
    { id: 'ember_man', x: 22, y: 8, sprite: 'NPC 12', dir: 'down', move: 'wander', text: ['이 마을 체육관 관장 해나는 물 타입을 써.', '전기나 풀 타입이 유리하겠지!'] },
    { id: 'ember_kid', x: 4, y: 15, sprite: 'NPC 14', dir: 'right', move: 'wander', text: ['진화의 돌을 쓰면 진화하는 포켓몬도 있대!', '가게에서 팔기도 해.'] },
  ],
};

// ------------------------------------------------------------
// 3번도로 (세로)
// ------------------------------------------------------------
MAPS.R3 = {
  name: '3번도로', bgm: 'HGSS 120 Route 30', battleBg: 'mountain', outdoor: true,
  rows: [
    'TTTTTTTTTTT==TTTTTTTTTTT',
    'TTTTTTTTTTT==TTTTTTTTTTT',
    'TT,,,,,....==....,,,,,TT',
    'TT,,,,,....==....,,,,,TT',
    'TT.....RR..==..RR.....TT',
    'TT.........==.........TT',
    'TT~~~~~....==....~~~~~TT',
    'TT~~~~~....==....~~~~~TT',
    'TT~~~~~,,,,==,,,,~~~~~TT',
    'TT.....,,,,==,,,,.....TT',
    'TT.....,,,,==,,,,.....TT',
    'TTTTT......==......TTTTT',
    'TTTTT......==......TTTTT',
    'TT,,,,,,...==...,,,,,,TT',
    'TT,,,,,,...==...,,,,,,TT',
    'TT,,,,,,...==...,,,,,,TT',
    'TT.....R...==...R.....TT',
    'TT.....s...==.........TT',
    'TTTTTTTT...==...TTTTTTTT',
    'TTTTTTTT...==...TTTTTTTT',
    'TT.,,,,,,,.==.,,,,,,,.TT',
    'TT.,,,,,,,.==.,,,,,,,.TT',
    'TT.,,,,,,,.==.,,,,,,,.TT',
    'TT.........==.........TT',
    'TT..b......==......b..TT',
    'TT.........==.........TT',
    'TTTTTTTTTTT==TTTTTTTTTTT',
    'TTTTTTTTTTT==TTTTTTTTTTT',
  ],
  exits: { south: { to: 'EMBER', dx: 2 }, north: { to: 'STAR', dx: 6 } },
  signs: [{ x: 7, y: 17, text: '3번도로\n↑ 별빛시티   ↓ 불씨마을' }],
  encounters: { min: 13, max: 19, list: [['GROWLITHE', 8], ['PONYTA', 8], ['VULPIX', 7], ['ABRA', 6], ['MACHOP', 8], ['GEODUDE', 8], ['MAREEP', 8], ['HOUNDOUR', 7], ['ROCKRUFF', 6], ['MAKUHITA', 6], ['ELECTRIKE', 6], ['SNUBBULL', 6], ['PAWMI', 5], ['TINKATINK', 4], ['DRATINI', 2], ['BAGON', 1], ['GIBLE', 1], ['DEINO', 1]] },
  trainers: [
    { id: 'r3_hiker', x: 9, y: 5, sprite: 'HIKER', dir: 'right', sight: 3, cls: '등산가', name: '우람', team: [['GEODUDE', 15], ['MACHOP', 15], ['GRAVELER', 17]], money: 400, before: '산길에서는 근력이 최고지!', after: '하하! 대단한 녀석이군!' },
    { id: 'r3_beauty', x: 16, y: 13, sprite: 'BEAUTY', dir: 'left', sight: 4, cls: '아가씨', name: '수아', team: [['VULPIX', 16], ['PONYTA', 17]], money: 600, before: '아름다운 포켓몬 승부를 보여줄게.', after: '패배조차 아름답네...' },
    { id: 'r3_black', x: 4, y: 21, sprite: 'BLACKBELT', dir: 'right', sight: 5, cls: '태권왕', name: '강철', team: [['MACHOP', 17], ['MAKUHITA', 17], ['MANKEY', 18]], money: 500, before: '하앗! 단련의 성과를 보여주마!', after: '수련이 부족했다...' },
    { id: 'r3_ace', x: 18, y: 23, sprite: 'ACETRAINER_M', dir: 'left', sight: 4, cls: '엘리트트레이너', name: '현우', team: [['MAREEP', 18], ['HOUNDOUR', 18], ['KIRLIA', 19]], money: 900, before: '리그를 목표로 한다면 날 넘어서 봐!', after: '좋은 승부였다. 리그에서 보자.' },
  ],
  items: [{ id: 'r3_thunder', x: 2, y: 2, item: 'THUNDERSTONE' }, { id: 'r3_hyper', x: 21, y: 21, item: 'HYPERPOTION' }, { id: 'r3_fire', x: 21, y: 2, item: 'FIRESTONE' }, { id: 'r3_water', x: 2, y: 16, item: 'WATERSTONE' }],
};

// ------------------------------------------------------------
// 별빛시티 (체육관 3: 에스퍼) + 리그로 가는 길
// ------------------------------------------------------------
MAPS.STAR = {
  name: '별빛시티', bgm: 'HGSS 141 Goldenrod City', battleBg: 'field', outdoor: true,
  rows: [
    'TTTTTTTTTTTTTTT==TTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTT==TTTTTTTTTTTTTTT',
    'TT.............--.............TT',
    'TT.............--.............TT',
    'TT.............--.............TT',
    'TT.............--.............TT',
    'TT.............--.............TT',
    'TT.............--.............TT',
    'TT..--------------------------TT',
    'TT..--------------------------TT',
    'TT..--...........--........--.TT',
    'TT..--...........--........--.TT',
    'TT..--...........--........--.TT',
    'TT..--...........--........--.TT',
    'TT..--...........--........--.TT',
    'TT..--...........--........--.TT',
    'TT..--------------------------TT',
    'TT..--------------------------TT',
    'TT.....ff....s...--...ff......TT',
    'TT...............--...........TT',
    'TT....b..........--.......b...TT',
    'TT...............--...........TT',
    'TTTTTTTTTTTTTTTTT--TTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTT--TTTTTTTTTTTTT',
  ],
  signGround: '.',
  stamps: [['pc', 4, 3, 'PC'], ['mart', 10, 4, 'MART'], ['gym', 20, 2, 'GYM3'], ['house_green', 7, 11, 'STAR_HOUSE'], ['house_small', 21, 11, 'STAR_HOUSE2']],
  exits: { south: { to: 'R3', dx: -6 }, north: { to: 'R4', dx: -4 } },
  signs: [{ x: 13, y: 18, text: '별빛시티\n별이 가장 가까운 도시\n↑ 챔피언로드' }],
  triggers: [{ x: 15, y: 2, w: 2, h: 1, cond: () => Player.badges.length < 3, run: 'leagueGuard' }],
  npcs: [
    { id: 'star_guard', x: 14, y: 2, sprite: 'trainer_POKEMONRANGER_M', dir: 'right', move: 'still', script: 'leagueGuard' },
    { id: 'star_woman', x: 9, y: 19, sprite: 'NPC 08', dir: 'down', move: 'wander', text: ['별빛 체육관 관장 루나는 에스퍼 타입의 달인이야.', '악이나 고스트, 벌레 타입이 효과가 좋아.'] },
    { id: 'star_gent', x: 26, y: 19, sprite: 'trainer_GENTLEMAN', dir: 'left', move: 'look', text: ['배지를 3개 모으면 챔피언로드로 갈 수 있다네.', '그 끝에 별빛 리그가 기다리고 있지.'] },
  ],
};

// ------------------------------------------------------------
// 챔피언로드
// ------------------------------------------------------------
MAPS.R4 = {
  name: '챔피언로드', bgm: 'HGSS 166 Route 38', battleBg: 'mountain', outdoor: true,
  rows: [
    'TTTTTTTTTTT==TTTTTTTTTTT',
    'TTTTTTTTTTT==TTTTTTTTTTT',
    'TT,,,,,,,,.==.,,,,,,,,TT',
    'TT,,,,,,,,.==.,,,,,,,,TT',
    'TT,,RR,,,,.==.,,,,RR,,TT',
    'TTTTTTTT,,.==.,,TTTTTTTT',
    'TTTTTTTT,,.==.,,TTTTTTTT',
    'TT,,,,,,,,.==.,,,,,,,,TT',
    'TT,,,,,,,,.==.,,,,,,,,TT',
    'TT,,TTTTTT.==.TTTTTT,,TT',
    'TT,,TTTTTT.==.TTTTTT,,TT',
    'TT,,,,,,,,.==.,,,,,,,,TT',
    'TT,,,,,,,,.==.,,,,,,,,TT',
    'TT~~~~~~,,.==.,,~~~~~~TT',
    'TT~~~~~~,,.==.,,~~~~~~TT',
    'TT,,,,,,,,.==.,,,,,,,,TT',
    'TT,,R,,,,,.==.,,,,,R,,TT',
    'TTTTTT,,,,.==.,,,,TTTTTT',
    'TTTTTT,,,,.==.,,,,TTTTTT',
    'TT,,,,,,,,.==.,,,,,,,,TT',
    'TT,,,,,,,,.==.,,,,,,,,TT',
    'TT.........==.........TT',
    'TT.........==.........TT',
    'TTTTTTTTTTT==TTTTTTTTTTT',
    'TTTTTTTTTTT==TTTTTTTTTTT',
  ],
  exits: { south: { to: 'STAR', dx: 4 }, north: { to: 'LEAGUE', dx: -3 } },
  encounters: { min: 30, max: 38, list: [['GRAVELER', 8], ['MACHOKE', 8], ['ONIX', 6], ['LAIRON', 6], ['GABITE', 4], ['GURDURR', 6], ['KADABRA', 5], ['SKARMORY', 5], ['ZWEILOUS', 3], ['HAKAMOO', 3], ['SHELGON', 3], ['DRAGONAIR', 3], ['FLAAFFY', 6], ['HOUNDOOM', 5], ['ARCANINE', 2], ['LUCARIO', 2], ['GARDEVOIR', 2], ['SNEASEL', 5], ['MISDREAVUS', 5], ['TOXEL', 4]] },
  trainers: [
    { id: 'r4_ace1', x: 9, y: 19, sprite: 'ACETRAINER_F', dir: 'right', sight: 4, cls: '엘리트트레이너', name: '서연', team: [['ROSELIA', 32], ['FLAAFFY', 32], ['ESPEON', 34]], money: 1800, before: '리그 도전자라면 이 정도는 이겨야지!', after: '당신이라면 챔피언도 될 수 있을지도.' },
    { id: 'r4_vet', x: 14, y: 12, sprite: 'COOLTRAINER_M', dir: 'left', sight: 4, cls: '엘리트트레이너', name: '진혁', team: [['MACHOKE', 33], ['HOUNDOOM', 33], ['GABITE', 35]], money: 1900, before: '여기까지 온 걸 칭찬하지. 하지만 여기까지다!', after: '...좋아, 지나가도 된다.' },
    { id: 'r4_psy', x: 9, y: 3, sprite: 'PSYCHIC_F', dir: 'down', sight: 3, cls: '초능력자', name: '미래', team: [['KADABRA', 34], ['GARDEVOIR', 35]], money: 1700, before: '당신이 올 것을 미리 보았어요.', after: '이 결과까지는 보지 못했네요...' },
  ],
  items: [{ id: 'r4_full', x: 2, y: 2, item: 'FULLRESTORE' }, { id: 'r4_ultra', x: 21, y: 2, item: 'ULTRABALL', n: 3 }, { id: 'r4_candy', x: 2, y: 11, item: 'RARECANDY' }, { id: 'r4_max', x: 21, y: 15, item: 'MAXREVIVE' }],
};

// ------------------------------------------------------------
// 별빛 리그
// ------------------------------------------------------------
MAPS.LEAGUE = {
  name: '별빛 리그', bgm: 'HGSS 201 Route 26', battleBg: 'field', outdoor: true,
  rows: [
    'TTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTT',
    'TT...............fTT',
    'TT................TT',
    'TT................TT',
    'TT................TT',
    'TT................TT',
    'TT................TT',
    'TT.......--.......TT',
    '========---------.TT',
    '========---------.TT',
    'TT.......--.......TT',
    'TT.......--.......TT',
    'TTp......--......pTT',
    'TTTTTTTT--TTTTTTTTTT',
    'TTTTTTTT--TTTTTTTTTT',
  ],
  stamps: [['league', 6, 1, 'CHAMPION'], ['pc', 13, 3, 'PC']],
  exits: { south: { to: 'R4', dx: 3 }, west: { to: 'MEADOW', dy: -1 } },
  npcs: [
    { id: 'league_guard', x: 0, y: 9, sprite: 'trainer_POKEMONRANGER_F', dir: 'right', move: 'still', cond: () => !Flags.has('champion'), text: ['이 너머는 환상의 풀숲.', '챔피언만이 들어갈 수 있는 곳이에요.'] },
    { id: 'league_guard2', x: 0, y: 10, sprite: 'trainer_POKEMONRANGER_F', dir: 'right', move: 'still', cond: () => !Flags.has('champion'), text: ['챔피언이 되면 다시 오세요!'] },
  ],
};

// ------------------------------------------------------------
// 환상의 풀숲 (엔딩 후: 전국의 모든 포켓몬이 출현)
// ------------------------------------------------------------
MAPS.MEADOW = {
  name: '환상의 풀숲', bgm: 'The Fairy\'s Forest', battleBg: 'flowery', outdoor: true,
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TT,,,,,,,,,,ff,,,,,,,,,,,,,,TT',
    'TT,,,,,,,,,,,,,,,,,,,ff,,,,,TT',
    'TT,,ff,,,,,,,,,,,,,,,,,,,,,,TT',
    'TT,,,,,,,,,,,,,,,,,,,,,,,,,,TT',
    'TT,,,,,,,,,..........,,,,,,,TT',
    'TT,,,,,,,,,.........s.,,,,,,TT',
    'TT,,,,,,,,,............=======',
    'TT,,,,,,,,,............=======',
    'TT,,,,,,,,,..........,,,,,,,TT',
    'TT,,,,,,,,,..........,,,,,,,TT',
    'TT,,,,,,ff,,,,,,,,,,,,,,,,,,TT',
    'TT,,,,,,,,,,,,,,,,,,,,,,ff,,TT',
    'TT,,,,,,,,,,,,,,,,,,,,,,,,,,TT',
    'TT,,,,,,,,,,,,,,,,,,,,,,,,,,TT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  exits: { east: { to: 'LEAGUE', dy: 1 } },
  signs: [{ x: 20, y: 7, text: '환상의 풀숲\n아스테라 밖의 모든 포켓몬이\n이곳에 모여든다고 한다...' }],
  encounters: { min: 40, max: 60, any: true },
};

// ------------------------------------------------------------
// 실내 맵 (어나더레드 범용 실내 템플릿 사용)
// ------------------------------------------------------------
const INTERIOR_DEFS = {
  HOME: { tmpl: 'house1', name: '우리 집', bgm: 'HGSS 104 New Bark Town', exit: [9, 11],
    npcs: [{ id: 'mom', x: 11, y: 7, sprite: 'NPC_MidageWoman', dir: 'down', move: 'look', script: 'mom' }] },
  RIVAL_HOME: { tmpl: 'house2', name: '카이의 집', bgm: 'HGSS 104 New Bark Town', exit: [9, 11],
    npcs: [{ id: 'rival_mom', x: 7, y: 6, sprite: 'NPC 06', dir: 'right', move: 'look', text: ['카이는 벌써 연구소에 갔단다.', '어릴 때부터 둘은 늘 경쟁했지. 후후.'] }] },
  LAB: { tmpl: 'lab', name: '한별 연구소', bgm: 'HGSS 158 National Park', exit: [6, 13],
    npcs: [
      { id: 'prof', x: 9, y: 6, sprite: 'trainer_SCIENTIST', dir: 'down', move: 'look', script: 'professor' },
      { id: 'lab_rival', x: 7, y: 6, sprite: 'trainer_COOLTRAINER_M', dir: 'down', move: 'look', cond: () => !Flags.has('rival1'), script: 'labRival' },
      { id: 'lab_aide', x: 3, y: 10, sprite: 'trainer_SCIENTIST', dir: 'right', move: 'look', text: ['박사님은 아스테라 지방 포켓몬의 생태를 연구하셔.', '도감을 완성하면 박사님이 정말 기뻐하실 거야!'] },
      { id: 'ball_1', x: 8, y: 4, sprite: 'Object ball', dir: 'down', move: 'still', cond: () => !Flags.has('starter'), script: 'starterBall', arg: 0 },
      { id: 'ball_2', x: 9, y: 4, sprite: 'Object ball', dir: 'down', move: 'still', cond: () => !Flags.has('starter'), script: 'starterBall', arg: 1 },
      { id: 'ball_3', x: 10, y: 4, sprite: 'Object ball', dir: 'down', move: 'still', cond: () => !Flags.has('starter'), script: 'starterBall', arg: 2 },
    ] },
  PC: { tmpl: 'pc', name: '포켓몬센터', bgm: null, exit: [7, 9], shared: true,
    npcs: [
      { id: 'nurse', x: 7, y: 2, sprite: 'NPC 16', dir: 'down', move: 'still', script: 'nurse' },
      { id: 'pc_box', x: 11, y: 1, sprite: '', dir: 'down', move: 'still', script: 'pcBox' },
      { id: 'pc_girl', x: 9, y: 6, sprite: 'trainer_AROMALADY', dir: 'down', move: 'wander', text: ['기술은 사용할수록 PP가 줄어들어.', '센터에서 쉬면 PP도 모두 회복된단다!'] },
    ] },
  MART: { tmpl: 'mart', name: '프렌들리숍', bgm: null, exit: [4, 8], shared: true,
    npcs: [{ id: 'clerk', x: 2, y: 3, sprite: 'NPC 19', dir: 'right', move: 'still', script: 'shop' }] },
  SPRAY_HOUSE: { tmpl: 'house1', name: '민가', bgm: null, exit: [9, 11],
    npcs: [{ id: 'sh_man', x: 11, y: 7, sprite: 'trainer_FISHERMAN', dir: 'down', move: 'look', script: 'giftEevee' }] },
  SPRAY_HOUSE2: { tmpl: 'house2', name: '민가', bgm: null, exit: [9, 11],
    npcs: [{ id: 'sh2_girl', x: 7, y: 6, sprite: 'NPC 11', dir: 'right', move: 'look', script: 'moveTutorHeal' }] },
  EMBER_HOUSE: { tmpl: 'house1', name: '민가', bgm: null, exit: [9, 11],
    npcs: [{ id: 'eh_breeder', x: 11, y: 7, sprite: 'trainer_POKEMONBREEDER', dir: 'down', move: 'look', script: 'nameRater' }] },
  STAR_HOUSE: { tmpl: 'house2', name: '민가', bgm: null, exit: [9, 11],
    npcs: [{ id: 'stah_sci', x: 7, y: 6, sprite: 'trainer_SCIENTIST', dir: 'right', move: 'look', script: 'fossilGift' }] },
  STAR_HOUSE2: { tmpl: 'house1', name: '민가', bgm: null, exit: [9, 11],
    npcs: [{ id: 'stah2_lady', x: 11, y: 7, sprite: 'trainer_LADY', dir: 'down', move: 'look', script: 'dexRating' }] },
  GYM1: { tmpl: 'gym1', name: '물보라 체육관', bgm: 'HGSS 162 Burned Tower', battleBg: 'gym', exit: [10, 11],
    npcs: [
      { id: 'gym1_leader', x: 10, y: 5, sprite: 'trainer_HIKER', dir: 'down', move: 'still', script: 'gymLeader', arg: 0 },
      { id: 'gym1_guide', x: 9, y: 8, sprite: 'NPC 15', dir: 'down', move: 'look', text: ['어서 와, 도전자!', '단단 관장은 바위 타입! 물이나 풀 타입 기술을 노려!'] },
    ],
    trainers: [{ id: 'gym1_t1', x: 11, y: 7, sprite: 'CAMPER', dir: 'left', sight: 3, cls: '캠프보이', name: '바위', team: [['GEODUDE', 10], ['ROLYCOLY', 10]], money: 200, before: '관장님께 가려면 날 먼저 이겨라!', after: '관장님은 나보다 훨씬 강해!' }] },
  GYM2: { tmpl: 'gym_ice', name: '불씨 체육관', bgm: 'HGSS 179 Ice Path', battleBg: 'icegym', exit: [5, 19],
    npcs: [
      { id: 'gym2_leader', x: 5, y: 5, sprite: 'trainer_SWIMMER_F', dir: 'down', move: 'still', script: 'gymLeader', arg: 1 },
      { id: 'gym2_guide', x: 4, y: 17, sprite: 'NPC 15', dir: 'right', move: 'still', text: ['해나 관장은 물 타입 전문가!', '전기나 풀 타입으로 맞서 봐!'] },
    ],
    trainers: [{ id: 'gym2_t1', x: 6, y: 12, sprite: 'SWIMMER_M', dir: 'left', sight: 2, cls: '수영팬티 소년', name: '파도', team: [['PSYDUCK', 17], ['WOOPER', 17]], money: 350, before: '물살을 가르고 왔다!', after: '꼬르륵...' },
      { id: 'gym2_t2', x: 4, y: 8, sprite: 'SWIMMER_F', dir: 'right', sight: 2, cls: '비키니 아가씨', name: '이슬', team: [['GOLDEEN', 18], ['SHELLOS', 18]], money: 360, before: '관장님께 가기 전에 나랑 놀자!', after: '물이 차갑네...' }] },
  GYM3: { tmpl: 'gym3', name: '별빛 체육관', bgm: 'HGSS 184 Bell Tower', battleBg: 'elecgym', exit: [33, 13],
    npcs: [
      { id: 'gym3_leader', x: 5, y: 5, sprite: 'trainer_PSYCHIC_F', dir: 'down', move: 'still', script: 'gymLeader', arg: 2 },
      { id: 'gym3_guide', x: 34, y: 11, sprite: 'NPC 15', dir: 'down', move: 'look', text: ['별빛 체육관에 온 걸 환영해!', '루나 관장은 에스퍼 타입. 악, 고스트, 벌레 타입이 효과 굉장!'] },
    ],
    trainers: [
      { id: 'gym3_t1', x: 23, y: 5, sprite: 'PSYCHIC_M', dir: 'left', sight: 4, cls: '초능력자', name: '선우', team: [['ABRA', 24], ['DROWZEE', 25]], money: 600, before: '너의 생각이 다 보인다!', after: '이건 예지하지 못했어...' },
      { id: 'gym3_t2', x: 13, y: 5, sprite: 'PSYCHIC_F', dir: 'left', sight: 4, cls: '초능력자', name: '다솜', team: [['RALTS', 25], ['NATU', 25], ['SPOINK', 26]], money: 600, before: '관장님께는 못 가!', after: '관장님은 나보다 몇 배는 강해.' },
    ] },
  CHAMPION: { tmpl: 'hall', name: '챔피언의 방', bgm: 'HGSS 184 Bell Tower', battleBg: 'champion', exit: [15, 20], exitAlt: [[16, 20]],
    npcs: [{ id: 'champ_rival', x: 15, y: 6, sprite: 'trainer_COOLTRAINER_M', dir: 'down', move: 'still', script: 'champion' },
      { id: 'champ_guide', x: 13, y: 18, sprite: 'NPC 15', dir: 'right', move: 'still', text: ['여기는 별빛 리그 챔피언의 방.', '준비가 되었다면 앞으로 나아가세요!'] }] },
};

// ------------------------------------------------------------
// 체육관 관장 / 라이벌 / 챔피언 데이터
// ------------------------------------------------------------
const GYM_LEADERS = [
  { name: '단단', cls: '체육관 관장', sprite: 'HIKER', badge: '바위 배지', bgm: 'HGSS 143 Battle! (Gym Leader Johto)', money: 1500,
    team: [['GEODUDE', 12], ['ROLYCOLY', 12], ['ONIX', 14]], reward: 'SUPERPOTION', rewardN: 3,
    before: '어서 와라! 나는 물보라 체육관 관장 단단!\n바위처럼 단단한 내 포켓몬을 부술 수 있겠나?', after: '크윽... 내 바위가 부서지다니!\n이 바위 배지를 받아라!' },
  { name: '해나', cls: '체육관 관장', sprite: 'SWIMMER_F', badge: '물결 배지', bgm: 'HGSS 143 Battle! (Gym Leader Johto)', money: 2500,
    team: [['STARYU', 19], ['MARILL', 20], ['FLOATZEL', 22]], reward: 'HYPERPOTION', rewardN: 3,
    before: '반가워요, 도전자님. 저는 해나.\n잔잔한 물결이 얼마나 깊은지 보여드릴게요.', after: '당신의 열정이 제 물결을 넘었네요.\n물결 배지를 드릴게요.' },
  { name: '루나', cls: '체육관 관장', sprite: 'PSYCHIC_F', badge: '별빛 배지', bgm: 'HGSS 143 Battle! (Gym Leader Johto)', money: 4000,
    team: [['KADABRA', 28], ['KIRLIA', 28], ['MEDICHAM', 29], ['ESPEON', 31]], reward: 'ULTRABALL', rewardN: 5,
    before: '...당신이 올 것을 별이 알려주었어요.\n제 이름은 루나. 미래를 바꿔 보세요.', after: '별이 당신의 승리를 빛내고 있군요.\n별빛 배지를 받으세요.' },
];
// 라이벌 팀: 플레이어 스타터에 상성이 좋은 스타터를 사용
const STARTERS = ['BULBASAUR', 'CHARMANDER', 'SQUIRTLE'];
const RIVAL_COUNTER = { BULBASAUR: 'CHARMANDER', CHARMANDER: 'SQUIRTLE', SQUIRTLE: 'BULBASAUR' };
const RIVAL_EVO = { BULBASAUR: ['IVYSAUR', 'VENUSAUR'], CHARMANDER: ['CHARMELEON', 'CHARIZARD'], SQUIRTLE: ['WARTORTLE', 'BLASTOISE'] };
function rivalTeam(stage) {
  const s = RIVAL_COUNTER[Flags.get('starterId') || 'BULBASAUR'];
  if (stage === 1) return [[s, 5]];
  if (stage === 2) return [['PIDGEOTTO', 16], ['EEVEE', 15], [RIVAL_EVO[s][0], 18]];
  return [['PIDGEOT', 40], ['UMBREON', 40], ['LUCARIO', 41], ['GARCHOMP', 42], ['GYARADOS', 41], [RIVAL_EVO[s][1], 44]];
}
const RIVAL_NAME = '카이';

// 상점 목록 (배지 수에 따라 늘어남)
function shopStock() {
  const b = Player.badges.length;
  const s = ['POKEBALL', 'POTION', 'ANTIDOTE', 'PARALYZEHEAL', 'AWAKENING', 'BURNHEAL', 'ICEHEAL', 'ESCAPEROPE', 'REPEL'];
  if (b >= 1) s.push('GREATBALL', 'SUPERPOTION', 'SUPERREPEL', 'FULLHEAL');
  if (b >= 2) s.push('HYPERPOTION', 'REVIVE', 'FIRESTONE', 'WATERSTONE', 'THUNDERSTONE', 'LEAFSTONE', 'MOONSTONE');
  if (b >= 3) s.push('ULTRABALL', 'MAXPOTION', 'FULLRESTORE', 'MAXREPEL', 'SUNSTONE', 'SHINYSTONE', 'DUSKSTONE', 'DAWNSTONE', 'ICESTONE');
  return s.filter(i => ITEMS[i]);
}
