// ============================================================
// landmarks.js - 마을 랜드마크 (별빛시티 천문대 / 산호항구 등대)
//   * 기존 좌표가 하나도 바뀌지 않도록 "출구가 없는 쪽"으로만 맵을 넓힘
//       - 별빛시티: 동쪽에 10칸 추가 → 천문대(7x12, 들어갈 수 있음)
//       - 산호항구: 남쪽에 3칸 추가 + 맨 아래를 바다로 → 등대(3x8, 들어갈 수 있음)
//   * 각 건물 안에는 이야기 + 한 번만 받을 수 있는 선물 포켓몬
//   * story2.js 다음, places.js(장식) 전에 불러와야 함 (맵을 만들기 전에 고쳐야 하므로)
// ============================================================
'use strict';

// ── 건물 조각 (Outside 타일셋 행/열, 문 위치) ──
STAMPS.observatory = { r: 432, c: 0, w: 7, h: 12, door: [3, 11] };
STAMPS.lighthouse = { r: 444, c: 5, w: 3, h: 8, door: [1, 7] };

// 행 문자열의 x번째 글자부터 바꾸기
function setRowChars(rows, y, x, s) { const r = rows[y]; rows[y] = r.slice(0, x) + s + r.slice(x + s.length); }

// ── 별빛시티: 동쪽으로 10칸 확장 + 천문대 ──
(function () {
  const d = MAPS.STAR; if (!d || d._landmark) return;
  d._landmark = true;
  const H = d.rows.length, ins = 30, add = 10;   // 원래 30~31열은 오른쪽 숲 테두리 'TT'
  d.rows = d.rows.map((r, y) => {
    let ext;
    if (y <= 1 || y >= H - 2) ext = 'T'.repeat(add);          // 위/아래 숲 테두리
    else if (y === 16 || y === 17) ext = '-'.repeat(add);     // 아래쪽 큰길을 천문대 앞까지 연장
    else ext = '.'.repeat(add);
    return r.slice(0, ins) + ext + r.slice(ins);
  });
  // 천문대 오른쪽 아래 꽃밭, 길 아래 화단
  setRowChars(d.rows, 19, 33, 'f.f.f');
  setRowChars(d.rows, 3, 39, 'f');
  // 천문대 앞 표지판 (문 왼쪽)
  setRowChars(d.rows, 15, 31, 's');
  d.stamps.push(['observatory', 32, 4, 'STAR_OBS']);
  d.signs.push({ x: 31, y: 15, text: '별빛 천문대\n아스테라에서 별에 가장 가까운 곳\n"별이 떨어지는 밤엔 균열이 깨어난다"' });
})();

// ── 산호항구: 남쪽으로 3칸 확장 + 바닷가 + 등대 ──
(function () {
  const d = MAPS.CORAL; if (!d || d._landmark) return;
  d._landmark = true;
  const W = d.rows[0].length, H = d.rows.length;
  // 맨 아래 숲 테두리 2줄 앞에 빈 땅 3줄 추가, 테두리 2줄은 바다로
  const ground = 'TT' + '.'.repeat(W - 4) + 'TT';
  const sea = 'TT' + '~'.repeat(W - 4) + 'TT';
  d.rows = d.rows.slice(0, H - 2).concat([ground, ground, ground, sea, sea]);
  // 등대 자리(29~31열, 20~27행)와 그 둘레를 비움 (덤불/꽃 제거)
  for (let y = 19; y <= 28; y++) setRowChars(d.rows, y, 28, '.....');
  // 큰길(17~18행)에서 등대 왼쪽으로 내려가 문 앞까지 이어지는 오솔길
  for (let y = 19; y <= 28; y++) setRowChars(d.rows, y, 27, '-');
  setRowChars(d.rows, 28, 27, '-----');
  // 표지판 (오솔길 왼쪽)
  setRowChars(d.rows, 25, 26, 's');
  d.stamps.push(['lighthouse', 29, 20, 'CORAL_LIGHT']);
  d.signs.push({ x: 26, y: 25, text: '산호항구 등대\n200년 동안 한 번도 꺼진 적 없는 불빛' });
})();

