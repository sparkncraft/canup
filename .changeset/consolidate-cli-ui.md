---
"canup": minor
---

Rename the `actions logs` command to `actions invocations`, and the `LogSummary`/`LogDetail` types to `InvocationSummary`/`InvocationDetail`, to match the API surface. Deduplicate CLI and UI internals: shared formatters and command helpers, a single secret-input reader, `requireClient()`, named API-client wire types, and a single-sourced credit-balance shape.
