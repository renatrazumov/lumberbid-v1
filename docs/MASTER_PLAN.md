# lumber.bid master plan

The living plan for this front door. The 6 September 2026 PDF
(`docs/lumber-bid-status-2026-09-06.pdf`) is the production snapshot that
opened Phase B. This file is the one to extend. When it disagrees with
`timberbid-v1:docs/LUMBERBID_REPO_BRIEF.md`, the main-repo brief wins.

The rails are finished. The market has not started. Do not add capability
to fix a demand problem.

Agent MCP (consumer vs builder, where to call, security): `docs/MCP_AGENT_PLAN.md`.

---

## Phases

### Phase A — make the built thing reachable and measurable

Done in product terms on 6 September 2026, with one measurement hole found
on 7 September (see [Review, 7 September 2026](#review-7-september-2026)).

| Change | Why | State |
|---|---|---|
| Homepage sell section leads with `/lumber/sell` | The working flow was unreachable from the front door | Shipped |
| Headline is the appraisal, not the auction | Money path is “what is this log worth?” | Shipped 27 Aug |
| Estimator capture step (email ask + confirm path) | Attach a lead to a log, or fall back to the waitlist | Already there |
| `estimate_shown` on the manual calculator | The only unmeasured path; carries lumber-vs-firewood | **RECORDING since 2026-09-10** — was called-not-recorded; see finding 1 |

### Phase B — get one seller, by hand

This is the real work. Nothing on the site fixes a supply cold start.

The mill list and the outreach draft already exist in the private repo,
unused. Phase B is sending them: **seventeen mills, by hand, from
`timberbid.app`** (the outreach domain — never lumber.bid), offering to
list their wood from photographs they text over. The first listing does
not have to be self-serve. It has to exist.

The platform has sent 28,263 cold emails and holds $67.08 of lifetime
revenue. More volume is not the lever; a specific ask to a specific mill
is.

Do not start Phase C, do not promote the leaderboard, and do not build a
photo-grid homepage, a freight quote, or a buyer side until Phase B has
produced a real close.

### Phase C — only after a real close

One event unlocks the rest: **a lot that closes with competing bids.**
Until then, building those surfaces is shipping empty shelves.

Lift together, the day that happens:

- Homepage open-lots strip starts rendering (it already knows how; it
  renders nothing at zero lots)
- `/leaderboard` loses `noindex` and returns to the sitemap
- Homepage can carry a record card again
- Freight quote at checkout, buyer-side surfaces, richer homepage grid

---

## What production said on 6 September 2026

Executed against production that day. Founder traffic excluded.

| Measure | All time | Note |
|---|---|---|
| Pageviews | 38 | 28 Aug – 6 Sep; 32 home, 6 estimate, 1 leaderboard |
| Outbound clicks to the app | 1 | The only funnel event that had ever fired |
| Raw-timber listings | 0 | The lot board has never held a lot |
| Lumber auctions | 0 | 6 auction rows exist; all firewood, none live |
| Saved log estimates | 0 | 6 people opened `/estimate`; nothing persisted |
| Seller leads | 0 | `slab_seller_leads` empty |
| Waitlist signups from lumber.bid | 0 | The form works; nobody has used it |
| Lumber orders / revenue | 0 | Platform-wide lifetime GMV $67.08 |

Roughly four visits a day, and nothing downstream. lumber.bid has not yet
been shown to anyone who mills or sells wood.

---

## Review, 7 September 2026

A pass over the live homepage, the live `/estimate` page, this repo at
`main`, and a live session against `https://mcp.timber.bid/`. No product
was shipped in this pass. The constraint is still demand.

### Homepage — `https://lumber.bid/`

The page is honest and correctly ordered.

- Hero is the appraiser (“What is your log worth?”), primary CTA to
  `/estimate`, ghost CTA to `#sell`. That matches the 27 August refocus.
- `#sell` leads with milled wood and the one finishable button:
  `timber.bid/lumber/sell`. Sealed-bid copy stays, loses the primary
  button, and says outright that no auction is open. Do not quietly swap
  those back.
- Open-lots strip is in the DOM and hidden. `lots.js` will fill it the
  day a real lot exists; until then the page is exactly this page.
- Waitlist promise is one announcement email. Keep it that tight.
- Mobile nav (`Estimate / Sell / How / timber.bid`) hides under 640px.
  The hero CTA still reaches `/estimate`, so this is not a blocker.

What not to change: the walnut-myth callout, the “no auction is open
yet” lines, the 2.5% figure stated as copy (fee math stays in
`timberbid-v1:utils/fees.ts`).

### `/estimate` — `https://lumber.bid/estimate`

The tool is built. Six people opened it; none finished. The page is
doing a few things that make “finished” less likely than it needs to be,
and one thing that makes “did they even try?” unanswerable.

**The page is photo-first.** Three shot boxes and a disabled “Get Log
Estimate” button sit above the manual form. The homepage says “or type
what you measured and skip the photo.” The estimate page itself does not
say that anywhere near the fold. A visitor with a tape and no photo —
or a visitor who will not grant the camera — meets a dead button. That
is the most plausible reading of six opens and zero completions.

**A fictional walnut already has a band, and an email ask, on first
paint.** The form defaults to black walnut, 24″ × 12′, clear faces,
clean, typical access. `render()` runs on load (the flagship case).
`revealLead()` then unhides the waitlist card because a band is on
screen. So every visitor is asked “Tell me when a log like this can
sell” about a log they did not measure. `estimate_shown` correctly
refuses to count that default. The lead card does not.

**The next step after a real band points at the closed door.** A
lumber-route verdict says “this is what a sealed bid is for.” The prose
link goes to `timber.bid/lumber` (empty lot board), not
`timber.bid/lumber/sell` (the walk a visitor can finish today). A
firewood-route verdict has no next step except the waitlist. Neither
path should promise buyers. The sell walk does not.

**No share card.** The homepage has `og-image?type=lumber_home`. This
page has title and description only. Not urgent; do not invent a record
card for it.

**Sitemap `lastmod` for `/estimate` is still 2026-08-21.** Cosmetic.

### Finding 1 — `estimate_shown` is emitted and then dropped — **CLOSED 2026-09-10**

**Resolution (Larch, 2026-09-10).** All three gates are open, server first:
timberbid-v1 ledger `20260910175457_the_calculator_finally_reports` widens the
CHECK (its self-test writes the event as `anon` and still refuses an unlisted
one), then `site/metrics.js` `EVENTS` and
`test/fixtures/site_events.events.json` in this repo, pinned to each other by
`test/metrics-events.test.mjs`. The finding below is kept as written because
the reasoning is the reusable part — a beacon can be live, committed,
documented as shipped, and still never leave the browser.

One thing the resolution adds: every `estimate_shown` count **before**
2026-09-10 is a structural zero, not a measurement, so the series does not
join across that date. The 6 September decision rule starts collecting on
09-10, not retroactively.

This is the one engineering remainder of Phase A. It is not new
capability. It is the watch metric the 6 September plan named, and it is
not reaching `site_events`.

On 6 September, `site/estimate.js` started calling
`lbTrack('estimate_shown', { mode: 'manual', route })` once per visit,
on first real input, never for the on-load walnut default. That call
is live.

`site/metrics.js` still drops any event that is not in its `EVENTS`
array. `estimate_shown` is not in that array. It is also not in
`test/fixtures/site_events.events.json`. The client returns before
`fetch`. Production cannot tell a visitor who typed a diameter from one
who bounced at the photo boxes.

CLAUDE.md and the 6 September PDF both list the event as shipped. The
commit even says it was verified firing. The `lbTrack` call fires. The
beacon does not leave the browser.

Do not “just add it” in this repo. Event names are CHECK-whitelisted in
`timberbid-v1` migration `20260827235000`. The counterpart rule is both
sides in the same window, or neither:

1. Add `estimate_shown` to the migration CHECK (timberbid-v1).
2. Add it to `site/metrics.js` `EVENTS` and
   `test/fixtures/site_events.events.json` (this repo).
3. Extend `test/metrics-events.test.mjs` is automatic once the fixture
   matches.

Until that lands, **do not read a zero `estimate_shown` count as
“the six visits were crawlers.”** The 6 September plan said that was
the decision rule for whether `/estimate` deserves more traffic. That
rule is currently blind.

### Finding 2 — the MCP is live, and it is the tree company, not this one

`https://mcp.timber.bid/` is a Streamable HTTP MCP server (POST only;
GET returns 405) on the shared Supabase project
(`uuzqezohkqgsbbxyzvvv`), `serverInfo.name = timber.bid`, version
`1.1.0`. A session from this review listed tools and called two of them.

What it can do, today:

| Tool | Role |
|---|---|
| `get_tree_estimate` | Preliminary **tree-work** band from publicly reachable photo URLs. Not a quote. |
| `get_photo_estimate` | Scope-only for an existing tree estimate id. Deliberately no price. |
| `search_jobs` / `get_job` | Open tree jobs and firewood requests. No poster identity, no price. |
| `search_providers` / `get_reputation` | Tree services and firewood sellers. |
| `get_order_status` | Buyer receipt token → order/delivery status. |
| `list_verified_insights` | Agora feed, informational, `executable=false`. Empty on 7 Sep. |
| `request_human_contact` | Records a follow-up **only when the person asked and left email or phone**. Does not post a job, does not email a mill, does not reach Woody. |

What it cannot do, and must not be asked to do:

- No `get_log_estimate`. No lumber listings. No sealed-lot search. No
  waitlist write. The instructions describe homeowners, tree services,
  and firewood — not sawlogs.
- Cannot post jobs, submit or accept bids, or take payment. Those stay
  on `https://timber.bid`.
- Cannot show a photo estimate’s price band to a company that may bid.
- Not a chat. Not a WebSocket. Not a conversation with a person at
  timber.bid. It is request/response RPC.

A `search_jobs` call for “lumber” on 7 September returned one open
**tree** job (white ash removal, Malden MA). That is the tree vertical
leaking into a lumber query, not lumber demand.

Do not add lumber tools to this MCP to decorate an empty market. If
Phase B ever needs an agent-readable log estimate, that is a
timberbid-v1 change with a named counterpart, and it waits on a reason
that is not “the homepage looks unfinished.”

### Finding 3 — there is no live inbox, and Woody is the wrong address

- **Gmail MCP** in this agent environment is `needsAuth`. This session
  cannot send or read mail until that integration is authenticated.
- **lumber.bid Resend** is verified and sends nothing. Receiving is off
  (no apex MX), on purpose.
- **`woody@timber.bid`** already taught the company the lesson: 29
  unanswered messages over 510 hours. An inbox nobody answers is worse
  than no inbox. Do not enable receiving on lumber.bid. Do not send
  this site’s mail there.
- Cold outreach, when Phase B actually runs it, goes from
  **`timberbid.app`**. Splitting cold volume across two young domains
  halves the reputation each builds.
- `request_human_contact` on the MCP is for a user who asked to be
  called back. It is not a page to Woody and not a substitute for the
  mill list.

### Suggestions, in the order they are worth doing

None of these reopen Phase C. The first one finishes Phase A. The rest
are copy and one-line gates, or they are Phase B itself.

1. ~~**Land `estimate_shown` for real.** Counterpart window above. Until
   then the 6 September decision rule is fiction.~~ **DONE 2026-09-10** —
   all three sides landed in one window (finding 1). Phase A is finished;
   the decision rule now has an input, starting from that date.
2. **Do Phase B.** Seventeen mills, by hand, from `timberbid.app`.
   Offer to list their wood from photos they already have. The first
   listing can be founder-entered. Watch `slab_seller_leads` and
   `listings` — not pageviews.
3. **Gate the estimate lead card on real input**, the same way
   `estimate_shown` already does. `revealLead()` on load is asking for
   an email about the default walnut. That is not a new feature; it is
   the honesty rule applied to the ask.
4. **Say “or type the measurements” next to the photo CTA**, in the
   words the homepage already uses. Six opens, zero finishes, photo
   button disabled until a file is chosen: the manual path is the one a
   visitor can finish without a log in their pocket.
5. **After a lumber-route band, offer the open door.** One ghost
   button to `timber.bid/lumber/sell` (milled wood, finishable) and keep
   the waitlist for sealed lots (not finishable). Do not send them to
   the empty lot board as if it were inventory.
6. **Do not** add a chat widget, a Woody bot, an MCP-backed estimator
   on this site, a second waitlist writer, or a leaderboard promotion.
   Do not put a precise price on the estimate. Do not enable mail
   receiving.

### What to watch (once finding 1 is closed)

- `estimate_shown` with `route=lumber` vs `route=firewood` — is anyone
  bringing a real sawlog.
- `estimate_photo_added` / `estimate_requested` / `estimate_returned` —
  did anyone get past the camera.
- `waitlist_joined` and `outbound_app_click` to `/lumber/sell` — the
  two conversions that can happen before a market exists.
- `listings` of raw timber or slabs, and `slab_seller_leads` — Phase B
  working.

If those stay zero after the mills have actually been asked, the
product is not the next lever.

---

## Channels this agent can use

Answered from a live session on 7 September 2026, so the next agent
does not have to rediscover it.

| Channel | Can this agent use it? | Notes |
|---|---|---|
| `https://mcp.timber.bid/` | Yes, read-only tools listed above | Streamable HTTP, POST. Tree/firewood, not lumber. Not a conversation. |
| Email Woody / `woody@timber.bid` | No, and should not | Gmail MCP unauthenticated here; that inbox is a known grave. |
| Resend on lumber.bid | No | Verified, sends nothing, receiving off. |
| Cold mail | Not from this domain | `timberbid.app` only; Phase B, by hand. |
| `request_human_contact` | Only if a person asked and left contact details | Records a follow-up. Not live chat. Not Woody. |
| Real-time conversation with timber.bid | No | No socket, no human on the other end of the MCP, no shared inbox. |
| Supabase / Stripe / Gmail / Drive MCPs in this environment | Not until authenticated | All four reported `needsAuth` on 7 Sep. |

To talk to a person at the company, use the founder’s existing channels
(the Cursor thread, GitHub, the private repo). Do not invent a new one
on this domain.

---

## Agent MCP — what to build, where to call it

The 7 September review found a live consumer MCP and no builder MCP.
The business plan, integration map, security analysis, and lumber.bid
focus sit in [`docs/MCP_AGENT_PLAN.md`](MCP_AGENT_PLAN.md).

Short version, so this file still decides:

- **Call** `https://mcp.timber.bid` (same server as `https://timber.bid/mcp`).
  From the agent runtime — Cursor `mcp.json`, Claude, cloud agent
  environments — not from lumber.bid JavaScript.
- **Build next, in timberbid-v1:** (1) actually point founder and cloud
  agents at the live server; (2) keyed READ tools for platform status,
  contracts, invariants, event whitelist, front-door CTA; (3) treat
  `agent_audit_events` as the research feed. Lumber consumer tools wait
  on a reason that is not an empty homepage.
- **lumber.bid focus is still Phase B.** Optional static `llms.txt` that
  tells crawling models the truth. No chat widget, no second MCP, no
  service-role, no auction back on the primary button.
