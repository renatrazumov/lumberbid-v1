## Counterpart checklist

Any change that touches a **shared contract** with timberbid-v1 (or wooddelivery)
must update both sides in the same change window.

- [ ] Named the counterpart path in the PR description
- [ ] Updated `test/fixtures/` if a shape / whitelist / golden changed
- [ ] `for t in test/*.test.mjs; do node "$t"; done` passes locally

### Counterpart map

| Touching | Also update |
|---|---|
| `site/log-model.js` | timberbid `utils/logValuation.ts` + `test/fixtures/logValuation.cases.json` |
| `site/estimate.js` | timberbid `estimate-log` + `test/fixtures/estimate-log.contract.json` |
| `site/lots.js` | timberbid `app/lumber/index.tsx` + `test/fixtures/listings.contract.json` |
| `site/waitlist.js` | timberbid + wooddelivery waitlist writers + `test/fixtures/waitlist.contract.json` |
| `site/metrics.js` | migration event CHECK + `test/fixtures/site_events.events.json` |
