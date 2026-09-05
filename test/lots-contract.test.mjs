// Query contract for site/lots.js ↔ timberbid-v1:app/lumber/index.tsx.
// Run: node test/lots-contract.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(root, '../site/lots.js'), 'utf8');
const fixture = JSON.parse(
  fs.readFileSync(path.join(root, 'fixtures/listings.contract.json'), 'utf8')
);

let fail = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + msg);
  if (!cond) fail++;
};

const colsMatch = src.match(/var COLS = \[([\s\S]*?)\](?:\.join|;)/);
ok(!!colsMatch, 'COLS declared');

const cols = colsMatch
  ? colsMatch[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1))
  : [];

ok(cols.join(',') === fixture.columns.join(','),
  'COLS order and names match fixture');

ok(src.includes('listing_type=eq.' + fixture.filters.listing_type),
  'filters listing_type=' + fixture.filters.listing_type);
ok(src.includes('sale_type=eq.' + fixture.filters.sale_type),
  'filters sale_type=' + fixture.filters.sale_type);
ok(src.includes('auction_status=in.(' + fixture.filters.auction_status_in.join(',') + ')'),
  'filters auction_status in live,closing');
ok(src.includes('order=' + fixture.order), 'orders by ' + fixture.order);
ok(src.includes('limit=' + fixture.limit), 'limit ' + fixture.limit);

ok(src.includes(fixture.lot_deep_link_prefix), 'lot cards deep-link to timber.bid');
ok(src.includes(fixture.board_deep_link), 'CTA links to the full board');

ok(/auction_mode\s*===\s*'open'/.test(src), 'seal gate uses auction_mode === open');
ok(src.includes('auction_current_bid_cents'), 'reads current bid (open only)');
ok(!/select=\*/.test(src) && !/\.select\('\*'\)/.test(src), 'never select *');

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
