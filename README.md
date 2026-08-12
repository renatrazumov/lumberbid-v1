# lumber.bid

Holding page for **lumber.bid**, an official domain of [timber.bid](https://timber.bid).

## What this repo is (and is not)

This is **not** the lumber vertical. It is a single static page whose job is to
make the domain deployable, so that:

1. Netlify will accept the repo (it refuses to connect an empty one),
2. lumber.bid's DNS can move from Namecheap parking to Netlify, and
3. Resend's SPF / DKIM / DMARC records can be managed there for mailability.

The sawmill/lumber vertical itself is **deferred** — specced but not built. See
`docs/lumber.md`, `docs/LUMBER_BID_TEMPLATE.md`, and
`docs/business-models/MASTER_LUMBER_BID.md` in the `timberbid-v1` repo, plus
PR #547, which parked this domain on purpose: a front door would promise a
product that does not exist. The page here therefore states plainly that there
is no marketplace yet, and links to timber.bid.

## Why there is no build step

`netlify.toml` publishes `site/` directly — no build command, no `package.json`,
no Node version. A publish-only site cannot fail to deploy, which is the whole
point while the deploy exists to unlock DNS. When the vertical ships, this
becomes a real build (Astro, mirroring the `wooddelivery` repo) and the holding
page is replaced.

## Conflict to be aware of

`timberbid-v1`'s `public/_redirects` carries a merged rule from PR #547:

```
https://lumber.bid/*  https://timber.bid/:splat  301!
```

That rule only fires if lumber.bid is aliased onto the **timber.bid** Netlify
site. Pointing the domain at **this** site instead means it never fires and
stays dead code. Pick one:

- **This site owns the domain** (current plan — needed for Netlify-managed DNS
  and Resend records) → remove or annotate that rule in `timberbid-v1`.
- **timber.bid owns the domain** → this repo stays unused and the 301 governs.

## Structure

```
netlify.toml     publish config + security headers
site/
  index.html     the holding page (self-contained: inline CSS, no scripts)
  robots.txt     noindex while it is a holding page
```

## Rules

- **No secrets, ever.** This is a public client with no backend of its own.
  Never add a Supabase `service_role` key.
- **Promise nothing.** The lumber marketplace does not exist. Copy here must not
  imply listings, bidding, or signups until it does.
- The CAN-SPAM postal address in the footer must stay accurate — this domain is
  intended to send mail.
