// Offline harness for site/lots.js. No prod writes: inserting a real listing
// would fire trigger_new_listing_email at real users.
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../site/lots.js', import.meta.url), 'utf8');

function run(rows, { hasHost = true } = {}) {
  const host = { innerHTML: '', hidden: true };
  const sandbox = {
    document: { getElementById: (id) => (hasHost && id === 'open-lots' ? host : null) },
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve(rows) }),
    window: {},
    encodeURIComponent,
    Date,
    Math,
    Number,
    String,
  };
  const fn = new Function(...Object.keys(sandbox), src);
  fn(...Object.values(sandbox));
  return new Promise((r) => setTimeout(() => r(host), 10));
}

const FUT = new Date(Date.now() + 3 * 86400000).toISOString();
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  PASS  ' : '  FAIL  ') + msg); if (!cond) fail++; };

// 1. ZERO LOTS -> renders absolutely nothing, stays hidden.
const empty = await run([]);
ok(empty.innerHTML === '', 'zero lots renders no markup at all');
ok(empty.hidden === true, 'zero lots leaves the section hidden');

// 2. A SEALED lot must never leak an amount.
const sealed = await run([{
  id: 'abc-123', title: '6 black walnut sawlogs', species: 'black walnut',
  images: ['https://uuzqezohkqgsbbxyzvvv.supabase.co/storage/v1/object/public/public/u/lumber-lots/1.jpg',
           'https://uuzqezohkqgsbbxyzvvv.supabase.co/storage/v1/object/public/public/u/lumber-lots/2.jpg'],
  auction_status: 'live', auction_ends_at: FUT,
  auction_starting_bid_cents: 90000, auction_bid_count: 3,
  auction_mode: 'sealed', auction_current_bid_cents: 250000,  // must NOT appear
  location: 'Foster, RI', estimated_board_feet: 1400, metal_risk: false,
}]);
const h = sealed.innerHTML;
ok(!h.includes('2,500') && !h.includes('$2,500'), 'SEAL: sealed lot hides auction_current_bid_cents');
ok(h.includes('From $900'), 'sealed lot shows the STARTING bid');
ok(h.includes('3 sealed bids'), 'sealed lot shows the bid count');
ok(h.includes('SEALED'), 'sealed lot is labelled SEALED');
ok(h.includes('<img src="https://uuzqezohkqgsbbxyzvvv.supabase.co/storage'), 'lead photo renders');
ok(h.includes('>2<'), 'photo count badge shows 2');
ok(h.includes('href="https://timber.bid/lumber/abc-123"'), 'links to the app lot page');
ok(h.includes('~1,400 BF') && h.includes('Foster, RI'), 'shows board feet and location');
ok(sealed.hidden === false, 'section is revealed when lots exist');

// 3. An OPEN auction may show the high bid.
const open = await run([{
  id: 'o-1', title: 'walnut burl', species: 'walnut burl', images: [],
  auction_status: 'live', auction_ends_at: FUT,
  auction_starting_bid_cents: 50000, auction_bid_count: 1,
  auction_mode: 'open', auction_current_bid_cents: 120000,
  location: 'Foster, RI', estimated_board_feet: null, metal_risk: true,
}]);
ok(open.innerHTML.includes('High bid $1,200'), 'OPEN lot shows the current high bid');
ok(open.innerHTML.includes('LIVE AUCTION'), 'open lot labelled LIVE AUCTION');
ok(open.innerHTML.includes('1 bid<'), 'singular "1 bid", not "1 bids"');
ok(open.innerHTML.includes('metal risk disclosed'), 'metal disclosure surfaces');
ok(open.innerHTML.includes('no photos'), 'a lot with no images degrades to a placeholder');

// 4. XSS: a hostile title must not execute.
const xss = await run([{
  id: 'x', title: '<img src=x onerror=alert(1)>', species: '"><script>bad()</script>',
  images: [], auction_status: 'live', auction_ends_at: FUT,
  auction_starting_bid_cents: 100, auction_bid_count: 0, auction_mode: 'sealed',
  auction_current_bid_cents: null, location: 'x', estimated_board_feet: null, metal_risk: false,
}]);
// Assert no live TAG survives. `onerror=` persisting as inert text after `<`
// became `&lt;` is correct output, not a leak — testing for the substring was
// the wrong assertion and failed a passing escape.
ok(!/<script\b/i.test(xss.innerHTML), 'no <script> tag survives escaping');
ok(!/<img src=x/i.test(xss.innerHTML), 'no injected <img> tag survives escaping');
ok(xss.innerHTML.includes('&lt;img src=x onerror=alert(1)&gt;'), 'hostile title renders as inert text');

// 5. No mount point -> no crash.
try { await run([{ id: 'z' }], { hasHost: false }); ok(true, 'missing #open-lots is a safe no-op'); }
catch (e) { ok(false, 'missing #open-lots threw: ' + e.message); }

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
