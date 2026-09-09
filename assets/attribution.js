// Oasis — click-ID + UTM capture (90-day localStorage persistence).
// Captures on every page load so a visitor who lands on a blog page and
// converts on an LP two days later still carries their gclid.
(function () {
  var KEYS = ['gclid', 'gbraid', 'wbraid', 'fbclid',
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var NS = 'oasis_attr';
  var TTL = 90 * 24 * 3600 * 1000;
  function load() {
    try {
      var raw = localStorage.getItem(NS);
      if (!raw) return {};
      var o = JSON.parse(raw);
      if (!o._ts || Date.now() - o._ts > TTL) return {};
      return o;
    } catch (e) { return {}; }
  }
  var store = load();
  var params = new URLSearchParams(location.search);
  var touched = false;
  KEYS.forEach(function (k) {
    var v = params.get(k);
    if (v) { store[k] = v.slice(0, 500); touched = true; }
  });
  if (touched || !store._ts) store._ts = store._ts && !touched ? store._ts : Date.now();
  try { localStorage.setItem(NS, JSON.stringify(store)); } catch (e) {}
  window.oasisAttribution = function () {
    var out = {};
    KEYS.forEach(function (k) { if (store[k]) out[k] = store[k]; });
    return out;
  };
})();
