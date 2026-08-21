// estimate.js — DOM glue for the /estimate page. All math lives in
// log-model.js (the faithful port of timberbid-v1:utils/logValuation.ts);
// this file only reads the form, calls LogModel.valueLog, and renders bands.
// House rule carried through: bands, never a single confident number, and the
// output is labelled an estimate, never a quote.

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
})();
