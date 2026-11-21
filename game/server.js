// ============================================================
// server.js - domang.org 서버 연동 (회원 로그인 / 서버 저장)
//   * 서버가 index.html에 <meta name="astera-server">를 넣어줄 때만 동작한다.
//     file:// 나 로컬 http.server로 실행하면 아무것도 바꾸지 않고 기존 로컬 방식 그대로.
//   * Account / SaveSys / Settings 를 감싸서(wrap) 바꾼다. 게임 코드는 그대로 둔다.
//   * localStorage는 그대로 "캐시"로 쓰고, 서버를 원본으로 삼는다.
//     (타이틀의 SaveSys.exists() 같은 동기 코드가 그대로 동작하게 하기 위함)
// ============================================================
'use strict';

const Server = {
  enabled: !!document.querySelector('meta[name="astera-server"]'),
  // 서버 데이터 종류 → localStorage 키
  keys: {
    save: () => SaveSys.KEY,
    cfg: () => Settings.key(),
    opts: () => 'astera_opts'
  },
  timers: {},
  pending: {},
  // 첫 로그인 확인 + 서버 기록 받기가 끝나면 풀리는 Promise
  ready: null,

  async api(url, opts = {}) {
    return fetch(url, { credentials: 'same-origin', cache: 'no-store', ...opts });
  },

  // 로그인 상태 확인 (페이지를 열 때 1번)
  async whoami() {
    try {
      const r = await this.api('/api/pokemon/me');
      const me = r.ok ? await r.json() : { loggedIn: false };
      if (me.loggedIn) { Account.user = me.userId; Account.admin = !!me.isAdmin; }
      else { Account.user = null; Account.admin = false; }
    } catch (e) {
      Account.user = null; Account.admin = false;
    }
  },

  /**
   * 서버 기록을 받아 localStorage에 반영
   * save는 더 최근 것을 쓰고(_savedAt 비교), cfg/opts는 서버 값이 있으면 서버 값 사용
   */
  async pullAll() {
    if (!Account.user) return;
    for (const kind of Object.keys(this.keys)) {
      try {
        const r = await this.api('/api/astera/data/' + kind);
        if (!r.ok) continue;
        const server = await r.json();
        const key = this.keys[kind]();
        if (kind === 'save') {
          let local = null;
          try { local = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { }
          if (local && (local._savedAt || 0) > (server._savedAt || 0)) {
            // 이 브라우저 기록이 더 최근이면 서버로 올림 (오프라인 중 저장한 경우)
            this.push('save', true);
            continue;
          }
        }
        localStorage.setItem(key, JSON.stringify(server));
      } catch (e) { console.warn('[서버] ' + kind + ' 불러오기 실패', e); }
    }
  },

  /**
   * localStorage의 현재 값을 서버로 올림 (짧게 모아서 1번)
   */
  push(kind, immediate = false) {
    if (!this.enabled || !Account.user) return;
    clearTimeout(this.timers[kind]);
    this.pending[kind] = true;
    const run = () => this._upload(kind);
    if (immediate) run(); else this.timers[kind] = setTimeout(run, 1200);
  },

  async _upload(kind) {
    const raw = localStorage.getItem(this.keys[kind]());
    if (!raw) return;
    try {
      const r = await this.api('/api/astera/data/' + kind, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw
      });
      if (r.ok) { this.pending[kind] = false; return; }
      if (r.status === 401) { toast('로그인이 만료되었습니다. 이 브라우저에만 저장됩니다.'); Account.user = null; Account.admin = false; Panel.render(); }
      else toast('서버 저장 실패 (' + r.status + ')');
    } catch (e) {
      toast('서버에 연결하지 못해 이 브라우저에만 저장했습니다.');
    }
  }
};
window.Server = Server;