// ── 건물 안 ──
INTERIOR_DEFS.STAR_OBS = {
  tmpl: 'lab', name: '별빛 천문대', bgm: 'HGSS 158 National Park', exit: [6, 13],
  npcs: [
    { id: 'obs_doc', x: 9, y: 6, sprite: 'trainer_SCIENTIST', dir: 'down', move: 'look', script: 'obsAstronomer' },
    { id: 'obs_scope', x: 9, y: 4, sprite: '', dir: 'down', move: 'still', script: 'obsTelescope' },
    { id: 'obs_aide', x: 3, y: 10, sprite: 'NPC 08', dir: 'right', move: 'look', text: ['천문대 지붕의 돔은 밤마다 열려요.', '균열이 처음 열리던 날 밤, 여기서 수많은 별똥별이 관측됐대요.'] }
  ]
};
INTERIOR_DEFS.CORAL_LIGHT = {
  tmpl: 'house2', name: '산호항구 등대', bgm: null, exit: [9, 11],
  npcs: [
    { id: 'light_keeper', x: 7, y: 6, sprite: 'trainer_SAILOR', dir: 'right', move: 'look', script: 'lightKeeper' },
    { id: 'light_log', x: 12, y: 8, sprite: '', dir: 'down', move: 'still', script: 'lightLog' }
  ]
};

// ── 이벤트 스크립트 ──
Object.assign(SCRIPTS, {
  // 천문학자: 삐(별에서 왔다는 포켓몬)를 한 번 선물
  async obsAstronomer(w) {
    const sp = '천문학자';
    if (Flags.has('gift_cleffa')) {
      await say(['삐는 잘 지내니?', '달의돌을 쓰면 픽시까지 진화한단다.\n별이 많은 밤에 더 기운이 넘치는 것 같더구나.'], { speaker: sp });
      return;
    }
    await say(['어서 오렴! 여긴 아스테라에서 별에 가장 가까운 곳이란다.', '균열이 열린 뒤로 별똥별이 떨어진 자리에서\n작은 포켓몬이 자주 발견되고 있어.', '이 아이도 어젯밤 천문대 지붕 위에서 발견했단다.'], { speaker: sp });
    if (!SPECIES.CLEFFA) return;
    if (!await yesNo('삐를 데려가 주겠니?')) { await say('그래... 마음이 바뀌면 또 오렴.', { speaker: sp }); return; }
    const m = new Mon('CLEFFA', 15, { ot: Player.name }); m.ot = Player.name; m.metMap = '별빛 천문대';
    givePokemon(m);
    Flags.set('gift_cleffa');
    Audio2.playME('Pkmn get');
    await say(Player.name + '은(는) 삐를 받았다!');
    if (ITEMS.MOONSTONE) { Bag.add('MOONSTONE', 1); await say(['이것도 가져가렴. 별똥별 조각에서 나온 달의돌이란다.', Player.name + '은(는) 달의돌을 받았다!'], { speaker: sp }); }
  },
  // 망원경: 진행 상황에 따라 다른 별 이야기
  async obsTelescope(w) {
    const lines = Flags.has('champion')
      ? ['망원경을 들여다보았다...', '환상의 풀숲 하늘 위로\n오색 빛줄기가 끝없이 흘러내리고 있다!']
      : Flags.has('origin_done')
        ? ['망원경을 들여다보았다...', '균열이 닫힌 하늘에 별이 평소보다 밝게 빛난다.']
        : ['망원경을 들여다보았다...', '시원의 길 쪽 하늘이 보랏빛으로 일렁이고 있다...!'];
    await say(lines);
  },
  // 등대지기: 라프라스를 한 번 선물
  async lightKeeper(w) {
    const sp = '등대지기';
    if (Flags.has('gift_lapras')) {
      await say(['라프라스는 잘 지내나?', '그 녀석은 사람 말을 알아듣는다네.\n외로울 땐 노래를 불러 줄 걸세.'], { speaker: sp });
      return;
    }
    await say(['이 등대 불빛은 200년 동안 한 번도 꺼진 적이 없지.', '밤마다 등대 아래로 라프라스 한 마리가 찾아와\n불빛을 바라보다 돌아가곤 했는데...', '요즘은 아예 돌아가지 않고 기다리더군. 아마 함께 바다를 건널 친구를 찾는 거겠지.'], { speaker: sp });
    if (!SPECIES.LAPRAS) return;
    if (!await yesNo('라프라스와 함께 가 주겠나?')) { await say('그런가... 라프라스는 계속 기다릴 걸세.', { speaker: sp }); return; }
    const m = new Mon('LAPRAS', 30, { ot: Player.name }); m.ot = Player.name; m.metMap = '산호항구 등대';
    givePokemon(m);
    Flags.set('gift_lapras');
    Audio2.cry && Audio2.cry('LAPRAS');
    Audio2.playME('Pkmn get');
    await say(Player.name + '은(는) 라프라스를 받았다!');
  },
  async lightLog(w) {
    await say(['낡은 등대 일지가 펼쳐져 있다.', '"균열이 열린 날, 바다 한가운데서 거대한 그림자가 떠올랐다.\n붉은빛과 푸른빛이 서로를 삼키려 했다..."', '...마지막 장은 찢겨 나가 있다.']);
  }
});

