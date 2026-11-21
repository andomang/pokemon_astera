// ============================================================
// panel.js - 오른쪽 개인 설정 패널: 계정(로그인/회원가입), 배속, 키 설정, 음량, 관리자 도구
//   * 현재 계정은 로컬 하드코딩(test/test = 관리자). 서버 연동 시 Account.* 만 교체하면 된다.
// ============================================================
'use strict';

const Account = {
  user: null, admin: false,
  // TODO(서버 연동): 아래 하드코딩/로컬 저장을 API 호출로 교체
  builtin: { test: { pw: 'test', admin: true } },
  users() { try { return JSON.parse(localStorage.getItem('astera_users') || '{}'); } catch (e) { return {}; } },
  login(id, pw) {
    const u = this.builtin[id] || this.users()[id];
    if (!u || u.pw !== pw) return false;
    this.user = id; this.admin = !!u.admin;
    localStorage.setItem('astera_session', id);
    Settings.load(); return true;
  },
  signup(id, pw) {
    if (!/^[A-Za-z0-9가-힣_]{3,16}$/.test(id) || pw.length < 4) return '아이디 3~16자, 비밀번호 4자 이상';
    const us = this.users();
    if (us[id] || this.builtin[id]) return '이미 있는 아이디입니다';
    us[id] = { pw, admin: false, created: Date.now() };
    localStorage.setItem('astera_users', JSON.stringify(us));
    return null;
  },
  logout() { this.user = null; this.admin = false; localStorage.removeItem('astera_session'); Settings.load(); },
  restore() { const id = localStorage.getItem('astera_session'); if (id && (this.builtin[id] || this.users()[id])) { this.user = id; this.admin = !!(this.builtin[id] || this.users()[id]).admin; } },
};
window.Account = Account;

const ACTIONS = [['up', '위'], ['down', '아래'], ['left', '왼쪽'], ['right', '오른쪽'], ['A', '결정'], ['B', '취소/메뉴'], ['run', '달리기'], ['menu', '메뉴'], ['L', 'L (Q)'], ['R', 'R (E)'], ['speed', '배속 전환']];
const DEFAULT_KEYMAP = { ...Input.map, KeyF: 'speed' };
Input.map = { ...DEFAULT_KEYMAP };
const Settings = {
  data: { speed: 1, keymap: null },
  key() { return 'astera_cfg_' + (Account.user || 'guest'); },
  load() {
    try { this.data = { speed: 1, keymap: null, ...JSON.parse(localStorage.getItem(this.key()) || '{}') }; } catch (e) { this.data = { speed: 1, keymap: null }; }
    Input.map = this.data.keymap ? { ...this.data.keymap } : { ...DEFAULT_KEYMAP };
    Game.speed = this.data.speed || 1;
    Panel.render && Panel.render();
  },
  save() { this.data.keymap = { ...Input.map }; this.data.speed = Game.speed; localStorage.setItem(this.key(), JSON.stringify(this.data)); },
};
function setSpeed(s) { Game.speed = s; Settings.save(); Panel.render(); }
// 배속 전환 키
const _beginFrame = Input.beginFrame.bind(Input);
Input.beginFrame = function () {
  _beginFrame();
  if (this.pressed.speed) { const l = [1, 2, 4, 8]; setSpeed(l[(l.indexOf(Game.speed) + 1) % l.length]); toast('게임 속도 ' + Game.speed + '배'); }
};
function keyLabel(code) { return code.replace(/^Key/, '').replace(/^Digit/, '').replace('Arrow', '방향').replace('Left', '←').replace('Right', '→').replace('Up', '↑').replace('Down', '↓').replace('ShiftLeft', 'Shift').replace('Escape', 'Esc').replace('Space', 'Space'); }
function toast(msg) {
  const t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.style.opacity = 1; clearTimeout(toast._t); toast._t = setTimeout(() => t.style.opacity = 0, 1600);
}

