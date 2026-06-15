---
"canup": minor
---

`CanupError.type` is now `CanupError.code`, matching the API's error envelope.

**Breaking:**

- Read `error.code` instead of `error.type` on a caught `CanupError` (for example in an `ActionButton` `onError` handler, or when inspecting `useAction().error` / `useCredits().error`). The values themselves (`CREDITS_EXHAUSTED`, `ACTION_NOT_FOUND`, `HTTP_ERROR`, …) are unchanged — only the field name.
