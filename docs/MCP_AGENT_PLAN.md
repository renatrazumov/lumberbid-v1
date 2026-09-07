# Agent integrations for timber.bid

A business plan for the MCP — what to build, who it is for, where to
call it, what better data is worth, and what lumber.bid should (and
should not) do with it.

Written 7 September 2026 from a live session against
`https://mcp.timber.bid/` and the public discovery files on
`https://timber.bid`. The MCP itself lives in **timberbid-v1**. This
file is the lumber.bid reading of it: what agents building this front
door need, and what must not be confused with a demand problem.

Authority when this disagrees with timberbid-v1:
`docs/LUMBERBID_REPO_BRIEF.md`, `protocol.json`, and
`__tests__/guards/theAgentManifestTellsTheTruth.test.ts`.

---

## The thesis

timber.bid already has an agent protocol. It is not a toy endpoint.

What it does not have is a way for **AI developer agents** — Cursor,
Claude Code, cloud agents on `lumberbid-v1` and `timberbid-v1` — to
ask the platform *how to build it without lying*. Today those agents
reread `CLAUDE.md`, a PDF, and whatever HTML they can fetch, then
guess. Guessing is how fee math gets copied, how `select('*')` rolls
an insert back, how an auction with zero lots becomes the primary
button, and how `estimate_shown` gets documented as shipped while the
whitelist drops it.

The consumer MCP starts conversations with homeowners about trees.
The missing piece starts conversations with **builders** about the
truth of the system. Those are two products on one host. Mixing them
is how a mill list, a service-role key, or a price band leaks.

The value is not “AI can post a job.” Posting a job, taking a bid,
and moving money are absent from every agent surface on purpose
(Tier 3/4 COMMIT — humans, signed in, on timber.bid). The value is
**better data in, better agents out**: fewer false markets, fewer
duplicate writers, a funnel you can actually read, and a conversation
that starts where people already talk to models.

---

## What already exists (do not rebuild it)

Verified live, 7 September 2026.

| Surface | Role |
|---|---|
| `https://mcp.timber.bid` | Canonical Streamable HTTP MCP (POST/OPTIONS). Same function as `https://timber.bid/mcp` and `https://uuzqezohkqgsbbxyzvvv.supabase.co/functions/v1/mcp`. |
| `https://timber.bid/.well-known/mcp.json` | Server card. Clients that probe well-known land here instead of the SPA. |
| `https://timber.bid/.well-known/mcp/catalog.json` | One-server catalog. |
| `https://timber.bid/.well-known/ai.json` | Agent manifest. Guarded: every capability is a real tool with a declared boundary. |
| `https://timber.bid/protocol.json` | Tiers 0–4, READ / DRAFT / COMMIT, delegation, audit, kill switch. |
| `https://timber.bid/llms.txt` | Human-and-model brief. Honesty rules for estimates. |

**Audience of the live MCP:** homeowners and tree/firewood companies
talking through ChatGPT, Claude, Cursor, or anything that speaks MCP.

**Tools (v1.1.0):** `get_tree_estimate`, `get_photo_estimate` (scope,
no price), `search_jobs`, `get_job`, `search_providers`,
`get_reputation`, `get_order_status`, `list_verified_insights`,
`request_human_contact`.

**Boundaries already enforced in code, not in a prompt:**

- MCP may READ and DRAFT. It may not COMMIT.
- Money, quotes, payouts, listings, job posts: absent, not
  approval-gated. A guard fails the build if one is declared.
- Estimate bands are preliminary. Never a quote. Never shown to a
  company that may bid on that job.
- CORS: no browser origins. Server-to-server only.
- Anonymous use: per-IP, fail-closed. `x-api-key: tbk_...` (from
  timber.bid/pro) lifts limits. Delegated agents add `x-agent-id`,
  `x-delegation-id`, `x-agent-nonce`.
- Audit: append-only `agent_audit_events`. Honest about not being
  third-party proof.
- In-app Woody may run a few human-gated COMMITs. Those are **not**
  on MCP. First-party device tools (box stock) are listed in the
  manifest so the boundary is public, and are unreachable over MCP.

There is no lumber tool. There is no log estimate. There is no
builder/status tool. A `search_jobs` query for “lumber” returned a
tree-removal job. That is the tree vertical, not sawlog demand.

`mcp.timber.bid` and `timber.bid/mcp` are the **same server**. Call
one. Prefer the canonical URL in the server card.

---

## Two customers, two integrations

### 1. Consumer agents (live) — start the conversation with demand

A homeowner in ChatGPT: “what will it cost to take down this oak?”
A tree service in Claude: “any open jobs near Malden?”
A buyer with a receipt token: “where is my firewood?”

This is distribution. Every assistant that can call MCP is a front
door that timber.bid did not have to rank in Google. The tree
vertical is starved (14 estimates all-time as of mid-August, four
job requests ever). The MCP is the one surface that can put the
estimator in front of people who will never type lumber.bid.

