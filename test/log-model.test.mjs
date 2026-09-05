// Golden cases for site/log-model.js — counterpart timberbid-v1:utils/logValuation.ts.
// Run: node test/log-model.test.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const M = require('../site/log-model.js');
const fixture = JSON.parse(
  fs.readFileSync(path.join(root, 'fixtures/logValuation.cases.json'), 'utf8')
);

let fail = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + msg);
  if (!cond) fail++;
};

ok(M.VERSION === fixture.valuation_version,
  'VERSION matches fixture (' + fixture.valuation_version + ')');

for (const c of fixture.cases) {
  const v = M.valueLog(c.input);
  const e = c.expect;
  ok(v.boardFeet === e.boardFeet, c.name + ': boardFeet ' + v.boardFeet + ' === ' + e.boardFeet);
  ok(v.grade === e.grade, c.name + ': grade ' + v.grade);
  ok(v.tier === e.tier, c.name + ': tier ' + v.tier);
  ok(v.route === e.route, c.name + ': route ' + v.route);
  ok(v.extractionCost === e.extractionCost, c.name + ': extractionCost ' + v.extractionCost);
  ok(v.grossValueBand.low === e.grossValueBand.low && v.grossValueBand.high === e.grossValueBand.high,
    c.name + ': gross band ' + v.grossValueBand.low + '-' + v.grossValueBand.high);
  ok(v.netValueBand.low === e.netValueBand.low && v.netValueBand.high === e.netValueBand.high,
    c.name + ': net band ' + v.netValueBand.low + '-' + v.netValueBand.high);
}

// Empty species must never resolve to walnut (2026-08-27 fix, both repos).
const empty = M.speciesValue('');
ok(empty.tier === 'utility' && empty.baseSawlogPerMbf === 180,
  'empty species → utility tier, not walnut');

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
