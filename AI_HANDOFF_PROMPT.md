# 프로젝트 인수인계 프롬프트 — 「포켓몬스터 아스테라」 (HTML5 팬게임)

당신은 이미 상당 부분 완성된 브라우저 기반 포켓몬 팬게임을 이어서 개발하게 됩니다. 아래 내용을 모두 읽고, 기존 구조와 규칙을 지키면서 작업해 주세요. 사용자는 한국어로 소통하며, 게임 내 모든 텍스트도 한국어입니다.

---

## 1. 한 줄 요약
RPG Maker XP / Pokémon Essentials 기반 팬게임 **"Pokemon Another Red"의 에셋(그래픽·사운드·데이터)을 그대로 활용**해서, 빌드 도구 없이 **순수 HTML + JavaScript(Canvas 2D)** 로 만든 오리지널 스토리의 포켓몬 게임입니다. 서버 없이 브라우저에서 돌아가며, 저장은 localStorage를 씁니다.

## 2. 폴더 구조
```
poke/
├─ Pokemon Another Red_PWT_250821/      ← 원본 에셋 (수정 금지, 읽기 전용)
│   ├─ Graphics/ (Pokemon/Front|Back|Icons|…, Characters/, Characters/Followers/, Tilesets/, Autotiles/,
│   │             Battlebacks/, UI/(Battle, Party, Summary, Bag, Pokedex, …), Windowskins/, Items/, Trainers/,
│   │             Animations/, Weather/, Fogs/ …)
│   ├─ Audio/ (BGM/*.ogg, SE/*.ogg, SE/Cries/<종ID>.ogg, ME/*.ogg)  ※ .mid는 재생 불가 → .ogg만 사용
│   ├─ Data/ (*.dat, *.rxdata — Ruby Marshal 형식. 이미 JS로 추출해 두었음)
│   └─ Fonts/ (power green.ttf 등 — 한글 포함)
└─ pokemon/                              ← 게임 본체 (여기서 작업)
    ├─ index.html          진입점. 스크립트 로드 순서가 중요함
    ├─ 게임시작.bat         python http.server(포트 8765)로 실행 후 브라우저 열기
    ├─ prototype.html      사용자가 처음 만들었던 프로토타입(보존용, 사용 안 함)
    ├─ src/                사용자의 초기 코드(사용 안 함, 보존)
    └─ game/
        ├─ gamedata.js     [자동생성] species(1463: 기본 1025 + 폼 438), moves(920), types, items(842), abilities(310) — 한국어 이름/설명 포함
        ├─ tilesets.js     [자동생성] RMXP 타일셋 통행(passages)/우선순위(priorities)/지형태그(terrain_tags)
        ├─ interiors.js    [자동생성] 원본의 범용 실내 맵 타일(포켓몬센터, 상점, 집, 연구소, 체육관 템플릿)
        ├─ core.js         에셋 로딩, 입력(Input), 사운드(Audio2/SE), 텍스트 렌더(text/textFit/wrapText), 한국어 조사(J.*), 공용 유틸
        ├─ tilemap.js      RMXP 오토타일(48패턴) 렌더, 통행 판정, ASCII→타일 맵 빌더(buildOutdoorMap), 건물 스탬프(STAMPS)
        ├─ world.js        초기 지역(새벽마을~별빛시티, 챔피언로드, 리그, 환상의 풀숲) ASCII 맵 + NPC/트레이너/실내 정의
        ├─ worldgen.js     절차적 도로/마을 생성기(genRoute/genTown/defineRoute/defineTown), 테마 타입 기반 야생 포켓몬 자동 생성
        ├─ mon.js          포켓몬 개체(Mon): 능력치·성격·경험치 곡선·기술·진화·지닌 도구·테라 타입·거다이맥스 인자·폼 변화
        ├─ battle.js       턴제 배틀 엔진(Battle 클래스, async/await 기반)
        ├─ gimmick.js      메가진화, 다이맥스/거다이맥스, 테라스탈, 원시회귀, 날씨, 레이드
        ├─ ui.js           대화창/선택지/전투 메뉴/파티/요약/가방/상점/PC 박스/도감/트레이너카드/설정/시작메뉴
        ├─ ability.js      특성 시스템 + Z기술 (Mon 클래스를 서브클래스로 재정의함)
        ├─ main.js         게임 루프(Game), 플레이어 데이터(Player/Flags), 저장(SaveSys), 오버월드(World/Char), SCRIPTS(이벤트), 타이틀·오프닝·명예의전당
        ├─ story.js        신대륙 확장: 신규 지역 12곳, 체육관 4~8, 사천왕, 균열단 스토리, 전설 90여 종, 레이드 둥지, 서브퀘스트, 배틀타워, 타운맵/공중날기
        ├─ story2.js       스토리 몰입: 챕터 카드, 박사 통화, 모험 수첩, Z링/특성 아이템 입수 경로
        ├─ panel.js        오른쪽 개인 설정 패널(로그인/회원가입, 배속, 키 설정, 음량), 관리자 도구 모달
        ├─ touch.js        모바일 가상 컨트롤러(드래그 이동 가능), 확대/축소 방지
        └─ dev.js          테스트용 진입점 (?test=1, ?view=맵키)
```