**Integrations to wire, in order of leverage:**

| Integration | Why | What they call |
|---|---|---|
| Cursor (Desktop + Cloud) | Founder and hired agents already work here | `~/.cursor/mcp.json` or project `.cursor/mcp.json` → `url: https://mcp.timber.bid` |
| Claude Desktop / Claude Code | Same MCP JSON shape | Streamable HTTP URL, optional `x-api-key` |
| ChatGPT (MCP / custom GPT / browsing `llms.txt`) | Where homeowners already ask “what does tree removal cost” | Discovery via `llms.txt` + well-known card; tools when the client supports MCP |
| Company-side assistants | Job cards and reputation, never price bands | Same server; instructions already forbid band leakage |

Do **not** call this MCP from the lumber.bid browser. CSP
`connect-src` is the Supabase project only. The MCP card says no
browser origins. A page that fetched MCP from the visitor’s laptop
would be a new origin, a new attack, and a product nobody asked for.

### 2. Builder agents (the gap) — start the conversation with the truth

A cloud agent on `lumberbid-v1`: “is the auction the primary CTA?”
A Cursor agent on `timberbid-v1`: “which file is the waitlist
counterpart?”
An agent about to add a column: “what does anon INSERT look like?”

This is leverage on **every future PR**, including this repo. The
failure mode of a second frontend is contract drift. The MCP should
serve the contracts the way `get_job` serves a job card: enumerated
fields, named counterparts, live counts, and the honesty flag.

**This does not belong on the anonymous public tool list.** A public
`dump_schema` is reconnaissance. A public mill list is the outreach
list. Builder tools are keyed (`tbk_`), bound to an owner account,
audited, and still READ/DRAFT only. They never get `service_role`.
They never drain `email_queue`. They never move money.

---

## The product to build (in timberbid-v1)

Phased by what an agent can *do* with the answer, not by calendar.

### Slice 1 — make the live MCP actually used

The server is live. The integrations are not. Value here is
distribution, not new tools.

- Founder’s Cursor: one `mcp.json` entry, canonical URL
  `https://mcp.timber.bid`. Optional `x-api-key` so founder traffic
  is metered instead of fighting the anonymous IP limit.
- Same entry in the timberbid-v1 and lumberbid-v1 **cloud agent
  environments**, so background agents stop rediscovering the
  protocol from HTML.
- Do not add a second MCP on lumber.bid’s Netlify site.

This is what “starts the conversation” this week: the estimator
already runs when an assistant has a photo URL. Nobody has pointed
the assistants at the URL.

### Slice 2 — builder READ tools (keyed)

The smallest set that would have changed this lumber.bid review:

| Tool | Returns | Why it pays |
|---|---|---|
| `get_platform_status` | Vertical, what’s live, listing/auction/lead/order counts, “honesty: no lumber lots” | Agents stop implying a market. The 6 Sep PDF becomes a query. |
| `get_contract` | Named shape: waitlist / site_events / estimate-log / listings / logValuation. Counterpart paths both repos. | The drift this repo exists to prevent. |
| `get_invariants` | No service-role, column-lock, Prefer: return=minimal, fee single-source, email chokepoint, sealed vs fixed-price, Woody inbox is not a channel | The rules agents break first. |
| `get_event_whitelist` | `site_events` CHECK list **and** whether a named event is actually in the client `EVENTS` array | `estimate_shown` would have shown as emitted-not-recorded. |
| `get_front_door` | lumber.bid / wood.delivery / timberbid.app: what each may write, primary CTA, noindex flags | Stops the auction sneaking back onto the primary button. |

All Tier 0/1 READ. Column-locked. No PII. No mill names. Counts, not
rows. Counterpart of the PDFs and `CLAUDE.md` — those files stay;
the MCP is how an agent checks they are still true.

### Slice 3 — better data in (the compounding asset)

Every MCP call already lands in `agent_audit_events`. That log is
the product-research feed the consumer site does not have.

Once Slice 1 is actually used:

- Which tools fire, from which surface, with which denied_reason.
- `get_tree_estimate` volume vs timber.bid/estimate pageviews —
  is the assistant the real top of funnel.
- `request_human_contact` quality (spam vs a person who asked).
- Builder-tool hits: which invariants agents keep asking. That is
  the next sentence in `CLAUDE.md`.

Treat the audit log as **analysis**, not as a dashboard vanity
chart. It tells you what agents (and therefore their humans) want
before you build a UI for it.

Do not store photos, emails, or raw prompts in that log beyond the
payload hash the protocol already specifies.

### Slice 4 — lumber on the consumer MCP, only with a reason

