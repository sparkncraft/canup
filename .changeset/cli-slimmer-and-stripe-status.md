---
"canup": patch
---

The CLI installs lighter and its Stripe status is more useful:

- Dropped the `zod` runtime dependency — the CLI no longer ships it, so `canup` installs smaller.
- `canup stripe status` now reports connection health: whether the stored key is valid, whether webhook delivery is working, and when the connection was last checked.
- `canup deps list` no longer prints an always-empty "Added" column.
