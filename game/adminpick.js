// ============================================================
// adminpick.js - 관리자 포켓몬 선택기(검색형) + 치트 켜짐 표시
//   * 기존 datalist는 기본값 "PIKACHU"가 들어 있어서 목록이 피카츄로만 걸러지는 문제가 있었음
//     (브라우저가 입력값으로 datalist를 필터링 → 지우지 않으면 피카츄 계열만 보임)
//   * 한국어 이름 / 영문 ID / 도감 번호 일부로 검색, 아이콘과 함께 목록 표시
//   * 포켓몬 생성(a-sp), 종 변경(a-psp), 야생 배틀 테스트(a-wsp) 세 칸 모두 적용
//   * admin.js 다음에 불러와야 함 (Admin.render, Cheats 사용)
// ============================================================
'use strict';

const SpeciesPicker = {
  // 검색용 목록 (한 번만 만듦): 기본 종 + 폼
  _all: null,
  all() {
    if (this._all) return this._all;
    const mk = (k, form) => ({ k, n: SPECIES[k].n, name: SPECIES[k].name, en: (SPECIES[k].en || k).toUpperCase(), form });
    const base = SPECIES_LIST.map(k => mk(k, ''));
    const forms = Object.keys(SPECIES).filter(k => SPECIES[k].form).map(k => mk(k, SPECIES[k].fname || k));
    this._all = base.concat(forms);
    return this._all;
  },
  // 검색: 빈 칸이면 도감 순서 앞부분, 아니면 이름/ID/번호 부분 일치 (정확히 일치 → 앞부분 일치 → 포함 순)
  search(q) {
    q = (q || '').trim();
    const L = this.all();
    if (!q) return L;   // 빈 칸이면 모든 포켓몬(폼 포함) 전부
    const u = q.toUpperCase(), num = /^\d+$/.test(q) ? +q : null;
    const score = e => {
      if (num !== null) return e.n === num ? (e.form ? 1 : 0) : String(e.n).startsWith(q) ? 5 : -1;
      if (e.k === u || e.name === q) return e.form ? 1 : 0;
      if (e.name.startsWith(q) || e.k.startsWith(u) || e.en.startsWith(u)) return e.form ? 3 : 2;
      if (e.name.includes(q) || e.k.includes(u) || e.en.includes(u) || (e.form && e.form.includes(q))) return e.form ? 5 : 4;
      return -1;
    };
    return L.map(e => [score(e), e]).filter(a => a[0] >= 0)
      .sort((a, b) => a[0] - b[0] || a[1].n - b[1].n)
      .map(a => a[1]);   // 검색 결과도 개수 제한 없음
  },
  // 아이콘 주소 (폼 아이콘이 없으면 두 번째 배경인 기본 종 아이콘이 보임)
  icon(k) { return assetURL('Graphics/Pokemon/Icons/' + k + '.png'); },
  iconBase(k) { return assetURL('Graphics/Pokemon/Icons/' + (typeof baseOf === 'function' ? baseOf(k) : k) + '.png'); },

  // 입력칸 하나에 선택기를 붙임
  attach(input, opts = {}) {
    if (!input || input._picker) return;
    input._picker = true;
    input.removeAttribute('list');           // 브라우저 datalist 대신 직접 만든 목록 사용
    input.setAttribute('autocomplete', 'off');
    if (opts.clear) { input.value = ''; }
    input.placeholder = '이름·ID·도감번호로 검색 (예: 리자몽, MEWTWO, 150)';

    // 선택된 종 표시줄
    const tag = document.createElement('div');
    tag.className = 'muted sp-tag';
    input.insertAdjacentElement('afterend', tag);
    const showTag = () => {
      const k = (input.value || '').trim().toUpperCase();
      const d = SPECIES[k];
      tag.textContent = d ? '선택됨: No.' + d.n + ' ' + d.name + (d.form ? ' [' + (d.fname || k) + ']' : '') + ' (' + k + ')'
        : (input.value ? '↓ 목록에서 골라 주세요 (Enter = 맨 위)' : '');
    };

    // 결과 목록 상자
    const box = document.createElement('div');
    box.className = 'sp-box';
    box.hidden = true;
    tag.insertAdjacentElement('afterend', box);
    let items = [], cur = 0;

    const pickItem = e => {
      input.value = e.k; box.hidden = true; showTag();
      input.dispatchEvent(new Event('change', { bubbles: true }));   // 특성/테라 목록 갱신용
    };
    const renderBox = () => {
      items = this.search(input.value);
      cur = Math.min(cur, Math.max(0, items.length - 1));
      if (!items.length) { box.innerHTML = '<div class="sp-none">찾는 포켓몬이 없습니다</div>'; box.hidden = false; return; }
      box.innerHTML = items.map((e, i) =>
        '<div class="sp-it' + (i === cur ? ' on' : '') + '" data-i="' + i + '">' +
        // 목록이 길어서(1500개 이상) 화면에 보이는 아이콘만 불러오도록 lazy 이미지 사용, 폼 아이콘이 없으면 기본 종 아이콘
        '<img class="sp-ic" loading="lazy" src="' + this.icon(e.k) + '" data-fb="' + this.iconBase(e.k) + '" onerror="this.onerror=null;this.src=this.dataset.fb" alt="">' +
        '<span class="sp-no">' + String(e.n).padStart(4, '0') + '</span><b>' + esc(e.name) + '</b>' +
        (e.form ? '<span class="sp-fm">' + esc(e.form) + '</span>' : '') +
        '<span class="sp-k">' + e.k + '</span></div>').join('');
      box.hidden = false;
      const on = box.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' });
    };

    // mousedown으로 고름 (blur보다 먼저 일어나야 목록이 닫히기 전에 선택됨)
    box.addEventListener('mousedown', ev => {
      const it = ev.target.closest('.sp-it'); if (!it) return;
      ev.preventDefault(); pickItem(items[+it.dataset.i]);
    });
    // 터치 기기: touchend에서도 선택
    box.addEventListener('touchend', ev => {
      const it = ev.target.closest('.sp-it'); if (!it) return;
      ev.preventDefault(); pickItem(items[+it.dataset.i]);
    });
    input.addEventListener('focus', () => { input.select(); cur = 0; renderBox(); });
    input.addEventListener('input', () => { cur = 0; renderBox(); showTag(); });
    input.addEventListener('blur', () => setTimeout(() => { box.hidden = true; }, 150));
    input.addEventListener('keydown', ev => {
      ev.stopPropagation();                  // 게임 키 입력으로 새지 않게
      if (ev.key === 'ArrowDown') { if (box.hidden) renderBox(); else cur = Math.min(items.length - 1, cur + 1); renderBox(); ev.preventDefault(); }
      else if (ev.key === 'ArrowUp') { cur = Math.max(0, cur - 1); renderBox(); ev.preventDefault(); }
      else if (ev.key === 'Enter') { if (!box.hidden && items[cur]) { pickItem(items[cur]); ev.preventDefault(); } }
      else if (ev.key === 'Escape') { box.hidden = true; }
    });
    showTag();
  }
};
window.SpeciesPicker = SpeciesPicker;

