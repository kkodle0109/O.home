/* 
  ====================

  :: 라브 클리커 위젯 ::

  ====================

  ~ 수정 및 변형, 직접 커스텀한 파일 재배포 등 자유 ~

  released 2026-09-05
  https://ainolaive.tistory.com

*/

(function () {
  // ---------- 사운드 엔진 ----------
  var audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        audioCtx = null;
      }
    }
    return audioCtx;
  }

  // 기본 효과음 합성
  function playBuiltInClick(kind) {
    var ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') { ctx.resume(); }

    var now = ctx.currentTime;
    var duration = 0.045;
    var bufferSize = Math.floor(ctx.sampleRate * duration);
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      var decay = Math.pow(1 - i / bufferSize, 2.2);
      data[i] = (Math.random() * 2 - 1) * decay;
    }

    var noise = ctx.createBufferSource();
    noise.buffer = buffer;

    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = kind === 'down' ? 1600 : 2400;
    filter.Q.value = 1.1;

    var gain = ctx.createGain();
    gain.gain.setValueAtTime(kind === 'down' ? 0.5 : 0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration);
  }

  function playCustomSound(url) {
    try {
      var audio = new Audio(url);
      audio.play().catch(function () {});
    } catch (e) {}
  }

  // ---------- 모바일 여부 판별 ----------
  // 모바일 기기(터치 UA)이거나 화면 폭이 좁은 경우 위젯을 숨김 처리
  function isMobileDevice() {
    var uaIsMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    var narrowScreen = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    return uaIsMobile || narrowScreen;
  }

  // ---------- 위젯 초기화 ----------
  function initWidget(el) {
    if (el.getAttribute('data-ttc-inited') === '1') return;
    el.setAttribute('data-ttc-inited', '1');

    // 모바일 환경 - 위젯 표시하지 않으며 초기화 처리 생략
    if (isMobileDevice()) {
      el.style.display = 'none';
      return;
    }

    var imgNormalSrc = el.dataset.imgNormal || '';
    var imgClickSrc = el.dataset.imgClick || imgNormalSrc;
    var width = el.dataset.width ? el.dataset.width + 'px' : 'auto';
    var soundOn = (el.dataset.sound || 'on').toLowerCase() !== 'off';
    var soundDownUrl = el.dataset.soundDown || '';
    var soundUpUrl = el.dataset.soundUp || '';
    var zIndex = el.dataset.zIndex || '9999';

    // 값이 순수 숫자면 px로 적용, '10%'처럼 단위가 이미 있을 경우 기재된 단위를 사용
    function toCssLength(value) {
      if (value === undefined || value === null || value === '') return null;
      return /^-?\d+(\.\d+)?$/.test(value) ? value + 'px' : value;
    }

    el.style.position = 'fixed';

    var top = toCssLength(el.dataset.top);
    var right = toCssLength(el.dataset.right);
    var bottom = toCssLength(el.dataset.bottom);
    var left = toCssLength(el.dataset.left);

    // top/right/bottom/left 중 하나라도 지정되어 있으면 그 값을 사용
    // 값이 없을 시 좌표값(data-x, data-y) 또는 기본값(우측 하단 20px)으로 적용
    if (top !== null || right !== null || bottom !== null || left !== null) {
      if (top !== null) el.style.top = top;
      if (right !== null) el.style.right = right;
      if (bottom !== null) el.style.bottom = bottom;
      if (left !== null) el.style.left = left;
    } else {
      var startX = parseFloat(el.dataset.x);
      var startY = parseFloat(el.dataset.y);
      if (isNaN(startX)) startX = 20;
      if (isNaN(startY)) startY = 20;
      el.style.right = startX + 'px';
      el.style.bottom = startY + 'px';
    }

    el.style.zIndex = zIndex;
    el.style.width = width;
    el.style.lineHeight = '0';
    el.style.cursor = 'grab';
    el.style.userSelect = 'none';
    el.style.webkitUserSelect = 'none';
    el.style.touchAction = 'none';

    var img = document.createElement('img');
    img.src = imgNormalSrc;
    img.draggable = false;
    img.alt = '';
    img.style.width = '100%';
    img.style.display = 'block';
    img.style.pointerEvents = 'none';
    el.appendChild(img);

    function playSound(kind) {
      if (!soundOn) return;
      var url = kind === 'down' ? soundDownUrl : soundUpUrl;
      if (url) {
        playCustomSound(url);
      } else {
        playBuiltInClick(kind);
      }
    }

    var dragging = false;
    var startPointerX = 0, startPointerY = 0;
    var elStartLeft = 0, elStartTop = 0;
    var DRAG_THRESHOLD = 4;

    function getPoint(e) {
      return e.touches && e.touches.length ? e.touches[0] : e;
    }

    function onPointerDown(e) {
      e.preventDefault();
      dragging = true;
      var p = getPoint(e);
      startPointerX = p.clientX;
      startPointerY = p.clientY;
      var rect = el.getBoundingClientRect();
      elStartLeft = rect.left;
      elStartTop = rect.top;

      img.src = imgClickSrc;
      el.style.cursor = 'grabbing';
      playSound('down');

      document.addEventListener('mousemove', onPointerMove);
      document.addEventListener('mouseup', onPointerUp);
      document.addEventListener('touchmove', onPointerMove, { passive: false });
      document.addEventListener('touchend', onPointerUp);
    }

    function onPointerMove(e) {
      if (!dragging) return;
      var p = getPoint(e);
      var dx = p.clientX - startPointerX;
      var dy = p.clientY - startPointerY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        e.preventDefault();
        // right/bottom으로 위치 설정 시 left/top 기준으로 전환 (값이 충돌해 위치가 어긋남 방지)
        el.style.right = '';
        el.style.bottom = '';
        el.style.left = (elStartLeft + dx) + 'px';
        el.style.top = (elStartTop + dy) + 'px';
      }
    }

    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      img.src = imgNormalSrc;
      el.style.cursor = 'grab';
      playSound('up');

      document.removeEventListener('mousemove', onPointerMove);
      document.removeEventListener('mouseup', onPointerUp);
      document.removeEventListener('touchmove', onPointerMove);
      document.removeEventListener('touchend', onPointerUp);
    }

    el.addEventListener('mousedown', onPointerDown);
    el.addEventListener('touchstart', onPointerDown, { passive: false });
  }

  function scanAndInit() {
    var widgets = document.querySelectorAll('.ttc-widget');
    for (var i = 0; i < widgets.length; i++) {
      initWidget(widgets[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanAndInit);
  } else {
    scanAndInit();
  }
})();