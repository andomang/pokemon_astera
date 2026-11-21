// ============================================================
// admin.js - 관리자 치트 (관리자 계정에서만 동작)
//   * 관리자 도구 모달에 "치트" 탭 추가
//   * 공격 안 당함 / 도망 100% / 트레이너전에서도 도망 / 야생 포켓몬 안 나옴 / 트레이너 시선 무시
//   * 포켓몬 추가·레벨 수정·맵 이동은 기존 탭(포켓몬 생성 / 파티 편집 / 진행·이동)에 있음
// ============================================================
'use strict';

const Cheats = {
  list: [
    ['invincible', '공격 안 당함', '내 포켓몬이 데미지를 받지 않음 (상대 기술·독·화상 등 전부)'],
    ['alwaysRun', '야생 도망 100%', '야생 배틀에서 도망치기가 항상 성공'],
    ['fleeTrainer', '트레이너전 도망', '트레이너·관장 배틀에서도 도망칠 수 있음 (도망친 트레이너는 맵을 다시 들어올 때까지 말을 걸지 않음)'],
    ['noWild', '야생 포켓몬 안 나옴', '풀숲을 걸어도 야생 포켓몬이 나오지 않음'],
    ['noTrainerSight', '트레이너 시선 무시', '트레이너와 눈이 마주쳐도 승부가 시작되지 않음']
  ],
  data: {},
  key() { return 'astera_cheats_' + (Account.user || 'guest'); },
  load() { this._for = Account.user; try { this.data = JSON.parse(localStorage.getItem(this.key()) || '{}'); } catch (e) { this.data = {}; } },
  save() { try { localStorage.setItem(this.key(), JSON.stringify(this.data)); } catch (e) { } },
  // 관리자 계정일 때만 켜짐 (로그인 계정이 바뀌면 그 계정 설정을 다시 읽음)
  on(k) {
    if (this._for !== Account.user) { this._for = Account.user; this.load(); }
    return !!(Account.admin && this.data[k]);
  }
};
window.Cheats = Cheats;

// 도망친 트레이너: 맵을 다시 들어올 때까지 무시
const fledTrainers = new Set();
let lastBattleResult = null;

// ── 전투 ──
{
  const P = Battle.prototype;

  const _damage = P.damage;
  P.damage = async function (b, dmg, eff) {
    if (b === this.p && Cheats.on('invincible')) return 0;
    return _damage.call(this, b, dmg, eff);
  };

  const _tryRun = P.tryRun;
  P.tryRun = async function () {
    if ((this.wild && Cheats.on('alwaysRun')) || (!this.wild && Cheats.on('fleeTrainer'))) {
      Audio2.se('Battle flee');
      await this.say('무사히 도망쳤다!');
      this.result = 'run';
      return true;
    }
    return _tryRun.call(this);
  };

  // "트레이너와의 승부에서 도망칠 수 없다" 대신 도망 행동으로 바꿈
  const _say = P.say;
  P.say = async function (s, wait) {
    if (!this.wild && Cheats.on('fleeTrainer') && typeof s === 'string' && s.indexOf('트레이너와의 승부에서 도망칠 수 없다') >= 0) {
      this._cheatRun = true;
      return;
    }
    return _say.call(this, s, wait);
  };
  const _choose = P.chooseAction;
  P.chooseAction = async function () {
    const act = await _choose.call(this);
    if (act === null && this._cheatRun) { this._cheatRun = false; return { type: 'run' }; }
    return act;
  };
}

// 마지막 전투 결과 기록 (트레이너에게서 도망쳤는지 판단용)
{
  const _startBattle = startBattle;
  // eslint-disable-next-line no-global-assign
  startBattle = async function (o) {
    const r = await _startBattle(o);
    lastBattleResult = r;
    return r;
  };
  const _trainerEncounter = trainerEncounter;
  // eslint-disable-next-line no-global-assign
  trainerEncounter = async function (w, c, dist) {
    lastBattleResult = null;
    const r = await _trainerEncounter(w, c, dist);
    if (r === 'run' || lastBattleResult === 'run') fledTrainers.add(c.id);
    return r;
  };
}

// ── 필드 ──
{
  const W = World.prototype;
  const _check = W.checkTrainers;
  W.checkTrainers = function () {
    if (Cheats.on('noTrainerSight')) return false;
    // 도망친 트레이너는 잠시 무시: 확인하는 동안만 쓰러뜨린 것처럼 취급
    if (!fledTrainers.size) return _check.call(this);
    const saved = {};
    for (const id of fledTrainers) { saved[id] = Player.defeated[id]; Player.defeated[id] = true; }
    try { return _check.call(this); }
    finally { for (const id of fledTrainers) { if (saved[id]) Player.defeated[id] = saved[id]; else delete Player.defeated[id]; } }
  };
  const _load = W.load;
  W.load = function (...args) { fledTrainers.clear(); return _load.apply(this, args); };

  const _wild = wildBattle;
  // eslint-disable-next-line no-global-assign
  wildBattle = async function (...args) {
    if (Cheats.on('noWild')) return null;
    return _wild.apply(this, args);
  };
  if (typeof roamCheck === 'function') {
    const _roam = roamCheck;
    // eslint-disable-next-line no-global-assign
    roamCheck = function (w) { return Cheats.on('noWild') ? false : _roam(w); };
  }
}

// ── 관리자 도구에 "치트" 탭 추가 ──
{
  const _render = Admin.render.bind(Admin);
  Admin.render = function () {
    _render();
    const m = document.getElementById('admin');
    const tabs = m.querySelector('.tabs');
    const btn = document.createElement('button');
    btn.textContent = '치트';
    btn.className = this.tab === 'cheat' ? 'on' : '';
    btn.addEventListener('click', () => { this.tab = 'cheat'; this.render(); });
    tabs.appendChild(btn);
    if (this.tab !== 'cheat') return;
    // 원래 render는 모르는 탭이면 '진행·이동' 내용을 그리므로 본문을 치트 화면으로 교체
    tabs.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('on'));
    Cheats.load();
    const mb = m.querySelector('.mb');
    mb.innerHTML = Cheats.list.map(([k, name, desc]) =>
      '<label class="chk" style="display:flex;align-items:flex-start;gap:8px;margin:8px 0">' +
      '<input type="checkbox" data-cheat="' + k + '"' + (Cheats.data[k] ? ' checked' : '') + '>' +
      '<span><b>' + name + '</b><br><span class="muted">' + desc + '</span></span></label>').join('') +
      '<div class="row"><button id="a-cheat-all" class="gold">전부 켜기</button><button id="a-cheat-none">전부 끄기</button></div>' +
      '<p class="muted">포켓몬 추가는 "포켓몬 생성", 레벨 수정은 "파티 편집", 맵 이동은 "진행·이동" 탭에 있습니다.</p>';
    mb.querySelectorAll('[data-cheat]').forEach(cb => cb.addEventListener('change', () => {
      Cheats.data[cb.dataset.cheat] = cb.checked; Cheats.save();
      this.msg(Cheats.list.find(c => c[0] === cb.dataset.cheat)[1] + (cb.checked ? ' 켬' : ' 끔'));
    }));
    const setAll = v => { Cheats.list.forEach(([k]) => Cheats.data[k] = v); Cheats.save(); this.render(); this.msg(v ? '치트 전부 켬' : '치트 전부 끔'); };
    document.getElementById('a-cheat-all').addEventListener('click', () => setAll(true));
    document.getElementById('a-cheat-none').addEventListener('click', () => setAll(false));
  };
}

window.addEventListener('load', () => Cheats.load());