// ── 선택기 모양 + 치트 표시 모양 ──
{
  const st = document.createElement('style');
  st.textContent =
    '#admin .sp-box{max-height:240px;overflow-y:auto;background:#0d1124;border:1px solid #3a4a80;border-radius:6px;margin-top:2px}' +
    '#admin .sp-it{display:flex;align-items:center;gap:8px;padding:1px 8px;cursor:pointer;font-size:13px}' +
    '#admin .sp-it.on,#admin .sp-it:hover{background:#2c3870}' +
    // 아이콘 이미지는 64x64 프레임 2개(128x64) → 첫 프레임만 40x40으로 보이게
    '#admin .sp-ic{width:40px;height:34px;flex:none;object-fit:cover;object-position:0 -4px;image-rendering:pixelated}' +
    '#admin .sp-no{color:#8890b0;font-variant-numeric:tabular-nums;width:36px}' +
    '#admin .sp-fm{color:#f8d030;font-size:11px}#admin .sp-k{margin-left:auto;color:#667;font-size:11px}' +
    '#admin .sp-none{padding:8px;color:#8890b0}#admin .sp-tag{min-height:16px;color:#9fd29f}' +
    '#cheat-badge{position:fixed;top:8px;left:8px;z-index:14;background:rgba(160,48,48,.88);color:#fff;font-size:12px;padding:3px 9px;border-radius:6px;pointer-events:none;display:none;max-width:60vw}';
  document.head.appendChild(st);
}

