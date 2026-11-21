// ============================================================
// ko_misc.js - 특성/도구 한국어 + 실제 적용 (ko.js, ko_moves.js 다음에 불러옴)
// ============================================================
'use strict';

// ── 특성: [이름(바꿀 때만), 설명] ──
const KO_ABILITIES = {
  SNOWWARNING: [null, '등장했을 때 눈을 내리게 한다.'],
  PROTEAN: [null, '자신이 쓰는 기술과 같은 타입으로 바뀐다. 등장할 때마다 한 번만.'],
  BATTLEBOND: [null, '상대를 쓰러뜨리면 트레이너와의 유대가 깊어져 공격, 특수공격, 스피드가 올라간다.'],
  INTREPIDSWORD: [null, '등장했을 때 공격이 올라간다.'],
  DAUNTLESSSHIELD: [null, '등장했을 때 방어가 올라간다.'],
  LIBERO: [null, '자신이 쓰는 기술과 같은 타입으로 바뀐다. 등장할 때마다 한 번만.'],
  ANGERSHELL: ['분노의껍질', 'HP가 절반 이하가 되면 화가 나서 방어 계열이 떨어지고 공격 계열과 스피드가 올라간다.'],
  ARMORTAIL: ['테일아머', '꼬리로 몸을 지켜 상대의 선제 기술을 받지 않는다.'],
  BEADSOFRUIN: ['재앙의구슬', '재앙의 구슬의 힘으로 자신 이외 모든 포켓몬의 특수방어를 떨어뜨린다.'],
  COMMANDER: ['사령탑', '어써러셔가 동료일 때 그 입 안에 들어가 지휘한다.'],
  COSTAR: ['공연', '등장했을 때 동료의 능력 변화를 복사한다.'],
  CUDCHEW: ['되새김질', '나무열매를 먹으면 다음 턴 끝에 한 번 더 먹는다.'],
  EARTHEATER: ['흙먹기', '땅 타입 기술을 받으면 데미지 대신 HP를 회복한다.'],
  ELECTROMORPHOSIS: ['전기로바꾸기', '데미지를 받으면 충전 상태가 된다.'],
  GOODASGOLD: ['황금몸', '녹슬지 않는 황금의 몸이라 변화 기술을 받지 않는다.'],
  GUARDDOG: ['파수견', '위협을 받으면 오히려 공격이 올라간다. 교체시키는 기술을 받지 않는다.'],
  HADRONENGINE: ['하드론엔진', '등장했을 때 일렉트릭필드를 펼친다. 일렉트릭필드에서는 특수공격이 올라간다.'],
  LINGERINGAROMA: [null, '접촉한 상대의 특성을 가시지않는향기로 바꾼다.'],
  MYCELIUMMIGHT: ['균사의힘', '변화 기술이 반드시 늦게 나가지만 상대의 특성에 방해받지 않는다.'],
  OPPORTUNIST: ['편승', '상대의 능력이 올라가면 자신도 똑같이 올린다.'],
  ORICHALCUMPULSE: ['진홍빛고동', '등장했을 때 쾌청으로 만든다. 쾌청에서는 공격이 올라간다.'],
  PROTOSYNTHESIS: ['고대활성', '부스트에너지를 갖고 있거나 쾌청일 때 가장 높은 능력이 올라간다.'],
  PURIFYINGSALT: ['정화의소금', '깨끗한 소금으로 상태 이상이 되지 않는다. 고스트 타입 기술의 데미지가 절반이 된다.'],
  QUARKDRIVE: ['쿼크차지', '부스트에너지를 갖고 있거나 일렉트릭필드일 때 가장 높은 능력이 올라간다.'],
  ROCKYPAYLOAD: ['바위나르기', '바위 타입 기술의 위력이 올라간다.'],
  SEEDSOWER: ['넘치는씨', '공격을 받으면 그래스필드를 펼친다.'],
  SHARPNESS: ['예리함', '베는 기술의 위력이 올라간다.'],
  SUPREMEOVERLORD: ['총대장', '쓰러진 동료가 많을수록 공격과 특수공격이 조금씩 올라간다.'],
  SWORDOFRUIN: ['재앙의검', '재앙의 검의 힘으로 자신 이외 모든 포켓몬의 방어를 떨어뜨린다.'],
  TABLETSOFRUIN: ['재앙의목간', '재앙의 목간의 힘으로 자신 이외 모든 포켓몬의 공격을 떨어뜨린다.'],
  THERMALEXCHANGE: ['열교환', '불꽃 타입 기술을 받으면 공격이 올라간다. 화상이 되지 않는다.'],
  TOXICDEBRIS: ['독치장', '물리 기술을 받으면 상대 발밑에 독압정을 깐다.'],
  VESSELOFRUIN: ['재앙의그릇', '재앙의 그릇의 힘으로 자신 이외 모든 포켓몬의 특수공격을 떨어뜨린다.'],
  WELLBAKEDBODY: ['노릇노릇바디', '불꽃 타입 기술을 받으면 데미지 대신 방어가 크게 올라간다.'],
  WINDPOWER: ['풍력발전', '바람 기술을 받으면 충전 상태가 된다.'],
  WINDRIDER: ['바람타기', '순풍이 불거나 바람 기술을 받으면 데미지 대신 공격이 올라간다.'],
  ZEROTOHERO: ['마이티체인지', '교체되면 마이티폼으로 변한다.'],
  SUPERSWEETSYRUP: ['감미로운꿀', '처음 등장했을 때 달콤한 꿀 향기로 상대의 회피율을 떨어뜨린다.'],
  HOSPITALITY: ['대접', '등장했을 때 동료를 대접해 HP를 조금 회복시킨다.'],
  TOXICCHAIN: ['독사슬', '독사슬의 힘으로 공격한 상대를 맹독으로 만들 때가 있다.'],
  MINDSEYE: ['심안', '고스트 타입에게 노말·격투 기술을 맞힐 수 있고 명중률이 떨어지지 않는다.'],
  EMBODYASPECT: ['면영활성', '마음속 추억이 떠올라 가면이 빛나며 능력이 올라간다.'],
  EMBODYASPECT_1: ['면영활성', '마음속 추억이 떠올라 우물의가면이 빛나며 특수방어가 올라간다.'],
  EMBODYASPECT_2: ['면영활성', '마음속 추억이 떠올라 화덕의가면이 빛나며 공격이 올라간다.'],
  EMBODYASPECT_3: ['면영활성', '마음속 추억이 떠올라 주춧돌의가면이 빛나며 방어가 올라간다.'],
  POISONPUPPETEER: ['독조종', '이 포켓몬의 기술로 독이 된 상대는 혼란에도 빠진다.'],
  TERASHIFT: ['테라체인지', '등장했을 때 주변의 에너지를 흡수해 테라스탈폼이 된다.'],
  TERASHELL: ['테라셸', '모든 타입의 힘을 담은 등딱지. HP가 가득하면 모든 기술의 효과가 별로다.'],
  TERAFORMZERO: ['제로포밍', '스텔라폼이 되면 날씨와 필드의 영향을 모두 없앤다.']
};
KO_ABILITIES.LINGERINGAROMA[0] = '가시지않는향기';

