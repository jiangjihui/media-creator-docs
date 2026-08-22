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
