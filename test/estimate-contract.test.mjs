// Static contract pin for site/estimate.js ↔ timberbid-v1:estimate-log.
// Run: node test/estimate-contract.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(root, '../site/estimate.js'), 'utf8');
const fixture = JSON.parse(
  fs.readFileSync(path.join(root, 'fixtures/estimate-log.contract.json'), 'utf8')
);

let fail = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + msg);
  if (!cond) fail++;
};

const fnMatch = src.match(/var FN_URL = '([^']+)'/);
ok(!!fnMatch, 'FN_URL is declared');
if (fnMatch) {
  const u = new URL(fnMatch[1]);
  ok(u.hostname === fixture.supabase_host, 'calls shared Supabase host');
  ok(u.pathname === fixture.fn_path, 'path is ' + fixture.fn_path);
}

ok(src.includes('log_detected'), 'gates on log_detected');
ok(src.includes('reject_reason'), 'surfaces reject_reason');
ok(src.includes('estimate_id'), 'captures estimate_id for confirm');

for (const key of fixture.photo_response_success.required_keys) {
  ok(src.includes(key), 'success response uses field: ' + key);
}

for (const key of fixture.confirm_request.confirmed_keys) {
  ok(src.includes(key), 'confirm.confirmed includes: ' + key);
}
for (const key of fixture.confirm_request.band_keys) {
  ok(src.includes(key) || (key === 'valuation_version' && src.includes('M.VERSION')),
    'confirm.band includes: ' + key);
}

ok(/estimate_id\s*=\s*lastEstimateId/.test(src), 'confirm attaches estimate_id');
ok(/photos:\s*send/.test(src), 'photo request sends photos array');

for (const key of fixture.photo_response_success.required_keys) {
  ok(key in fixture.example_success, 'example_success has ' + key);
}
ok(fixture.example_reject.log_detected === false, 'example_reject is a reject');
console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
