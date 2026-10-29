# Public setup for any Google account

This path works for a personal Gmail account, an account in someone else's Workspace organization, and accounts outside the organization that owns the Cloud project. The credential model is bring-your-own OAuth client: each user creates one Cloud project and one Desktop app client, then the skill stores it locally. No broker, no shared secret, no hosted token service.

`references/setup.md` remains the short reference. This file covers the public path and the Google-side limits that decide whether "anyone" can sign in. When an agent is guiding a user through the Console, [console setup guide](console-setup-guide.md) has the same steps as a turn-by-turn script.

## Two setups, one difference that matters

| Who signs in | Consent screen user type | Google verification | Refresh grant |
| --- | --- | --- | --- |
| Only accounts in the Workspace org that owns the project | Internal | Not needed | Normal lifetime |
| Anyone, up to the test-user list | External, Testing | Not needed | Expires after 7 days |
| Anyone with a Google account | External, Published | Required, plus a security assessment for restricted scopes | Normal lifetime |

If outside accounts are rejected with `Error 403: org_internal`, the signed-in account is outside the Cloud project's parent organization — which is exactly what an Internal consent screen enforces. That is the single most common "it only works in the organization" cause.

## What Google will not let a script do

Project creation and API enablement are scriptable with `gcloud`. The consent screen and the Desktop client are not, because Google retired the only programmatic path for them.

The IAP OAuth Admin API was deprecated on 22 January 2025, closed to new projects on 19 January 2026, and shut down on 19 March 2026. The retirement covers the OAuth clients API, the Brands API, and the `gcloud iap oauth-brands` and `gcloud iap oauth-clients` command groups on both alpha and beta tracks. There is no replacement API for minting brands or clients.

What still works:

- **Cloud Console** creates and manages consent screen brands and OAuth clients, which is the path this guide uses.
- **Terraform** can apply credentials that already exist (`google_iap_settings`), and migration guidance shows how to clear old client fields. It is not a way to create a client.
- **Secret Manager** stores a client secret that was created in the Console.

