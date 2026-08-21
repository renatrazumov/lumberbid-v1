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
    fetch(FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photos: send }),
    })
      .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, j: j }; }); })
      .then(function (r) {
        if (!r.ok) { say(r.j && r.j.error ? r.j.error : 'Could not read the photo — try again.', false); return; }
        if (!r.j.log_detected) { say(r.j.reject_reason || 'No log visible in that photo — try another angle.', false); return; }
        applyFacts(r.j);
      })
      .catch(function () { say('Network problem — check your connection and try again.', false); })
      .finally(function () { goBtn.disabled = false; refreshCta(); });
  });

  refreshCta();
})();
