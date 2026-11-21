// ============================================================
// follower.js - 데리고 다니는 포켓몬 보완
//   1) 파티 1번(기절했으면 그다음 포켓몬)이 항상 따라다님
//      - 예전엔 맵 이동/전투 때만 다시 정해서, 파티 순서를 바꿔도 예전 포켓몬이 계속 따라다녔음
//   2) 그림이 없어서 안 보이던 포켓몬도 보이게
//      - 예전엔 그림 파일이 있는지 "불러오기 전에" 판단해서, 없는 파일을 계속 그리려다 아무것도 안 보였음
//        (폼 134종, 니드런♀♂, 차데스, 이로치 그림이 없는 일부)
//      - 이제 매 프레임: 이로치 그림 → 일반 그림 → 기본 종 그림 → (전부 없으면) 아이콘 순으로 찾아서 그림
//   shiny.js 다음에 불러옴
// ============================================================
'use strict';

const FollowerArt = {
  // 따라다닐 포켓몬: 파티 1번부터 기절하지 않은 첫 포켓몬
  lead() { return Player.party.find(m => !m.fainted) || null; },
  // 그릴 수 있는 따라다니기 그림 경로 (아직 불러오는 중이면 그 경로, 확실히 없으면 다음 후보)
  path(mon) {
    const base = String(mon.species).replace(/_\d+$/, '');
    const cands = [];
    if (mon.shiny) cands.push('Graphics/Characters/Followers shiny/' + mon.species + '.png');
    cands.push('Graphics/Characters/Followers/' + mon.species + '.png');
    if (base !== mon.species) {
      if (mon.shiny) cands.push('Graphics/Characters/Followers shiny/' + base + '.png');
      cands.push('Graphics/Characters/Followers/' + base + '.png');
    }
    for (const p of cands) if (!imgFailed(p)) return p;
    return null;   // 따라다니기 그림이 하나도 없음 → 아이콘으로
  }
};
window.FollowerArt = FollowerArt;

{
  const W = World.prototype;
  // 따라다니는 포켓몬 만들기: 그림이 없어도 만든다 (그림은 그릴 때 정함)
  W.setupFollower = function (reset) {
    const lead = FollowerArt.lead();
    if (!lead || Player.options.follower === false) { this.follower = null; return; }
    if (!this.follower || reset) {
      const [dx, dy] = DIRS[OPP[this.player.dir]];
      let fx = this.player.x + dx, fy = this.player.y + dy;
      if (!this.map.passable(fx, fy, this.player.dir) || this.charAt(fx, fy)) { fx = this.player.x; fy = this.player.y; }
      this.follower = new Char({ x: fx, y: fy, sprite: FollowerArt.path(lead) || 'Graphics/Characters/Followers/' + lead.species + '.png', follower: true, dir: this.player.dir });
      this.follower.hiddenUntilMove = fx === this.player.x && fy === this.player.y;
    }
    this.follower.mon = lead;
    this.follower.sprite = FollowerArt.path(lead) || this.follower.sprite;
  };

  // 파티 1번이 바뀌면(순서 변경·기절·회복·새로 받음) 바로 따라다니는 포켓몬도 바꿈
  const _update = W.update;
  W.update = function (...args) {
    const lead = FollowerArt.lead();
    const want = Player.options.follower !== false && lead;
    if (want && (!this.follower || this.follower.mon !== lead)) this.setupFollower(false);
    else if (!want && this.follower) this.follower = null;
    return _update.apply(this, args);
  };
}

// ── 그리기: 그림을 매번 다시 확인, 없으면 아이콘으로 ──
{
  const C = Char.prototype;
  const _draw = C.draw;
  C.draw = function (ctx, camX, camY) {
    if (!this.follower || !this.mon) return _draw.call(this, ctx, camX, camY);
    const p = FollowerArt.path(this.mon);
    if (p) { this.sprite = p; return _draw.call(this, ctx, camX, camY); }
    // 따라다니기 그림이 없는 포켓몬: 아이콘(64x64, 2프레임)을 걷는 것처럼 통통 튀게
    if (!this.visible) return;
    const ip = monSpritePath('Icons', this.mon.species, this.mon.shiny);
    const im = ip && img(ip);
    if (!im) return;
    const n = Math.max(1, Math.floor(im.width / im.height)), fs = im.height;
    const f = Math.floor((this.anim || Game.tick) / 12) % n;
    const bob = (this.moving ? Math.abs(Math.sin(this.anim / 6)) * -3 : 0);
    const dx = Math.round(this.x * TILE + this.px - camX + 16 - fs / 2);
    const dy = Math.round(this.y * TILE + this.py - camY + 32 - fs + 6 + bob);
    ctx.drawImage(im, f * fs, 0, fs, fs, dx, dy, fs, fs);
  };
}
