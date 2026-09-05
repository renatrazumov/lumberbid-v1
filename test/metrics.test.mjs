// Offline harness for site/metrics.js — specifically the self-exclusion flag.
//
// This logic fails silently in BOTH directions and neither shows up on the
// page: a broken opt-out keeps polluting the funnel, and a too-eager one kills
// every beacon for every visitor while the site looks perfectly fine. So both
// directions are asserted here, plus the storage-refused fallback, which is
// the case that would take analytics down globally if it failed toward
// silence.
//
// Run: node test/metrics.test.mjs
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../site/metrics.js', import.meta.url), 'utf8');

/**
 * Execute metrics.js against a fake browser.
 * @param {object} o
 * @param {string} o.search        location.search
 * @param {object|null} o.store    backing object for localStorage, null = throws
 */
function run({ search = '', store = {} } = {}) {
  const sent = [];
  const logs = [];
  const listeners = {};

  const throwing = store === null;
  const localStorage = {
    getItem: (k) => { if (throwing) throw new Error('blocked'); return k in store ? store[k] : null; },
    setItem: (k, v) => { if (throwing) throw new Error('blocked'); store[k] = String(v); },
    removeItem: (k) => { if (throwing) throw new Error('blocked'); delete store[k]; },
  };
  const sess = {};
  const sessionStorage = {
    getItem: (k) => (k in sess ? sess[k] : null),
    setItem: (k, v) => { sess[k] = String(v); },
  };

  const win = {};
  const sandbox = {
    window: win,
    document: {
      referrer: '',
      addEventListener: (type, fn) => { listeners[type] = fn; },
    },
    location: { search, pathname: '/', hostname: 'lumber.bid' },
    localStorage,
    sessionStorage,
    console: { log: (m) => logs.push(String(m)) },
    fetch: (url, init) => { sent.push(JSON.parse(init.body)); return Promise.resolve({ ok: true }); },
    URL,
    Math,
    Date,
    JSON,
    String,
  };

  new Function(...Object.keys(sandbox), src)(...Object.values(sandbox));
  return { sent, logs, store, win, click: listeners.click };
}

let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  PASS  ' : '  FAIL  ') + msg); if (!cond) fail++; };

// 1. The normal visitor is measured.
const plain = run();
ok(plain.sent.length === 1 && plain.sent[0].event === 'pageview', 'a normal visit sends exactly one pageview');
ok(plain.sent[0].site === 'lumber.bid' && plain.sent[0].path === '/', 'the beacon carries site and path');

// 2. ?nostats=1 opts this browser out, and does not count its own visit.
const optOut = run({ search: '?nostats=1' });
ok(optOut.sent.length === 0, 'the opting-out visit itself sends nothing');
ok(optOut.store.lb_nostats === '1', 'the flag is persisted');
ok(optOut.logs.some((l) => /OFF for this browser/.test(l)), 'it says out loud that it is off');

// 3. The flag persists on later visits with no parameter.
const later = run({ store: { lb_nostats: '1' } });
ok(later.sent.length === 0, 'a later plain visit still sends nothing');

// 4. Opt-out suppresses the FUNNEL beacons too, not just the pageview —
//    estimate.js and waitlist.js call through window.lbTrack.
const funnel = run({ store: { lb_nostats: '1' } });
funnel.win.lbTrack('estimate_requested', { photos: 2 });
funnel.win.lbTrack('waitlist_joined', { via: 'homepage_form' });
ok(funnel.sent.length === 0, 'window.lbTrack is suppressed while opted out');

// 5. ?nostats=0 turns it back on.
const optIn = run({ search: '?nostats=0', store: { lb_nostats: '1' } });
ok(!('lb_nostats' in optIn.store), 'the flag is cleared');
ok(optIn.sent.length === 1, 'beacons resume immediately');
ok(optIn.logs.some((l) => /ON for this browser/.test(l)), 'it says out loud that it is on');

// 6. THE IMPORTANT ONE: storage that throws must not kill analytics.
const blocked = run({ store: null });
ok(blocked.sent.length === 1, 'a browser that refuses storage still gets measured');
const blockedToggle = run({ search: '?nostats=1', store: null });
ok(blockedToggle.sent.length === 1, 'and a toggle it cannot persist does not silently half-apply');

// 7. A junk parameter value changes nothing.
const junk = run({ search: '?nostats=yes' });
ok(junk.sent.length === 1 && !('lb_nostats' in junk.store), 'an unrecognised nostats value is ignored');

// 8. The opt-out never leaves the browser.
ok(plain.sent.every((b) => !('nostats' in b) && !JSON.stringify(b).includes('lb_nostats')),
   'the flag is never transmitted in a beacon');

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
