---
"canup": minor
---

Mint the subscribe link on click instead of caching it. `CreditCounter` now requests a fresh link the moment the user clicks the subscribe/manage CTA, so the short-lived token it carries can no longer go stale before the click.

Replace `CreditBalance.billingUrl` with a stable `billingAvailable` boolean. The flag carries no token, so it rides both the REST read and the SSE update — the subscribe/manage CTA appears and disappears as billing connects or disconnects, without a reload. `CreditBalance` is now exactly the shared REST + SSE schema.

**Breaking:** `CreditBalance.billingUrl` is removed. Use `billingAvailable` to decide whether to show the subscribe/manage CTA; `CreditCounter` mints and opens the link itself.
