// ============================================================
// prefetch.js - 다음 맵 그림 미리 받기
//   맵에 들어오고 잠시 뒤(움직임이 없는 틈), 이 맵에서 갈 수 있는 맵(출구·문)의
//   타일셋과 사람·전설 그림을 미리 받아 둠 → 맵을 옮길 때 그림이 늦게 뜨는 일이 줄어듦
//   이미 받은 그림은 브라우저/Cloudflare 캐시에서 바로 나오므로 부담이 적음
//   follower.js 다음에 불러옴
// ============================================================
'use strict';

const Prefetch = {
  done: new Set(),     // 이미 미리 받은 맵
  // 맵 정의에서 그림 경로 모으기
  pathsOf(key) {
    const isIn = !!INTERIOR_DEFS[key], d = isIn ? INTERIOR_DEFS[key] : MAPS[key];
    if (!d) return [];
    const out = [];
    const sp = s => { if (!s) return; out.push(s.startsWith('Graphics/') ? s : 'Graphics/Characters/' + s + '.png'); };
    (d.npcs || []).forEach(n => sp(n.sprite));
    (d.trainers || []).forEach(t => sp('trainer_' + t.sprite));
    (d.specials || []).forEach(s => sp(s.sprite));
    try {
      const tsId = isIn ? (window.INTERIORS[d.tmpl] || {}).ts : 6;   // 야외는 모두 같은 타일셋(6)
      const ts = tsId !== undefined && getTileset(tsId);
      if (ts && ts.img) out.push(ts.img);
    } catch (e) { }
    return out;
  },
  // 이 맵에서 갈 수 있는 맵
  neighbors(w) {
    const d = w.def, out = new Set();
    Object.values(d.exits || {}).forEach(e => e && e.to && out.add(e.to));
    (d.stamps || []).forEach(st => st[3] && out.add(st[3]));
    if (d.exit && Player.returnPoint) out.add(Player.returnPoint.map);   // 실내 → 나갈 맵
    return [...out];
  },
  run(w) {
    const keys = this.neighbors(w).filter(k => !this.done.has(k));
    let i = 0;
    // 한꺼번에 몰아 받지 않고 0.3초 간격으로 한 맵씩 (게임 진행 중인 요청을 방해하지 않게)
    const next = () => {
      if (i >= keys.length || Game.world !== w) return;
      const k = keys[i++];
      this.done.add(k);
      this.pathsOf(k).forEach(p => img(p));
      setTimeout(next, 300);
    };
    next();
  }
};
window.Prefetch = Prefetch;

{
  const W = World.prototype;
  const _load = W.load;
  W.load = function (...args) {
    const r = _load.apply(this, args);
    clearTimeout(this._prefetchT);
    this._prefetchT = setTimeout(() => Prefetch.run(this), 1500);
    return r;
  };
}
