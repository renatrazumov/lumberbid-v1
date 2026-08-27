// lumber.bid metrics — the site's SECOND write, and the first measurement.
//
// For two weeks this site was live with zero analytics of any kind, which made
// every number uninterpretable: "zero waitlist signups" could mean zero
// visitors or five hundred people bouncing, and those demand opposite
// responses. This beacon is the fix, done the only way this site's CSP allows:
// first-party script, first-party connect target, no vendor, no cookies.
//
// SHARED-TABLE CONTRACT (name the counterpart, both ways — CLAUDE.md rule):
// public.site_events is created and column-locked by
//   timberbid-v1:supabase/migrations/20260827235000_the_family_sites_learn_to_count_their_visitors.sql
// That migration's header names this file as the writer. Change the event
// whitelist there and the EVENTS list here together or not at all.
//
// Contract facts (the wood_delivery_waitlist lessons, inherited on purpose):
//   - anon has column-locked INSERT and NO SELECT → always
//     Prefer: return=minimal; asking for RETURNING rolls the insert back.
//   - event names are CHECK-whitelisted server-side; an unlisted name is a
//     silent 4xx here, a loud check_violation there. EVENTS below mirrors it.
//   - the table has a global flood valve that fails closed. Losing beacons in
//     a flood is correct; blocking a visitor's page never is.
//
// PRIVACY, so nobody re-litigates it per event: no IP is stored, no user
// agent, no fingerprint, no cookies, no localStorage. `sid` is a random id per
// TAB SESSION (sessionStorage, try/catch — private windows may refuse it),
// existing only so a funnel can tell "one visitor did five steps" from "five
// visitors did one step each". It identifies a tab, not a person.
//
// EVERY failure is swallowed. A beacon must never cost a visitor anything —
// not an error, not a slow paint, not a retry. If the table does not exist
// yet, every send 404s and the site behaves identically. Analytics are a
// passenger here, never a driver.

(function () {
  'use strict';

  var SUPABASE_URL = 'https://uuzqezohkqgsbbxyzvvv.supabase.co';
  // Browser-public BY DESIGN — the same anon key every timber.bid client
  // ships; all access is RLS/grant-gated server-side. Never a service key.
  var ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1enFlem9oa3Fnc2JieHl6dnZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3MzY0NTIsImV4cCI6MjA1NTMxMjQ1Mn0.9UurHgUQk4xLJHapaK8e5qYPq1vV09tsqSoWCXbhmj8';

  // Mirrors the CHECK whitelist in the migration named above. An event sent
  // outside this list would bounce server-side anyway; refusing it here keeps
  // the two lists honest about being one list.
  var EVENTS = [
    'pageview',
    'estimate_photo_added',
    'estimate_requested',
    'estimate_returned',
    'estimate_rejected',
    'estimate_failed',
    'estimate_corrected',
    'waitlist_joined',
    'outbound_app_click',
  ];

  function sessionId() {
    try {
      var sid = sessionStorage.getItem('lb_sid');
      if (!sid) {
        sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem('lb_sid', sid);
      }
      return sid;
    } catch (e) {
      return null; // private window / storage blocked — count the event, lose the stitching
    }
  }

  function referrerHost() {
    try {
      if (!document.referrer) return null;
      var host = new URL(document.referrer).hostname;
      // Internal navigation is not acquisition — record only where visitors
      // came FROM, which is the question this column exists to answer.
      return host === location.hostname ? null : host.slice(0, 120);
    } catch (e) {
      return null;
    }
  }

  var SID = sessionId();

  function track(event, meta) {
    if (EVENTS.indexOf(event) === -1) return;
    var body = {
      site: 'lumber.bid',
      path: (location.pathname || '/').slice(0, 120),
      event: event,
      referrer: event === 'pageview' ? referrerHost() : null,
      sid: SID,
      meta: meta && typeof meta === 'object' ? meta : {},
    };
    try {
      // keepalive lets the outbound-click beacon survive the navigation that
      // triggered it (sendBeacon cannot carry the apikey header, so fetch).
      fetch(SUPABASE_URL + '/rest/v1/site_events', {
        method: 'POST',
        headers: {
          apikey: ANON_KEY,
          Authorization: 'Bearer ' + ANON_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal', // anon has no SELECT — never ask for RETURNING
        },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(function () { /* a lost beacon is a lost beacon */ });
    } catch (e) { /* and so is one that never launched */ }
  }

  // The pages call this for funnel steps; guarded everywhere with
  // `typeof window.lbTrack === 'function'` so this file loading late or not at
  // all changes nothing about how the site works.
  window.lbTrack = track;

  track('pageview');

  // Outbound handoffs to the app are the site's one conversion the funnel
  // cannot see from the app side (the app has no referrer contract with us).
  // Delegated so pages need no per-link wiring.
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    if (a.href.indexOf('https://timber.bid') === 0) {
      track('outbound_app_click', { to: a.pathname || '/' });
    }
  });
})();