`get_log_estimate` (vision facts + a band, never a quote) would
mirror `/estimate` and could send a visitor to
`timber.bid/lumber/sell` or `lumber.bid/estimate`. It is the
honest consumer conversation for this vertical.

It waits on a reason that is not “the homepage looks unfinished.”
The honest reasons, when one exists:

- Assistants are already asking “what is this log worth” (you will
  see it in audit, or you will not).
- Phase B has a mill that wants inbound from ChatGPT.

Until then, a lumber tool on a server whose `llms.txt` still says
“tree services and firewood” is a false market in a new channel.
The honesty rule binds MCP copy the same way it binds the homepage.

### Never on MCP

- `publish_listing`, `post_job_request`, `submit_quote`,
  `accept_quote`, `capture_payment`, `release_payout`.
- Service-role anything. Schema dumps. The mill outreach list.
- Cold email send. Resend receiving. Woody’s inbox as a chatbot.
- A browser widget on lumber.bid that “chats with timber.bid.”

---

## Where to call the MCP from

**Canonical:** `https://mcp.timber.bid`  
**Aliases (same function):** `https://timber.bid/mcp`, the Supabase
`/functions/v1/mcp` URL in the server card.  
**Discovery:** `https://timber.bid/.well-known/mcp.json`  
**Not a chat, not a WebSocket.** JSON-RPC 2.0 over POST.

### Call it from the agent runtime

```json
{
  "mcpServers": {
    "timber.bid": {
      "url": "https://mcp.timber.bid",
      "headers": {
        "x-api-key": "tbk_...."
      }
    }
  }
}
```

Put that in:

1. **Founder Cursor** (`~/.cursor/mcp.json`) — so every local chat
   can estimate a tree, search jobs, and eventually hit builder
   tools.
2. **Project environments** for timberbid-v1 and lumberbid-v1 cloud
   agents — so a background agent on this repo can ask the platform
   instead of grepping a PDF.
3. **Claude Desktop / Claude Code**, same shape.

Use the `tbk_` key from a signed-in timber.bid/pro account. Do not
commit the key. Anonymous works and is rate-limited; founder and
hired agents will hit that limit and look like the server is down.

Delegation headers (`x-agent-id`, `x-delegation-id`,
`x-agent-nonce`) are for when an agent identity is bound to a
human principal with an expiring grant. Cloud agents that are
“the founder building the site” can start on the API key alone.
Company-side or customer-side agents should use the grant.

### Do not call it from

| Place | Why |
|---|---|
| `lumber.bid` page JavaScript | CSP forbids it; MCP CORS forbids browser origins; the visitor is not an agent runtime. |
| A Netlify function on this repo | This site is publish-only on purpose. New backend belongs in timberbid-v1. |
| The visitor’s phone as “talk to Woody” | Woody is in-app, human-gated. MCP `request_human_contact` is a lead row, not a conversation. |
| Email to `woody@timber.bid` as a substitute | That inbox taught the receiving-off rule. `llms.txt` still says a human replies; it is not a live channel from this environment. |

### lumber.bid’s job in this picture

Stay a static front door. Optionally add `site/llms.txt` (and a
Sitemap/robots pointer) that tells crawling models the truth:
no auction is open, the estimator is at `/estimate`, the finishable
sell walk is `timber.bid/lumber/sell`, the MCP for trees is
`https://mcp.timber.bid`. That is discovery, not a new product.
It is the one lumber.bid-side integration that starts a conversation
without implying a market.

---

## What better data is worth

Today the company learns slowly and in the wrong place.

| Without a used MCP | With Slice 1 + 2 + 3 |
|---|---|
| 38 pageviews, six estimate opens, no idea if they typed a number (`estimate_shown` dropped) | Funnel beacons that actually land; agent audit that shows whether assistants even tried |
| Agents reread CLAUDE.md and still restore the auction | `get_front_door` returns the primary CTA and the honesty flag |
| Three waitlist writers; a fourth appears inside one repo | `get_contract('waitlist')` names all three; a fourth fails the agent’s own check |
| $67.08 lifetime GMV, 28,263 cold emails | Assistants bring *inbound* tree estimates (the starved vertical) without another cold blast |
| Protocol.json roadmap lists “draft quote / draft job” as planned | Audit log says whether anyone asked for a draft before you build one |
| A second repo exists so the trade-off is explicit | The second repo’s agents can query the first repo’s invariants |

The compounding asset is **enumerated, counterpart-named, live
state**. Every tool that returns a count instead of a story makes
the next agent cheaper. Every tool that returns a story instead of
a count (the 6 Sep PDF) goes stale the next morning.

What will not improve: liquidity on lumber.bid. MCP does not create
a mill that wants to list. That is Phase B.

---

## Security and systems analysis

The live design is already stricter than most “ChatGPT plugin”
marketplaces. Keep it that way when adding builder tools.

### What is already working

