// ============================================================
// display.js - 전체화면 표시
//   * 전체화면이면 오른쪽 설정 패널과 하단 안내를 숨기고, 게임 화면을 화면 전체에 맞춰 키운다.
//   * 브라우저 전체화면(F11)과 패널의 "전체화면" 버튼 모두 지원.
//   * 전체화면 중에는 Tab 키로 설정 패널을 잠깐 열고 닫을 수 있다.
// ============================================================
'use strict';

const Display = {
  // 지금 전체화면인지 (API 전체화면 또는 F11처럼 창이 화면 크기와 같은 경우)
  isFull() {
    return !!document.fullscreenElement ||
      (Math.abs(innerWidth - screen.width) < 4 && Math.abs(innerHeight - screen.height) < 4);
  },
  apply() {
    const full = this.isFull();
    document.body.classList.toggle('fs', full);
    if (!full) document.body.classList.remove('fs-side');
    // main.js의 fit()이 resize 이벤트에서 패널 폭을 빼고 다시 계산함
    dispatchEvent(new Event('resize'));
  },
  init() {
    const st = document.createElement('style');
    st.textContent = [
      'body.fs { padding: 0 !important; justify-content: center !important; align-items: center !important; }',
      'body.fs #hint { display: none !important; }',
      'body.fs #side { display: none; }',
      // 전체화면 중 Tab으로 패널을 열면 게임 위에 겹쳐서 보여줌 (게임 크기는 그대로)
      'body.fs.fs-side #side { display: block; z-index: 25; box-shadow: -6px 0 20px rgba(0,0,0,.6); }'
    ].join('\n');
    document.head.appendChild(st);
    document.addEventListener('fullscreenchange', () => this.apply());
    addEventListener('resize', () => {
      const full = this.isFull();
      if (full !== document.body.classList.contains('fs')) this.apply();
    });
    addEventListener('keydown', e => {
      if (e.code === 'Tab' && document.body.classList.contains('fs')) {
        e.preventDefault();
        document.body.classList.toggle('fs-side');
      }
    });
    this.apply();
  }
};
window.Display = Display;

// 게임 화면 크기 계산(main.js fit)은 #side의 offsetWidth를 빼므로,
// 전체화면에서 패널을 겹쳐 열었을 때 게임이 줄어들지 않게 offsetWidth를 0으로 보이게 함
{
  const desc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      if (this.id === 'side' && document.body.classList.contains('fs')) return 0;
      return desc.get.call(this);
    }
  });
}

window.addEventListener('load', () => Display.init());
