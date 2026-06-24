# @canup/cli

Command-line tool to scaffold, deploy, and manage [Canva app](https://www.canva.dev/) backends on
[CanUp](https://canup.link).

[![npm](https://img.shields.io/npm/v/@canup/cli)](https://www.npmjs.com/package/@canup/cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/sparkncraft/canup/blob/main/LICENSE)

CanUp gives a Canva app a managed backend — deploy serverless actions (Python or Node.js) to AWS
Lambda, meter credits, and connect Stripe for billing, without running servers. `@canup/cli` is the
developer tool that drives it; the [`@canup/ui`](https://www.npmjs.com/package/@canup/ui) React
components consume what you deploy.

## Usage

No install needed — run it with `npx`:

```sh
npx @canup/cli login                          # Authenticate via GitHub OAuth
npx @canup/cli init                           # Link your Canva app, create the canup/ folder
npx @canup/cli actions new generate-text      # Scaffold an action
npx @canup/cli actions deploy generate-text   # Deploy to AWS Lambda
```

Or add it as a dev dependency and call the `canup` binary directly:

```sh
npm install -D @canup/cli
npx canup status
```

## Commands

### Project

| Command                | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| `canup init`           | Initialize a project (auto-login, app linking, dependency setup) |
| `canup login`          | Authenticate via GitHub OAuth                                    |
| `canup logout`         | Clear stored credentials                                         |
| `canup whoami`         | Show the current user                                            |
| `canup status`         | Show project and app status                                      |
| `canup pull`           | Download deployed action scripts                                 |

### Actions

| Command                            | Description                                            |
| ---------------------------------- | ------------------------------------------------------ |
| `canup actions new <name>`         | Scaffold a new action (Python or Node.js)              |
| `canup actions deploy <name>`      | Deploy an action to AWS Lambda                         |
| `canup actions list`               | List the app's actions                                 |
| `canup actions run <name>`         | Invoke a deployed action                               |
| `canup actions test <name>`        | Test an action locally                                 |
| `canup actions invocations <name>` | View invocation history (`--search <term>` to filter)  |
| `canup actions remove <name>`      | Remove a deployed action                               |

### Secrets & dependencies

| Command                           | Description                                          |
| --------------------------------- | --------------------------------------------------- |
| `canup secrets set/list/delete`   | Manage secrets exposed as env vars in your actions  |
| `canup deps add/list/remove`      | Manage pip / npm dependencies for your actions      |

### Stripe

| Command                   | Description                             |
| ------------------------- | --------------------------------------- |
| `canup stripe connect`    | Connect a Stripe account for billing    |
| `canup stripe status`     | Show Stripe connection status           |
| `canup stripe disconnect` | Disconnect Stripe                       |

## How it works

1. Write a backend action (Python or Node.js) in `canup/actions/`.
2. Deploy it with `canup actions deploy`.
3. Trigger it from your Canva app with
   [`@canup/ui`](https://www.npmjs.com/package/@canup/ui)'s `<ActionButton>` — credits and
   subscriptions are metered automatically.

## License

MIT
