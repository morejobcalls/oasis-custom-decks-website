// Oasis — scroll-reveal choreography. Pairs with the `motion` block in site.css.
// Marks section content with [data-reveal] and staggers grid/gallery/step/chip
// children; an IntersectionObserver flips each to .in as it enters the viewport.
// Hero + header + trust bar are pure CSS load animations (no JS needed beyond html.js).
(function () {
  var d = document;
  if (!d.documentElement.classList.contains('js')) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  var GROUP = '.grid,.gal,.steps,.chips';
  var STEP = { '.chips': 35, '.gal': 80, '.grid': 110, '.steps': 110 };
  var targets = [];

  function mark(el, delay) {
    el.setAttribute('data-reveal', '');
    if (delay) el.style.transitionDelay = delay + 'ms';
    targets.push(el);
  }
  function stagger(group) {
    var key = Object.keys(STEP).filter(function (k) { return group.matches(k); })[0] || '.grid';
    var kids = group.children;
    for (var j = 0; j < kids.length; j++) mark(kids[j], Math.min(j, 9) * STEP[key]);
  }

  var wraps = d.querySelectorAll('section .wrap');
  for (var w = 0; w < wraps.length; w++) {
    var kids = wraps[w].children, order = 0;
    for (var i = 0; i < kids.length; i++) {
      var c = kids[i];
      if (c.matches(GROUP)) { stagger(c); continue; }
      var inner = c.querySelector(GROUP);
      if (inner && c.tagName === 'DIV') { stagger(inner); continue; }
      mark(c, Math.min(order++, 4) * 90);
    }
  }

  if (!('IntersectionObserver' in window)) {
    targets.forEach(function (t) { t.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
  targets.forEach(function (t) { io.observe(t); });

  // Safety net: anything still hidden after 6s (odd layouts, print) is shown.
  setTimeout(function () { targets.forEach(function (t) { t.classList.add('in'); }); }, 6000);
})();
