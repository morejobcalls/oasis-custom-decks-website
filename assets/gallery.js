// Lightbox for .pg (project gallery) tiles — click to open, arrows/swipe to move, Esc/backdrop to close.
(function () {
  var tiles = Array.prototype.slice.call(document.querySelectorAll('.pg a, .gx a, .story-media a'));
  if (!tiles.length) return;
  var lb = document.createElement('div'); lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-label', 'Project photo');
  lb.innerHTML = '<button class="lb-x" aria-label="Close">&times;</button><button class="lb-prev" aria-label="Previous">&#8249;</button><figure><img alt=""><figcaption></figcaption></figure><button class="lb-next" aria-label="Next">&#8250;</button>';
  document.body.appendChild(lb);
  var img = lb.querySelector('img'), cap = lb.querySelector('figcaption'), i = 0;
  function visible() { return tiles.filter(function (t) { return !t.hidden && t.offsetParent !== null; }); }
  function show(n) {
    var vis = visible(); if (!vis.length) return; tiles = vis.concat(tiles.filter(function (t) { return vis.indexOf(t) < 0; })); i = (n + vis.length) % vis.length;
    var a = tiles[i]; img.src = a.getAttribute('href'); img.alt = a.getAttribute('data-cap') || ''; cap.textContent = a.getAttribute('data-cap') || '';
    lb.classList.add('on'); document.body.style.overflow = 'hidden';
    [tiles[(i + 1) % tiles.length], tiles[(i - 1 + tiles.length) % tiles.length]].forEach(function (t) { var p = new Image(); p.src = t.getAttribute('href'); });
  }
  function hide() { lb.classList.remove('on'); document.body.style.overflow = ''; }
  tiles.forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); show(visible().indexOf(a)); }); });
  lb.querySelector('.lb-x').addEventListener('click', hide);
  lb.querySelector('.lb-prev').addEventListener('click', function () { show(i - 1); });
  lb.querySelector('.lb-next').addEventListener('click', function () { show(i + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) hide(); });
  document.addEventListener('keydown', function (e) { if (!lb.classList.contains('on')) return; if (e.key === 'Escape') hide(); if (e.key === 'ArrowLeft') show(i - 1); if (e.key === 'ArrowRight') show(i + 1); });
  var x0 = null; lb.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(dx < 0 ? i + 1 : i - 1); x0 = null; }, { passive: true });
})();

// Category filters on the gallery page (chips + "See all …" buttons in the stories)
(function () {
  var grid = document.querySelector('.gx'); if (!grid) return;
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chips button'));
  var empty = document.querySelector('.gx-empty');
  function apply(cat, scroll) {
    var n = 0;
    Array.prototype.forEach.call(grid.querySelectorAll('a'), function (a) { var on = cat === 'all' || a.getAttribute('data-cat') === cat; a.hidden = !on; if (on) n++; });
    chips.forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-filter') === cat); });
    if (empty) empty.hidden = n > 0;
    if (scroll) document.getElementById('all').scrollIntoView({ behavior: 'smooth', block: 'start' });
    try { history.replaceState(null, '', cat === 'all' ? location.pathname : '#' + cat); } catch (e) {}
  }
  document.querySelectorAll('[data-filter]').forEach(function (b) { b.addEventListener('click', function () { apply(b.getAttribute('data-filter'), !b.closest('.chips')); }); });
  var h = (location.hash || '').slice(1); if (h && chips.some(function (c) { return c.getAttribute('data-filter') === h; })) apply(h, false);
})();
