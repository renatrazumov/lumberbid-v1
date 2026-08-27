// estimate.js — DOM glue for the /estimate page. All math lives in
// log-model.js (the faithful port of timberbid-v1:utils/logValuation.ts);
// this file only reads the form, calls LogModel.valueLog, and renders bands.
// House rule carried through: bands, never a single confident number, and the
// output is labelled an estimate, never a quote.
//
// Photo mode COUNTERPART: timberbid-v1:supabase/functions/estimate-log
// (vision-only, returns measured facts + confidences, never a price). The
// pricing stays HERE in log-model.js, so the same fields the AI fills are the
// same fields the seller can correct — no hidden path from photo to dollars.
// Layout mirrors timber.bid/estimate (three shot boxes, one big CTA): one
// company, one format. The three angles are the LOG's three: full stick
// (scale), end grain (diameter/rings/rot), bark (species).

(function () {
  'use strict';
  var M = window.LogModel;
  var form = document.getElementById('est-form');
  if (!form || !M) return;

  var out = document.getElementById('est-result');
  var usd = function (n) { return '$' + Math.max(0, n).toLocaleString('en-US'); };

  var GRADE_LABEL = {
    veneer: 'Veneer candidate',
    grade1: 'Grade 1 sawlog',
    grade2: 'Grade 2 sawlog',
    grade3: 'Grade 3 sawlog',
    below_grade: 'Below sawlog grade'
  };

  function read() {
    return {
      species: document.getElementById('est-species').value,
      smallEndDiameterIn: parseFloat(document.getElementById('est-diameter').value) || 0,
      lengthFt: parseFloat(document.getElementById('est-length').value) || 0,
      rule: document.querySelector('input[name="rule"]:checked').value,
      clear: document.getElementById('est-clear').checked,
      defects: parseInt(document.querySelector('input[name="defects"]:checked').value, 10),
      metalSuspected: document.getElementById('est-metal').checked,
      delivered: document.querySelector('input[name="where"]:checked').value === 'delivered',
      harvestDifficulty: parseFloat(document.querySelector('input[name="difficulty"]:checked').value)
    };
  }

  function render() {
    var input = read();
    if (input.smallEndDiameterIn <= 0 || input.lengthFt <= 0) { out.hidden = true; return; }
    var v = M.valueLog(input);

    var rows = [];
    rows.push('<h2>The estimate</h2>');
    rows.push('<div class="est-row"><span>Board feet (' + (input.rule === 'doyle' ? 'Doyle' : 'International ¼″') + ')</span><strong>' + v.boardFeet.toLocaleString('en-US') + ' BF</strong></div>');
    rows.push('<div class="est-row"><span>Grade</span><strong>' + GRADE_LABEL[v.grade] + '</strong></div>');

    if (v.route === 'lumber') {
      rows.push('<div class="est-row"><span>Gross value band</span><strong>' + usd(v.grossValueBand.low) + ' – ' + usd(v.grossValueBand.high) + '</strong></div>');
      rows.push('<div class="est-row"><span>Est. extraction cost</span><strong>−' + usd(v.extractionCost) + '</strong></div>');
      rows.push('<div class="est-row est-net"><span>Net value band</span><strong>' + usd(v.netValueBand.low) + ' – ' + usd(v.netValueBand.high) + '</strong></div>');
      rows.push('<p class="est-verdict ok">Worth selling as a log — this is what a sealed bid is for.</p>');
    } else {
      rows.push('<p class="est-verdict">This one is firewood, not lumber — milling it would not beat the ~$60/log firewood alternative. That is a fine outcome; most logs are firewood.</p>');
    }

    if (v.flags.length) {
      rows.push('<ul class="est-flags">' + v.flags.map(function (f) { return '<li>' + f + '</li>'; }).join('') + '</ul>');
    }
    rows.push('<p class="wl-fine">An estimate, never a quote. Bands anchor to Aug-2026 Appalachian survey data (' +
      'Doyle scale, delivered-to-mill); your region and your buyer will differ — which is exactly why lots sell by sealed bid.</p>');

    out.innerHTML = rows.join('');
    out.hidden = false;
  }

  form.addEventListener('input', render);
  form.addEventListener('submit', function (ev) { ev.preventDefault(); render(); });
  render(); // walnut default renders immediately — the flagship case on load

  // --- Photo mode --------------------------------------------------------
  var FN_URL = 'https://uuzqezohkqgsbbxyzvvv.supabase.co/functions/v1/estimate-log';
  // Set when a photo estimate returns one. Null means "no AI reading exists for
  // what is on screen", which gates every write below.
  var lastEstimateId = null;
  var shotsWrap = document.getElementById('shots');
  var fileInput = document.getElementById('shot-file');
  var goBtn = document.getElementById('est-photo-go');
  var helper = document.getElementById('est-photo-helper');
  var statusEl = document.getElementById('est-photo-status');
  if (!shotsWrap || !fileInput || !goBtn) return;

  // Up to three downscaled data URLs, indexed by slot (full / end / bark).
  var photos = [null, null, null];
  var activeSlot = 0;

  function say(msg, ok) {
    statusEl.textContent = msg;
    statusEl.className = 'wl-status' + (ok === true ? ' ok' : ok === false ? ' err' : '');
  }

  function refreshCta() {
    var n = photos.filter(Boolean).length;
    goBtn.disabled = n === 0;
    helper.textContent = n === 0
      ? 'Add at least one photo of the log'
      : n + ' photo' + (n > 1 ? 's' : '') + ' ready — more angles read better';
  }

  // Downscale client-side so a 12MP phone photo becomes a ~200KB JPEG. The
  // function rejects giant payloads; a compliant client never sends one.
  function downscale(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var max = 1280;
        var scale = Math.min(1, max / Math.max(img.width, img.height));
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('unreadable image')); };
      img.src = url;
    });
  }

  // Click a box → pick a file → downscale → thumbnail into that box.
  shotsWrap.addEventListener('click', function (ev) {
    var box = ev.target.closest ? ev.target.closest('.shot') : null;
    if (!box) return;
    activeSlot = parseInt(box.getAttribute('data-slot'), 10) || 0;
    fileInput.value = '';
    fileInput.click();
  });
  fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    var box = shotsWrap.querySelector('.shot[data-slot="' + activeSlot + '"]');
    say('');
    downscale(file)
      .then(function (dataUrl) {
        photos[activeSlot] = dataUrl;
        // Funnel beacon — see site/metrics.js. Guarded: analytics absent
        // must change nothing about how this page works.
        if (typeof window.lbTrack === 'function') window.lbTrack('estimate_photo_added', { slot: activeSlot });
        if (box) {
          box.classList.add('filled');
          var pv = box.querySelector('img.preview');
          var cam = box.querySelector('svg.cam');
          if (pv) { pv.src = dataUrl; pv.hidden = false; }
          if (cam) cam.style.display = 'none';
        }
        refreshCta();
      })
      .catch(function () { say('That image could not be read — try another photo.', false); });
  });

  function setRadio(name, value) {
    var el = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if (el) el.checked = true;
  }

  function applyFacts(f) {
    // Species: select the matching option, else 'other' (log-model routes
    // unknown species to the conservative utility tier).
    var sel = document.getElementById('est-species');
    var match = 'other';
    for (var i = 0; i < sel.options.length; i++) {
      var v = sel.options[i].value;
      if (v !== 'other' && (f.species === v || f.species.indexOf(v) !== -1 || v.indexOf(f.species) !== -1)) {
        match = v; break;
      }
    }
    sel.value = match;
    document.getElementById('est-diameter').value = f.small_end_diameter_in;
    document.getElementById('est-length').value = f.length_ft;
    document.getElementById('est-clear').checked = !!f.clear_faces;
    setRadio('defects', String(f.defects));
    document.getElementById('est-metal').checked = !!f.metal_suspected;
    render();

    var bits = [
      'Read: ' + f.species + ' (' + f.species_confidence + ' confidence), ' +
      f.small_end_diameter_in + '″ × ' + f.length_ft + ' ft' +
      (f.reference_object ? ', scaled by ' + f.reference_object : ', NO scale object — diameter is a rough guess'),
    ];
    if (f.figured_suspected) bits.push('Possible figure — worth a buyer’s inspection.');
    if (f.notes) bits.push(f.notes);
    bits.push('Check the numbers below — every field is yours to correct.');
    say(bits.join(' '), true);
  }

  goBtn.addEventListener('click', function () {
    var send = photos.filter(Boolean);
    if (send.length === 0) { say('Add at least one photo first.', false); return; }
    goBtn.disabled = true;
    helper.textContent = '';
    say('Reading the log…');
    // Funnel beacons throughout — see site/metrics.js. The 2026-08-26 lesson:
    // one visitor's estimate was REJECTED by the model and from the database
    // that was indistinguishable from the tool never being tried at all.
    var trk = function (ev, meta) { if (typeof window.lbTrack === 'function') window.lbTrack(ev, meta); };
    trk('estimate_requested', { photos: send.length });
    fetch(FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photos: send }),
    })
      .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, j: j }; }); })
      .then(function (r) {
        if (!r.ok) { trk('estimate_failed', { status: 'http' }); say(r.j && r.j.error ? r.j.error : 'Could not read the photo — try again.', false); return; }
        if (!r.j.log_detected) { trk('estimate_rejected', {}); say(r.j.reject_reason || 'No log visible in that photo — try another angle.', false); return; }
        trk('estimate_returned', { species: String(r.j.species || '').slice(0, 30) });
        // Older deploys of estimate-log do not return an id; everything below
        // is a no-op in that case, by design.
        lastEstimateId = typeof r.j.estimate_id === 'string' ? r.j.estimate_id : null;
        applyFacts(r.j);
        scheduleConfirmation();
      })
      .catch(function () { trk('estimate_failed', { status: 'network' }); say('Network problem — check your connection and try again.', false); })
      .finally(function () { goBtn.disabled = false; refreshCta(); });
  });

  refreshCta();

  // --- Sending back what the human actually decided -----------------------
  //
  // COUNTERPART: timberbid-v1:supabase/functions/estimate-log (confirm shape).
  // Change one, change the other.
  //
  // The AI reads the log; the seller then corrects it — and the corrected
  // numbers are worth more than the reading. They are a human-verified label on
  // a physical measurement, which is what tells us whether the model's diameter
  // is trustworthy, whether the scale-object advice actually helps, and where
  // the band should move. Until 2026-08-24 all of it died with the tab.
  //
  // Three rules this obeys:
  //   1. FIRE AND FORGET. A telemetry write must never cost a seller their
  //      estimate, so every failure is swallowed and nothing here touches the
  //      rendered band.
  //   2. DEBOUNCED. render() runs on every keystroke; corrections are sent
  //      only once the numbers have been still for a moment, and only when
  //      they actually changed.
  //   3. ONLY AFTER A PHOTO. Typing into the manual calculator produces no
  //      estimate_id and sends nothing — there is no AI reading to compare a
  //      correction against, so the row would carry a label with no subject.
  var CONFIRM_DEBOUNCE_MS = 2500;
  var lastSentSignature = '';
  var confirmTimer = null;

  function currentConfirmation() {
    var input = read();
    if (input.smallEndDiameterIn <= 0 || input.lengthFt <= 0) return null;
    var v = M.valueLog(input);
    // A firewood-route log has no value band; record the facts, not a fake band.
    var band = v.route === 'lumber' ? v.netValueBand : null;
    return {
      confirmed: {
        species: document.getElementById('est-species').value,
        small_end_diameter_in: input.smallEndDiameterIn,
        length_ft: input.lengthFt,
        clear_faces: input.clear,
        defects: input.defects,
        metal: input.metalSuspected
      },
      band: {
        low: band ? band.low : null,
        high: band ? band.high : null,
        board_feet: v.boardFeet,
        log_rule: input.rule,
        valuation_version: M.VERSION || null
      }
    };
  }

  function sendConfirmation(email, onDone) {
    if (!lastEstimateId) { if (onDone) onDone(false); return; }
    var payload = currentConfirmation();
    if (!payload) { if (onDone) onDone(false); return; }
    var signature = JSON.stringify(payload) + '|' + (email || '');
    if (!email && signature === lastSentSignature) { if (onDone) onDone(true); return; }
    lastSentSignature = signature;
    payload.estimate_id = lastEstimateId;
    if (email) payload.email = email;
    fetch(FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (res.ok && typeof window.lbTrack === 'function') {
          // The correction is the dataset; an email with it is a lead too.
          window.lbTrack('estimate_corrected', {});
          if (email) window.lbTrack('waitlist_joined', { via: 'estimate_confirm' });
        }
        if (onDone) onDone(res.ok);
      })
      .catch(function () { if (onDone) onDone(false); });
  }

  function scheduleConfirmation() {
    if (!lastEstimateId) return;
    if (confirmTimer) clearTimeout(confirmTimer);
    confirmTimer = setTimeout(function () { sendConfirmation(null, null); }, CONFIRM_DEBOUNCE_MS);
  }

  form.addEventListener('input', scheduleConfirmation);

  // --- The email ask ------------------------------------------------------
  // Shown only once a band exists, because before that there is nothing to be
  // told about. Deliberately the waitlist ask and not a buyer promise — no
  // auction is open (honesty rule).
  var leadBox = document.getElementById('est-lead');
  var leadForm = document.getElementById('est-lead-form');
  var leadEmail = document.getElementById('est-lead-email');
  var leadBtn = document.getElementById('est-lead-submit');
  var leadStatus = document.getElementById('est-lead-status');

  if (leadBox && leadForm) {
    // The result card is the trigger: if a band is on screen, so is the ask.
    var revealLead = function () {
      if (!out.hidden) leadBox.hidden = false;
    };
    form.addEventListener('input', revealLead);
    revealLead();

    leadForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var value = (leadEmail.value || '').trim();
      if (!value) return;
      leadBtn.disabled = true;
      leadStatus.textContent = 'Saving…';
      // No estimate_id means the visitor never ran a photo estimate. Their
      // interest is still real, so fall back to the site's own waitlist write
      // rather than dropping it.
      if (!lastEstimateId && typeof window.lumberWaitlistSubmit === 'function') {
        window.lumberWaitlistSubmit(value, 'lumber: estimate page (manual)', function (ok) {
          leadBtn.disabled = false;
          leadStatus.textContent = ok
            ? "You're on the list — you'll hear when sealed lots open near you."
            : 'That did not save. Try again in a moment.';
        });
        return;
      }
      sendConfirmation(value, function (ok) {
        leadBtn.disabled = false;
        leadStatus.textContent = ok
          ? "You're on the list — you'll hear when sealed lots open near you."
          : 'That did not save. Try again in a moment.';
      });
    });
  }
})();