if (Server.enabled) {
  // ── 에셋 주소에 서버가 알려준 에셋 버전을 붙임 ──
  // 예전에 받은 응답(특히 "파일 없음" 404)을 브라우저/Cloudflare가 기억하고 있어도 새 주소라 다시 받아옴
  const assetRev = (document.querySelector('meta[name="astera-assets"]') || {}).content;
  if (assetRev && typeof assetURL === 'function') {
    const _assetURL = assetURL;
    // eslint-disable-next-line no-global-assign
    assetURL = function (p) { return _assetURL(p) + '?r=' + assetRev; };
  }

  // ── 계정: 사이트 회원 계정으로 로그인 (하드코딩 관리자 계정은 서버에서는 쓰지 않음) ──
  Account.builtin = {};
  Account.restore = function () { /* 서버 모드에서는 Server.whoami()가 대신함 */ };
  Account.loginAsync = async function (id, pw) {
    const r = await Server.api('/api/astera/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, pw })
    });
    const j = await r.json().catch(() => ({ ok: false, error: '서버 응답 오류' }));
    if (!j.ok) return j.error || '로그인 실패';
    this.user = j.userId; this.admin = !!j.isAdmin;
    await Server.pullAll();
    return null;
  };
  Account.logoutAsync = async function () {
    try { await Server.api('/api/astera/logout', { method: 'POST' }); } catch (e) { }
    this.user = null; this.admin = false;
  };

  // ── 저장: 기존 저장 후 시각을 붙여 서버로 올림 ──
  const _save = SaveSys.save.bind(SaveSys);
  SaveSys.save = function () {
    _save();
    try {
      const p = JSON.parse(localStorage.getItem(this.KEY));
      p._savedAt = Date.now();
      localStorage.setItem(this.KEY, JSON.stringify(p));
    } catch (e) { }
    Server.push('save', true);
  };
  const _saveOptions = SaveSys.saveOptions.bind(SaveSys);
  SaveSys.saveOptions = function () { _saveOptions(); Server.push('opts'); };
  const _settingsSave = Settings.save.bind(Settings);
  Settings.save = function () { _settingsSave(); Server.push('cfg'); };

  // ── 패널: 로그인/가입/로그아웃 버튼을 서버용으로 교체 ──
  const replaceClick = (id, fn) => {
    const el = document.getElementById(id);
    if (!el) return;
    const clone = el.cloneNode(true);
    el.replaceWith(clone);
    clone.addEventListener('click', fn);
  };
  const _bind = Panel.bind.bind(Panel);
  Panel.bind = function () {
    _bind();
    const $ = id => document.getElementById(id);
    // 회원가입은 사이트 가입 페이지에서 (이메일 인증 등 사이트 규칙을 그대로 따름)
    replaceClick('p-tosignup', () => window.open('/metasearch/register', '_blank'));
    replaceClick('p-login', async () => {
      const err = await Account.loginAsync($('p-id').value.trim(), $('p-pw').value);
      if (err) { $('p-err').textContent = err; return; }
      // 타이틀 화면이면 새로고침해서 계정 기록으로 "이어서 하기"를 다시 판단
      if (!Game.world) { location.reload(); return; }
      Settings.load(); toast(Account.user + '님 환영합니다!'); this.render();
    });
    replaceClick('p-logout', async () => {
      await Account.logoutAsync();
      if (!Game.world) { location.reload(); return; }
      Settings.load(); toast('로그아웃했습니다'); this.render();
    });
    // 로그인 칸 안내 문구를 서버 기준으로
    const pw = $('p-pw');
    if (pw && !$('p-dosignup')) {
      const note = this.el.querySelector('section .muted');
      if (note) note.textContent = 'domang.org 회원 아이디로 로그인하세요. 로그인하면 기록과 설정이 계정에 저장되어 다른 기기에서도 이어서 할 수 있습니다.';
    }
  };

  // 창을 닫기 직전에 아직 못 올린 기록을 보냄
  window.addEventListener('pagehide', () => {
    if (!Account.user) return;
    for (const kind of Object.keys(Server.pending)) {
      if (!Server.pending[kind]) continue;
      const raw = localStorage.getItem(Server.keys[kind]());
      if (raw) navigator.sendBeacon('/api/astera/data/' + kind, new Blob([raw], { type: 'application/json' }));
    }
  });

  // 스크립트가 실행되자마자 로그인 확인 + 서버 기록 받기 시작 (타이틀이 뜨기 전에 끝나도록)
  Server.ready = (async () => { await Server.whoami(); await Server.pullAll(); })();
  // 패널이 처음 그려질 때 로그인 상태가 반영되도록, 확인이 끝나면 다시 그림
  Server.ready.then(() => {
    // 개발용 주소 옵션(?test=1, ?view=)은 관리자만 사용 (boot가 주소를 읽기 전에 지움)
    if (!Account.admin && /[?&](test|view)=/.test(location.search)) {
      history.replaceState(null, '', location.pathname);
      toast('개발용 옵션은 관리자 계정만 사용할 수 있습니다');
    }
    Settings.load();
    // 서버에서 받은 음량/텍스트 옵션을 타이틀 단계에서 바로 반영
    if (!Game.world) {
      Player.options = loadOptions();
      if (Player.options.bgmVol !== undefined) Audio2.vol = Player.options.bgmVol;
      if (Player.options.seVol !== undefined) Audio2.seVol = Player.options.seVol;
    }
    Panel.render && Panel.render();
  });
  // ── 관리자 선물 받기 ──
  //   관리자가 보낸 포켓몬/도구가 서버 선물함에 있으면, 필드에 있을 때 받아서 파티(가득 차면 박스)에 넣고 바로 저장
  //   게임을 켠 직후와 이후 30초마다 확인
  Server.claimGifts = async function () {
    if (!Account.user || this._claiming) return;
    const w = Game.world;
    if (!w || Game.scene !== w || w.busy || Game.ui.length || !Player.party || !Player.party.length) return;
    this._claiming = true;
    try {
      const r = await this.api('/api/astera/gifts/claim', { method: 'POST' });
      if (!r.ok) return;
      const list = ((await r.json()) || {}).list || [];
      if (!list.length) return;
      const got = [];
      for (const g of list) {
        if (g.mon && SPECIES[g.mon.s]) {
          const m = Mon.fromJSON(g.mon);
          if (!m.ot) m.ot = Player.name;
          if (!m.metMap) m.metMap = '관리자 선물';
          givePokemon(m);
          got.push((m.shiny ? '★' : '') + m.name + ' Lv.' + m.level);
        }
        for (const [id, n] of Object.entries(g.items || {})) {
          if (!ITEMS[id]) continue;
          if (n > 0 && !(ITEMS[id].pk === 8 && Bag.count(id))) Bag.add(id, n);   // 중요한 물건은 1개만
          got.push(itemName(id) + (n > 1 ? ' ' + n + '개' : ''));
        }
      }
      SaveSys.save();   // 받은 즉시 저장 (서버에서도 선물함은 이미 비워짐)
      if (got.length) w.runScript(async () => {
        Audio2.playME('Pkmn get');
        await say(['관리자에게서 선물이 도착했다!', Player.name + '은(는) ' + got.join(', ') + '을(를) 받았다!']);
      });
    } catch (e) { console.warn('[선물] 받기 실패', e); }
    finally { this._claiming = false; }
  };
  // ── 관리자가 내 기록을 고쳤는지 확인 ──
  //   /pokeadmin 에서 수정하면 서버에 수정 시각이 남음. 플레이 중에 이 시각이 바뀌면
  //   이 브라우저의 (수정 전) 기록을 서버에 올리지 않고, 수정본을 받아 다시 시작 → 관리자 수정이 덮어써지지 않음
  Server.adminSeen = null;   // 페이지를 연 시점의 수정 시각 (이미 반영된 것)
  Server.checkAdminEdit = async function (knownTs) {
    if (!Account.user || this.reloading) return;
    try {
      let ts = knownTs;
      if (ts === undefined) {
        const r = await this.api('/api/astera/adminedit');
        if (!r.ok) return;
        ts = ((await r.json()) || {}).ts || 0;
      }
      if (this.adminSeen === null) { this.adminSeen = ts; return; }
      if (ts <= this.adminSeen) return;
      // 필드에 있을 때(전투·대화 중 아님)만 다시 불러옴
      const w = Game.world;
      if (w && (Game.scene !== w || w.busy || Game.ui.length)) return;
      this.reloading = true;
      // 아직 못 올린 이 브라우저 기록은 버림 (수정본을 덮어쓰지 않게)
      Object.keys(this.timers).forEach(k => clearTimeout(this.timers[k]));
      this.pending = {};
      const s = await this.api('/api/astera/data/save');
      if (s.ok) localStorage.setItem(this.keys.save(), await s.text());
      toast('관리자가 기록을 수정했습니다. 수정된 기록으로 다시 불러옵니다.');
      setTimeout(() => location.reload(), 1500);
    } catch (e) { console.warn('[관리자 수정 확인] 실패', e); }
  };
  // 다시 불러오는 중에는 서버로 올리지 않음
  const _push = Server.push.bind(Server);
  Server.push = function (kind, immediate) { if (this.reloading) return; return _push(kind, immediate); };

  // ── 휴대폰·전체화면용 로그인 버튼 ──
  //   휴대폰에서는 설정 패널(로그인 칸)이 숨겨져 있어서, 로그인 안 했으면 화면 위에 버튼을 띄워 /signin 으로 보냄
  Server.ready.then(() => {
    if (Account.user) return;
    const a = document.createElement('a');
    a.id = 'login-fab';
    a.href = '/signin?returnUrl=' + encodeURIComponent('/pokemon');
    a.textContent = '로그인하고 기록 저장';
    a.style.cssText = 'position:fixed;top:calc(8px + env(safe-area-inset-top,0px));right:8px;z-index:16;background:#e53935;color:#fff;font:600 13px sans-serif;padding:8px 12px;border-radius:10px;text-decoration:none;box-shadow:0 2px 10px rgba(0,0,0,.4);display:none';
    document.body.appendChild(a);
    // 휴대폰이거나 전체화면일 때만 (PC 일반 화면은 오른쪽 패널에 로그인 칸이 있음)
    const upd = () => { const b = document.body.classList; a.style.display = (b.contains('mobile') || b.contains('fs')) ? 'block' : 'none'; };
    upd(); setInterval(upd, 1000);
  });

  // ── 주기 확인 (30초) : 요청 1번으로 관리자 수정 시각·선물 수·소포 수를 받음 ──
  //   예전: 30초마다 선물 받기 시도 + 수정 시각 확인 = 요청 2번 (접속자가 많으면 라즈베리파이에 부담)
  //   지금: 요청 1번, 선물이 있을 때만 받기 요청. 탭을 안 보고 있으면 건너뜀
  Server.poll = async function () {
    if (!Account.user || this.reloading || document.hidden) return;
    try {
      const r = await this.api('/api/astera/poll');
      if (!r.ok) return;
      const j = await r.json();
      await this.checkAdminEdit(j.ts || 0);
      if (j.gifts > 0) await this.claimGifts();
      if (window.Parcels) {
        Parcels.waiting = j.parcels || 0;
        const w = Game.world, c = w && w.key === 'PC' && w.chars.find(x => x.id === 'parcel_man');
        if (c) c.parcelMark = Parcels.waiting > 0;
      }
    } catch (e) { }
  };
  setInterval(() => Server.poll(), 30000);
  // 탭으로 돌아오면 바로 한 번 확인
  document.addEventListener('visibilitychange', () => { if (!document.hidden) Server.poll(); });
  Server.ready.then(() => { Server.checkAdminEdit(); setTimeout(() => Server.poll(), 4000); });   // 시작 시점 수정 시각을 기준으로 기억

  // 시작 시 폰트 로딩 단계에서 서버 확인도 같이 기다림 → 타이틀의 "이어서 하기" 판단 전에 기록이 준비됨
  const _loadFonts = loadFonts;
  // eslint-disable-next-line no-global-assign
  loadFonts = function () { return Promise.all([_loadFonts(), Server.ready]); };
}
