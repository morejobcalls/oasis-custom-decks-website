// Oasis — multi-step estimate form engine.
// Every form with [data-oasis-form] gets: step navigation, option buttons that
// record exact GHL picklist strings, validation, POST to /api/lead, redirect
// Lead relay lives on the Cloudflare Pages worker. When this site is served from
// GitHub Pages (oasiscustomdecks.com) the relay is cross-origin — CORS allowlist in _worker.js.
var RELAY_BASE = /\.pages\.dev$|^localhost$/.test(location.hostname) ? '' : 'https://oasis-website-s94.pages.dev';
// to /thank-you/. Attribution (gclid/UTMs) rides in from attribution.js.
(function () {
  document.querySelectorAll('[data-oasis-form]').forEach(initForm);

  function initForm(root) {
    var steps = Array.prototype.slice.call(root.querySelectorAll('.f-step'));
    var bars = Array.prototype.slice.call(root.querySelectorAll('.f-progress i'));
    var data = {};
    var idx = 0;

    function show(i) {
      idx = Math.max(0, Math.min(i, steps.length - 1));
      steps.forEach(function (s, n) { s.classList.toggle('on', n === idx); });
      bars.forEach(function (b, n) { b.classList.toggle('done', n <= idx); });
      var first = steps[idx].querySelector('input');
      if (first && idx > 0) first.focus({ preventScroll: true });
    }

    root.querySelectorAll('.opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        data[btn.closest('.f-step').getAttribute('data-field')] = btn.getAttribute('data-value');
        show(idx + 1);
      });
    });
    root.querySelectorAll('.f-back').forEach(function (b) {
      b.addEventListener('click', function () { show(idx - 1); });
    });

    var submitBtn = root.querySelector('[data-submit]');
    if (!submitBtn) return;
    submitBtn.addEventListener('click', function () {
      var err = root.querySelector('.f-err');
      err.textContent = '';
      var name = (root.querySelector('[name=name]').value || '').trim();
      var phone = (root.querySelector('[name=phone]').value || '').trim();
      var email = (root.querySelector('[name=email]').value || '').trim();
      var address = ((root.querySelector('[name=address]') || {}).value || '').trim();
      var city = (root.querySelector('[name=city]') || {}).value || '';
      var state = (root.querySelector('[name=state]') || {}).value || '';
      var zip = (root.querySelector('[name=zip]') || {}).value || '';
      var consent = root.querySelector('[name=consent]');
      if (name.length < 2) { err.textContent = 'Please enter your name.'; return; }
      if (phone.replace(/\D/g, '').length < 10) { err.textContent = 'Please enter a valid phone number.'; return; }
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'That email doesn’t look right.'; return; }
      if (address.length < 5) { err.textContent = 'Please enter the project address.'; return; }
      if (consent && !consent.checked) { err.textContent = 'Please check the consent box so we can contact you.'; return; }

      var parts = name.split(/\s+/);
      var payload = Object.assign({
        firstName: parts.shift(),
        lastName: parts.join(' '),
        phone: phone,
        email: email,
        address: address,
        city: city,
        state: state,
        zip: zip.trim(),
        project_type: data.project_type || '',
        timeline: data.timeline || '',
        notes: ((root.querySelector('[name=notes]') || {}).value || '').slice(0, 500),
        consent: !!(consent && consent.checked),
        page: location.pathname,
        page_url: location.href,
        referrer: document.referrer || '',
        submitted_at: new Date().toISOString(),
      }, window.oasisAttribution ? window.oasisAttribution() : {});

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
      fetch(RELAY_BASE + '/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok) {
            try {
              sessionStorage.setItem('oasis_lead', '1');
              // Enhanced-conversions payload for /thank-you/ (gtag 'user_data'); hashed by gtag, never sent raw to Google.
              var digits = phone.replace(/\D/g, '');
              var ud = { phone_number: '+' + (digits.length === 10 ? '1' + digits : digits),
                address: { first_name: payload.firstName, last_name: payload.lastName, street: address, city: city, region: state, postal_code: zip.trim(), country: 'US' } };
              if (email) ud.email = email;
              sessionStorage.setItem('oasis_lead_ud', JSON.stringify(ud));
            } catch (e) {}
            location.href = '/thank-you/';
          } else {
            throw new Error(res.j.error || 'send failed');
          }
        })
        .catch(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.getAttribute('data-label') || 'Get My Free Estimate';
          err.textContent = 'Something went wrong sending your request. Please call us at (724) 888-7288.';
        });
    });

    show(0);
  }


  // Google Places autocomplete on [data-places] inputs — active only when the
  // Maps script is loaded (MAPS_KEY set in build.mjs). Fills hidden city/state/zip.
  function wirePlaces() {
    if (!(window.google && google.maps && google.maps.places)) return;
    document.querySelectorAll('[data-places]').forEach(function (input) {
      if (input.__placesWired) return;
      input.__placesWired = true;
      var ac = new google.maps.places.Autocomplete(input, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
        fields: ['address_components', 'formatted_address'],
      });
      ac.addListener('place_changed', function () {
        var place = ac.getPlace() || {};
        if (place.formatted_address) input.value = place.formatted_address;
        var get = function (type, short) {
          var c = (place.address_components || []).find(function (x) { return x.types.indexOf(type) >= 0; });
          return c ? (short ? c.short_name : c.long_name) : '';
        };
        var root = input.closest('[data-oasis-form]');
        if (!root) return;
        var set = function (name, v) { var el = root.querySelector('[name=' + name + ']'); if (el && v) el.value = v; };
        set('city', get('locality') || get('administrative_area_level_3'));
        set('state', get('administrative_area_level_1', true));
        set('zip', get('postal_code'));
      });
    });
  }
  document.addEventListener('places-ready', wirePlaces);
  wirePlaces();

  // sticky mobile CTA bar (Google LPs): scrolls to the form, hides while the form is on screen
  var bar = document.querySelector('.m-cta');
  if (bar) {
    document.body.classList.add('has-mcta');
    var card = document.querySelector('.form-card');
    var go = bar.querySelector('.m-go');
    if (go && card) go.addEventListener('click', function (e) {
      e.preventDefault();
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    if (card && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        bar.classList.toggle('hide', es[0].isIntersecting && es[0].intersectionRatio >= 0.3);
      }, { threshold: [0, 0.3, 1] }).observe(card);
    }
  }

  // mobile nav
  var mb = document.querySelector('.menu-btn');
  if (mb) mb.addEventListener('click', function () {
    document.querySelector('.nav').classList.toggle('open');
    mb.setAttribute('aria-expanded', document.querySelector('.nav').classList.contains('open'));
  });
})();