- COMMIT absent, with a CI guard. Adding `publish_listing` to MCP
  should fail the build, not “require confirmation.”
- Column-lock culture matches anon REST: enumerate or get 42501.
- Price-band isolation (homeowner vs bidder) is in the manifest,
  the tool descriptions, and `get_photo_estimate` (no price key).
- Fail-closed anonymous rate limit. Keyed monthly quota.
- Delegation: 30-day ceiling, one nonce per grant, kill switch
  outranks a valid grant, Tier 3/4 cannot execute from a grant.
- Audit is append-only for service role (no UPDATE/DELETE grant).
- Device/ops tools deliberately unpublished so the retail map
  does not leak.

### What adding integrations will stress

| Risk | If ignored | Mitigation |
|---|---|---|
| Cost attack on `get_tree_estimate` | Anonymous photo URLs burn vision budget | Keep per-IP fail-closed; require `tbk_` above a low free tier; cap photos (already 1–5) |
| `request_human_contact` spam | Woody’s grave, round two: a lead queue nobody works | Same as the inbox rule. Cap it. Require email or phone. Do not auto-email. A human still has to answer. |
| Job-card scraping | Open demand is already public on the site; MCP just makes it structured | Blurred location and no poster identity stay non-negotiable |
| Builder tools on anonymous | Schema, counts, counterpart paths help an attacker map writes | Keyed only. Counts, not rows. No mill list. No service-role. |
| Agent confused with a user | A Cursor agent on lumberbid-v1 calls `request_human_contact` as if it were a homeowner | Builder keys should not get consumer DRAFT tools they do not need; or the tool must refuse `source=agent-builder` |
| Band leakage via a new lumber tool | A mill’s assistant prices a lot it will bid on | Same rule as trees: facts maybe, band never, to a party that may bid |
| Second MCP on lumber.bid | Split brain, split auth, CSP hole, a static site that now has a backend | One function, one project, one audit table |
| Treating audit HMAC as proof | Legal or partner claims that “the log is tamper-proof” | `protocol.json` already says attestation, not proof. Keep saying it. |
| CORS “just for debugging” | Browser origins appear, lumber.bid grows a chat widget | Card says no browser origins. Keep the test. |

### What will improve in the systems themselves

- **RLS and grants stay the real gate.** MCP is another client, same
  as lumber.bid’s anon key. If a tool can read a column, a browser
  with the anon key can too. Never give MCP a wider grant than anon
  plus the caller’s user JWT.
- **Counterpart tests become MCP-backed.** Today Netlify runs
  `scripts/test.sh` against fixtures. A builder tool that returns
  the live CHECK list makes “fixture vs prod” a query, which is how
  `estimate_shown` gets caught before the PDF ships.
- **Email chokepoint stays one queue.** `request_human_contact`
  writes a row a human works. It must not call Resend. lumber.bid
  still sends nothing.
- **Agora `executable=false` is the pattern to copy.** Builder
  insights (“the waitlist has three writers”) are informational.
  An agent that reads them still has to open a PR. Nothing in MCP
  merges, deploys, or pays.

### Analysis you get for free once Slice 1 is used

The tree vertical’s question is “is anyone asking.” The MCP audit
answers that without another homepage rewrite. If assistants send
zero `get_tree_estimate` calls after they are actually configured,
the problem is not the tool list. If they send many and
timber.bid/estimate stays empty, the assistant *is* the front door
and the site is the closer — which is the opposite of how lumber.bid
is currently built, and worth knowing before spending on Astro.

---

## lumber.bid focus at this point

The MCP plan is a timberbid-v1 plan. This repo’s focus has not
moved.

**Do Phase B.** Seventeen mills, by hand, from `timberbid.app`.
The first listing does not have to be self-serve. MCP will not
produce it.

**Finish the one Phase A hole:** `estimate_shown` in the migration
CHECK, `site/metrics.js` `EVENTS`, and the fixture, same window.
Until then you cannot tell a calculator user from a bounce.

**If you touch `/estimate` at all** (optional, small): gate the
lead card on real input; say “or type the measurements” next to
the photo CTA; after a lumber-route band, offer
`timber.bid/lumber/sell` instead of the empty lot board. Copy and
one-line gates. Not a new product.

**If you touch this repo for agents at all:** a static `llms.txt`
that tells the truth and points at `https://mcp.timber.bid` for
trees and at `/estimate` and `/lumber/sell` for wood. No MCP
client. No chat. No Woody.

**Do not:** add lumber tools to the public MCP to decorate empty
shelves; enable mail receiving; put a service-role key anywhere
in this bundle; restore the auction as the primary button; build
the photo-grid homepage, the leaderboard promotion, or a freight
quote.

The conversation you want on lumber.bid is still a mill answering
an email. The conversation the MCP is ready to start is a
homeowner asking an assistant about a tree. Run both. Do not
pretend they are the same conversation.
