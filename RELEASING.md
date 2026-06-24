# Releasing

`@canup/ui` and `@canup/cli` publish to npm via
[npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC).
**No npm token is involved** — GitHub Actions authenticates with a short-lived
OIDC credential, and packages publish with
[provenance](https://docs.npmjs.com/generating-provenance-statements).

The two packages version in lockstep: bump them to the same version and release
them together.

## Cutting a release

1. On a branch, bump the `version` in both `packages/ui/package.json` and
   `packages/cli/package.json` to the new version and update each package's
   `CHANGELOG.md`. Merge to `main`.
2. Run the **Release** workflow from the Actions tab (`workflow_dispatch`). It
   builds, tests, and publishes — with provenance, no token. (pnpm skips any
   package whose version is already on npm, so a re-run without a bump is a
   no-op.)

## First publish (one-time, per package)

npm Trusted Publishing can't bootstrap a package name that doesn't exist yet, so
the **first** publish of each package is manual and requires your npm 2FA:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm --filter @canup/ui publish --access public
pnpm --filter @canup/cli publish --access public
```

Then configure the trusted publisher for **each** package at
`https://www.npmjs.com/package/<name>/access` → **Trusted Publisher** →
**GitHub Actions**:

| Field                | Value                                          |
| -------------------- | ---------------------------------------------- |
| Organization or user | `sparkncraft`                                  |
| Repository           | `canup`                                        |
| Workflow filename    | `release.yml` _(filename only, not a path)_    |
| Environment          | _(leave blank)_                                |

After that, the `release.yml` workflow publishes on its own — no token needed.

## Requirements (handled by the workflow)

- npm **≥ 11.5.1** and Node **≥ 22** — the workflow installs `npm@latest`
  because runners ship an older npm and pnpm delegates the publish to the npm CLI.
- `id-token: write` permission on the release job.
