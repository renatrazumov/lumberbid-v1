# CLAUDE.md — lumber.bid

## What this repo is

A **front end on timber.bid's backend.** Not a new product, not a new backend.
One Supabase project (`uuzqezohkqgsbbxyzvvv`), one Stripe platform, one email
chokepoint — shared with `timber.bid`, `wood.delivery` and `timberbid.app`.

Today it serves the sealed-bid front door plus **two writes** — the lumber
interest waitlist (anon insert into `wood_delivery_waitlist`) and first-party
analytics beacons (`site/metrics.js`, anon insert into `site_events`, no PII;
counterpart: timberbid-v1 migration `20260827235000`) — and **one
backend call**: `POST /functions/v1/estimate-log` from `/estimate` — a
vision-only edge fn in timberbid-v1 that reads a log photo into MEASURED FACTS
(species, diameter, length, condition + confidences). It never prices; the
bands are computed client-side in `site/log-model.js`. The fn's header names
this page as its counterpart — change the response contract in both places or
neither.

Two more read-only backend touches since 2026-08-23: `/leaderboard` calls the
`lumber_leaderboard()` RPC as anon (counterpart: the migration's self-test pins
the shape `site/leaderboard.js` depends on), and every page's `og:image` points
at `og-image?type=lumber_leaderboard`, which renders the live record card
(5-minute cache). Still zero writes beyond the waitlist.

The full brief lives in the main repo and is the authority when this file and it
disagree: `C:\Users\Renat\Dev\timberbid-v1\docs\LUMBERBID_REPO_BRIEF.md`.
Read it before building anything here.

## Current state (2026-08-13)

| | |
|---|---|
| Site | `https://lumber.bid` — 200, own Netlify site, valid TLS, HSTS |
| DNS | delegated to Netlify (`dns1-4.p05.nsone.net`) |
| Build | **none** — `netlify.toml` publishes `site/` with no build command |
| Resend | **verified**; receiving **OFF** (no apex MX); sends nothing |
| Waitlist | **LIVE** — `site/waitlist.js` inserts `role='interested'`, `source='lumber.bid'` |
| Product | **sealed-bid RAILS LIVE in prod** (migration `20260821003609`, 2026-08-21) — app surfaces + buyer liquidity still pending; first sales broker-run |
| Estimator | **LIVE** at `/estimate` — `site/log-model.js` (port of `utils/logValuation.ts`, 27/27 cross-checked) |
| SEO | **indexed** as of 2026-08-21 (noindex lifted — real content shipped); `sitemap.xml` with 2 URLs |

## The honesty rule — this is the one that gets broken

`docs/lumber.md` in the main repo: *"we don't imply a market that doesn't exist
yet."* The lumber vertical has **zero liquidity** — no lots, no buyers, no
listings. timber.bid has already paid for breaking this twice (a claim page
promising jobs that did not exist; a firewood company shown tree-service copy).

Copy here must not promise buyers, prices, or a marketplace. The current page
says outright *"No auction is open yet"* and that first sales are broker-run
while the buyer side is seeded. The RAILS being live (sealed mode in prod) does
not make liquidity claims true — keep the distinction sharp until a real lot
has really closed with competing bids.

## Never reimplement these — they are single-source in timberbid-v1

| Never duplicate | Lives in |
|---|---|
| Fee math (tiered buyer fee, 2.5% seller, Pro 0%) | `utils/fees.ts` + `_shared/fees.ts` |
| Deposits / capture / payout | `manage-job-deposit` |
| Stripe Connect, webhooks, API version pinning | `_shared/authHelpers.ts` |
| Auth, RLS assumptions, privilege columns | `profiles`, `security_invariants.sql` |
| Email sending | `email_queue` → `drain_email_queue_one` |

**Rule of thumb:** if it touches money, auth, or an outbound email, it belongs in
timberbid-v1 and this site deep-links to it.

The sealed-bid product belongs in **timberbid-v1**, not here — it needs deposits,
escrow, fee math and payouts, and the funded-deals engine already does all of
that, entity-aware. **Its foundation is APPLIED** (ledger `20260821003609`):
`auction_mode='sealed'` on `listings`, sealed-aware `place_auction_bid` /
`claim_ended_auctions` / `get_auction_bids`, the `raw_timber` constraint fix,
and lot columns (`species`, `estimated_board_feet`, `metal_risk`). The deployed
`close-auctions` worker needed zero changes — sealed winners resolve at claim
time into the columns it already reads. This site deep-links; it never
reimplements any of that.

## Rules that will bite you

- **No service-role key, ever.** This is a static public bundle. If a feature
  seems to need one, it belongs in a timberbid-v1 edge function this site calls.
