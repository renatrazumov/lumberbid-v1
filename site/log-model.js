// log-model.js — the lumber.bid log-value model, browser port.
//
// COUNTERPART (name it both ways): this is a FAITHFUL port of
// timberbid-v1:utils/logValuation.ts (which carries the matching comment).
// The species table, log rules, grade thresholds, multipliers and
// extraction-cost model MUST move together — update both files or neither.
// Cross-checked against timberbid-v1:__tests__/logValuation.test.ts at port
// time (2026-08-21) by loading this file in Node and asserting the same cases.
//
// PRICES ARE REGIONAL AND VOLATILE. Every dollar output is a BAND, presented
// as an estimate, never a quote (house rule: no false precision). Anchored to
// Aug-2026 Appalachian survey data (Doyle scale, delivered-to-mill).
//
// Pure and deterministic: no DOM, no network, no state. estimate.js owns the UI.

(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.LogModel = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Board feet from small-end diameter (in) and length (ft). */
  function boardFeet(smallEndDiameterIn, lengthFt, rule) {
    rule = rule || 'doyle';
    var d = Math.max(0, smallEndDiameterIn);
    var L = Math.max(0, lengthFt);
    if (d < 4 || L <= 0) return 0;
    if (rule === 'doyle') {
      // Doyle: ((D-4)^2 / 16) * L. Common in the East; under-measures small logs.
      return Math.round((Math.pow(d - 4, 2) / 16) * L);
    }
    // International 1/4-inch, the most accurate rule. Per 4-ft section:
    // BF = 0.22*D^2 - 0.71*D, summed over L/4 sections (taper ignored — the
    // small-end diameter is conservative, which is the honest direction).
    return Math.round((0.22 * d * d - 0.71 * d) * (L / 4));
  }

  var SPECIES = {
    'walnut':       { tier: 'premium', baseSawlogPerMbf: 900, veneerPerMbf: 6000 },
    'black walnut': { tier: 'premium', baseSawlogPerMbf: 900, veneerPerMbf: 6000 },
    'white oak':    { tier: 'premium', baseSawlogPerMbf: 620, veneerPerMbf: 4800 },
    'cherry':       { tier: 'premium', baseSawlogPerMbf: 550, veneerPerMbf: 3200 },
    'hard maple':   { tier: 'premium', baseSawlogPerMbf: 520, veneerPerMbf: 3000 },
    'red oak':      { tier: 'high',    baseSawlogPerMbf: 420, veneerPerMbf: 1600 },
    'ash':          { tier: 'high',    baseSawlogPerMbf: 360, veneerPerMbf: 1200 },
    'hickory':      { tier: 'high',    baseSawlogPerMbf: 340, veneerPerMbf: 1100 },
    'soft maple':   { tier: 'medium',  baseSawlogPerMbf: 280, veneerPerMbf: 900 },
    'birch':        { tier: 'medium',  baseSawlogPerMbf: 270, veneerPerMbf: 900 },
    'poplar':       { tier: 'medium',  baseSawlogPerMbf: 240, veneerPerMbf: 700 },
    'sycamore':     { tier: 'medium',  baseSawlogPerMbf: 220, veneerPerMbf: 600 },
    'pine':         { tier: 'utility', baseSawlogPerMbf: 200, veneerPerMbf: 350 },
    'spruce':       { tier: 'utility', baseSawlogPerMbf: 190, veneerPerMbf: 320 },
    'fir':          { tier: 'utility', baseSawlogPerMbf: 190, veneerPerMbf: 320 },
    'cottonwood':   { tier: 'utility', baseSawlogPerMbf: 150, veneerPerMbf: 250 }
  };

  /** Map free-text species to a value tier; unknown -> utility (conservative). */
  function speciesValue(species) {
    var s = String(species || '').toLowerCase().trim();
    if (SPECIES[s]) return SPECIES[s];
    for (var key in SPECIES) {
      if (s.indexOf(key) !== -1 || key.indexOf(s) !== -1) return SPECIES[key];
    }
    if (s.indexOf('walnut') !== -1) return SPECIES['walnut'];
    if (s.indexOf('oak') !== -1) return s.indexOf('red') !== -1 ? SPECIES['red oak'] : SPECIES['white oak'];
    if (s.indexOf('maple') !== -1) return SPECIES['soft maple'];
    return { tier: 'utility', baseSawlogPerMbf: 180, veneerPerMbf: 300 };
  }

  /**
   * Grade from small-end diameter (the dominant driver) with defect knockdown.
   * veneer >=22" clear, grade1 >=16", grade2 >=13", grade3 >=10", length >=8ft.
   * Metal suspicion caps at grade3 — one embedded nail can ruin a blade.
   */
  function gradeLog(opts) {
    var d = opts.smallEndDiameterIn;
    if (d < 10 || opts.lengthFt < 8) return 'below_grade';
    var grade =
      d >= 22 && opts.clear ? 'veneer' :
      d >= 16 ? 'grade1' :
      d >= 13 ? 'grade2' : 'grade3';
    var order = ['veneer', 'grade1', 'grade2', 'grade3', 'below_grade'];
    var idx = order.indexOf(grade);
    idx += Math.max(0, Math.min(2, opts.defects || 0));
    if (opts.metalSuspected && idx < order.indexOf('grade3')) idx = order.indexOf('grade3');
    return order[Math.min(idx, order.length - 1)];
  }

  var GRADE_MULTIPLIER = {
    veneer: 1,      // priced off veneerPerMbf directly
    grade1: 1.35,   // x baseSawlogPerMbf
    grade2: 1.0,
    grade3: 0.6,
    below_grade: 0  // not a sawlog -> firewood path
  };

  var round = function (n) { return Math.round(n); };

  function valueLog(input) {
    var rule = input.rule || 'doyle';
    var bf = boardFeet(input.smallEndDiameterIn, input.lengthFt, rule);
    var sv = speciesValue(input.species);
    var grade = gradeLog({
      smallEndDiameterIn: input.smallEndDiameterIn,
      lengthFt: input.lengthFt,
      clear: input.clear,
      defects: input.defects,
      metalSuspected: input.metalSuspected
    });
    var flags = [];

    if (grade === 'below_grade' || bf <= 0) {
      if (input.smallEndDiameterIn < 10) flags.push('under 10" small-end — below sawlog grade');
      if (input.lengthFt < 8) flags.push('under 8ft — below merchantable log length');
      return {
        boardFeet: bf, grade: grade, tier: sv.tier,
        grossValueBand: { low: 0, high: 0 }, extractionCost: 0,
        netValueBand: { low: 0, high: 0 }, route: 'firewood', flags: flags
      };
    }

    var perMbf = grade === 'veneer' ? sv.veneerPerMbf : sv.baseSawlogPerMbf * GRADE_MULTIPLIER[grade];
    var grossMid = (bf / 1000) * perMbf;
    // +/-25% band — regional volatility is real; never a single confident number.
    var grossLow = grossMid * 0.75;
    var grossHigh = grossMid * 1.25;

    if (!input.delivered) { grossLow *= 0.6; grossHigh *= 0.6; flags.push('stumpage (standing) — ~40% under delivered-to-mill'); }

    // Extraction cost scales with harvest difficulty AND log value: a premium
    // log is felled/bucked carefully (slower, more rigging) to protect grade.
    var diff = Math.max(0, Math.min(1, input.harvestDifficulty == null ? 0.3 : input.harvestDifficulty));
    var valueCareFactor = sv.tier === 'premium' ? 1.4 : sv.tier === 'high' ? 1.2 : 1.0;
    var extractionCost = round((80 + 340 * diff) * valueCareFactor);

    if (input.metalSuspected) flags.push('metal suspected — one nail ruins a blade; mills discount or reject');
    if (grade === 'veneer') flags.push('veneer-grade candidate — get a buyer to inspect; value is highly log-specific');
    if (sv.tier === 'premium') flags.push('premium species — worth milling, not chipping');

    var netLow = round(grossLow - extractionCost);
    var netHigh = round(grossHigh - extractionCost);
    var route = netHigh > 60 ? 'lumber' : 'firewood';

    return {
      boardFeet: bf, grade: grade, tier: sv.tier,
      grossValueBand: { low: round(grossLow), high: round(grossHigh) },
      extractionCost: extractionCost,
      netValueBand: { low: netLow, high: netHigh },
      route: route, flags: flags
    };
  }

  return { boardFeet: boardFeet, speciesValue: speciesValue, gradeLog: gradeLog, valueLog: valueLog, SPECIES: SPECIES };
}));
