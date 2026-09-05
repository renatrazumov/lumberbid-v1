# lumber.bid

Front door for the lumber / sawmill side of [timber.bid](https://timber.bid).
**Not a separate product or backend** — one Supabase project, one Stripe
platform, one email chokepoint, shared with `timber.bid`, `wood.delivery`, and
`timberbid.app`.

Live: https://lumber.bid · Netlify publishes `site/` after the contract suite
(no npm / no bundler — plain Node).

## What this site does

| Surface | Role |
|---|---|
| `/` | Appraiser-led homepage; waitlist; open-lots strip (renders nothing at zero lots) |
| `/estimate` | Log value estimator — photo mode calls timberbid-v1 `estimate-log`; bands from `log-model.js` |
| `/leaderboard` | Demoted (`noindex`) until the first real close with competing bids |

Money, auth, sealed-bid deposits, fees, and payouts live in **timberbid-v1**.
This site deep-links (`timber.bid/lumber`, `/lumber/post`, lot pages) and never
reimplements them.

## Shared-backend contracts

Every write/read that touches the core DB names its counterpart in a file
header. Fixtures under `test/fixtures/` pin the shapes Netlify enforces
before publish:

| This repo | timberbid-v1 counterpart |
|---|---|
| `site/log-model.js` | `utils/logValuation.ts` |
| `site/estimate.js` | `supabase/functions/estimate-log` |
| `site/lots.js` | `app/lumber/index.tsx` |
| `site/waitlist.js` | `wood_delivery_waitlist` (+ wooddelivery writer) |
| `site/metrics.js` | migration `20260827235000` → `site_events` |

Change a contract in both places (or three, for waitlist) — or neither.

## Honesty rule

The lumber vertical may have **rails** without **liquidity**. Copy must not
promise buyers, prices, or an open marketplace that does not exist yet.

## Rules

- **No service-role key, ever.** Public anon client only; RLS/grants gate access.
- Anon reads are **column-locked** — never `select('*')` or bare RETURNING.
- Do not send cold mail from this domain (`timberbid.app` is outreach).
- Fee math, Stripe, escrow, email queue → timberbid-v1 only.

## Develop / test

```bash
# Same suite Netlify runs before every publish (no GitHub Actions)
bash scripts/test.sh
```

No `npm install`. When this surface grows real content, Astro (mirroring
`wood.delivery`) is the intended stack — not required while the site stays
static.

## Domain note

`timberbid-v1/public/_redirects` still carries `lumber.bid → timber.bid` from
PR #547. It is **inert**: lumber.bid is attached to this Netlify site, so that
rule never fires. Kept on purpose if the domain is ever re-aliased.

## Authority

Operator brief: `CLAUDE.md` in this repo. When it disagrees with the main
repo's `docs/LUMBERBID_REPO_BRIEF.md`, the main repo wins.
