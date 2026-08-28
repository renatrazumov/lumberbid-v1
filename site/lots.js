// lumber.bid open-lots strip — the site's first surface that shows WOOD.
//
// Wood is bought by eye. The app grew lot photos in timberbid-v1 PR #626, but
// this site never had a surface that rendered one, so the front door of the
// lumber vertical showed no lumber at all.
//
// THE HONESTY RULE IS THE DESIGN CONSTRAINT. This strip renders NOTHING at
// zero lots -- no skeleton, no "coming soon", no empty frame. The homepage
// with no open lots is byte-for-byte the page that shipped before this file
// existed, because a lot board that advertises its own emptiness is still
// advertising. It appears the moment a real lot is live and disappears again
// when the last one closes.
//
// READ CONTRACT (anon, verified against prod 2026-08-27):
//   - Every column below is anon-SELECTable and was checked one by one; the
//     live query returns 200 with [] today. NEVER select('*') -- 42501.
//   - Filters mirror app/lumber/index.tsx (the counterpart board):
//     listing_type=raw_timber, sale_type=auction, status live|closing.
//   - THE SEAL: for a SEALED lot this renders the STARTING bid and the bid
//     COUNT, never an amount. auction_current_bid_cents is shown only for
//     auction_mode='open', which is the same rule the app board and
//     get_auction_bids enforce. Sealed means sealed on every surface.
//
// Images come straight from listings.images -- Supabase Storage public URLs
// in the `public` bucket (public:true, verified) -- so no proxy, no signing,
// and the existing CSP img-src needs one origin added, nothing else.
//
// COUNTERPART: timberbid-v1:app/lumber/index.tsx renders the same rows for the
// app. Change the shape in one, change it in the other.

(function () {
  'use strict';

  var SUPABASE_URL = 'https://uuzqezohkqgsbbxyzvvv.supabase.co';
  // Browser-public by design; all access is RLS/grant-gated. Never a service key.
  var ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1enFlem9oa3Fnc2JieHl6dnZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3MzY0NTIsImV4cCI6MjA1NTMxMjQ1Mn0.9UurHgUQk4xLJHapaK8e5qYPq1vV09tsqSoWCXbhmj8';

  var COLS = [
    'id', 'title', 'species', 'images', 'auction_status', 'auction_ends_at',
    'auction_starting_bid_cents', 'auction_bid_count', 'auction_mode',
    'auction_current_bid_cents', 'location', 'estimated_board_feet', 'metal_risk'
  ].join(',');

  var host = document.getElementById('open-lots');
  if (!host) return;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function usd(cents) {
    if (cents == null) return null;
    return '$' + Math.round(cents / 100).toLocaleString('en-US');
  }

  function endsIn(iso) {
    if (!iso) return '';
    var ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return 'closing now';
    var d = Math.floor(ms / 86400000);
    if (d >= 1) return d + 'd ' + Math.floor((ms % 86400000) / 3600000) + 'h left';
    var h = Math.floor(ms / 3600000);
    if (h >= 1) return h + 'h ' + Math.floor((ms % 3600000) / 60000) + 'm left';
    return Math.max(1, Math.floor(ms / 60000)) + 'm left';
  }

  function card(l) {
    var shots = (l.images || []).filter(Boolean);
    var lead = shots[0];
    var isOpen = l.auction_mode === 'open';
    var n = l.auction_bid_count || 0;
    var url = 'https://timber.bid/lumber/' + encodeURIComponent(l.id);

    // The seal: an amount appears ONLY for open auctions.
    var priceLine = isOpen && l.auction_current_bid_cents != null
      ? 'High bid ' + usd(l.auction_current_bid_cents)
      : 'From ' + (usd(l.auction_starting_bid_cents) || '—');

    var meta = [];
    if (l.estimated_board_feet) meta.push('~' + Number(l.estimated_board_feet).toLocaleString('en-US') + ' BF');
    if (l.location) meta.push(esc(l.location));

    return '' +
      '<a class="lot" href="' + esc(url) + '">' +
        (lead
          ? '<div class="lot-shot"><img src="' + esc(lead) + '" alt="' +
            esc(l.species || 'timber') + ' lot" loading="lazy" decoding="async">' +
            (shots.length > 1 ? '<span class="lot-count">' + shots.length + '</span>' : '') +
            '</div>'
          : '<div class="lot-shot lot-noshot"><span>no photos</span></div>') +
        '<div class="lot-body">' +
          '<div class="lot-top">' +
            '<span class="lot-species">' + esc(l.species || 'timber lot') + '</span>' +
            '<span class="lot-tag' + (isOpen ? ' open' : '') + '">' +
              (isOpen ? 'LIVE AUCTION' : 'SEALED') + ' &middot; ' + esc(endsIn(l.auction_ends_at)) +
            '</span>' +
          '</div>' +
          '<p class="lot-title">' + esc(l.title || '') + '</p>' +
          (meta.length ? '<p class="lot-meta">' + meta.join(' &middot; ') + '</p>' : '') +
          (l.metal_risk ? '<p class="lot-metal">metal risk disclosed</p>' : '') +
          '<div class="lot-bottom">' +
            '<span class="lot-price">' + esc(priceLine) + '</span>' +
            '<span class="lot-bids">' + n + (isOpen ? ' bid' : ' sealed bid') + (n === 1 ? '' : 's') + '</span>' +
          '</div>' +
        '</div>' +
      '</a>';
  }

  var url = SUPABASE_URL + '/rest/v1/listings' +
    '?select=' + encodeURIComponent(COLS) +
    '&listing_type=eq.raw_timber&sale_type=eq.auction' +
    '&auction_status=in.(live,closing)' +
    '&order=auction_ends_at.asc&limit=6';

  fetch(url, { headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY } })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (rows) {
      // Zero lots renders zero markup, on purpose. See the header.
      if (!rows || !rows.length) return;
      host.innerHTML =
        '<h2>Open lots</h2>' +
        '<div class="lot-grid">' + rows.map(card).join('') + '</div>' +
        '<a class="cta" href="https://timber.bid/lumber">See every open lot &rarr;</a>';
      host.hidden = false;
      // No beacon fires here on purpose: metrics.js already sent the pageview,
      // and a second one would double-count every homepage visit that happens
      // to have lots. Clicks into the app are caught by the outbound_app_click
      // delegate in metrics.js, which is exactly what these cards are.
    })
    .catch(function () { /* a strip that cannot load simply is not there */ });
})();