// ── Admin.render 뒤에 선택기 붙이기 (치트 탭 wrapper까지 포함해 모든 탭에 적용) ──
{
  const _render = Admin.render.bind(Admin);
  Admin.render = function () {
    _render();
    addGiftControls();
    SpeciesPicker.attach(document.getElementById('a-sp'), { clear: true });
    SpeciesPicker.attach(document.getElementById('a-psp'));
    SpeciesPicker.attach(document.getElementById('a-wsp'), { clear: true });
  };
}

// ── 치트가 켜져 있으면 화면 왼쪽 위에 빨간 표시 ──
//   ("야생 포켓몬 안 나옴"을 켜 둔 걸 잊고 풀숲에서 포켓몬이 안 나온다고 착각하는 일 방지)
{
  const badge = document.createElement('div');
  badge.id = 'cheat-badge';
  const put = () => document.body.appendChild(badge);
  if (document.body) put(); else window.addEventListener('DOMContentLoaded', put);
  let last = '';
  setInterval(() => {
    const on = Cheats.list.filter(([k]) => Cheats.on(k)).map(([, n]) => n);
    const s = on.length ? '치트 ON · ' + on.join(' · ') : '';
    if (s === last) return;
    last = s;
    badge.textContent = s;
    badge.style.display = s ? 'block' : 'none';
  }, 700);
}

// ── 다른 계정에 보내기 (포켓몬 생성 탭) ──
//   위 칸에서 고른 포켓몬/레벨/이로치 등을 그대로 만들어 서버 선물함으로 보냄 (/api/astera/admin/gift)
//   받는 사람은 게임을 켜고 필드에 있으면 30초 안에 자동으로 받음
function addGiftControls() {
  const make = document.getElementById('a-make');
  if (!make || document.getElementById('a-gift')) return;
  const box = document.createElement('div');
  box.innerHTML =
    '<div class="grid"><label>다른 계정에 보내기 <input id="a-to" placeholder="받는 회원 아이디 (예: ks1017ks)"></label>' +
    '<div><label class="chk"><input type="checkbox" id="a-band"> 다이맥스 밴드도 같이</label></div></div>' +
    '<button id="a-gift" class="wide">이 포켓몬을 그 계정에 보내기</button>' +
    '<div class="muted">서버(domang.org)에서만 동작. 받는 사람이 게임을 켜고 필드에 있으면 자동으로 받습니다.</div>';
  make.insertAdjacentElement('afterend', box);
  document.getElementById('a-gift').addEventListener('click', async () => {
    const v = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };
    const to = v('a-to').toLowerCase();
    if (!to) { Admin.msg('받는 회원 아이디를 입력하세요.'); return; }
    if (!window.Server || !Server.enabled) { Admin.msg('서버에서 열었을 때만 보낼 수 있습니다.'); return; }
    // 생성 탭과 같은 방식으로 포켓몬 만들기
    const raw = v('a-sp'), up = raw.toUpperCase();
    const k = SPECIES[up] ? up : Object.keys(SPECIES).find(s => SPECIES[s].name === raw);
    if (!k) { Admin.msg('포켓몬을 목록에서 골라 주세요.'); return; }
    const lv = clamp(+v('a-lv') || 5, 1, 100);
    const m = new Mon(k, lv, {
      shiny: document.getElementById('a-shiny').checked, gmax: document.getElementById('a-gmax').checked,
      nature: +v('a-nat'), tera: v('a-tera'),
      ivs: document.getElementById('a-iv').checked ? [31, 31, 31, 31, 31, 31] : undefined
    });
    m.ot = null; m.metMap = '관리자 선물';
    const it = v('a-item').toUpperCase(); if (ITEMS[it]) m.item = it;
    m.calcStats(); m.hp = m.maxhp;
    const gift = { mon: m.toJSON(), items: {}, from: Account.user, at: Date.now() };
    if (document.getElementById('a-band').checked) gift.items.DYNAMAXBAND = 1;
    try {
      const r = await Server.api('/api/astera/admin/gift', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, gift }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { Admin.msg('보내기 실패: ' + (j.error || r.status)); return; }
      Admin.msg((m.shiny ? '★' : '') + m.name + ' Lv.' + lv + (gift.items.DYNAMAXBAND ? ' + 다이맥스 밴드' : '') + ' → ' + j.to + ' 선물함에 넣었습니다');
    } catch (e) { Admin.msg('서버에 연결하지 못했습니다.'); }
  });
}