// ---------------- 패널 UI ----------------
const Panel = {
  el: null, capturing: null, signupMode: false,
  init() {
    const side = document.createElement('aside'); side.id = 'side'; document.body.appendChild(side); this.el = side;
    const tst = document.createElement('div'); tst.id = 'toast'; document.body.appendChild(tst);
    window.KeyCapture = e => {
      if (!this.capturing) return false;
      const act = this.capturing; this.capturing = null;
      if (e.code === 'Escape') { this.render(); return true; }
      for (const c in Input.map) if (Input.map[c] === act) delete Input.map[c];
      Input.map[e.code] = act;
      Settings.save(); this.render(); toast(ACTIONS.find(a => a[0] === act)[1] + ' → ' + keyLabel(e.code));
      return true;
    };
    Account.restore(); Settings.load(); this.render();
    setInterval(() => { const s = document.getElementById('p-status'); if (s) s.textContent = this.status(); }, 1000);
  },
  status() {
    if (!Game.world) return '타이틀 화면';
    const t = Math.floor(Player.playTime / 60);
    return (Game.world.def.name || '') + ' · 배지 ' + Player.badges.length + ' · ' + Math.floor(t / 60) + '시간 ' + (t % 60) + '분';
  },
  render() {
    if (!this.el) return;
    const h = [];
    h.push('<h2>개인 설정</h2>');
    // 계정
    if (Account.user) {
      h.push('<section><div class="row"><b>' + esc(Account.user) + '</b>님' + (Account.admin ? ' <span class="badge">관리자</span>' : '') + '<button id="p-logout" class="sm">로그아웃</button></div>');
      h.push('<div class="muted" id="p-status">' + this.status() + '</div>');
      if (Account.admin) h.push('<button id="p-admin" class="wide gold">관리자 도구 열기</button>');
      h.push('</section>');
    } else if (this.signupMode) {
      h.push('<section><h3>회원가입</h3><input id="p-id" placeholder="아이디"><input id="p-pw" type="password" placeholder="비밀번호"><input id="p-pw2" type="password" placeholder="비밀번호 확인"><div class="row"><button id="p-dosignup">가입</button><button id="p-tologin" class="sm">로그인으로</button></div><div class="err" id="p-err"></div></section>');
    } else {
      h.push('<section><h3>로그인</h3><input id="p-id" placeholder="아이디"><input id="p-pw" type="password" placeholder="비밀번호"><div class="row"><button id="p-login">로그인</button><button id="p-tosignup" class="sm">회원가입</button></div><div class="err" id="p-err"></div><div class="muted">로그인하지 않으면 게스트로 저장됩니다. 계정마다 저장 데이터와 설정이 따로 관리됩니다.</div></section>');
    }
    // 배속
    h.push('<section><h3>게임 속도 <span class="muted">(F키로 전환)</span></h3><div class="seg">' + [1, 2, 4, 8].map(s => '<button data-speed="' + s + '" class="' + (Game.speed === s ? 'on' : '') + '">' + s + '배</button>').join('') + '</div></section>');
    // 음량/옵션
    const o = Player.options || {};
    h.push('<section><h3>소리 · 진행</h3>' +
      '<label>배경음악 <input type="range" id="p-bgm" min="0" max="10" value="' + Math.round(Audio2.vol * 10) + '"></label>' +
      '<label>효과음 <input type="range" id="p-se" min="0" max="10" value="' + Math.round(Audio2.seVol * 10) + '"></label>' +
      '<label>텍스트 속도 <select id="p-ts">' + ['느림', '보통', '빠름'].map((n, i) => '<option value="' + i + '"' + ((o.textSpeed ?? 1) === i ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label>' +
      '<label class="chk"><input type="checkbox" id="p-auto"' + (o.autoBattleText ? ' checked' : '') + '> 전투 메시지 자동 넘김</label>' +
      '<label class="chk"><input type="checkbox" id="p-follow"' + (o.follower !== false ? ' checked' : '') + '> 동료 포켓몬 함께 걷기</label>' +
      '<label class="chk"><input type="checkbox" id="p-dn"' + (o.dayNight !== false ? ' checked' : '') + '> 낮/밤 연출</label></section>');
    // 키 설정
    h.push('<section><h3>키 설정 <button id="p-keyreset" class="sm">초기화</button></h3><table class="keys">' + ACTIONS.map(([a, n]) => {
      const codes = Object.keys(Input.map).filter(c => Input.map[c] === a).map(keyLabel).join(', ') || '-';
      return '<tr><td>' + n + '</td><td>' + (this.capturing === a ? '<i>키를 누르세요… (Esc 취소)</i>' : esc(codes)) + '</td><td><button class="sm" data-key="' + a + '">변경</button></td></tr>';
    }).join('') + '</table></section>');
    h.push('<section><h3>바로가기</h3><div class="row"><button id="p-save">지금 저장</button><button id="p-full">전체화면</button></div></section>');
    this.el.innerHTML = h.join('');
    this.bind();
    if (typeof Game !== 'undefined' && Game.canvas) dispatchEvent(new Event('resize'));
  },
  bind() {
    const $ = id => document.getElementById(id);
    const on = (id, ev, f) => { const e = $(id); if (e) e.addEventListener(ev, f); };
    on('p-login', 'click', () => { if (Account.login($('p-id').value.trim(), $('p-pw').value)) { toast(Account.user + '님 환영합니다!'); this.render(); } else $('p-err').textContent = '아이디 또는 비밀번호가 틀렸습니다.'; });
    on('p-pw', 'keydown', e => { if (e.key === 'Enter') ($('p-login') || $('p-dosignup')).click(); });
    on('p-tosignup', 'click', () => { this.signupMode = true; this.render(); });
    on('p-tologin', 'click', () => { this.signupMode = false; this.render(); });
    on('p-dosignup', 'click', () => {
      if ($('p-pw').value !== $('p-pw2').value) { $('p-err').textContent = '비밀번호가 일치하지 않습니다.'; return; }
      const err = Account.signup($('p-id').value.trim(), $('p-pw').value);
      if (err) { $('p-err').textContent = err; return; }
      Account.login($('p-id').value.trim(), $('p-pw').value); this.signupMode = false; toast('가입 완료!'); this.render();
    });
    on('p-logout', 'click', () => { Account.logout(); toast('로그아웃했습니다'); this.render(); });
    on('p-admin', 'click', () => Admin.open());
    this.el.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => setSpeed(+b.dataset.speed)));
    this.el.querySelectorAll('[data-key]').forEach(b => b.addEventListener('click', () => { this.capturing = b.dataset.key; this.render(); b.blur(); document.activeElement && document.activeElement.blur(); }));
    on('p-keyreset', 'click', () => { Input.map = { ...DEFAULT_KEYMAP }; Settings.save(); this.render(); });
    on('p-bgm', 'input', e => { Audio2.vol = e.target.value / 10; if (Audio2.bgm) Audio2.bgm.volume = Audio2.vol; Player.options.bgmVol = Audio2.vol; SaveSys.saveOptions(); });
    on('p-se', 'input', e => { Audio2.seVol = e.target.value / 10; Player.options.seVol = Audio2.seVol; SaveSys.saveOptions(); });
    on('p-ts', 'change', e => { Player.options.textSpeed = +e.target.value; SaveSys.saveOptions(); });
    on('p-auto', 'change', e => { Player.options.autoBattleText = e.target.checked; SaveSys.saveOptions(); });
    on('p-follow', 'change', e => { Player.options.follower = e.target.checked; SaveSys.saveOptions(); if (Game.world) Game.world.setupFollower(true); });
    on('p-dn', 'change', e => { Player.options.dayNight = e.target.checked; SaveSys.saveOptions(); });
    on('p-save', 'click', () => { if (!Game.world || Game.scene !== Game.world) { toast('필드에서만 저장할 수 있습니다'); return; } SaveSys.save(); toast('저장했습니다 (' + (Account.user || '게스트') + ')'); });
    on('p-full', 'click', () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); });
    // 패널 클릭 후 게임으로 포커스 돌려주기
    this.el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => setTimeout(() => b.blur(), 0)));
  },
};
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ---------------- 관리자 도구 (모달) ----------------
const Admin = {
  tab: 'make',
  open() {
    if (!Account.admin) return;
    let m = document.getElementById('admin');
    if (!m) { m = document.createElement('div'); m.id = 'admin'; document.body.appendChild(m); m.addEventListener('mousedown', e => { if (e.target === m) this.close(); }); }
    m.style.display = 'flex'; this.render();
  },
  close() { const m = document.getElementById('admin'); if (m) m.style.display = 'none'; document.activeElement && document.activeElement.blur(); },
  inGame() { if (!Game.world) { this.msg('먼저 게임을 시작(이어하기/새로 시작)하세요.'); return false; } return true; },
  msg(s) { const e = document.getElementById('a-msg'); if (e) e.textContent = s; toast(s); },
  spOpts() { return SPECIES_LIST.map(k => '<option value="' + k + '">' + SPECIES[k].n + ' ' + esc(SPECIES[k].name) + '</option>').join('') + Object.keys(SPECIES).filter(k => SPECIES[k].form).map(k => '<option value="' + k + '">' + esc(SPECIES[k].name) + ' [' + esc(SPECIES[k].fname || k) + ']</option>').join(''); },
  itemOpts() { return Object.keys(ITEMS).map(k => '<option value="' + k + '">' + esc(ITEMS[k].name) + '</option>').join(''); },
  abOpts(sp, cur) { const d = SPECIES[sp] || {}; const l = [...new Set([...(d.ab || []), ...(d.hab || []), ...Object.keys(ABILITIES)])]; return l.map(a => '<option value="' + a + '"' + (a === cur ? ' selected' : '') + '>' + esc(abilityName(a)) + ((d.hab || []).includes(a) ? ' (숨겨진)' : (d.ab || []).includes(a) ? ' (기본)' : '') + '</option>').join(''); },
  typeOpts(cur) { return Object.keys(TYPES).map(t => '<option value="' + t + '"' + (t === cur ? ' selected' : '') + '>' + TYPES[t].name + '</option>').join(''); },
  natOpts(cur) { return NATURES.map((n, i) => '<option value="' + i + '"' + (i === cur ? ' selected' : '') + '>' + n + '</option>').join(''); },
  render() {
    const m = document.getElementById('admin');
    const tabs = [['make', '포켓몬 생성'], ['party', '파티 편집'], ['item', '아이템·돈'], ['prog', '진행·이동']];
    let body = '';
    if (this.tab === 'make') {
      body = '<label>포켓몬 <input id="a-sp" list="a-splist" placeholder="이름 또는 ID 입력 후 선택" value="PIKACHU"><datalist id="a-splist">' + this.spOpts() + '</datalist></label>' +
        '<div class="grid"><label>레벨 <input id="a-lv" type="number" min="1" max="100" value="50"></label><label>성격 <select id="a-nat">' + this.natOpts(rand(25)) + '</select></label>' +
        '<label>특성 <select id="a-ab">' + this.abOpts('PIKACHU') + '</select></label><label>테라 타입 <select id="a-tera">' + this.typeOpts('ELECTRIC') + '</select></label>' +
        '<label>지닌 도구 <input id="a-item" list="a-itemlist" placeholder="예: LEFTOVERS"></label><label>넣을 곳 <select id="a-dest"><option value="box">박스</option><option value="party">파티(가득 차면 박스)</option></select></label></div>' +
        '<div class="row"><label class="chk"><input type="checkbox" id="a-shiny"> 색이 다름(이로치)</label><label class="chk"><input type="checkbox" id="a-gmax"> 거다이맥스 인자</label><label class="chk"><input type="checkbox" id="a-iv" checked> 개체값 최대</label></div>' +
        '<datalist id="a-itemlist">' + this.itemOpts() + '</datalist><button id="a-make" class="wide gold">생성하기</button>';
    } else if (this.tab === 'party') {
      const P = Game.world ? Player.party : [];
      const i = clamp(this.pi || 0, 0, Math.max(0, P.length - 1)); this.pi = i;
      const mon = P[i];
      body = '<label>대상 <select id="a-pi">' + P.map((p, k) => '<option value="' + k + '"' + (k === i ? ' selected' : '') + '>' + (k + 1) + '. ' + esc(p.name) + ' Lv.' + p.level + '</option>').join('') + '</select></label>';
      if (mon) body += '<div class="grid"><label>레벨 <input id="a-plv" type="number" min="1" max="100" value="' + mon.level + '"></label><label>성격 <select id="a-pnat">' + this.natOpts(mon.nature) + '</select></label>' +
        '<label>특성 <select id="a-pab">' + this.abOpts(mon.species, mon.ability) + '</select></label><label>테라 타입 <select id="a-ptera">' + this.typeOpts(mon.tera) + '</select></label>' +
        '<label>지닌 도구 <input id="a-pitem" list="a-itemlist" value="' + (mon.item || '') + '"></label><label>종 변경 <input id="a-psp" list="a-splist" value="' + mon.species + '"></label></div>' +
        '<div class="row"><label class="chk"><input type="checkbox" id="a-pshiny"' + (mon.shiny ? ' checked' : '') + '> 이로치</label><label class="chk"><input type="checkbox" id="a-pgmax"' + (mon.gmaxF ? ' checked' : '') + '> 거다이맥스</label><label class="chk"><input type="checkbox" id="a-pmoves"> 레벨에 맞게 기술 재설정</label></div>' +
        '<datalist id="a-itemlist">' + this.itemOpts() + '</datalist><datalist id="a-splist">' + this.spOpts() + '</datalist>' +
        '<div class="row"><button id="a-papply" class="gold">적용</button><button id="a-pheal">회복</button><button id="a-piv">개체값 최대</button><button id="a-pdel" class="danger">놓아주기</button></div>';
      else body += '<p class="muted">파티가 비어 있거나 게임이 시작되지 않았습니다.</p>';
    } else if (this.tab === 'item') {
      body = '<div class="grid"><label>아이템 <input id="a-it" list="a-itemlist" placeholder="예: RARECANDY"></label><label>개수 <input id="a-itn" type="number" value="10" min="1" max="999"></label></div><datalist id="a-itemlist">' + this.itemOpts() + '</datalist>' +
        '<div class="row"><button id="a-itadd" class="gold">추가</button><button id="a-keys">키 아이템 모두</button><button id="a-balls">볼 세트</button><button id="a-megas">메가스톤 전부</button><button id="a-zs">Z크리스탈 전부</button></div>' +
        '<div class="grid"><label>소지금 <input id="a-money" type="number" value="' + (Game.world ? Player.money : 0) + '"></label><div><button id="a-moneyset">설정</button></div></div>';
    } else {
      const maps = Object.keys(MAPS).concat(Object.keys(INTERIOR_DEFS));
      body = '<div class="grid"><label>배지 개수 <input id="a-badge" type="number" min="0" max="8" value="' + (Game.world ? Player.badges.length : 0) + '"></label><div><button id="a-badgeset">설정</button></div></div>' +
        '<div class="row"><button id="a-healall">파티 전체 회복</button><button id="a-dexseen">도감 전부 발견</button><button id="a-dexall">도감 전부 포획 처리</button></div>' +
        '<div class="row"><button data-flag="megaring">메가링 이벤트 완료</button><button data-flag="origin_done">균열단 사건 해결</button><button data-flag="champion">챔피언 달성</button></div>' +
        '<label>순간이동 <select id="a-map">' + maps.map(k => '<option value="' + k + '">' + esc((MAPS[k] || INTERIOR_DEFS[k]).name) + ' (' + k + ')</option>').join('') + '</select></label><button id="a-warp" class="gold">이동</button>' +
        '<label>야생 배틀 테스트 <input id="a-wsp" list="a-splist" placeholder="종"><datalist id="a-splist">' + this.spOpts() + '</datalist></label><div class="grid"><label>레벨 <input id="a-wlv" type="number" value="30"></label><label>종류 <select id="a-wtype"><option value="">일반</option><option value="dyna">맥스 레이드</option><option value="tera">테라 레이드</option><option value="legend">전설 연출</option></select></label></div><button id="a-wild">배틀 시작</button>';
    }
    m.innerHTML = '<div class="modal"><div class="mh"><b>관리자 도구</b><button id="a-close" class="sm">닫기 ✕</button></div><div class="tabs">' + tabs.map(([k, n]) => '<button data-tab="' + k + '" class="' + (this.tab === k ? 'on' : '') + '">' + n + '</button>').join('') + '</div><div class="mb">' + body + '</div><div class="muted" id="a-msg"></div></div>';
    this.bind();
  },
  bind() {
    const $ = id => document.getElementById(id), v = id => $(id) && $(id).value.trim();
    const on = (id, f) => { const e = $(id); if (e) e.addEventListener('click', f); };
    const spKey = s => { if (!s) return null; if (SPECIES[s.toUpperCase()]) return s.toUpperCase(); const k = Object.keys(SPECIES).find(k => SPECIES[k].name === s && !SPECIES[k].form) || Object.keys(SPECIES).find(k => SPECIES[k].name === s); return k || null; };
    const itKey = s => { if (!s) return null; if (ITEMS[s.toUpperCase()]) return s.toUpperCase(); return Object.keys(ITEMS).find(k => ITEMS[k].name === s) || null; };
    document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { this.tab = b.dataset.tab; this.render(); }));
    on('a-close', () => this.close());
    const sp = $('a-sp'); if (sp) sp.addEventListener('change', () => { const k = spKey(sp.value); if (k) { $('a-ab').innerHTML = this.abOpts(k, (SPECIES[k].ab || [])[0]); $('a-tera').innerHTML = this.typeOpts(SPECIES[k].t[0]); } });
    const setAb = (mon, ab) => { const d = mon.data; const i = (d.ab || []).indexOf(ab); if (i >= 0) { mon.abIdx = i; mon.abHidden = false; } else if ((d.hab || []).includes(ab)) mon.abHidden = true; else { mon.abOverride = ab; } };
    on('a-make', () => {
      if (!this.inGame()) return;
      const k = spKey(v('a-sp')); if (!k) { this.msg('포켓몬을 찾을 수 없습니다.'); return; }
      const lv = clamp(+v('a-lv') || 5, 1, 100);
      const m = new Mon(k, lv, { shiny: $('a-shiny').checked, gmax: $('a-gmax').checked, nature: +v('a-nat'), tera: v('a-tera'), ivs: $('a-iv').checked ? [31, 31, 31, 31, 31, 31] : undefined, ot: Player.name });
      m.ot = Player.name; m.metMap = '관리자'; setAb(m, v('a-ab'));
      const it = itKey(v('a-item')); if (it) m.item = it;
      m.calcStats(); m.hp = m.maxhp;
      Player.seen[baseOf(k)] = Player.caught[baseOf(k)] = true;
      if (v('a-dest') === 'party' && Player.party.length < 6) { Player.party.push(m); Game.world.setupFollower(false); this.msg(m.name + ' Lv.' + lv + ' → 파티'); }
      else { const b = Storage.deposit(m); this.msg(m.name + ' Lv.' + lv + ' → 박스 ' + (b + 1)); }
    });
    const pi = $('a-pi'); if (pi) pi.addEventListener('change', () => { this.pi = +pi.value; this.render(); });
    const mon = () => Player.party[this.pi || 0];
    on('a-papply', () => {
      const m = mon(); if (!m) return;
      const ns = spKey(v('a-psp')); if (ns && ns !== m.species) m.species = ns;
      const lv = clamp(+v('a-plv') || m.level, 1, 100); m.level = lv; m.exp = m.expAt(lv);
      m.nature = +v('a-pnat'); m.tera = v('a-ptera'); m.shiny = $('a-pshiny').checked; m.gmaxF = $('a-pgmax').checked;
      m.abOverride = null; setAb(m, v('a-pab'));
      const it = itKey(v('a-pitem')); m.item = it || null;
      if ($('a-pmoves').checked) m.resetMoves();
      m.calcStats(); m.hp = m.maxhp;
      Game.world && Game.world.setupFollower(true);
      this.msg(m.name + ' 적용 완료'); this.render();
    });
    on('a-pheal', () => { const m = mon(); if (m) { m.heal(); this.msg('회복 완료'); } });
    on('a-piv', () => { const m = mon(); if (m) { m.ivs = [31, 31, 31, 31, 31, 31]; m.calcStats(); m.hp = m.maxhp; this.msg('개체값 최대'); } });
    on('a-pdel', () => { const m = mon(); if (m && Player.party.length > 1 && confirm(m.name + '를 놓아줄까요?')) { Player.party.splice(this.pi, 1); this.pi = 0; Game.world.setupFollower(true); this.render(); } });
    on('a-itadd', () => { if (!this.inGame()) return; const k = itKey(v('a-it')); if (!k) { this.msg('아이템을 찾을 수 없습니다.'); return; } Bag.add(k, clamp(+v('a-itn') || 1, 1, 999)); this.msg(itemName(k) + ' 추가'); });
    on('a-keys', () => { if (!this.inGame()) return; ['MEGARING', 'ZRING', 'DYNAMAXBAND', 'TERAORB', 'REDORB', 'BLUEORB', 'SHINYCHARM', 'EXPSHARE'].forEach(k => ITEMS[k] && !Bag.count(k) && Bag.add(k)); Flags.set('gsball'); this.msg('키 아이템 지급'); });
    on('a-balls', () => { if (!this.inGame()) return; ['POKEBALL', 'GREATBALL', 'ULTRABALL', 'QUICKBALL', 'DUSKBALL', 'NETBALL'].forEach(k => ITEMS[k] && Bag.add(k, 99)); Bag.add('MASTERBALL', 10); this.msg('볼 세트 지급'); });
    on('a-megas', () => { if (!this.inGame()) return; MEGA_STONES.forEach(k => !Bag.count(k) && Bag.add(k)); this.msg('메가스톤 ' + MEGA_STONES.length + '종 지급'); });
    on('a-zs', () => { if (!this.inGame()) return; Object.keys(ITEMS).filter(k => (ITEMS[k].fl || []).includes('ZCrystal')).forEach(k => !Bag.count(k) && Bag.add(k)); this.msg('Z크리스탈 지급'); });
    on('a-moneyset', () => { if (!this.inGame()) return; Player.money = Math.max(0, +v('a-money') || 0); this.msg('소지금 ' + Player.money); });
    on('a-badgeset', () => { if (!this.inGame()) return; const n = clamp(+v('a-badge') || 0, 0, 8); Player.badges = GYM_LEADERS.slice(0, n).map(l => l.badge); this.msg('배지 ' + n + '개'); });
    on('a-healall', () => { if (!this.inGame()) return; Player.party.forEach(m => m.heal()); this.msg('전체 회복'); });
    on('a-dexseen', () => { if (!this.inGame()) return; SPECIES_LIST.forEach(k => Player.seen[k] = true); this.msg('도감 전부 발견'); });
    on('a-dexall', () => { if (!this.inGame()) return; SPECIES_LIST.forEach(k => Player.seen[k] = Player.caught[k] = true); this.msg('도감 전부 포획 처리'); });
    document.querySelectorAll('[data-flag]').forEach(b => b.addEventListener('click', () => { if (!this.inGame()) return; const f = b.dataset.flag; Flags.set(f); if (f === 'megaring') Bag.add('MEGARING'); if (f === 'champion') { Flags.set('origin_done'); } Game.world.refreshEvents(); this.msg(b.textContent); }));
    on('a-warp', () => {
      if (!this.inGame()) return;
      const k = v('a-map'), w = Game.world;
      if (INTERIOR_DEFS[k]) { const d = INTERIOR_DEFS[k]; w.load(k, d.exit[0], d.exit[1] - 1, 'up'); }
      else {
        const d = MAPS[k]; let x = d.spawn ? d.spawn[0] : Math.floor(d.rows[0].length / 2), y = d.spawn ? d.spawn[1] : Math.floor(d.rows.length / 2);
        if (typeof flySpot === 'function' && (d.stamps || []).some(s => s[0] === 'pc')) [x, y] = flySpot(k);
        w.load(k, x, y, 'down');
        const m = w.map; if (!m.passable(x, y, 'down')) outer: for (let r = 1; r < 15; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (m.passable(x + dx, y + dy, 'down') && m.passable(x + dx, y + dy, 'up')) { w.player.x = x + dx; w.player.y = y + dy; w.setupFollower(true); break outer; }
      }
      this.close(); toast((MAPS[k] || INTERIOR_DEFS[k]).name + '(으)로 이동');
    });
    on('a-wild', () => {
      if (!this.inGame()) return;
      const k = spKey(v('a-wsp')); if (!k) { this.msg('종을 입력하세요'); return; }
      const lv = clamp(+v('a-wlv') || 30, 1, 100), t = v('a-wtype');
      this.close();
      Game.world.runScript(() => startBattle({ type: 'wild', foe: [new Mon(k, lv)], raid: t === 'dyna' || t === 'tera' ? t : undefined, legend: t === 'legend' }));
    });
  },
};
// 관리자 특성 지정: 목록에 없는 특성도 강제 지정 가능
let _abp = Mon.prototype; while (_abp && !Object.getOwnPropertyDescriptor(_abp, 'ability')) _abp = Object.getPrototypeOf(_abp);
const _abDesc = Object.getOwnPropertyDescriptor(_abp, 'ability');
Object.defineProperty(Mon.prototype, 'ability', { get() { return this.abOverride || _abDesc.get.call(this); } });
const _tj = Mon.prototype.toJSON;
Mon.prototype.toJSON = function () { const o = _tj.call(this); if (this.abOverride) o.ao = this.abOverride; return o; };
const _fj = Mon.fromJSON;
Mon.fromJSON = function (o) { const m = _fj(o); if (o.ao) m.abOverride = o.ao; return m; };

window.addEventListener('load', () => Panel.init());