### index.html 스크립트 로드 순서 (반드시 유지)
`gamedata → tilesets → interiors → core → tilemap → world → worldgen → mon → battle → gimmick → ui → ability → main → story → story2 → panel → touch → dev`
- 뒤쪽 파일이 앞쪽의 클래스/함수를 **덮어쓰거나 감싸는(wrap) 방식**으로 확장되어 있습니다. 예: story.js가 `rivalTeam`, `shopStock`, `introFlow`, `SCRIPTS.*`를 재정의하고, ability.js가 `Mon`을 서브클래스로 교체합니다.
- 모듈(ES Module)이 아니라 **일반 `<script>` 전역 스코프**입니다. `file://`로 열어도 동작해야 하므로 fetch/ES 모듈을 쓰지 마세요.

## 3. 핵심 설계 규칙
1. **화면:** 512×384 캔버스 하나에 모든 것을 그립니다(32px 타일, 16×12 타일 뷰). CSS로 확대(pixelated).
2. **게임 루프:** `Game.frame`이 rAF에서 누적 시간으로 60Hz 고정 스텝(`Game.step`)을 돌리고, `Game.speed`(1/2/4/8배)만큼 스텝 수를 늘립니다. 그리기는 프레임당 1회.
3. **입력:** `Input.beginFrame()`이 스텝 시작 시 `pending → pressed`로 래치합니다. `Input.trig(k)`(눌림), `Input.rep(k)`(메뉴 반복), `Input.held[k]`(유지). 키 이름: `up/down/left/right/A/B/run/menu/L/R/speed`. 키 매핑은 `Input.map`(코드→액션)이며 계정별로 저장됩니다. 가상 키 입력은 `Input.pending[k]=true; Input.held[k]=true`.
4. **UI 창 스택:** `Game.open(win)`은 Promise를 반환하고, 창은 `this.close(값)`으로 닫습니다. 맨 위 창만 입력을 받습니다. 모든 창은 `Win`을 상속하고 `update()/draw(ctx)`를 구현합니다.
5. **이벤트/연출은 async 함수:** `await say(text|[texts], {speaker})`, `await ask(질문, 선택지)`, `await yesNo()`, `await frames(n)`, `await startBattle({...})`. 오버월드 스크립트는 `world.runScript(fn)`으로 실행(실행 중 플레이어 조작 잠금).
6. **에셋 경로:** 항상 `img('Graphics/...')`, `drawImg(ctx, 'Graphics/...', ...)`, `Audio2.playBGM('이름')`, `Audio2.se('이름')`, `Audio2.playME('이름')`, `Audio2.cry(종ID)` 사용. 경로 앞부분(`../Pokemon Another Red_PWT_250821/`)은 `assetURL()`이 붙입니다. 새 에셋을 쓸 땐 **실제 파일이 존재하는지 반드시 확인**하세요(대소문자/공백 포함).
7. **한국어 텍스트:** 조사는 `J.iga/J.eunneun/J.eulreul/J.wagwa/J.ro/J.a`(숫자 받침 처리 포함)를 쓰세요. 칸에 맞춰야 하는 글자는 `textFit()`(자동 축소), 긴 문장은 `wrapText()`.
8. **데이터 ID:** 포켓몬/기술/도구/특성은 Essentials 내부 ID(대문자, 예: `CHARIZARD`, `FLAMETHROWER`, `LEFTOVERS`, `BLAZE`)를 씁니다. 폼은 `종ID_번호`(예: `CHARIZARD_1`=메가X, `CHARIZARD_3`=거다이맥스, `RATTATA_1`=알로라). `SPECIES_LIST`는 폼을 제외한 1025종. 도감 등록은 `baseOf(종)` 기준.
9. **저장:** `SaveSys.save()/load()`. 키는 `astera_save_v1_<계정>`(로그인 안 하면 `astera_save_v1`). Mon은 `toJSON()/Mon.fromJSON()`로 직렬화 — 필드 추가 시 둘 다 수정하세요.