// ============================================================
// 관리자 도구 "기술" 탭: 파티 포켓몬의 기술 4개를 직접 고르기
//   배울 수 있는 기술(레벨업 · 기술머신/가르침 · 진화 전 모습의 기술) 또는 모든 기술 중에서 선택
// ============================================================
// 이 포켓몬이 배울 수 있는 기술 (원작 데이터 기준) → { id: '레벨업 Lv.16' 같은 설명 }
function learnableMoves(sp) {
  const out = {};
  const add = (id, why) => { if (MOVES[id] && !out[id]) out[id] = why; };
  let s = sp, guard = 0;
  while (s && SPECIES[s] && guard++ < 4) {
    const d = SPECIES[s], pre = s !== sp ? ' (' + d.name + ')' : '';
    (d.mv || []).forEach(([lv, id]) => add(id, (lv === 0 ? '진화 시' : '레벨업 Lv.' + lv) + pre));
    (d.tm || []).forEach(id => add(id, '기술머신·가르침' + pre));
    s = typeof PREVO !== 'undefined' ? PREVO[s.replace(/_\d+$/, '')] : null;   // 진화 전 모습
  }
  return out;
}
window.learnableMoves = learnableMoves;

{
  const _render = Admin.render.bind(Admin);
  Admin.render = function () {
    _render();
    const m = document.getElementById('admin'); if (!m) return;
    const tabs = m.querySelector('.tabs');
    const btn = document.createElement('button');
    btn.textContent = '기술';
    btn.className = this.tab === 'moves' ? 'on' : '';
    btn.addEventListener('click', () => { this.tab = 'moves'; this.render(); });
    tabs.appendChild(btn);
    if (this.tab !== 'moves') return;
    tabs.querySelectorAll('button').forEach(b => { if (b !== btn) b.classList.remove('on'); });
    const mb = m.querySelector('.mb');
    const P = Game.world ? Player.party : [];
    if (!P.length) { mb.innerHTML = '<p class="muted">게임을 시작하고 파티에 포켓몬이 있어야 합니다.</p>'; return; }
    const i = clamp(this.mvi || 0, 0, P.length - 1); this.mvi = i;
    const mon = P[i], learn = learnableMoves(mon.species), all = !!this.mvAll;
    const ids = all ? Object.keys(MOVES).filter(k => !/^(MAX|GMAX)/.test(k)) : Object.keys(learn);
    ids.sort((a, b) => MOVES[a].name.localeCompare(MOVES[b].name, 'ko'));
    const opt = (cur) => '<option value="">(비움)</option>' + ids.map(id =>
      '<option value="' + id + '"' + (id === cur ? ' selected' : '') + '>' + esc(MOVES[id].name) + ' · ' + typeName(MOVES[id].t) + (learn[id] ? ' · ' + learn[id] : (all ? ' · 원래는 못 배움' : '')) + '</option>').join('');
    mb.innerHTML =
      '<label>대상 <select id="a-mvi">' + P.map((p, k) => '<option value="' + k + '"' + (k === i ? ' selected' : '') + '>' + (k + 1) + '. ' + esc(p.name) + ' Lv.' + p.level + '</option>').join('') + '</select></label>' +
      '<label class="chk"><input type="checkbox" id="a-mvall"' + (all ? ' checked' : '') + '> 모든 기술 보기 (원래 못 배우는 기술 포함)</label>' +
      '<div class="muted">배울 수 있는 기술 ' + Object.keys(learn).length + '개 · 레벨업 / 기술머신·가르침 / 진화 전 모습 기준</div>' +
      [0, 1, 2, 3].map(k => {
        const cur = mon.moves[k] ? mon.moves[k].id : '';
        return '<label>기술 ' + (k + 1) + (cur ? ' <span class="muted">PP ' + mon.moves[k].pp + '/' + mon.moves[k].max + '</span>' : '') + ' <select data-slot="' + k + '">' + opt(cur) + '</select></label>';
      }).join('') +
      '<div class="row"><button id="a-mvapply" class="gold">적용</button><button id="a-mvpp">PP 전부 회복</button><button id="a-mvreset">레벨에 맞게 다시 배우기</button></div>';
    const $ = id => document.getElementById(id);
    $('a-mvi').addEventListener('change', e => { this.mvi = +e.target.value; this.render(); });
    $('a-mvall').addEventListener('change', e => { this.mvAll = e.target.checked; this.render(); });
    $('a-mvapply').addEventListener('click', () => {
      const pick = [...mb.querySelectorAll('[data-slot]')].map(s => s.value).filter(Boolean);
      const uniq = [...new Set(pick)];
      if (!uniq.length) { this.msg('기술을 하나 이상 고르세요.'); return; }
      // 이미 있던 기술은 PP 유지, 새 기술은 PP 가득
      mon.moves = uniq.slice(0, 4).map(id => mon.moves.find(x => x.id === id) || Mon.makeMove(id));
      this.msg(mon.name + '의 기술: ' + mon.moves.map(x => MOVES[x.id].name).join(', ')); this.render();
    });
    $('a-mvpp').addEventListener('click', () => { mon.moves.forEach(x => x.pp = x.max); this.msg('PP 회복'); this.render(); });
    $('a-mvreset').addEventListener('click', () => { mon.resetMoves(); this.msg(mon.name + ' 기술을 레벨 ' + mon.level + '에 맞게 다시 배웠습니다'); this.render(); });
  };
}

