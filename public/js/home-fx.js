/* ExamPro — Home page visual effects. Visual only: no data, login or exam logic is touched. */
(function () {
  'use strict';
  var root = document.documentElement; root.classList.add('hx');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Typewriter headline
  var rot = $('#hxRot');
  if (rot && !reduce) {
    var words = ['Conduct Exams', 'Take Exams', 'Grade Exams', 'Ace Exams'], w = 0, c = words[0].length, del = true;
    (function tick() {
      var d;
      if (del) { c--; d = 45; if (c <= 0) { del = false; w = (w + 1) % words.length; d = 300; } }
      else { c++; d = 90; if (c >= words[w].length) { del = true; d = 1800; } }
      rot.textContent = words[w].slice(0, c) || '\u00A0';
      setTimeout(tick, d);
    })();
  }

  // 2. Live exam card: options cycle + countdown (decorative preview only)
  var opts = $$('.hp-mockup .hp-mock-opt'), timer = $('.hp-mockup .hp-timer');
  if (opts.length === 4 && !reduce) {
    var order = [0, 1, 3, 2], k = 0;
    setInterval(function () {
      var i = order[k++ % order.length];
      opts.forEach(function (o, j) {
        var on = j === i;
        o.classList.toggle('sel', on);
        o.classList.toggle('hx-ok', on && i === 2);
        var dot = $('.hp-mock-dot', o); if (dot) dot.classList.toggle('sel', on);
      });
    }, 1300);
  }
  if (timer && !reduce) {
    var secs = 154;
    setInterval(function () {
      secs = secs <= 0 ? 154 : secs - 1;
      var m = ('0' + Math.floor(secs / 60)).slice(-2), s = ('0' + (secs % 60)).slice(-2);
      timer.textContent = '\u23F1 ' + m + ':' + s;
    }, 1000);
  }

  // 3. Cursor glow + 3D tilt
  var hero = $('.hp-hero'), card = $('.hp-mockup');
  if (hero) {
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      hero.style.setProperty('--my', (e.clientY - r.top) + 'px');
      if (card && !reduce) {
        var b = card.getBoundingClientRect();
        var ry = ((e.clientX - (b.left + b.width / 2)) / r.width) * 14;
        var rx = -((e.clientY - (b.top + b.height / 2)) / r.height) * 14;
        card.style.setProperty('--ry', Math.max(-9, Math.min(9, ry)) + 'deg');
        card.style.setProperty('--rx', Math.max(-9, Math.min(9, rx)) + 'deg');
      }
    });
    hero.addEventListener('mouseleave', function () {
      if (card) { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); }
    });
  }

  // 4. Feature card spotlight
  $$('.hp-feat-card').forEach(function (el) {
    el.addEventListener('mousemove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  // 5. Steps line draw + stats count-up + quote fade (all via observers; app.js untouched)
  if ('IntersectionObserver' in window) {
    var steps = $('.hp-steps');
    if (steps) {
      var sio = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { steps.classList.add('hx-in'); sio.disconnect(); }
      }, { threshold: 0.3 });
      sio.observe(steps);
      setTimeout(function () { steps.classList.add('hx-in'); }, 6000);
    }
    ['statStudents', 'statExams', 'statAttempts', 'statPass'].forEach(function (id) {
      var el = document.getElementById(id); if (!el) return;
      var mo, raf, pending = null;
      function write(n) { if (id === 'statPass') el.innerHTML = n + '<span>%</span>'; else el.textContent = n; mo.takeRecords(); }
      function run(t) {
        cancelAnimationFrame(raf);
        var t0 = performance.now();
        (function step() {
          var p = Math.min(1, (performance.now() - t0) / 1400);
          write(Math.round(t * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(step);
        })();
      }
      var io = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting && pending !== null) { var t = pending; pending = null; run(t); }
      }, { threshold: 0.3 });
      io.observe(el);
      mo = new MutationObserver(function () {
        var t = parseInt(el.textContent, 10); if (isNaN(t) || reduce) return;
        var r = el.getBoundingClientRect();
        if (el.offsetParent !== null && r.top < innerHeight && r.bottom > 0) run(t); else pending = t;
      });
      mo.observe(el, { childList: true, characterData: true, subtree: true });
    });
  }
  ['quoteText', 'quoteAuthor'].forEach(function (id) {
    var el = document.getElementById(id); if (!el) return;
    new MutationObserver(function () {
      el.classList.remove('hx-swap'); void el.offsetWidth; el.classList.add('hx-swap');
    }).observe(el, { childList: true, characterData: true, subtree: true });
  });

  // 6. Scroll progress bar (home page only)
  var bar = document.createElement('div'); bar.className = 'hx-progress'; document.body.appendChild(bar);
  var home = $('#page-home');
  function onScroll() {
    var max = root.scrollHeight - innerHeight;
    var p = (home && home.classList.contains('active') && max > 0) ? window.scrollY / max : 0;
    bar.style.transform = 'scaleX(' + p + ')';
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
})();
