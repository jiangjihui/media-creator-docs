/* ============================================================================
 * WorkBuddy 内联 SVG 互动引擎（独立文件，避免污染 index.html）
 * ----------------------------------------------------------------------------
 * 用法：在任意 .md 文档里，给"包裹 SVG 的容器"加一个 data-wb="<类型>" 属性，
 *       本引擎会在 docsify 每次渲染完成后自动扫描并按类型接线。
 *
 * 新增一种互动图时：只需在本文件里 WB.register('类型', fn) 注册一个模块，
 * 文档侧只需写 SVG + 设 data-wb；index.html 与已存在的图都无需改动。
 *
 * 注意：docsify 用 innerHTML 注入文档，<script> 不执行，所以互动逻辑必须放
 *       全局（这里），文档内的 SVG 只通过 class 选择器 + data 属性与引擎对接。
 * ========================================================================== */
(function () {
  var WB = (window.WB = window.WB || {});
  WB.helpers = {};
  WB.interactions = {};

  // 注册一个互动模块：fn(wrapperEl) 负责把该容器内的 SVG 接好事件
  WB.register = function (type, fn) { WB.interactions[type] = fn; };

  /* ----------------------------- 通用辅助 ----------------------------- */

  // 开尔文色温 → RGB（暖橙 → 中性白 → 冷蓝）
  WB.helpers.kelvinColor = function (k) {
    k = Math.max(1000, Math.min(12000, k));
    var r, g, b;
    if (k <= 5500) {
      var u = (k - 1800) / (5500 - 1800);
      r = 255; g = Math.round(150 + u * 98); b = Math.round(60 + u * 178);
    } else {
      var v = (k - 5500) / (10000 - 5500);
      r = Math.round(255 - v * 120); g = Math.round(248 - v * 30); b = Math.round(238 + v * 17);
    }
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  };

  // 开尔文数值 → 中文名称
  WB.helpers.tempName = function (k) {
    if (k < 2200) return '烛光/篝火（极暖）';
    if (k < 3200) return '白炽灯（暖）';
    if (k < 4000) return '黄金时刻（暖调）';
    if (k < 5000) return '暖白（微暖）';
    if (k < 6000) return '日光（中性）';
    if (k < 7000) return '阴天（偏冷）';
    return '阴影/蓝天（冷）';
  };

  /* ----------------------------- 模块：光位探索 ----------------------------- */
  // data-wb="light-explorer" —— 拖动太阳，实时改球体明暗、投影、地面影子与光位名
  WB.register('light-explorer', function (ex) {
    var svg = ex.querySelector('svg');
    if (!svg || !svg.viewBox || !svg.viewBox.baseVal) return;
    var light = ex.querySelector('.wb-light');
    var subj = ex.querySelector('.wb-subj');
    if (!light || !subj) return;
    var hi = ex.querySelector('.wb-hi');
    var shOn = ex.querySelector('.wb-sh-on');
    var shGround = ex.querySelector('.wb-sh-ground');
    var dir = ex.querySelector('.wb-dir');
    var read = ex.querySelector('.wb-readout');
    var W = svg.viewBox.baseVal.width, H = svg.viewBox.baseVal.height;
    var cx = +subj.getAttribute('cx'), cy = +subj.getAttribute('cy'), R = +subj.getAttribute('r');

    function toLocal(evt) {
      var r = svg.getBoundingClientRect();
      return { x: (evt.clientX - r.left) / r.width * W, y: (evt.clientY - r.top) / r.height * H };
    }
    function lightName(dx, dy) {
      if (dx < 0 && Math.abs(dy) <= Math.abs(dx) * 0.45) return '顺光';
      if (dx < 0 && Math.abs(dy) <= Math.abs(dx) * 1.3) return '前侧光';
      if (dx > 0 && Math.abs(dy) <= Math.abs(dx) * 0.45) return '逆光';
      if (dx > 0 && Math.abs(dy) <= Math.abs(dx) * 1.3) return '侧逆光';
      if (Math.abs(dy) > Math.abs(dx) * 1.3) return dy < 0 ? '顶光' : '底光';
      return '侧光';
    }
    function setLight(px, py) {
      px = Math.max(20, Math.min(W - 20, px));
      py = Math.max(20, Math.min(H - 40, py));
      light.setAttribute('transform', 'translate(' + px + ',' + py + ')');
      var dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy) || 1;
      var ux = dx / d, uy = dy / d;
      if (hi) { hi.setAttribute('cx', cx + ux * R * 0.5); hi.setAttribute('cy', cy + uy * R * 0.5); }
      if (shOn) { shOn.setAttribute('cx', cx - ux * R * 0.5); shOn.setAttribute('cy', cy - uy * R * 0.5); }
      if (shGround) {
        var gy = cy + R + 8;
        var high = Math.min(1, Math.max(0, (cy - py) / 200));
        var len = 60 + (1 - high) * 150;
        shGround.setAttribute('cx', cx - ux * len * 0.6);
        shGround.setAttribute('cy', gy);
        shGround.setAttribute('rx', len * 0.45);
      }
      if (dir) { dir.setAttribute('x1', cx); dir.setAttribute('y1', cy); dir.setAttribute('x2', px); dir.setAttribute('y2', py); }
      if (read) read.textContent = '光位：' + lightName(dx, dy) + '（约 ' + Math.round(Math.abs(Math.atan2(dy, -dx)) * 180 / Math.PI) + '°）';
    }
    var dragging = false;
    light.addEventListener('pointerdown', function (e) { dragging = true; e.preventDefault(); });
    svg.addEventListener('pointermove', function (e) { if (dragging) { var p = toLocal(e); setLight(p.x, p.y); } });
    svg.addEventListener('pointerup', function () { dragging = false; });
    svg.addEventListener('pointerleave', function () { dragging = false; });
    setLight(520, 120);
  });

  /* ----------------------------- 模块：色温互动 ----------------------------- */
  // data-wb="kelvin-slider" —— 拖动或点击底部色温光谱条，改白卡/肤色/中性灰的染色与 K 值
  WB.register('kelvin-slider', function (ex) {
    var svg = ex.querySelector('svg');
    if (!svg || !svg.viewBox || !svg.viewBox.baseVal) return;
    var handle = ex.querySelector('.wb-temp-handle');
    var track = ex.querySelector('.wb-temp-track');
    var tint = svg.querySelector('.wb-tint');
    var label = svg.querySelector('.wb-temp-label');
    if (!handle || !tint || !label) return;
    var W = svg.viewBox.baseVal.width;
    var x0 = 60, x1 = 700, kMin = 1800, kMax = 10000;
    function kToX(k) { return x0 + (k - kMin) / (kMax - kMin) * (x1 - x0); }
    function xToK(x) { return Math.round(kMin + (x - x0) / (x1 - x0) * (kMax - kMin)); }
    function apply(k) {
      k = Math.max(kMin, Math.min(kMax, k));
      var x = kToX(k);
      handle.setAttribute('transform', 'translate(' + x + ',308)');
      var dev = Math.abs(k - 5500);
      var op = Math.min(0.6, 0.1 + dev / 9000);
      tint.setAttribute('fill', WB.helpers.kelvinColor(k));
      tint.setAttribute('opacity', op.toFixed(2));
      label.textContent = k + 'K · ' + WB.helpers.tempName(k);
    }
    function fromEvent(evt) {
      var r = svg.getBoundingClientRect();
      var x = (evt.clientX - r.left) / r.width * W;
      apply(xToK(x));
    }
    var dragging = false;
    function start(e) { dragging = true; e.preventDefault(); fromEvent(e); }
    handle.addEventListener('pointerdown', start);
    if (track) track.addEventListener('pointerdown', start);
    svg.addEventListener('pointermove', function (e) { if (dragging) fromEvent(e); });
    svg.addEventListener('pointerup', function () { dragging = false; });
    svg.addEventListener('pointerleave', function () { dragging = false; });
    apply(5500);
  });

  /* ----------------------------- 模块：合焦平面探索 ----------------------------- */
  // data-wb="focus-plane" —— 沿深度标尺拖动焦点，前景/中景/背景按与焦点距离实时虚化
  WB.register('focus-plane', function (ex) {
    var svg = ex.querySelector('svg');
    if (!svg || !svg.viewBox || !svg.viewBox.baseVal) return;
    var handle = ex.querySelector('.wb-focus-handle');
    var label = ex.querySelector('.wb-focus-label');
    if (!handle) return;
    var W = svg.viewBox.baseVal.width;
    var subs = [
      { name: '前景（最近）', el: ex.querySelector('.wb-fp-near'), filtId: 'fpf_near', depth: 0 },
      { name: '中景（主体）', el: ex.querySelector('.wb-fp-mid'), filtId: 'fpf_mid', depth: 0.5 },
      { name: '背景（最远）', el: ex.querySelector('.wb-fp-far'), filtId: 'fpf_far', depth: 1 }
    ];
    var rx0 = 90, rx1 = 670, ry = 400;
    function dToX(d) { return rx0 + d * (rx1 - rx0); }
    function xToD(x) { return Math.max(0, Math.min(1, (x - rx0) / (rx1 - rx0))); }
    function setBlur(id, b) {
      var f = svg.querySelector('#' + id);
      if (f) { var g = f.querySelector('feGaussianBlur'); if (g) g.setAttribute('stdDeviation', b.toFixed(2)); }
    }
    function apply(x) {
      var d = xToD(x);
      handle.setAttribute('transform', 'translate(' + dToX(d) + ',' + ry + ')');
      var best = subs[0], bd = 1e9;
      subs.forEach(function (s) {
        var dist = Math.abs(s.depth - d);
        if (dist < bd) { bd = dist; best = s; }
      });
      subs.forEach(function (s) {
        var dist = Math.abs(s.depth - d);
        var blur = dist < 0.05 ? 0 : Math.min(8, 0.6 + dist * 9);
        setBlur(s.filtId, blur);
        if (s.el) s.el.setAttribute('filter', dist < 0.05 ? 'none' : 'url(#' + s.filtId + ')');
      });
      if (label) label.textContent = '当前合焦：' + best.name + (bd < 0.05 ? '（绝对清晰）' : '（其他层已虚化）');
    }
    var dragging = false;
    function fromEvt(e) { var r = svg.getBoundingClientRect(); apply((e.clientX - r.left) / r.width * W); }
    handle.addEventListener('pointerdown', function (e) { dragging = true; e.preventDefault(); fromEvt(e); });
    svg.addEventListener('pointermove', function (e) { if (dragging) fromEvt(e); });
    svg.addEventListener('pointerup', function () { dragging = false; });
    svg.addEventListener('pointerleave', function () { dragging = false; });
    apply(dToX(0.5));
  });

  /* ----------------------------- 模块：景深预览 ----------------------------- */
  // data-wb="dof-preview" —— 拖动光圈滑块，背景/前景虚化随 f 值实时变化
  WB.register('dof-preview', function (ex) {
    var svg = ex.querySelector('svg');
    if (!svg || !svg.viewBox || !svg.viewBox.baseVal) return;
    var handle = ex.querySelector('.wb-dof-handle');
    var track = ex.querySelector('.wb-dof-track');
    var label = ex.querySelector('.wb-dof-label');
    if (!handle || !label) return;
    var W = svg.viewBox.baseVal.width;
    var x0 = 60, x1 = 700, ty = 373;
    function tToF(t) { return 1.4 * Math.pow(2, t * 4); }
    function setBlur(id, b) {
      var f = svg.querySelector('#' + id);
      if (f) { var g = f.querySelector('feGaussianBlur'); if (g) g.setAttribute('stdDeviation', b.toFixed(2)); }
    }
    function apply(x) {
      var t = Math.max(0, Math.min(1, (x - x0) / (x1 - x0)));
      var f = tToF(t);
      handle.setAttribute('transform', 'translate(' + x + ',' + ty + ')');
      var open = (f - 1.4) / (22.4 - 1.4);
      setBlur('dof_bg', 0.4 + (1 - open) * 9);
      setBlur('dof_fg', 0.4 + (1 - open) * 6);
      var lvl = open < 0.25 ? '浅景深 · 强虚化' : open < 0.62 ? '中等景深' : '深景深 · 远近皆清';
      label.textContent = '光圈 f/' + f.toFixed(1) + ' · ' + lvl;
    }
    var dragging = false;
    function fromEvt(e) { var r = svg.getBoundingClientRect(); apply((e.clientX - r.left) / r.width * W); }
    handle.addEventListener('pointerdown', function (e) { dragging = true; e.preventDefault(); fromEvt(e); });
    if (track) track.addEventListener('pointerdown', function (e) { dragging = true; e.preventDefault(); fromEvt(e); });
    svg.addEventListener('pointermove', function (e) { if (dragging) fromEvt(e); });
    svg.addEventListener('pointerup', function () { dragging = false; });
    svg.addEventListener('pointerleave', function () { dragging = false; });
    apply(x0);
  });

  /* ----------------------------- 模块：调性台（曝光/对比/饱和度） ----------------------------- */
  // data-wb="tone-lift" —— 三颗滑块实时改场景的 CSS filter（亮度/对比/饱和），直方图随曝光平移并提示裁切
  WB.register('tone-lift', function (ex) {
    var svg = ex.querySelector('svg');
    if (!svg || !svg.viewBox || !svg.viewBox.baseVal) return;
    var photo = ex.querySelector('.wb-photo');
    var hist = ex.querySelector('.wb-hist');
    var read = ex.querySelector('.wb-tl-readout');
    var clips = { left: ex.querySelector('.wb-clip-left'), right: ex.querySelector('.wb-clip-right') };
    var W = svg.viewBox.baseVal.width;
    var ranges = {
      ev: { x0: 60, x1: 260, v0: -2, v1: 2 },
      co: { x0: 290, x1: 490, v0: -100, v1: 100 },
      sa: { x0: 520, x1: 720, v0: -100, v1: 100 }
    };
    var handles = {
      ev: ex.querySelector('.wb-ev-handle'),
      co: ex.querySelector('.wb-co-handle'),
      sa: ex.querySelector('.wb-sa-handle')
    };
    var state = { ev: 0, co: 0, sa: 0 };

    function buildHist() {
      if (!hist) return;
      var n = 28, x0 = 60, x1 = 700, base = 350, maxH = 44, s = '';
      for (var i = 0; i < n; i++) {
        var t = i / (n - 1);
        var g = Math.exp(-Math.pow((t - 0.5) / 0.22, 2));
        var h = 8 + g * maxH;
        var x = x0 + t * (x1 - x0);
        var w = (x1 - x0) / n * 0.7;
        s += '<rect x="' + x.toFixed(1) + '" y="' + (base - h).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="1.5" fill="var(--svg-accent)" opacity="0.75"/>';
      }
      hist.innerHTML = s;
    }
    function setHandle(key) {
      var r = ranges[key], h = handles[key];
      if (!h) return;
      var t = (state[key] - r.v0) / (r.v1 - r.v0);
      var x = r.x0 + t * (r.x1 - r.x0);
      h.setAttribute('transform', 'translate(' + x.toFixed(1) + ',395)');
    }
    function apply() {
      var B = Math.pow(2, state.ev * 0.5);
      var C = 1 + state.co / 100 * 0.7;
      var S = 1 + state.sa / 100;
      if (photo) photo.style.filter = 'brightness(' + B.toFixed(3) + ') contrast(' + C.toFixed(3) + ') saturate(' + S.toFixed(3) + ')';
      if (hist) hist.setAttribute('transform', 'translate(' + (state.ev * 20) + ',0)');
      if (clips.left) clips.left.setAttribute('opacity', state.ev < -1.2 ? '1' : '0');
      if (clips.right) clips.right.setAttribute('opacity', state.ev > 1.2 ? '1' : '0');
      if (read) {
        var note = state.ev > 1.2 ? ' · ⚠ 高光裁切' : state.ev < -1.2 ? ' · ⚠ 阴影裁切' : '';
        read.textContent = '曝光 ' + (state.ev >= 0 ? '+' : '') + state.ev.toFixed(1) + 'EV · 对比 ' + (state.co > 0 ? '+' : '') + Math.round(state.co) + ' · 饱和 ' + (state.sa > 0 ? '+' : '') + Math.round(state.sa) + note;
      }
      setHandle('ev'); setHandle('co'); setHandle('sa');
    }
    ['ev', 'co', 'sa'].forEach(function (key) {
      var r = ranges[key];
      var h = handles[key];
      var track = ex.querySelector('.wb-' + key + '-track');
      var dragging = false;
      function fromEvt(e) {
        var rr = svg.getBoundingClientRect();
        var x = (e.clientX - rr.left) / rr.width * W;
        var t = Math.max(0, Math.min(1, (x - r.x0) / (r.x1 - r.x0)));
        state[key] = r.v0 + t * (r.v1 - r.v0);
        apply();
      }
      function start(e) { dragging = true; e.preventDefault(); fromEvt(e); }
      if (h) h.addEventListener('pointerdown', start);
      if (track) track.addEventListener('pointerdown', start);
      svg.addEventListener('pointermove', function (e) { if (dragging) fromEvt(e); });
      svg.addEventListener('pointerup', function () { dragging = false; });
      svg.addEventListener('pointerleave', function () { dragging = false; });
    });
    buildHist();
    apply();
  });

  /* ----------------------------- 模块：蒙版笔刷 ----------------------------- */
  // data-wb="mask-brush" —— 在天空区域拖动笔刷，蒙版涂抹处压暗；"清空"重置
  WB.register('mask-brush', function (ex) {
    var svg = ex.querySelector('svg');
    if (!svg || !svg.viewBox || !svg.viewBox.baseVal) return;
    var maskG = ex.querySelector('.wb-sky-mask');
    var read = ex.querySelector('.wb-mb-readout');
    var reset = ex.querySelector('.wb-brush-reset');
    var hit = ex.querySelector('.wb-sky-hit');
    var W = svg.viewBox.baseVal.width, H = svg.viewBox.baseVal.height;
    var count = 0;
    function toLocal(e) {
      var r = svg.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
    }
    function paint(e) {
      if (!maskG) return;
      var p = toLocal(e);
      var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', 26);
      c.setAttribute('fill', '#0b1020'); c.setAttribute('opacity', '0.13');
      maskG.appendChild(c);
      count++;
      if (read) read.textContent = '已涂抹 ' + count + ' 笔 · 天空约压暗 -' + (count * 0.1).toFixed(1) + 'EV（示意）';
    }
    var dragging = false;
    if (hit) {
      hit.addEventListener('pointerdown', function (e) { dragging = true; e.preventDefault(); paint(e); });
      hit.addEventListener('pointermove', function (e) { if (dragging) paint(e); });
      hit.addEventListener('pointerup', function () { dragging = false; });
      hit.addEventListener('pointerleave', function () { dragging = false; });
    }
    if (reset) reset.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (maskG) maskG.innerHTML = '';
      count = 0;
      if (read) read.textContent = '已涂抹 0 笔';
    });
  });

  /* ----------------------------- 模块：皮肤蒙版 + 磨皮 ----------------------------- */
  // data-wb="skin-retouch" —— 在脸上拖动笔刷圈出皮肤选区（蒙版），再拖滑块控制磨皮强度
  WB.register('skin-retouch', function (ex) {
    var svgns = 'http://www.w3.org/2000/svg';
    var svg = ex.querySelector('svg');
    if (!svg || !svg.viewBox || !svg.viewBox.baseVal) return;
    var maskG = ex.querySelector('.wb-skin-mask');      // 可见选区叠加
    var clip = svg.querySelector('#sr_maskclip');        // 蒙版裁剪（镜像笔触）
    var smooth = ex.querySelector('.wb-skin-smooth');    // 干净皮肤覆盖层（被蒙版裁剪）
    var read = ex.querySelector('.wb-sr-readout');
    var reset = ex.querySelector('.wb-sr-reset');
    var hit = ex.querySelector('.wb-skin-hit');
    var handle = ex.querySelector('.wb-sr-handle');
    var track = ex.querySelector('.wb-sr-track');
    var W = svg.viewBox.baseVal.width, H = svg.viewBox.baseVal.height;
    var count = 0, strength = 0;
    var x0 = 60, x1 = 700, ty = 414;

    function toLocal(e) {
      var r = svg.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
    }
    function paint(e) {
      var p = toLocal(e);
      if (maskG) {
        var c = document.createElementNS(svgns, 'circle');
        c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', 24);
        c.setAttribute('fill', 'var(--svg-accent)'); c.setAttribute('opacity', '0.22');
        maskG.appendChild(c);
      }
      if (clip) {
        var c2 = document.createElementNS(svgns, 'circle');
        c2.setAttribute('cx', p.x); c2.setAttribute('cy', p.y); c2.setAttribute('r', 24);
        clip.appendChild(c2);
      }
      count++;
      updateRead();
    }
    function applyStrength() {
      if (smooth) {
        smooth.setAttribute('opacity', (strength / 100).toFixed(2));
        smooth.style.filter = 'blur(' + (strength / 100 * 2).toFixed(2) + 'px)';
      }
      updateRead();
    }
    function updateRead() {
      if (!read) return;
      if (count === 0) { read.textContent = '请先在脸上涂抹皮肤选区'; return; }
      read.textContent = '已选皮肤 ' + count + ' 笔 · 磨皮强度 ' + strength + '%' + (strength > 70 ? '（当心塑料感）' : '');
    }
    var dragging = false;
    if (hit) {
      hit.addEventListener('pointerdown', function (e) { dragging = true; e.preventDefault(); paint(e); });
      hit.addEventListener('pointermove', function (e) { if (dragging) paint(e); });
      hit.addEventListener('pointerup', function () { dragging = false; });
      hit.addEventListener('pointerleave', function () { dragging = false; });
    }
    if (reset) reset.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (maskG) maskG.innerHTML = '';
      if (clip) clip.innerHTML = '';
      count = 0; strength = 0;
      if (smooth) { smooth.setAttribute('opacity', '0'); smooth.style.filter = 'none'; }
      if (handle) handle.setAttribute('transform', 'translate(' + x0 + ',' + ty + ')');
      updateRead();
    });
    if (handle) {
      var hDrag = false;
      function fromEvt(e) {
        var r = svg.getBoundingClientRect();
        var x = Math.max(x0, Math.min(x1, (e.clientX - r.left) / r.width * W));
        strength = Math.round((x - x0) / (x1 - x0) * 100);
        handle.setAttribute('transform', 'translate(' + x + ',' + ty + ')');
        applyStrength();
      }
      handle.addEventListener('pointerdown', function (e) { hDrag = true; e.preventDefault(); fromEvt(e); });
      if (track) track.addEventListener('pointerdown', function (e) { hDrag = true; e.preventDefault(); fromEvt(e); });
      svg.addEventListener('pointermove', function (e) { if (hDrag) fromEvt(e); });
      svg.addEventListener('pointerup', function () { hDrag = false; });
      svg.addEventListener('pointerleave', function () { hDrag = false; });
    }
    updateRead();
  });

  /* ----------------------------- 模块：肤色 HSL 校正 ----------------------------- */
  // data-wb="skin-tone" —— 拖色相/饱和两颗滑块，实时改人脸肤色（背景不受影响）
  WB.register('skin-tone', function (ex) {
    var svg = ex.querySelector('svg');
    if (!svg || !svg.viewBox || !svg.viewBox.baseVal) return;
    var face = ex.querySelector('.wb-face');
    var read = ex.querySelector('.wb-st-readout');
    var W = svg.viewBox.baseVal.width;
    var ranges = {
      hue: { x0: 60, x1: 380, v0: -40, v1: 40 },
      sat: { x0: 410, x1: 700, v0: -100, v1: 100 }
    };
    var handles = { hue: ex.querySelector('.wb-hue-handle'), sat: ex.querySelector('.wb-sat-handle') };
    var state = { hue: 0, sat: 0 };
    function setHandle(key) {
      var r = ranges[key], h = handles[key];
      if (!h) return;
      var t = (state[key] - r.v0) / (r.v1 - r.v0);
      var x = r.x0 + t * (r.x1 - r.x0);
      h.setAttribute('transform', 'translate(' + x.toFixed(1) + ',414)');
    }
    function apply() {
      if (face) face.style.filter = 'hue-rotate(' + state.hue + 'deg) saturate(' + (1 + state.sat / 100).toFixed(2) + ')';
      var note = '';
      if (state.hue < -8) note = ' · 向粉/红偏移（修正偏黄）';
      else if (state.hue > 8) note = ' · 向黄/绿偏移（修正偏红）';
      if (read) read.textContent = '色相 ' + (state.hue >= 0 ? '+' : '') + state.hue + '° · 饱和 ' + (state.sat >= 0 ? '+' : '') + state.sat + note;
      setHandle('hue'); setHandle('sat');
    }
    ['hue', 'sat'].forEach(function (key) {
      var r = ranges[key];
      var h = handles[key];
      var track = ex.querySelector('.wb-' + key + '-track');
      var dragging = false;
      function fromEvt(e) {
        var rr = svg.getBoundingClientRect();
        var x = (e.clientX - rr.left) / rr.width * W;
        var t = Math.max(0, Math.min(1, (x - r.x0) / (r.x1 - r.x0)));
        state[key] = Math.round(r.v0 + t * (r.v1 - r.v0));
        apply();
      }
      function start(e) { dragging = true; e.preventDefault(); fromEvt(e); }
      if (h) h.addEventListener('pointerdown', start);
      if (track) track.addEventListener('pointerdown', start);
      svg.addEventListener('pointermove', function (e) { if (dragging) fromEvt(e); });
      svg.addEventListener('pointerup', function () { dragging = false; });
      svg.addEventListener('pointerleave', function () { dragging = false; });
    });
    apply();
  });

  /* ----------------------------- 扫描接线 ----------------------------- */
  // docsify 每次渲染后调用：找出所有 [data-wb]，按类型分派给已注册模块
  WB.scan = function () {
    document.querySelectorAll('[data-wb]').forEach(function (ex) {
      var type = ex.getAttribute('data-wb');
      var fn = WB.interactions[type];
      if (fn && ex.dataset.wbBound !== '1') {
        try { fn(ex); ex.dataset.wbBound = '1'; }
        catch (e) { console.error('[wb-interactive] 模块 "' + type + '" 执行失败', e); }
      }
    });
  };

  // 自注册 doneEach 钩子（docsify.min.js 之后执行本文件，$docsify 已存在）
  function registerHook() {
    if (!window.$docsify) window.$docsify = {};
    window.$docsify.plugins = (window.$docsify.plugins || []).concat([function (hook) {
      hook.doneEach(function () { setTimeout(WB.scan, 30); });
    }]);
  }
  registerHook();
})();
