// EVENTS whitelist in site/metrics.js must match the migration CHECK list.
// Run: node test/metrics-events.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(root, '../site/metrics.js'), 'utf8');
const fixture = JSON.parse(
  fs.readFileSync(path.join(root, 'fixtures/site_events.events.json'), 'utf8'));

let fail = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + msg);
  if (!cond) fail++;
};

const m = src.match(/var EVENTS = \[([\s\S]*?)\];/);
ok(!!m, 'EVENTS array found in metrics.js');

const fromSrc = m
  ? m[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1))
  : [];

ok(fromSrc.length === fixture.events.length,
  'same event count (' + fromSrc.length + ' vs ' + fixture.events.length + ')');

const a = [...fromSrc].sort().join(',');
const b = [...fixture.events].sort().join(',');
ok(a === b, 'EVENTS === fixture whitelist (set equality)');

for (const ev of fixture.events) {
  ok(fromSrc.includes(ev), 'includes ' + ev);
}

ok(src.includes('/rest/v1/' + fixture.table), 'posts to ' + fixture.table);
ok(src.includes('return=minimal'), 'Prefer return=minimal (anon has no SELECT)');

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