## 4. 게임 콘텐츠 현황
### 스토리 (오리지널)
- 무대: 200년 전 가라앉았다가 "시공의 균열"과 함께 떠오른 신대륙 **아스테라**. 대륙 중심의 "시원의 결정"(테라파고스)이 모든 시대의 포켓몬을 끌어당겨 1~9세대 포켓몬과 전설·환상이 공존.
- 주요 인물: 한별 박사(탐사대장), 라이벌 카이(최종 챔피언), 악당 조직 **균열단**(보스 제로스, 간부 헥스·카르마).
- 진행: 새벽마을 → 체육관 8개(바위·물·에스퍼·격투·얼음·땅·페어리·드래곤) → 시원의 길(균열단 최종전 + 테라파고스) → 챔피언로드 → 사천왕 4명 → 챔피언 카이 → 명예의 전당/엔딩 → 엔딩 후 "균열 지대" 8곳(전설 수집), 배틀 타워.
- 연출: 챕터 카드 11개, 배지마다 박사 통화, 메뉴의 "모험 수첩"(현재 목표 자동 표시 — `currentGoal()`).

### 맵
- 손으로 만든 ASCII 맵(world.js) + 절차 생성 맵(story.js의 `defineRoute/defineTown`, 시드 고정이라 항상 같은 맵).
- ASCII 범례: `T`나무 `.`풀밭 `,`풀숲(야생 출현) `=`흙길 `-`포장길 `~`바다 `f`꽃 `b`덤불 `R`바위 `p`꽃덤불 `s`표지판 `y`모래 `g`돌바닥 `w`눈밭.
- 맵 연결: `exits:{north:{to:'키'}}` + `exitPos`(출구 좌표)로 자동 정렬. 문(door)은 건물 스탬프의 4번째 값(실내 키)으로 자동 생성.
- 실내는 원본 템플릿 재사용(`INTERIOR_DEFS`, `tmpl` 필드). 포켓몬센터·상점은 공용(`shared`)이고 `Player.returnPoint`로 돌아갈 위치를 기억.
- 날씨 연출(`def.weather`: snow/sand/rain/fog/rift/ash), 실제 시계 기반 낮/밤.

### 전투 시스템
- 싱글 배틀만 지원. 타입 상성, 자속, 급소, 명중/회피 랭크, 상태이상(독·맹독·화상·마비·잠듦·얼음·혼란·풀죽음), 기술 효과는 Essentials의 `function_code` 문자열을 정규식으로 해석(능력 랭크 변화, 흡수, 반동, 연속기, 고정 데미지, 방어, 2턴 기술 등).
- 기믹(기술 선택 화면에서 **Q키**로 선택, 한 배틀에 각 1회): **메가진화**(메가링+메가스톤 47종), **다이맥스/거다이맥스**(3턴, HP 2배, 다이맥스 기술), **테라스탈**(스텔라 포함), **Z기술**(Z링+Z크리스탈), **원시회귀**(가이오가/그란돈+구슬).
- 특성 310종 데이터, 그중 자주 쓰이는 약 80종은 효과 구현(위협, 날씨 특성, 맹화류, 흡수/무효 특성, 옹골참, 클리어바디 등). 나머지는 이름·설명만 표시. 특성캡슐/특성패치로 변경 가능.
- 경험치: 모던 방식(파티 전원 획득: 참가 100%, 비참가 80%).
- 레이드: 맥스 레이드/테라 레이드 둥지(매일 바뀜), 이기면 포획 기회.
- AI: 트레이너는 기대 데미지 기반으로 기술 선택. 관장/사천왕/보스는 에이스에게 기믹 사용(`trainer.gimmick`).

