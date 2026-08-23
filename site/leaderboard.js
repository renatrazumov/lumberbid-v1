// leaderboard.js — the public board: most expensive wood sold, live public
// auctions, and the activity ticker.
//
// READ-ONLY. One call: POST /rest/v1/rpc/lumber_leaderboard (SECURITY DEFINER,
// EXECUTE granted to anon), defined in timberbid-v1
// supabase/migrations/*_lumber_leaderboard{,_activity}.sql — the COUNTERPART of
// this file. Those migrations' self-tests pin the response keys used here
// (record, sold, live_open, recent_activity, live_sealed_count, sold_count,
// total_hammer_cents); change the shape in both places or neither.
//
// THE HONESTY RULES, which matter most on a leaderboard:
//   * no fabricated counters — no "N online", no visitor total. Every number
//     shown is a real auction, a real bid, or a real hammer price.
//   * no paid placement. Rank is hammer price, full stop.
//   * the ticker NEVER shows a sealed lot's bid while it is live; the RPC
//     excludes them by construction and proves it in its own self-test.
//   * an empty market renders as an empty board that says so.
//
// The anon key is browser-public BY DESIGN (same key as waitlist.js and every
// timber.bid client). NEVER a service key in this repo.

(function () {
  'use strict';
  var SUPABASE_URL = 'https://uuzqezohkqgsbbxyzvvv.supabase.co';
  var ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1enFlem9oa3Fnc2JieHl6dnZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3MzY0NTIsImV4cCI6MjA1NTMxMjQ1Mn0.9UurHgUQk4xLJHapaK8e5qYPq1vV09tsqSoWCXbhmj8';
  var LOT = 'https://timber.bid/lumber/';
  var POST = 'https://timber.bid/lumber/post';

  var $ = function (id) { return document.getElementById(id); };
  var usd = function (c) { return '$' + Math.round((c || 0) / 100).toLocaleString('en-US'); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var town = function (l) { return esc(String(l || '').split(',').slice(0, 2).join(',').trim()); };

  function countdown(iso) {
    var ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return { t: 'closing now', soon: true };
    var d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5),
        m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3);
    if (d >= 1) return { t: d + 'd ' + h + 'h left', soon: false };
    if (h >= 1) return { t: h + 'h ' + m + 'm left', soon: false };
    return { t: m + 'm ' + (s < 10 ? '0' : '') + s + 's left', soon: true };
  }
  function ago(iso) {
    var s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return s + 's ago';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }

  // Categories are derived from the species string rather than a new column —
  // the taxonomy is a presentation choice, and a schema change to power a
  // filter chip would be the tail wagging the dog.
  var CATS = [
    { id: 'all',      label: 'All',              test: function () { return true; } },
    { id: 'burl',     label: 'Burls & figured',  test: function (s) { return /burl|figur|curl|quilt|birdseye|spalt|flame/i.test(s); } },
    { id: 'walnut',   label: 'Walnut',           test: function (s) { return /walnut/i.test(s); } },
    { id: 'oak',      label: 'Oak',              test: function (s) { return /oak/i.test(s); } },
    { id: 'maple',    label: 'Maple',            test: function (s) { return /maple/i.test(s); } },
    { id: 'slab',     label: 'Slabs',            test: function (s) { return /slab|live.?edge/i.test(s); } },
    { id: 'exotic',   label: 'Rare & exotic',    test: function (s) { return /koa|bog|ebony|rosewood|teak|exotic|cocobolo|zebrawood/i.test(s); } },
  ];
  var activeCat = 'all';
  var data = null;

  function matches(row) {
    var c = CATS.filter(function (x) { return x.id === activeCat; })[0];
    if (!c) return true;
    return c.test(String(row.species || '') + ' ' + String(row.title || ''));
  }

  function renderChips() {
    if (!data) return;
    var all = (data.sold || []).concat(data.live_open || []);
    $('chips').innerHTML = CATS.map(function (c) {
      var n = c.id === 'all' ? all.length : all.filter(function (r) {
        return c.test(String(r.species || '') + ' ' + String(r.title || ''));
      }).length;
      // A chip that filters to nothing is noise — hide empties except "All".
      if (n === 0 && c.id !== 'all') return '';
      return '<button type="button" class="chip' + (activeCat === c.id ? ' on' : '') +
        '" data-cat="' + c.id + '">' + esc(c.label) +
        (n ? ' <span class="ct">' + n + '</span>' : '') + '</button>';
    }).join('');
  }

  function renderLive() {
    if (!data) return;
    var rows = (data.live_open || []).filter(matches);
    $('live-list').innerHTML = rows.length ? rows.map(function (l) {
      var c = countdown(l.auction_ends_at);
      var has = l.current_high_cents != null;
      return '<a class="lot livecard" href="' + LOT + esc(l.id) + '">' +
        '<div class="rank">&#128293;</div>' +
        '<div class="body"><div class="t"><span class="sp">' + esc(l.species || 'wood') + '</span> &middot; ' + esc(l.title) + '</div>' +
        '<div class="m"><span class="tag">public auction</span>' + town(l.location) + ' &middot; ' +
        (l.auction_bid_count || 0) + ' bid' + ((l.auction_bid_count || 0) === 1 ? '' : 's') +
        (l.estimated_board_feet ? ' &middot; ~' + Number(l.estimated_board_feet).toLocaleString('en-US') + ' BF' : '') + '</div></div>' +
        '<div class="right"><div class="price">' + (has ? usd(l.current_high_cents) : 'from ' + usd(l.starting_cents)) + '</div>' +
        '<div class="ends' + (c.soon ? ' soon' : '') + '">' + c.t + '</div></div></a>';
    }).join('') :
      '<div class="empty">No public auctions are live' + (activeCat === 'all' ? '' : ' in this category') +
      ' right now. <a href="' + POST + '">Post a piece</a> and it appears here the moment it goes live.</div>';
  }

  function renderBoard() {
    if (!data) return;
    var rows = (data.sold || []).filter(matches);
    $('board-list').innerHTML = rows.length ? rows.map(function (s, i) {
      return '<a class="lot' + (i === 0 ? ' one' : '') + '" href="' + LOT + esc(s.id) + '">' +
        '<div class="rank">#' + (i + 1) + '</div>' +
        '<div class="body"><div class="t"><span class="sp">' + esc(s.species || 'wood') + '</span> &middot; ' + esc(s.title) + '</div>' +
        '<div class="m"><span class="tag">' + (s.auction_mode === 'sealed' ? 'sealed bid' : 'public auction') + '</span>' +
        town(s.location) + ' &middot; ' + new Date(s.auction_closed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' &middot; ' + (s.auction_bid_count || 0) + ' bids' +
        (s.estimated_board_feet ? ' &middot; ~' + Number(s.estimated_board_feet).toLocaleString('en-US') + ' BF' : '') + '</div></div>' +
        '<div class="right"><div class="price">' + usd(s.hammer_cents) + '</div></div></a>';
    }).join('') :
      '<div class="empty">' + (activeCat === 'all'
        ? 'Nothing has sold yet — the first sale takes #1 by default. <a href="' + POST + '">That could be yours.</a>'
        : 'Nothing has sold in this category yet.') + '</div>';
  }

  function renderFeed() {
    if (!data) return;
    var rows = data.recent_activity || [];
    $('feed').innerHTML = rows.length ? rows.map(function (a) {
      var sold = a.kind === 'sold';
      return '<div class="feed-row">' +
        '<span class="ico">' + (sold ? '&#127942;' : '&#128176;') + '</span>' +
        '<span class="txt">' + (sold ? 'Sold: ' : esc(a.who || 'A bidder') + ' bid on ') +
        '<a href="' + LOT + esc(a.lot_id) + '"><b>' + esc(a.species || 'wood') + '</b> &middot; ' + esc(a.title) + '</a></span>' +
        '<span class="amt">' + usd(a.amount_cents) + '</span>' +
        '<span class="ago">' + ago(a.at) + '</span></div>';
    }).join('') :
      '<div style="color:var(--muted);font-size:.9rem">No bids yet. The first bid on the first lot shows up here in real time — and every one after it.</div>';
  }

  function render() {
    var d = data, rec = d.record;
    if (rec) {
      $('record-amt').textContent = usd(rec.hammer_cents);
      $('record-what').innerHTML = '<span class="sp">' + esc(rec.species || 'wood') + '</span> &middot; ' + esc(rec.title) + ' &middot; ' + town(rec.location);
      $('record-when').textContent = 'Sold ' +
        new Date(rec.auction_closed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) +
        (rec.auction_mode === 'sealed' ? ' by sealed bid' : ' at public auction') +
        ' · ' + (rec.auction_bid_count || 0) + ' bids. Beat it.';
      document.title = usd(rec.hammer_cents) + ' — most expensive wood sold on lumber.bid';
    } else {
      $('record-amt').textContent = 'unclaimed';
      $('record-what').textContent = 'No wood has sold at auction here yet.';
      $('record-when').textContent = 'The first hammer price becomes the record — and the headline.';
    }

    $('s-live').textContent = String((d.live_open || []).length);
    $('s-sealed').textContent = String(d.live_sealed_count || 0);
    $('s-sold').textContent = String(d.sold_count || 0);
    $('s-total').textContent = usd(d.total_hammer_cents);

    var nLive = (d.live_open || []).length, nSealed = d.live_sealed_count || 0;
    $('pill-text').innerHTML = nLive || nSealed
      ? '<b>' + nLive + '</b> live auction' + (nLive === 1 ? '' : 's') + ' · <b>' + nSealed + '</b> sealed lot' + (nSealed === 1 ? '' : 's') + ' open · real hammer prices only'
      : 'No auctions open yet · the board fills the moment the first lot goes live';

    var share = rec
      ? 'The most expensive wood sold on lumber.bid: ' + usd(rec.hammer_cents) + ' for ' + (rec.species || 'a lot') + '. Beat it.'
      : 'The record for the most expensive wood sold on lumber.bid is unclaimed. First sale takes #1.';
    $('share-x').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(share) +
      '&url=' + encodeURIComponent('https://lumber.bid/leaderboard');

    renderChips(); renderLive(); renderBoard(); renderFeed();
  }

  function load() {
    return fetch(SUPABASE_URL + '/rest/v1/rpc/lumber_leaderboard', {
      method: 'POST',
      headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_limit: 25 }),
    })
      .then(function (r) { if (!r.ok) throw new Error('rpc ' + r.status); return r.json(); })
      .then(function (j) { data = j; render(); })
      .catch(function () {
        // No silent failures: say it, and say that it retries.
        $('pill-text').textContent = 'board unavailable — retrying every 30s';
        if (!data) {
          $('live-list').innerHTML = '<div class="empty">Couldn’t load the board. Retrying automatically.</div>';
          $('board-list').innerHTML = '';
        }
      });
  }

  document.getElementById('chips').addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('.chip') : null;
    if (!b) return;
    activeCat = b.getAttribute('data-cat');
    renderChips(); renderLive(); renderBoard();
  });

  var copy = document.getElementById('copy-link');
  copy.addEventListener('click', function () {
    var url = 'https://lumber.bid/leaderboard';
    var done = function () { $('copied').textContent = 'Copied'; setTimeout(function () { $('copied').textContent = ''; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { $('copied').textContent = url; });
    else $('copied').textContent = url;
  });

  load();
  setInterval(load, 30000);            // new bids, closes, sales
  setInterval(function () { renderLive(); renderFeed(); }, 1000); // countdowns + "Xs ago"
})();