// ============================================================
// 오류 표시 + 관리자 도구 "진단" 탭
//   야생 포켓몬이 안 나오거나 트레이너가 승부를 안 걸거나 배틀이 멈출 때 원인을 바로 보기 위함
// ============================================================
const GameErrors = { list: [] };
window.GameErrors = GameErrors;
{
  const push = (msg) => {
    msg = String(msg || '').slice(0, 300);
    if (!msg || GameErrors.list.length && GameErrors.list[GameErrors.list.length - 1].msg === msg) return;
    GameErrors.list.push({ at: new Date().toLocaleTimeString('ko-KR'), msg });
    if (GameErrors.list.length > 20) GameErrors.list.shift();
    // 화면 위 빨간 알림 (5초)
    let el = document.getElementById('err-toast');
    if (!el) { el = document.createElement('div'); el.id = 'err-toast'; el.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:60;max-width:90vw;background:rgba(160,30,30,.95);color:#fff;font:12px/1.5 monospace;padding:8px 12px;border-radius:8px;white-space:pre-wrap;pointer-events:none'; document.body.appendChild(el); }
    el.textContent = '게임 오류: ' + msg.split('\n')[0];
    el.style.display = 'block';
    clearTimeout(el._t); el._t = setTimeout(() => { el.style.display = 'none'; }, 5000);
  };
  const _ce = console.error;
  console.error = function (...a) { try { push(a.map(x => x && x.stack || String(x)).join(' ')); } catch (e) { } return _ce.apply(console, a); };
  window.addEventListener('error', e => push(e.message + (e.filename ? ' @' + e.filename.split('/').pop() + ':' + e.lineno : '')));
  window.addEventListener('unhandledrejection', e => push(e.reason && e.reason.stack || e.reason));
}

{
  const _render = Admin.render.bind(Admin);
  Admin.render = function () {
    _render();
    const m = document.getElementById('admin'); if (!m) return;
    const tabs = m.querySelector('.tabs');
    const btn = document.createElement('button');
    btn.textContent = '진단';
    btn.className = this.tab === 'diag' ? 'on' : '';
    btn.addEventListener('click', () => { this.tab = 'diag'; this.render(); });
    tabs.appendChild(btn);
    if (this.tab !== 'diag') return;
    tabs.querySelectorAll('button').forEach(b => { if (b !== btn) b.classList.remove('on'); });
    const w = Game.world, P = Player;
    const yes = v => v ? '<b style="color:#ff7070">예</b>' : '아니오';
    const cheats = Cheats.list.filter(([k]) => Cheats.on(k)).map(([, n]) => n);
    const lead = P.party.find(mn => !mn.fainted);
    const rows = [
      ['켜진 관리자 치트', cheats.length ? '<b style="color:#ff7070">' + cheats.join(', ') + '</b>' : '없음'],
      ['스크립트 실행 중(busy)', w ? yes(w.busy) : '-'],
      ['열린 창 수', Game.ui.length],
      ['현재 화면', Game.scene ? Game.scene.constructor.name : '-'],
      ['게임 루프 처리 중', yes(Game._stepping)],
      ['배속', Game.speed + '배'],
      ['현재 맵', w ? (w.def.name + ' (' + w.key + ')') : '-'],
      ['이 맵 야생 출현', w ? (w.def.encounters ? '있음 (Lv.' + w.def.encounters.min + '~' + w.def.encounters.max + ')' : '<b style="color:#ff7070">없음</b>') : '-'],
      ['발밑이 풀숲', w ? yes(w.map.terrain(w.player.x, w.player.y) === 2).replace('예', '예(풀숲)') : '-'],
      ['스프레이 남은 걸음', P.repel ? '<b style="color:#ff7070">' + P.repel + '</b> (선두보다 레벨 낮은 야생은 안 나옴)' : '0'],
      ['싸울 수 있는 포켓몬', lead ? lead.name + ' Lv.' + lead.level + ' HP ' + lead.hp + '/' + lead.maxhp : '<b style="color:#ff7070">없음 (전원 기절)</b>'],
      ['이 맵 트레이너', w ? w.chars.filter(c => c.kind === 'trainer').map(c => c.data.name + (P.defeated[c.id] ? '(이김)' : '')).join(', ') || '없음' : '-'],
      ['걸음 수(이번 맵)', w ? w.stepCount : '-']
    ];
    const errs = GameErrors.list.slice(-8).reverse().map(e => '<div style="font:11px monospace;color:#ffb0b0;white-space:pre-wrap;margin:2px 0">[' + e.at + '] ' + esc(e.msg) + '</div>').join('') || '<div class="muted">없음</div>';
    m.querySelector('.mb').innerHTML =
      '<table class="keys">' + rows.map(([a, v]) => '<tr><td>' + a + '</td><td style="color:#dde">' + v + '</td></tr>').join('') + '</table>' +
      '<div style="margin-top:8px"><b>최근 오류</b>' + errs + '</div>' +
      '<div class="row"><button id="a-unstick" class="gold">막힌 상태 풀기</button><button id="a-diag-refresh">새로고침</button></div>' +
      '<p class="muted">"막힌 상태 풀기": 치트 전부 끄기 + 실행 중 표시 해제 + 열린 창 닫기 + 스프레이 해제. 이 화면을 캡처해서 보내 주시면 원인을 바로 찾을 수 있습니다.</p>';
    document.getElementById('a-diag-refresh').addEventListener('click', () => this.render());
    document.getElementById('a-unstick').addEventListener('click', () => {
      Cheats.list.forEach(([k]) => { Cheats.data[k] = false; }); Cheats.save();
      if (w) w.busy = false;
      Game.closeAllUI(); Game._stepping = false; Player.repel = 0;
      this.msg('막힌 상태를 풀었습니다'); this.render();
    });
  };
}