- **Anon reads are column-locked.** `.select('*')` returns 42501, and
  `.insert(...).select()` (bare = `RETURNING *`) **rolls the whole insert back**.
  Always enumerate columns, or `.select('id')`.
- **Name the counterpart.** Any shared table this repo writes must name the
  timberbid-v1 file that also writes it, in a comment, both ways. Contract drift
  is the failure mode of a second repo — one side adds a column, the other keeps
  writing the old shape, and *nothing errors*.
- **Do not send cold mail from this domain.** `timberbid.app` is the designated
  outreach domain; splitting cold volume across two young domains halves the
  reputation each builds.
- **Do not enable Resend receiving.** An inbox nobody answers is worse than no
  inbox — `woody@timber.bid` accumulated 29 unanswered messages over 510 hours
  learning that.

## The redirect in timberbid-v1 is inert — do not "fix" it

`timberbid-v1/public/_redirects` carries
`https://lumber.bid/* → https://timber.bid/:splat 301!` from PR #547. It is
**unreachable by construction**: a `_redirects` rule only applies to traffic
reaching *that* Netlify site, and lumber.bid is attached to a different one.
Proven live — with the rule merged, `curl https://lumber.bid/` returns 200 and
this page.

It is kept deliberately (correct again if the domain is ever re-aliased onto the
timber.bid site) and annotated there. Older notes in `THREE_DOMAINS.md` and the
brief said it "must be removed or the new site is unreachable" — that was wrong
and is corrected in the brief.

## Stack

Zero-build static HTML today, on purpose: the deploy existed to activate the
Netlify site so DNS could be delegated and Resend records added, and a
publish-only site cannot fail to build. **Astro** (matching `wood.delivery`) is
the right stack the moment this surface carries real content.

```
netlify.toml     publish config + security headers (CSP: default-src 'none',
                 plus script-src 'self' and connect-src to the Supabase project)
site/index.html  the holding page — inline CSS, one deferred first-party script
site/waitlist.js the first write this site makes (see contract below)
site/metrics.js  the second write — first-party pageview/funnel beacons into
                 site_events (no PII, no vendor; the CSP admits nothing else).
                 Counterpart: timberbid-v1 migration 20260827235000. Every
                 send is fire-and-forget: absent analytics change nothing.
site/estimate.html + estimate.js + log-model.js — the log value estimator
                 (photo mode calls timberbid-v1:estimate-log; see above).
                 log-model.js is a FAITHFUL PORT of timberbid-v1:utils/
                 logValuation.ts (counterpart-commented both ways; update both
                 or neither; cross-checked against its jest suite at port time)
site/robots.txt  crawling + indexing allowed (2026-08-21); Sitemap line
site/sitemap.xml two URLs, static
```

### The waitlist contract (verified against prod 2026-08-14)

`public.wood_delivery_waitlist` is SHARED. Its other writers are
`wooddelivery:src/lib/driveWaitlist.ts` and
`timberbid-v1:app/wood-delivery/index.tsx` (both `role='driver'`). Change the
shape in all three places or none.

- `role` CHECK allows ONLY `driver|provider|buyer|interested`. There is no
  `'lumber'` role — the lumber segment lives in `source='lumber.bid'` +
  `note='lumber: <who>'`, never in `role`.
- anon has INSERT and **no SELECT** → always `Prefer: return=minimal`; asking
  for RETURNING rolls the insert back (same rule as the column-locked reads).
- 409 duplicate = already on the list = success.
- These addresses are promised **one announcement email**, nothing else. Do not
  fold them into any campaign audience without a fresh opt-in.

`robots.txt` allows crawling on purpose: `Disallow` would stop crawlers reading
the `noindex` meta tag, and a blocked URL can still be indexed if linked. Allow
the fetch, let `noindex` do the work.

## SEO lessons already paid for in timberbid-v1

- A dynamic route with no pre-rendering serves an identical shell to every URL
  (Astro: `getStaticPaths`). 509 URLs once served one page.
- Gate thin pages behind real inventory; thin-content demotion is site-wide.
- Cap content width (~1100 layout, ~760–820 prose).
- "Nearby" must mean nearby — use real distance, not population.
- One place, one URL. Slug duplicates generated two live URLs per page.

## Before you build anything here

The main repo's canon says stage-3 verticals should not start while the top of
funnel is empty. As of 2026-08-13: **14 tree estimates all-time, 0 in the last 7
days, 4 job requests ever.** The tree vertical is starved, not broken. Building
lumber while trees have no traffic spends the scarce thing.

Recommended posture: keep this a low-cost surface that needs no ongoing
attention. Founder's call — this exists so the trade-off is explicit.