### 부가 기능
도감(1025종, 한국어 설명), 파티/요약(특성·테라·지닌 도구 표시), 가방(도구 사용·지니게 하기·기술머신), 상점, PC 박스, 동료 포켓몬(Followers 스프라이트가 뒤를 따라 걸음), 화석 복원, 게임 내 교환, 지가르데 셀 퀘스트, 타운맵·공중날기, 배회 전설, 지역 폼 랜덤 출현, 빛나는부적.

### 오른쪽 패널 / 계정 (panel.js)
- 로그인: **하드코딩 `test` / `test` = 관리자**. 회원가입은 지금은 localStorage(`astera_users`)에 평문 저장 — **나중에 서버 연동 예정**이며 `Account` 객체(login/signup/logout/restore)만 API 호출로 바꾸면 되게 분리해 둠.
- 계정별 저장 데이터·설정(배속, 키 매핑) 분리.
- 관리자 도구 모달: 포켓몬 생성(종/레벨/성격/특성/테라/도구/이로치/거다이맥스/개체값 → 파티 또는 박스), 파티 편집, 아이템·돈 지급, 배지/스토리 플래그 설정, 맵 순간이동, 테스트 배틀.

### 모바일 (touch.js)
터치 기기에서 가상 방향패드(아날로그식) + A/B/달리기 + 메뉴/L/R/배속/배치/설정 버튼. 손잡이(⠿)나 "배치" 모드로 위치를 드래그해서 옮기고 localStorage(`astera_touchpos`)에 저장. 핀치/더블탭 확대 차단.

## 5. 아직 없는 것 / 알려진 한계
- 더블배틀, 특성 일부 효과(이름만 표시되는 특성 다수), 지형(필드) 효과, 교체 시 순서 세부 규칙, 서버 연동(계정/저장), 비밀번호 해시.
- 처음부터 끝까지 이어서 해 본 통합 플레이 테스트는 사용자가 진행 중. 구간별 테스트만 완료됨.

## 6. 실행 / 테스트 방법
- 실행: `pokemon/게임시작.bat` (또는 `poke` 폴더에서 `python -m http.server 8765` 후 `http://127.0.0.1:8765/pokemon/index.html`). `index.html`을 직접 열어도 동작(file://).
- 개발용 URL 파라미터(dev.js):
  - `?test=1&map=R1&x=11&y=20&party=CHARIZARD:50,PIKACHU:30&badges=3` → 해당 위치·파티로 바로 시작
  - `&battle=PIKACHU&lv=5` 야생 배틀 즉시 시작, `&ui=party|bag|summary|dex|shop|box|options|evo` UI 바로 열기
  - `?view=맵키` → 맵 전체를 큰 캔버스에 그리고 통행 불가 칸(빨강)·이벤트 위치를 표시(맵 설계 검증용)
- 검증 습관: 수정 후 `node --check game/파일.js`로 문법 확인 → 브라우저 콘솔 오류 확인 → 가능하면 헤드리스 브라우저로 스크린샷 확인.

## 7. 작업할 때 지켜야 할 것
1. 원본 에셋 폴더는 절대 수정하지 말 것. 필요한 데이터는 JS로 추출해 game/ 아래에 둘 것.
2. 새 기능은 가능하면 **새 파일로 분리**하고, 기존 함수를 감싸는(wrap) 방식으로 확장할 것. 수정 후 index.html 로드 순서를 확인.
3. 게임 텍스트·UI는 한국어로, 조사 함수(J.*)를 사용하고 글자가 칸 밖으로 넘치지 않게 `textFit/wrapText`를 쓸 것.
4. 맵/이벤트를 추가하면 NPC·트레이너·아이템이 통행 불가 칸이나 다른 이벤트와 겹치지 않는지 확인할 것(`?view=` 활용).
5. 저장 데이터 호환: 새 필드는 기본값을 두고 `toJSON/fromJSON`을 함께 수정할 것.
6. 실존 게임을 그대로 재현하지 말 것: 지역·스토리·맵 배치는 오리지널로 유지(원본 에셋의 관동/성도 맵을 그대로 옮기지 않음).
7. 사용자에게 보고할 때는 무엇을 바꿨는지, 어떻게 확인했는지, 확인 못 한 부분이 무엇인지 솔직하게 알릴 것.
