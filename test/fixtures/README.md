# Contract fixtures

Pinned shapes shared with **timberbid-v1** (and wooddelivery for the waitlist).
When a counterpart changes upstream, update the fixture **and** the matching
`site/*.js` in the same change window — or neither.

| Fixture | This repo | Counterpart |
|---|---|---|
| `logValuation.cases.json` | `site/log-model.js` | `utils/logValuation.ts` |
| `estimate-log.contract.json` | `site/estimate.js` | `supabase/functions/estimate-log` |
| `listings.contract.json` | `site/lots.js` | `app/lumber/index.tsx` |
| `site_events.events.json` | `site/metrics.js` | migration `20260827235000` |
| `waitlist.contract.json` | `site/waitlist.js` | waitlist writers in timberbid + wooddelivery |

Authority when this directory and timberbid-v1 disagree: **timberbid-v1**.
Regen valuation goldens by loading `site/log-model.js` in Node against the same
inputs timberbid’s jest suite uses.
