# Console setup guide for agents

Use this when the user has no OAuth client yet. The agent runs the commands and keeps the conversation short; the user does the four Console clicks Google requires. Google offers no API for creating a brand or a client — the IAP OAuth Admin API shut down on 19 March 2026 — so these four steps cannot be delegated.

Pair this with [agent playbook](agent-playbook.md), which covers what the agent runs after the JSON exists.

## Ask one question first

> Is the Google account you want to use a personal Gmail account, or an account inside a company or school Workspace?

| Answer | Audience to configure |
| --- | --- |
| Personal Gmail | **External**, Testing, that account as a test user |
| Workspace account, only you will use it | **Internal** is fine and skips verification entirely |
| Workspace account, plus people outside the org | **External**, Testing, every account as a test user |
| Unsure, or the org already owns a shared project for another app | Create a **new** project. Do not convert a shared one |

If the user is not an administrator of the Workspace org, Internal may be the only option they can configure; External still works, but their admin may need to allow the app later.

## Step 1 — Project

Give the link: <https://console.cloud.google.com/projectcreate>

Or, when `gcloud` is installed and authenticated (`gcloud auth list`), run it for them:

```bash
gcloud projects create workspace-skill-<suffix> --name="Workspace skill"
```

Then ask: **"What is the project ID?"** Record it; every later link needs it.

## Step 2 — Enable the product APIs

Fastest path, if `gcloud` is available:

```bash
gcloud services enable gmail.googleapis.com drive.googleapis.com calendar-json.googleapis.com \
  people.googleapis.com docs.googleapis.com sheets.googleapis.com slides.googleapis.com \
  chat.googleapis.com classroom.googleapis.com tasks.googleapis.com forms.googleapis.com \
  script.googleapis.com --project=<PROJECT_ID>
```

Otherwise give <https://console.cloud.google.com/apis/library?project=PROJECT_ID> and the list of APIs to enable: Gmail, Drive, Calendar, People, Docs, Sheets, Slides, Chat, Classroom, Tasks, Forms, Apps Script.

These product APIs need no billing account. Do not promise that Chat or Classroom will work: eligibility depends on the account's edition.

## Step 3 — Audience

Link: <https://console.cloud.google.com/auth/audience?project=PROJECT_ID> (older consoles show this as **APIs & Services → OAuth consent screen**).

Tell the user, in their language:

1. **User type**: External, or Internal if only their own org account will sign in.
2. **Publishing status**: Testing.
3. **Test users**: add every Google account that will authorize, starting with theirs.

Then **Data access → Add or remove scopes**. Minimum read-only set for this skill:

```text
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/calendar.events.readonly
https://www.googleapis.com/auth/spreadsheets.readonly
https://www.googleapis.com/auth/documents.readonly
https://www.googleapis.com/auth/presentations.readonly
https://www.googleapis.com/auth/tasks.readonly
https://www.googleapis.com/auth/contacts.readonly
https://www.googleapis.com/auth/chat.spaces.readonly
https://www.googleapis.com/auth/chat.messages.readonly
```

Add write scopes only when the user asked for mutations, and say which ones.

## Step 4 — Desktop client

Link: <https://console.cloud.google.com/auth/clients?project=PROJECT_ID> (older consoles: **APIs & Services → Credentials**).

1. **Create client** → Application type **Desktop app**.
2. Name it anything, for example `workspace-skill`.
3. **Create**, then **Download JSON**.

Tell the user:

> Keep the downloaded file. Don't paste its contents anywhere — just give me the file path.

If they can only pick **Web application**, they are on the wrong screen or type: the loopback flow this skill uses needs a Desktop app client.

## Step 5 — Hand back to the agent

Ask for the path only, then run:

```bash
node "<skill-dir>/dist/cli.js" setup --client-secret-file "<path>" --json
```

Check the result:

| Output | Meaning | Next |
| --- | --- | --- |
| `clientType: "installed"` | Desktop client accepted | continue to Step 6 |
| `CLIENT_TYPE` | A Web application client was downloaded | ask for a Desktop app client |
| `CONFIG_EXISTS` | Credentials already installed | ask before adding `--force` |
| `INVALID_CLIENT_FILE` | Not the downloaded JSON, or empty | ask them to re-download |
| `ENOENT` | Wrong path | ask them to copy the path from the file explorer |

`setup` prints the client ID, which is public. It never prints the secret.

## Step 6 — Consent

```bash
node "<skill-dir>/dist/cli.js" auth --window --read-only --json
```

Then say:

> A terminal window and Google's consent page should open. Pick the account you added as a test user, accept the "Google hasn't verified this app" warning with **Continue**, review the scopes, then **Allow**.

Poll every 3 seconds, up to 5 minutes:

```bash
node "<skill-dir>/dist/cli.js" auth-status --json
```

Stop when the granted scopes appear. If the window closes with nothing, ask what the browser showed and consult the branch table below.

## Step 7 — Verify and report

```bash
node "<skill-dir>/dist/cli.js" doctor --json
```

Report one line per service: `enabled`, or `disabled` with the enable URL, or `unauthorized`/`forbidden`/`error` with the action. Onboarding ends here; do not run a mutation to "prove" it works.

## Branches the user will actually hit

| What the user sees | What it means | What the agent does |
| --- | --- | --- |
| `Access blocked: "<brand>" can only be used within its organization` | Account is outside the project's parent org, or the screen is Internal | Add the account as a test user on an External project; do not convert a project shared with another app |
| "Google hasn't verified this app" | Normal while in Testing | Tell them to click **Continue** |
| "Access blocked: … has not completed the Google verification process" | Account is not on the test-user list | Add it under Audience → Test users |
| "This app is blocked" from a Workspace admin | Org policy blocks third-party apps | Ask their admin to allow the client ID under Admin console → Security → API controls |
| `redirect_uri_mismatch` | Callback URI not registered | Register `http://localhost:8080/callback`, or use `--redirect-uri` consistently |
| Callback never arrives, port busy | Something else holds 8080 | Free it, or register and use `http://localhost:8081/callback` |
| `PERMISSION_DENIED … has not been used in project` | Product API still off | Open the `enableUrl` from `doctor` |
| Grant gone after seven days | Testing mode | Re-run `auth`, or publish the app |

## Never ask the user for

- Their Google password or a 2FA code.
- The contents of `client_secret*.json`, `config.json`, or any token file.
- Permission to paste a secret into chat.

Asking for the file **path** is fine; `setup` reads the file locally.

## Done criteria

- `setup` reported `clientType: "installed"`.
- `auth-status --json` lists the target services with the scopes requested.
- `doctor --json` is `enabled` for those services, or every `disabled` one has an enable URL the user was given.
- No secret was printed, and no mutation was executed.
