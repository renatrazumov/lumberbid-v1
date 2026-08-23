// leaderboard.js — the public board: most expensive wood sold + live auctions.
//
// READ-ONLY. One call: POST /rest/v1/rpc/lumber_leaderboard (SECURITY DEFINER,
// EXECUTE granted to anon), defined in timberbid-v1
// supabase/migrations/*_lumber_leaderboard.sql — the COUNTERPART of this file.
// The response keys (record, sold, live_open, live_sealed_count, sold_count,
// total_hammer_cents) are asserted by that migration's self-test; change the
// shape in both places or neither.
//
// Honesty rules carried through: no fabricated counters, no "N online", no
// paid ranks. An empty market renders as an empty board that says so.
//
// The anon key is browser-public BY DESIGN (same key as waitlist.js and every
// timber.bid client). NEVER a service key in this repo.

(function () {
  'use strict';
  var SUPABASE_URL = 'https://uuzqezohkqgsbbxyzvvv.supabase.co';
  var ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1enFlem9oa3Fnc2JieHl6dnZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3MzY0NTIsImV4cCI6MjA1NTMxMjQ1Mn0.9UurHgUQk4xLJHapaK8e5qYPq1vV09tsqSoWCXbhmj8';
  var LOT_URL = 'https://timber.bid/lumber/';

  var $ = function (id) { return document.getElementById(id); };
  var usd = function (cents) { return '$' + Math.round((cents || 0) / 100).toLocaleString('en-US'); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  var town = function (loc) { return esc(String(loc || '').split(',').slice(0, 2).join(',').trim()); };

  function endsIn(iso) {
    var ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return { text: 'closing now', soon: true };
    var d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
    if (d >= 1) return { text: 'ends in ' + d + 'd ' + h + 'h', soon: false };
    if (h >= 1) return { text: 'ends in ' + h + 'h ' + m + 'm', soon: false };
    return { text: 'ends in ' + m + 'm ' + (s < 10 ? '0' : '') + s + 's', soon: true };
  }

  var liveRows = [];

  function renderLive() {
    var el = $('live-list');
    if (!liveRows.length) {
      el.innerHTML = '<div class="card empty">No public auctions are live right now. ' +
        '<a href="https://timber.bid/lumber/post" style="color:var(--brand)">Post a piece</a> and it appears here the moment it’s live.</div>';
      return;
    }
    el.innerHTML = liveRows.map(function (l) {
      var e = endsIn(l.auction_ends_at);
      var hasBid = l.current_high_cents != null;
      return '<div class="card live-card"><div class="row">' +
        '<div class="info"><div class="t"><span class="sp">' + esc(l.species || 'wood') + '</span> — ' + esc(l.title) + '</div>' +
        '<div class="m">' + town(l.location) + ' · ' + (l.auction_bid_count || 0) + ' bid' + ((l.auction_bid_count || 0) === 1 ? '' : 's') +
        (l.estimated_board_feet ? ' · ~' + Number(l.estimated_board_feet).toLocaleString('en-US') + ' BF' : '') + '</div>' +
        '<a class="bid" href="' + LOT_URL + esc(l.id) + '">Bid now →</a></div>' +
        '<div style="text-align:right"><div class="price">' + (hasBid ? usd(l.current_high_cents) : 'from ' + usd(l.starting_cents)) + '</div>' +
        '<div class="ends' + (e.soon ? ' soon' : '') + '">' + e.text + '</div></div>' +
        '</div></div>';
    }).join('');
  }

  function render(d) {
    var rec = d.record;
    if (rec) {
      $('record-amt').textContent = usd(rec.hammer_cents);
      $('record-what').innerHTML = '<strong>' + esc(rec.species || 'wood') + '</strong> — ' + esc(rec.title) + ' · ' + town(rec.location);
      $('record-when').textContent = 'Sold ' + new Date(rec.auction_closed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) +
        (rec.auction_mode === 'sealed' ? ' by sealed bid' : ' at public auction') + ' · ' + (rec.auction_bid_count || 0) + ' bids. The record is there to be beaten.';
      document.title = usd(rec.hammer_cents) + ' — the most expensive wood sold on lumber.bid';
    } else {
      $('record-amt').textContent = '$0';
      $('record-what').textContent = 'The record is unclaimed.';
      $('record-when').textContent = 'No wood has sold at auction here yet. The first hammer price becomes the record — and the headline.';
    }

    $('s-live').textContent = String(d.live_open.length);
    $('s-sealed').textContent = String(d.live_sealed_count || 0);
    $('s-sold').textContent = String(d.sold_count || 0);
    $('s-total').textContent = usd(d.total_hammer_cents);
    $('pulse-text').textContent = ' · ' + d.live_open.length + ' public auction' + (d.live_open.length === 1 ? '' : 's') +
      ' live · ' + (d.live_sealed_count || 0) + ' sealed lot' + ((d.live_sealed_count || 0) === 1 ? '' : 's') + ' open';

    liveRows = d.live_open || [];
    renderLive();

    var board = $('board');
    if (!d.sold.length) {
      board.innerHTML = '<div class="card empty">Nothing has sold yet — the first sale takes #1 by default. ' +
        '<a href="https://timber.bid/lumber/post" style="color:var(--brand)">That could be yours.</a></div>';
    } else {
      board.innerHTML = d.sold.map(function (s, i) {
        return '<div class="card' + (i === 0 ? ' one' : '') + '"><div class="row">' +
          '<div class="rank' + (i === 0 ? ' one' : '') + '">#' + (i + 1) + '</div>' +
          '<div class="info"><div class="t"><span class="sp">' + esc(s.species || 'wood') + '</span> — ' + esc(s.title) + '</div>' +
          '<div class="m">' + town(s.location) + ' · ' + new Date(s.auction_closed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
          ' · ' + (s.auction_mode === 'sealed' ? 'sealed bid' : 'public auction') + ' · ' + (s.auction_bid_count || 0) + ' bids' +
          (s.estimated_board_feet ? ' · ~' + Number(s.estimated_board_feet).toLocaleString('en-US') + ' BF' : '') + '</div></div>' +
          '<div class="price">' + usd(s.hammer_cents) + '</div>' +
          '</div></div>';
      }).join('');
    }
  }

  function load() {
    return fetch(SUPABASE_URL + '/rest/v1/rpc/lumber_leaderboard', {
      method: 'POST',
      headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_limit: 25 }),
    })
      .then(function (r) { if (!r.ok) throw new Error('rpc ' + r.status); return r.json(); })
      .then(render)
      .catch(function () {
        $('pulse-text').textContent = ' · board unavailable — retrying';
        $('live-list').innerHTML = '<div class="card empty">Couldn’t load the board. It retries every 30 seconds.</div>';
      });
  }

  load();
  setInterval(load, 30000);      // fresh bids and closes
  setInterval(renderLive, 1000); // the countdowns tick

  var copy = $('copy-link');
  if (copy) {
    copy.addEventListener('click', function () {
      var done = function () { $('copy-status').textContent = 'Copied.'; setTimeout(function () { $('copy-status').textContent = ''; }, 2000); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText('https://lumber.bid/leaderboard').then(done, function () { $('copy-status').textContent = 'https://lumber.bid/leaderboard'; });
      else $('copy-status').textContent = 'https://lumber.bid/leaderboard';
    });
  }
})();
