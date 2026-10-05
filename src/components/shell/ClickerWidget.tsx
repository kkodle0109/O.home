'use client';

import { useEffect } from 'react';

export function ClickerWidget() {
  useEffect(() => {
    // 위젯 div가 화면에 생긴 뒤에 스크립트를 불러와야 위젯을 찾을 수 있다
    if (document.querySelector('script[data-clicker]')) return;
    const s = document.createElement('script');
    s.src = '/clicker/clicker-widget.js';
    s.async = true;
    s.dataset.clicker = '1';
    document.body.appendChild(s);
  }, []);

  return (
    <>
      {/* 클리커 위젯 © 라브 — https://ainolaive.tistory.com/138 */}
      <div
        className="ttc-widget"
        suppressHydrationWarning
        data-img-normal="clicker/kei.png"
        data-img-click="clicker/kei.png"
        data-right="20"
        data-bottom="100"
        data-width="120"
        data-sound="on"
        data-z-index="55"
      />
       <div
        className="ttc-widget"
        suppressHydrationWarning
        data-img-normal="clicker/yui.png"
        data-img-click="clicker/yui.png"
        data-right="20"
        data-bottom="100"
        data-width="120"
        data-sound="on"
        data-z-index="55"
      />
      {/* 위젯을 더 넣으려면 위 div를 복사해서 이미지·위치만 바꾸세요. script는 하나면 됩니다 */}
    </>
  );
}