// ── 도구: [이름(바꿀 때만), 설명] ──
const TERA_KO = { NORMAL: '노말', FIRE: '불꽃', WATER: '물', ELECTRIC: '전기', GRASS: '풀', ICE: '얼음', FIGHTING: '격투', POISON: '독', GROUND: '땅', FLYING: '비행', PSYCHIC: '에스퍼', BUG: '벌레', ROCK: '바위', GHOST: '고스트', DRAGON: '드래곤', DARK: '악', STEEL: '강철', FAIRY: '페어리', STELLAR: '스텔라' };
const MAIL_KO = { GRASS: '그래스', FLAME: '플레임', BUBBLE: '버블', BLOOM: '블룸', TUNNEL: '터널', STEEL: '스틸', HEART: '하트', SNOW: '스노', SPACE: '스페이스', AIR: '에어', MOSAIC: '모자이크', BRICK: '브릭' };
const KO_ITEMS = {
  DUBIOUSDISC: [null, '수상한 데이터가 담긴 투명한 디스크. 폴리곤2에게 지니게 하고 교환하면 진화한다.'],
  HM02: [null, '하늘을 날아 가 본 적 있는 마을로 이동할 수 있다.'],
  HM04: [null, '무거운 바위를 밀어 움직일 수 있다.'],
  HM06: [null, '깨질 것 같은 바위를 부술 수 있다.'],
  BLACKAUGURITE: ['검은휘석', '검고 반짝이는 돌. 스라크에게 쓰면 사마자르로 진화한다.'],
  PEATBLOCK: ['피트블록', '습지의 흙을 굳힌 덩어리. 보름달 밤에 링곰에게 쓰면 진화한다.'],
  ADAMANTCRYSTAL: ['큰금강옥', '디아루가에게 지니게 하면 오리진폼이 된다.'],
  LUSTROUSGLOBE: ['큰백옥', '펄기아에게 지니게 하면 오리진폼이 된다.'],
  LEGENDPLATE: ['레전드플레이트', '모든 타입의 힘이 담긴 석판.'],
  BLANKPLATE: ['무지플레이트', '아무 무늬도 없는 석판. 노말 타입 기술의 위력이 올라간다.'],
  HOPOBERRY: ['호포열매', '기술 하나의 PP를 회복하는 나무열매.'],
  GRISEOUSCORE: ['큰백금옥', '기라티나에게 지니게 하면 오리진폼이 된다.'],
  HISUIANPOKEBALL: [null, '옛날에 쓰던 몬스터볼.'],
  HISUIANGREATBALL: [null, '옛날에 쓰던 수퍼볼. 몬스터볼보다 잡기 쉽다.'],
  HISUIANULTRABALL: [null, '옛날에 쓰던 하이퍼볼. 수퍼볼보다 잡기 쉽다.'],
  FEATHERBALL: ['페더볼', '멀리 날아가는 볼. 하늘을 나는 포켓몬을 잡기 좋다.'],
  WINGBALL: ['윙볼', '페더볼보다 더 멀리 날아가는 볼.'],
  JETBALL: ['제트볼', '아주 멀리 날아가는 볼.'],
  HISUIANHEAVYBALL: [null, '옛날에 쓰던 무거운 볼. 멀리 날아가지 않지만 잡기 쉽다.'],
  LEADENBALL: ['레든볼', '헤비볼보다 무거운 볼.'],
  GIGATONBALL: ['기가톤볼', '아주 무거운 볼. 잡기 무척 쉽다.'],
  ORIGINBALL: ['오리진볼', '디아루가와 펄기아를 잡기 위한 특별한 볼.'],
  STRANGEBALL: ['스트레인지볼', '어디서 왔는지 모르는 이상한 볼.'],
  AUSPICIOUSARMOR: ['축복의갑옷', '좋은 기운이 깃든 갑옷. 카르본에게 쓰면 카디나르마로 진화한다.'],
  MALICIOUSARMOR: ['저주의갑옷', '원념이 깃든 갑옷. 카르본에게 쓰면 파라블레이즈로 진화한다.'],
  SCROLLOFDARKNESS: ['악의족자', '악의 극의가 적힌 족자. 쿠라에게 보여 주면 일격의 태세 우라오스로 진화한다.'],
  SCROLLOFWATERS: ['물의족자', '물의 극의가 적힌 족자. 쿠라에게 보여 주면 연격의 태세 우라오스로 진화한다.'],
  LEADERSCREST: ['대장의증표', '무리 대장의 투구 조각. 모은 수에 따라 대도각참으로 진화할 수 있다.'],
  BOOSTERENERGY: ['부스트에너지', '고대활성·쿼크차지 특성을 가진 포켓몬의 능력을 끌어올린다.'],
  ABILITYSHIELD: ['특성가드', '지닌 포켓몬의 특성이 바뀌거나 무효가 되지 않는다.'],
  CLEARAMULET: ['클리어참', '상대의 기술이나 특성으로 능력이 떨어지지 않는다.'],
  MIRRORHERB: ['흉내허브', '상대의 능력이 올라가면 한 번 따라 올린다.'],
  PUNCHINGGLOVE: ['펀치글러브', '펀치 기술의 위력이 올라가고 접촉하지 않게 된다.'],
  COVERTCLOAK: ['은밀망토', '기술의 추가 효과를 받지 않는다.'],
  LOADEDDICE: ['속임수주사위', '연속 기술이 많이 맞게 된다.'],
  GIMMIGHOULCOIN: ['모으령의코인', '모으령이 소중히 하는 코인. 999개 모으면 무언가 일어난다고 한다.'],
  TINYBAMBOOSHOOT: ['작은죽순', '작은 죽순. 비싸게 팔 수 있다.'],
  BIGBAMBOOSHOOT: ['큰죽순', '큰 죽순. 아주 비싸게 팔 수 있다.'],
  ROTOMPHONE: ['로토무폰', '로토무가 들어간 스마트폰.'],
  SCARLETBOOK: ['스칼렛북', '에어리어 제로의 탐험 기록이 적힌 붉은 책.'],
  VIOLETBOOK: ['바이올렛북', '에어리어 제로의 탐험 기록이 적힌 보라색 책.'],
  HEALTHMOCHI: ['체력떡', '포켓몬의 HP 노력치를 올리는 떡.'],
  MUSCLEMOCHI: ['근력떡', '포켓몬의 공격 노력치를 올리는 떡.'],
  RESISTMOCHI: ['저항떡', '포켓몬의 방어 노력치를 올리는 떡.'],
  GENIUSMOCHI: ['지력떡', '포켓몬의 특수공격 노력치를 올리는 떡.'],
  CLEVERMOCHI: ['정신떡', '포켓몬의 특수방어 노력치를 올리는 떡.'],
  SWIFTMOCHI: ['순발떡', '포켓몬의 스피드 노력치를 올리는 떡.'],
  FRESHSTARTMOCHI: ['리셋떡', '포켓몬의 노력치를 모두 0으로 되돌리는 떡.'],
  FAIRYFEATHER: ['요정의깃털', '페어리 타입 기술의 위력이 올라간다.'],
  SYRUPYAPPLE: ['꿀맛사과', '끈적한 꿀이 묻은 사과. 과미르로 진화시킨다.'],
  UNREMARKABLETEACUP: ['범작찻잔', '평범한 찻잔. 차데스(가짜폼)를 진화시킨다.'],
  MASTERPIECETEACUP: ['걸작찻잔', '걸작 찻잔. 차데스(진작폼)를 진화시킨다.'],
  WELLSPRINGMASK: ['우물의가면', '오거폰에게 지니게 하면 물 타입이 되고 물 기술의 위력이 올라간다.'],
  HEARTHFLAMEMASK: ['화덕의가면', '오거폰에게 지니게 하면 불꽃 타입이 되고 불꽃 기술의 위력이 올라간다.'],
  CORNERSTONEMASK: ['주춧돌의가면', '오거폰에게 지니게 하면 바위 타입이 되고 바위 기술의 위력이 올라간다.'],
  TEALMASK: ['벽록의가면', '오거폰이 원래 쓰던 가면.'],
  METALALLOY: ['복합금속', '여러 금속이 섞인 금속. 두랄루돈을 브리두라스로 진화시킨다.'],
  INDIGODISK: ['남색원반', '블루베리 아카데미에서 받은 원반.'],
  MYTHICALPECHABERRY: ['환상의복슝열매', '복숭악동이 좋아하는 특별한 복슝열매.'],
  SYNCHROMACHINE: ['싱크로머신', '포켓몬과 마음을 맞추는 기계.'],
  METEORITE: ['운석', '우주에서 떨어진 신비한 돌. 테오키스의 폼을 바꾼다.'],
  BRIARSBOOK: ['브라이어의책', '브라이어가 쓴 에어리어 제로의 책.'],
  DYNAMAXBAND: ['다이맥스밴드', '다이맥스 에너지를 모아 포켓몬을 다이맥스시키는 밴드.'],
  WISHINGSTAR: ['소원의별', '다이맥스 에너지가 담긴 신비한 돌.'],
  DYNAMAXCANDY: ['다이사탕', '포켓몬의 다이맥스 레벨을 1 올린다.'],
  DYNAMAXCANDYXL: ['다이사탕XL', '포켓몬의 다이맥스 레벨을 최대로 올린다.'],
  MAXSOUP: ['다이수프', '버섯으로 끓인 수프. 거다이맥스 인자를 주거나 없앤다.'],
  TERAORB: ['테라스탈오브', '포켓몬을 테라스탈시키는 오브. 포켓몬센터에서 충전된다.'],
  MYSTERYTERAJEWEL: ['수수께끼테라주얼', '신비한 빛을 내는 테라스탈 주얼.'],
  MASTERTERAJEWEL: ['마스터테라주얼', '강한 빛을 내는 테라스탈 주얼.'],
  RADIANTTERAJEWEL: ['빛나는테라주얼', '눈부시게 빛나는 테라스탈 주얼.'],
  GLIMMERINGCHARM: ['반짝반짝부적', '테라 레이드에서 얻는 테라피스가 늘어나는 부적.'],
  ZPOWERRING: ['Z파워링', 'Z파워를 끌어내는 고리.'],
  ZBOOSTER: ['Z부스터', 'Z파워를 다시 쓸 수 있게 해 주는 장치.']
};
Object.keys(MAIL_KO).forEach(k => { KO_ITEMS[k + 'MAIL'] = [MAIL_KO[k] + '메일', '포켓몬에게 지니게 하는 편지.']; });
Object.keys(TERA_KO).forEach(t => { KO_ITEMS[t + 'TERASHARD'] = [TERA_KO[t] + '테라피스', TERA_KO[t] + ' 타입의 테라스탈 에너지가 담긴 조각. 50개 모으면 테라스탈 타입을 바꿀 수 있다.']; });

