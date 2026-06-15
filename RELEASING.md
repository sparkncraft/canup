# Releasing

Releases are automated with [Changesets](https://github.com/changesets/changesets)
and [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC).
**No npm token is involved** — GitHub Actions authenticates to npm via a
short-lived OIDC credential, and packages are published with
[provenance](https://docs.npmjs.com/generating-provenance-statements).

## For contributors

If your change affects published behavior, add a changeset in the same PR:

```sh
pnpm changeset
```

Pick the bump type (patch / minor / major) and write a short, user-facing
summary. CI reminds you if a PR is missing one.

That's it — you don't publish anything. Maintainers merge the automated release
PR (below) when it's time to ship.

## How a release happens

1. PRs merge to `main`, each carrying a changeset.
2. The release workflow opens (and keeps updating) a **"Version Packages"** PR
   that bumps the version and updates `CHANGELOG.md`.
3. Merging that PR publishes the new version to npm — with provenance, no token.

## Maintainer setup (one-time)

npm Trusted Publishing requires the package to exist before a trusted publisher
can be attached, so the very first release is published manually; every release
after that is automated.

1. **First publish (once, requires npm 2FA):**

   ```sh
   pnpm install --frozen-lockfile
   pnpm run build
   npm publish --access public
   ```

2. **Configure the trusted publisher** at
   <https://www.npmjs.com/package/canup/access> → **Trusted Publisher** →
   **GitHub Actions**:

   | Field | Value |
   |-------|-------|
   | Organization or user | `sparkncraft` |
   | Repository | `canup` |
   | Workflow filename | `release.yml` *(filename only, not a path)* |
   | Environment | *(leave blank)* |

After this, no token is needed and the `release.yml` workflow publishes on its
own. Any previously configured `NPM_TOKEN` secret can be deleted.

## Requirements (handled by the workflow)

- npm **≥ 11.5.1** and Node **≥ 22.14.0** — the workflow installs `npm@latest`
  because runners ship an older npm and pnpm delegates the publish to the npm CLI.
- `id-token: write` permission on the release job.
