// ============================================================
// parcels.js - 이상한 소포 (포켓몬센터 배달원)
//   * 관리자가 /pokeadmin 에서 만든 소포(포켓몬·도구)를 포켓몬센터 카운터 오른쪽 배달원에게서 받음
//   * 소포마다 계정당 1번 (서버가 받은 기록을 남김). 전원 / 특정 아이디 / 기간 지정 가능
//   * 받을 소포가 있으면 배달원 머리 위에 "!" 표시
//   * 서버(domang.org) + 로그인 상태에서만 동작. 아니면 로그인 안내
//   server.js 다음에 불러옴 (Server, Account 사용)
// ============================================================
'use strict';

const Parcels = {
  waiting: 0,          // 받을 수 있는 소포 수 (머리 위 ! 표시용)
  _checkedAt: 0,

  online() { return !!(window.Server && Server.enabled && Account.user); },

  async list() {
    const r = await Server.api('/api/astera/parcels');
    if (!r.ok) throw new Error('parcels ' + r.status);
    const l = await r.json();
    this.waiting = l.length;
    return l;
  },

  // 포켓몬센터에 들어갈 때 확인 (너무 자주 묻지 않게 20초 간격)
  async refresh() {
    if (!this.online() || Date.now() - this._checkedAt < 20000) return;
    this._checkedAt = Date.now();
    try { await this.list(); } catch (e) { }
  },

  // 소포 내용 넣기: { mons: [포켓몬 기록...], mon: 포켓몬 기록(하나), items: { 도구ID: 개수 } }
  apply(gift) {
    const got = [];
    const mons = (gift.mons || []).concat(gift.mon ? [gift.mon] : []);
    let toBox = 0;
    for (const j of mons) {
      if (!j || !SPECIES[j.s]) continue;
      const m = Mon.fromJSON(j);
      if (!m.ot) m.ot = Player.name;
      if (!m.metMap) m.metMap = '이상한 소포';
      if (Player.party.length >= 6) toBox++;
      givePokemon(m);
      got.push((m.shiny ? '★' : '') + m.name + ' Lv.' + m.level);
    }
    for (const [id, n] of Object.entries(gift.items || {})) {
      if (!ITEMS[id] || !(n > 0)) continue;
      if (ITEMS[id].pk === 8 && Bag.count(id)) continue;   // 중요한 물건은 1개만
      Bag.add(id, n);
      got.push(itemName(id) + (n > 1 ? ' ' + n + '개' : ''));
    }
    return { got, toBox };
  }
};
window.Parcels = Parcels;

// ── 포켓몬센터 카운터 오른쪽에 배달원 (모든 마을의 포켓몬센터가 같은 방을 씀) ──
INTERIOR_DEFS.PC.npcs.push({ id: 'parcel_man', x: 12, y: 2, sprite: 'NPC 01', dir: 'down', move: 'still', fixedDir: true, script: 'mysteryGift' });

// ── 대화 ──
SCRIPTS.mysteryGift = async function (w, c) {
  const S = '소포 배달원';
  if (!Parcels.online()) {
    await say(['어서 오세요! 이상한 소포 배달원입니다.', '이상한 소포는 domang.org 회원으로 로그인해야 받을 수 있어요.\n로그인하면 특별한 포켓몬이 도착할지도 몰라요!'], { speaker: S });
    return;
  }
  let list;
  try { list = await Parcels.list(); }
  catch (e) { await say('지금은 배송 시스템에 연결할 수 없어요. 잠시 후 다시 와 주세요.', { speaker: S }); return; }
  if (!list.length) {
    c.parcelMark = false;
    await say(['어서 오세요! 이상한 소포 배달원입니다.', Player.name + '님 앞으로 도착한 소포는 지금 없어요.\n다음에 또 들러 주세요!'], { speaker: S });
    return;
  }
  await say(['어서 오세요! 이상한 소포 배달원입니다.', Player.name + '님 앞으로 이상한 소포가 ' + list.length + '개 도착해 있어요!'], { speaker: S });
  let received = 0;
  for (const p of list) {
    await say(['「' + p.title + '」'].concat(p.message ? [p.message] : []), { speaker: '소포' });
    if (!(await yesNo('이 소포를 받으시겠어요?', { speaker: S }))) { await say('알겠어요. 나중에 다시 오시면 드릴게요.', { speaker: S }); continue; }
    let res;
    try { res = await (await Server.api('/api/astera/parcels/' + p.id + '/claim', { method: 'POST' })).json(); }
    catch (e) { res = { ok: false, error: '배송 시스템에 연결할 수 없어요.' }; }
    if (!res.ok) { await say(res.error || '이 소포는 받을 수 없어요.', { speaker: S }); continue; }
    const { got, toBox } = Parcels.apply(res.gift || {});
    received++;
    SaveSys.save();   // 받은 즉시 저장 (서버에도 받은 기록이 남아 다시 못 받음)
    Audio2.playME('Pkmn get');
    await say(got.length ? Player.name + '은(는) ' + got.join(', ') + '을(를) 받았다!' : '소포는 비어 있었다...');
    if (toBox) await say('파티가 가득 차서 포켓몬은 박스로 보냈어요.', { speaker: S });
  }
  Parcels.waiting = Math.max(0, list.length - received);
  if (!Parcels.waiting) c.parcelMark = false;
  await say('또 이용해 주세요!', { speaker: S });
};

// ── 받을 소포가 있으면 배달원 머리 위에 "!" ──
{
  const W = World.prototype;
  const _load = W.load;
  W.load = function (key, ...rest) {
    const r = _load.call(this, key, ...rest);
    if (key === 'PC') Parcels.refresh().then(() => markParcelMan(this));
    return r;
  };
  function markParcelMan(w) {
    if (Game.world !== w || w.key !== 'PC') return;
    const c = w.chars.find(x => x.id === 'parcel_man');
    if (c) c.parcelMark = Parcels.waiting > 0;
  }
  // 소포 표시: 통통 튀는 흰 말풍선 + 빨간 "!" (기본 말풍선은 어두워서 실내 벽에 묻힘)
  const _emote = Char.prototype.drawEmote;
  Char.prototype.drawEmote = function (ctx) {
    _emote.call(this, ctx);
    if (!this.parcelMark || this.emote || !this._spriteTop || !this.visible) return;
    const [x, top] = this._spriteTop;
    const y = top - 22 + Math.round(Math.abs(Math.sin(Game.tick / 12)) * -5);
    ctx.save();
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#c02020'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 11, y - 12, 22, 22, 6) : ctx.rect(x - 11, y - 12, 22, 22); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 4, y + 10); ctx.lineTo(x, y + 15); ctx.lineTo(x + 4, y + 10); ctx.closePath(); ctx.fill();   // 말풍선 꼬리
    ctx.restore();
    text(ctx, '!', x, y - 10, { size: 20, align: 'center', color: '#e02020', shadow: null });
  };
  // 스프라이트 위치 기억 (말풍선 자리 계산용)
  const _draw = Char.prototype.draw;
  Char.prototype.draw = function (ctx, camX, camY) {
    _draw.call(this, ctx, camX, camY);
    if (this.parcelMark) { const im = this.sprite ? img(this.spritePath) : null; const fh = im ? im.height / 4 : 48;
      this._spriteTop = [Math.round(this.x * TILE + this.px - camX + 16), Math.round(this.y * TILE + this.py - camY + 32 - fh)]; }
  };
}