// ── 적용 ──
(function applyKorean() {
  const G = window.GAMEDATA; if (!G) return;
  const S = G.species, M = G.moves, A = G.abilities, I = G.items;
  // 포켓몬: 기본 종 → 폼 순서 (폼은 기본 종 이름을 따라감)
  if (S) {
    for (const k of Object.keys(KO_SPECIES)) {
      const d = S[k]; if (!d) continue;
      const [name, cat, dex] = KO_SPECIES[k];
      if (name) d.name = name;
      if (cat) d.cat = cat;
      if (dex) d.dex = dex;
    }
    for (const k of Object.keys(S)) {
      const d = S[k]; if (!d.form) continue;
      const base = k.replace(/_\d+$/, '');
      if (S[base] && /^[A-Za-z]/.test(d.name || '')) d.name = S[base].name;
      if (d.fname && KO_FORM[d.fname]) d.fname = KO_FORM[d.fname];
      else if (d.fname && /^[A-Za-z][A-Za-z ()\-]*$/.test(d.fname)) d.fname = '';   // 모르는 영어 폼 이름은 표시 안 함
      if (S[base] && /[A-Za-z]{3,}/.test(d.dex || '') && !/[가-힣]/.test(d.dex || '')) d.dex = S[base].dex;
      if (S[base] && /^[A-Za-z]/.test(d.cat || '')) d.cat = S[base].cat;
    }
  }
  const patch = (T, K) => { if (!T) return; for (const k of Object.keys(K)) { const d = T[k]; if (!d) continue; if (K[k][0]) d.name = K[k][0]; if (K[k][1]) d.d = K[k][1]; } };
  patch(M, KO_MOVES);
  patch(A, KO_ABILITIES);
  patch(I, KO_ITEMS);
})();