// ── 산호 체육관(GYM7): 관장이 있는 윗단으로 올라가는 발판 ──
//   이 방(gym2 템플릿)은 윗단과 아래층 사이가 절벽으로 막혀 있고, 원래 바닥의 주황 원형 발판으로 오르는 구조
//   예전엔 발판 기능이 없어서 관장에게 갈 수 없었음 → 발판을 밟으면 관장 옆으로 이동, 윗단 양 끝에서 내려옴
if (INTERIOR_DEFS.GYM7) {
  const d = INTERIOR_DEFS.GYM7;
  d.triggers = (d.triggers || []).concat([
    { x: 10, y: 7, w: 2, h: 1, run: 'gym7Up' },
    { x: 9, y: 8, w: 3, h: 1, run: 'gym7Up' },
    { x: 11, y: 6, w: 2, h: 1, run: 'gym7Up' },   // 절벽 바로 아래 줄도 발판처럼 (발판을 지나쳐 이 줄로 온 경우)
    { x: 7, y: 3, w: 1, h: 2, run: 'gym7Down' },
    { x: 13, y: 3, w: 1, h: 2, run: 'gym7Down' }
  ]);
  // 절벽 바로 아래(6번 줄)에서 위로 가려고 하면 막히는 대신 단 위로 올라감
  //   (발판이 생기기 전에 저장해서 이미 발판 위쪽에 서 있는 경우에도 올라갈 수 있게)
  const _bump = World.prototype.bump;
  World.prototype.bump = function () {
    const p = this.player;
    if (this.key === 'GYM7' && !this.busy && p.dir === 'up' && p.y === 6 && p.x >= 8 && p.x <= 12) { this.runScript(() => SCRIPTS.gym7Up(this)); return; }
    return _bump.call(this);
  };
  Object.assign(SCRIPTS, {
    async gym7Up(w) {
      SE.door();
      await Game.fade(1, 10);
      w.player.x = 9; w.player.y = 4; w.player.dir = 'right';
      w.setupFollower(true); w.updateCamera();
      await Game.fade(0, 10);
      await say('발판이 빛나며 관장이 있는 단 위로 올라왔다!');
    },
    async gym7Down(w) {
      if (!(await yesNo('아래층으로 내려가는 발판이다. 내려갈까?'))) { await walkSteps(w.player, w.player.x <= 7 ? 'right' : 'left', 1); return; }
      SE.door();
      await Game.fade(1, 10);
      w.player.x = 10; w.player.y = 9; w.player.dir = 'down';
      w.setupFollower(true); w.updateCamera();
      await Game.fade(0, 10);
    }
  });
}
