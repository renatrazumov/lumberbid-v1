// lumber.bid waitlist — the ONE write this site makes.
//
// SHARED-TABLE CONTRACT (name the counterpart, both ways — CLAUDE.md rule):
// public.wood_delivery_waitlist is also written by
//   - wooddelivery repo:  src/lib/driveWaitlist.ts       (role 'driver')
//   - timberbid-v1 repo:  app/wood-delivery/index.tsx    (role 'driver')
// This file writes role 'interested' + source 'lumber.bid'. If the table's
// shape changes, all three writers change together or not at all.
//
// Contract facts, verified against prod 2026-08-14:
//   - role CHECK allows ONLY driver|provider|buyer|interested. There is no
//     'lumber' role — do not invent one; the insert fails 23514. The lumber
//     segment lives in `source` + `note`, not in `role`.
//   - anon has INSERT and NO SELECT. The request must not ask for
//     representation (Prefer: return=minimal) — RETURNING would 42501 and
//     roll the whole insert back.
//   - A duplicate may 409: someone already on the list IS on the list.
//     Treated as success, same as driveWaitlist.ts.
//
// The anon key below is browser-public BY DESIGN — the same key ships in every
// timber.bid client bundle and all access is RLS-gated. NEVER a service key
// anywhere in this repo.

(function () {
  'use strict';

  var SUPABASE_URL = 'https://uuzqezohkqgsbbxyzvvv.supabase.co';
  var ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1enFlem9oa3Fnc2JieHl6dnZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3MzY0NTIsImV4cCI6MjA1NTMxMjQ1Mn0.9UurHgUQk4xLJHapaK8e5qYPq1vV09tsqSoWCXbhmj8';

  /**
   * The one place this repo writes wood_delivery_waitlist.
   * Resolves true when the row exists (409 = already on the list = on the list).
   */
  function postWaitlist(body) {
    return fetch(SUPABASE_URL + '/rest/v1/wood_delivery_waitlist', {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        Authorization: 'Bearer ' + ANON_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal', // anon has no SELECT — never ask for RETURNING
      },
      body: JSON.stringify(body),
    }).then(function (res) { return res.ok || res.status === 409; });
  }

  /**
   * Exposed for the /estimate lead ask, which lives on a page that has no
   * #waitlist-form and would otherwise need its own copy of the insert
   * contract above. Kept here on purpose: the header comment names three
   * writers of this table across three repos, and a fourth inside this one
   * would be the drift that comment warns about.
   *
   * NOTE the /estimate page prefers estimate-log's confirm path, which attaches
   * the email to the LOG it is about; this is the fallback for a visitor who
   * used the manual calculator and never ran a photo.
   */
  window.lumberWaitlistSubmit = function (emailValue, note, done) {
    var addr = (emailValue || '').trim();
    if (!addr) { if (done) done(false); return; }
    postWaitlist({
      email: addr,
      zip: null,
      role: 'interested',
      note: note || 'lumber: estimate page',
      source: 'lumber.bid',
    })
      .then(function (ok) { if (done) done(ok); })
      .catch(function () { if (done) done(false); });
  };

  var form = document.getElementById('waitlist-form');
  if (!form) return;

  var email = document.getElementById('wl-email');
  var zip = document.getElementById('wl-zip');
  var button = document.getElementById('wl-submit');
  var status = document.getElementById('wl-status');

  function say(msg, ok) {
    status.textContent = msg;
    status.className = ok ? 'wl-status ok' : 'wl-status err';
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();

    var who = form.querySelector('input[name="who"]:checked');
    var body = {
      email: (email.value || '').trim(),
      zip: (zip.value || '').trim() || null,
      role: 'interested',
      note: 'lumber: ' + (who ? who.value : 'unspecified'),
      source: 'lumber.bid',
    };
    if (!body.email) { say('An email address is the one thing we need.', false); return; }

    // Disable while in flight — a double-tap must not enqueue twice.
    button.disabled = true;
    button.textContent = 'Adding…';

    fetch(SUPABASE_URL + '/rest/v1/wood_delivery_waitlist', {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        Authorization: 'Bearer ' + ANON_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal', // anon has no SELECT — never ask for RETURNING
      },
      body: JSON.stringify(body),
    })
      .then(function (res) {
        // 409 = already on the list = on the list.
        if (res.ok || res.status === 409) {
          form.hidden = true;
          say("You're on the list. One email when it opens — that's the whole deal.", true);
          return;
        }
        return res.text().then(function () {
          say('That didn\u2019t go through. Please try again in a minute.', false);
          button.disabled = false;
          button.textContent = 'Notify me';
        });
      })
      .catch(function () {
        say('That didn\u2019t go through. Check your connection and try again.', false);
        button.disabled = false;
        button.textContent = 'Notify me';
      });
  });
})();
