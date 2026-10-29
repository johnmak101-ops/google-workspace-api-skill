# Agent playbook: install, authorize, verify

Use this sequence when a user asks an agent to set up Google Workspace access from scratch. Every command is safe to run from a non-interactive shell; the one step that needs a human is the Google consent click, and `auth --window` opens the terminal for it.

## Preconditions

| Check | Command | Expected |
| --- | --- | --- |
| Node version | `node --version` | `v24.22.x` |
| CLI present | `node "<skill-dir>/dist/cli.js" services --json` | `status: ok`, 13 services |
| Credentials present | `node "<skill-dir>/dist/cli.js" auth-status --json` | `status: ok` (content may be empty) |
| Client JSON | path from the user | a `client_secret_*.json` with an `installed` block |

A missing `config.json` and no environment variables produce `MISSING_CONFIG`; that is the signal to run `setup`.

## Sequence

### 1. Import the OAuth client

```bash
node "<skill-dir>/dist/cli.js" setup --client-secret-file "<client_secret.json>" --json
```

Expect `content.clientType: "installed"`. Exit 1 with `CLIENT_TYPE` means the user downloaded a Web application client; ask for a Desktop app client. Exit 1 with `CONFIG_EXISTS` means credentials are already installed; add `--force` only if the user asked to replace them.

### 2. Launch the consent window

```bash
node "<skill-dir>/dist/cli.js" auth --window --read-only --json
```

`--read-only` keeps the request to read scopes. Add `--services gmail,drive` to narrow it further; drop `--read-only` only when the user explicitly wants mutations.

Expect exit 0 and `{"launched": true, "command": "...", "pid": ...}`. Then tell the user, in their language:

> A terminal window and Google's consent page should open. Approve the requested access there; this agent cannot click for you.

If exit 1 with `LAUNCH_FAILED`, no terminal could be opened. Print the `command` value from the error, or have the user run the same command in their own terminal.

### 3. Wait for the grant

Poll every 3 seconds, up to 5 minutes:

```bash
node "<skill-dir>/dist/cli.js" auth-status --json
```

Success is `content` listing the requested service with the scopes you asked for. Keep the poll result to a one-line summary; never print token values.

If nothing appears after the timeout, ask the user what the browser showed. Do not relaunch silently: one relaunch is acceptable only after the user confirms the window is gone or was closed by mistake.

### 4. Verify capability

```bash
node "<skill-dir>/dist/cli.js" doctor --json
```

Exit 0 means every probed service answered. Exit 1 means at least one did not; map each result:

| Status | What to tell the user |
| --- | --- |
| `enabled` | nothing |
| `disabled` | open the `enableUrl`, enable the API, wait a few minutes, re-run `doctor` |
| `unauthorized` | the service was not part of the consent; re-run `auth --window --services <service>` |
| `forbidden` | the API is on but the account or policy refuses; check product eligibility or admin grant |
| `error` | show the message |

`skipped` lists docs, sheets, slides, forms, and appscript; they need a real document ID before a probe is meaningful.

### 5. Stop before mutations

Onboarding ends at read capability. Do not call `mutate` to "verify" anything. The first mutation stays a separate, explicitly confirmed step.

## Hard rules for the agent

- Never ask for a Google password, never type into the consent page, never take over the browser.
- Never print `config.json`, token files, or a client secret. `auth-status` is safe by design.
- Never retry `auth` in a loop; each launch opens a real window and a real consent page.
- Never run `logout` as part of setup. It deletes grants the user may already rely on.
- Report what you verified: which services answered, which need API enablement, and what the user still has to click.

## Failure matrix

| Symptom | Cause | Handling |
| --- | --- | --- |
| `TERMINAL_REQUIRED` | `auth` without `--window` from a non-interactive shell | add `--window` |
| `LAUNCH_FAILED` | no terminal emulator available | user runs the printed command |
| Timeout with no grants | consent closed, blocked, or wrong account | ask the user; relaunch once only on request |
| `Error 403: org_internal` in the browser | the signed-in account is outside the project's parent organization, or the consent screen is Internal | use an External project with that account as a test user; avoid converting a project another product shares |
| "Access blocked: … has not completed verification" | account is not a test user | add it under Audience → Test users |
| `PERMISSION_DENIED … has not been used in project` | product API is off | open the `enableUrl` from `doctor` |
| Grant disappears after seven days | app still in Testing | re-run `auth`, or publish the app |
| `MISSING_CONFIG` | no `config.json` and no env vars | run `setup` |
| `CLIENT_TYPE` | Web application client downloaded | create a Desktop app client |

## What stays human

The Cloud Console pass cannot be delegated to an agent, and Google gives no API for it since the IAP OAuth Admin API shut down on 19 March 2026:

1. Create the project (optionally `gcloud projects create`).
2. Enable product APIs (optionally `gcloud services enable`).
3. Consent screen: Internal or External, plus test users.
4. Create the Desktop app client and download its JSON.

Hand this list to the user with the console links from [public setup](public-setup.md). Resume the sequence at step 1 once they have the JSON.

For the exact wording, links, scope list, and branch handling while guiding the user through those four steps, use [console setup guide](console-setup-guide.md).

## Done criteria

- `auth-status --json` lists the target services with the expected scopes.
- `doctor --json` reports `enabled` for those services, or the user has an enable URL for each `disabled` one.
- No mutation was executed, and no secret or token value was printed.
