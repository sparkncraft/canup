---
"canup": minor
---

`useAction().execute()` now resolves to the action's return value directly, instead of an `{ result, durationMs }` wrapper. `durationMs` was a diagnostic that belongs in the dashboard's invocation logs, and the post-run credit balance is applied to `useCredits` automatically — so the value you almost always wanted (`result`) is now what you get.

**Breaking:**

- `await execute(params)` returns the action's result, not `{ result, durationMs }`. Replace `const { result } = await execute(...)` with `const result = await execute(...)`.
- `<ActionButton onResult={...}>` receives the action result directly — `onResult={(result) => ...}` instead of `onResult={(data) => data.result}`.
- The `ActionResult` type export is removed.
