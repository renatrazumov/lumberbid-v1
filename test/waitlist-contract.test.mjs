// Waitlist insert contract — shared table, three writers across repos.
// Run: node test/waitlist-contract.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(root, '../site/waitlist.js'), 'utf8');
const fixture = JSON.parse(
  fs.readFileSync(path.join(root, 'fixtures/waitlist.contract.json'), 'utf8')
);

let fail = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + msg);
  if (!cond) fail++;
};

ok(src.includes('/rest/v1/' + fixture.table), 'posts to ' + fixture.table);
ok(src.includes("role: 'interested'") || src.includes('role: "interested"'),
  'lumber uses role=interested (not a fake lumber role)');
ok(src.includes("source: '" + fixture.lumber_insert.source + "'") ||
   src.includes('source: "' + fixture.lumber_insert.source + '"'),
  'source=' + fixture.lumber_insert.source + ' segments this vertical');
ok(src.includes('return=minimal'), 'Prefer return=minimal');
ok(src.includes('status === 409') || src.includes('res.status === 409'),
  '409 duplicate treated as success');

ok(!/role:\s*'lumber'/.test(src), 'never invents role=lumber');
ok(src.includes(fixture.lumber_insert.note_prefix) || src.includes("note: 'lumber:"),
  'note carries lumber: prefix');

for (const key of fixture.lumber_insert.required_keys) {
  ok(new RegExp(key + '\\s*:').test(src), 'insert body includes ' + key);
}

ok(fixture.role_allowed.includes('interested'), 'fixture still allows interested');
ok(!fixture.role_allowed.includes('lumber'), 'fixture does not invent lumber role');

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