Sources: [IAP deprecations](https://cloud.google.com/iap/docs/deprecations), [Migrate from the IAP OAuth Admin API](https://cloud.google.com/iap/docs/deprecations/migrate-oauth-client), [Use custom OAuth clients with IAP](https://cloud.google.com/iap/docs/custom-oauth-configuration).

Plan for one console pass. Everything after it is automated by `setup`, `auth`, and `doctor`.

## Public path, step by step

### 1. Create a project

Console: <https://console.cloud.google.com/projectcreate>

Or with an authenticated `gcloud`:

```bash
gcloud projects create workspace-skill-<random-suffix> --name="Workspace skill"
gcloud config set project workspace-skill-<random-suffix>
```

The project ID must be globally unique.

### 2. Enable the product APIs you need

```bash
gcloud services enable \
  gmail.googleapis.com drive.googleapis.com calendar-json.googleapis.com \
  people.googleapis.com docs.googleapis.com sheets.googleapis.com \
  slides.googleapis.com chat.googleapis.com classroom.googleapis.com \
  tasks.googleapis.com forms.googleapis.com script.googleapis.com
```

Without `gcloud`, enable the same APIs one by one under **APIs & Services → Library** in the project. A service whose API is off returns `PERMISSION_DENIED` with an enable URL, and `doctor` prints that URL for you.

These ordinary product APIs do not need billing enabled. Google Workspace product eligibility still applies to Chat and Classroom, and directory search still needs an administrator grant.

### 3. Configure the consent screen

<https://console.cloud.google.com/apis/credentials/consent?project=PROJECT_ID>

- **User type: External.** Internal is what limits sign-in to one organization.
- **Publishing status: Testing** while you evaluate. Add every Google account that will sign in as a test user; accounts that are not listed cannot authorize the app.
- **Scopes:** add what you intend to request. `gmail.readonly`, `gmail.modify`, `gmail.send`, and `drive.readonly` are restricted; Calendar, Chat, Classroom, Docs, Sheets, Slides, Tasks, Forms, and Apps Script scopes are sensitive. The Console labels each scope as you add it.
- **App name, support email, developer contact:** fill them in even in Testing; publishing later needs them anyway.

Testing mode is fine for personal use and evaluation. Its two costs are the test-user list and refresh grants that expire after seven days.

#### If the project is already Internal

Your console block page reads `Access blocked: "<brand>" can only be used within its organization`. Google shows `org_internal` when the signed-in account is outside the Cloud project's parent organization, and no client setting changes that.

Two ways forward, and they are not equivalent:

- **Safer: use a separate project.** Create a new project, repeat steps 1 and 2, and set *its* consent screen to External. A project shared with another product should not be converted: the audience rule applies to every OAuth client in it, and the block page names the shared brand. This keeps the org app Internal and untouched.
- **Convert the existing project.** Switch User type to External, then add every account that will sign in as a test user. The console presents Internal → External as a one-way change, so read the prompt before confirming, and expect the seven-day test-user grant while the app stays in Testing.

Either way the account that hit the block must be on the test-user list, unless the app is published and verified.

### 4. Create a Desktop app client

<https://console.cloud.google.com/apis/credentials?project=PROJECT_ID> → **Create credentials → OAuth client ID → Desktop app**.

Register this loopback redirect when the console asks for one:

```text
http://localhost:8080/callback
```

Desktop clients accept loopback redirects, so the port can move later with `--redirect-uri` and a matching registration. Download the JSON. Do not commit it.

### 5. Install the credential into the skill

```bash
node "<skill-dir>/dist/cli.js" setup --client-secret-file "<downloads>/client_secret_<project>.apps.googleusercontent.com.json"
```

`setup` validates that the file is an `installed` (Desktop) client, rejects Web application clients with `CLIENT_TYPE`, and writes `<credential-home>/config.json` owner-only: POSIX mode 0600, Windows ACL restricted to the current account. The credential home is `WORKSPACE_API_HOME` when set, otherwise `~/.google-workspace-api`.

After this step, no environment variables are needed. Explicit `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_CLIENT_SECRET_FILE`, and `GOOGLE_OAUTH_REDIRECT_URI` still win when present, which keeps existing org setups working.

Use `--force` to replace an existing configuration, and `--redirect-uri` when you registered a different loopback URI:

```bash
node "<skill-dir>/dist/cli.js" setup --client-secret-file "<json>" --redirect-uri http://127.0.0.1:9000/callback --force
```

### 6. Authorize and verify

```bash
node "<skill-dir>/dist/cli.js" auth --read-only
node "<skill-dir>/dist/cli.js" doctor --json
```

`auth` must run in a real terminal because Google's consent page opens in the browser. `--read-only` and `--services gmail,drive` keep the requested scopes small; add write scopes only when you need mutations.

`doctor` probes each service with a bounded read and reports one of:

| Status | Meaning | Fix |
| --- | --- | --- |
| `enabled` | The API answered | None |
| `disabled` | API off in this project, `enableUrl` included | Enable it, wait a few minutes |
| `unauthorized` | No grant for that service | Run `auth --services <service>` |
| `forbidden` | API on, account or policy refuses | Check product eligibility or admin grant |
| `error` | Anything else, message included | Read the message |

Docs, Sheets, Slides, Forms, and Apps Script are listed as skipped because they need a real document ID; the other services cover the enablement question.

## Publishing to users outside the test list

Publishing is what removes the test-user list and the seven-day refresh expiry, and it is a verification project rather than a checkbox:

1. Branding must verify first: app name, support email, homepage, privacy policy, and authorized domains on a domain you control.
2. Data-access verification follows, per scope. Sensitive scopes need a review; restricted scopes need the same review plus a security assessment, and restricted-scope apps re-verify annually.
3. Until verification passes, external accounts outside the test list are blocked, and restricted scopes cannot be granted to them at all.

Sources: [OAuth app verification](https://support.google.com/cloud/answer/9110914) and [OAuth app branding](https://support.google.com/cloud/answer/10311615).

Practical consequence: a publicly distributed skill should stay on bring-your-own-client. Users who only need their own mailbox never touch verification, and the project owner keeps their own quota and audit trail.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Error 403: org_internal` for an outside account | Consent screen user type is Internal, or the account is outside the project's parent organization | External + test user, or a separate External project (see *If the project is already Internal*) |
| "Access blocked: … has not completed the Google verification process" | External app, account not a test user, or unverified with restricted scopes | Add the account as a test user, or complete verification |
| `PERMISSION_DENIED … has not been used in project` | The product API is off | Use the URL in the error, or run `doctor` |
| Authorization works, then fails a week later | Testing-mode refresh grant expired | Re-run `auth`, or publish the app |
| `redirect_uri_mismatch` | Registered loopback differs from the one used | Register `http://localhost:8080/callback`, or pass `--redirect-uri` |
| `CLIENT_TYPE` from `setup` | A Web application client was downloaded | Create a Desktop app client instead |
| `MISSING_CONFIG` after install | No `config.json` and no environment variables | Run `setup` |

## Credential handling

- The downloaded client JSON stays on disk only long enough for `setup` to read it. The stored `config.json` is owner-only, and tokens live under `<credential-home>/tokens`.
- Never commit a client JSON, `config.json`, or token files, and never paste a client secret into a chat.
- `logout` deletes local grants for one service, or all of them when no service is named.
