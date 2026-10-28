# OAuth and installation guide

Complete this setup once. Everyday authentication is one `auth` command followed by Google's consent screen.

## 1. Install Node

Install Node 24.22.1 on Windows, macOS, or Linux and verify `node --version`. OpenPave can run its own process on another version, but the skill child process must use this Node version. Set `PAVE_NODE_BIN` when necessary.

## 2. Configure one Google Cloud project

Create or reuse one Google Cloud project. Enable the ordinary product APIs for the services you need, such as Gmail API, Drive API, Calendar API, People API, Docs API, Sheets API, Slides API, Chat API, Classroom API, Tasks API, Forms API, and Apps Script API. Product MCP APIs are not used.

Configure the OAuth consent screen and scopes. For an external app in Testing, add your Google account as a test user. Refresh tokens in Testing can expire after seven days. Publishing an app with sensitive or restricted scopes can require Google verification.

Create one **Desktop app** OAuth client. Register this exact loopback redirect URI when the console requests it:

```text
http://localhost:8080/callback
```

For Chat, complete Google's Chat app configuration. Directory search requires an administrator grant. Apps Script function execution requires a same-project deployment enabled for API execution. Product eligibility varies for Chat and Classroom accounts.

## 3. Configure local credentials

Set `GOOGLE_OAUTH_CLIENT_ID`. Store the client secret in an owner-only file outside this repository and set `GOOGLE_OAUTH_CLIENT_SECRET_FILE` to its path. The file can contain only the secret or the downloaded client JSON. `GOOGLE_OAUTH_CLIENT_SECRET` also works on hosts that pass it to child processes; OpenPave users should use the file option.

Optional settings:

- `GOOGLE_OAUTH_REDIRECT_URI` selects another preregistered loopback URI with an explicit port and path.
- `WORKSPACE_API_HOME` selects the credential and result directory. The default is `~/.google-workspace-api`.
- `auth --services gmail,drive` limits the requested products.
- `auth --read-only` omits write scopes.
- `auth --directory-admin` adds the administrator-only directory scope for People directory search.
- `auth --universal-products gmail,drive,calendar,chat` limits federated-search scopes.

Never paste secrets into chat or commit them.

## 4. Install the skill

Use this repository as the skill directory. It includes `dist/cli.js`, so no build or package installation is required after cloning.

- Kimi Code: copy or link the directory to `~/.agents/skills/google-workspace-api`.
- Claude Code: copy or link the directory to `~/.claude/skills/google-workspace-api`.
- OpenPave: run `pave install .` from this repository and invoke the installed entrypoint with Node 24.22.1.

## 5. Connect Google

Run:

```bash
node "<skill-dir>/dist/cli.js" auth
```

The command opens Google's consent UI directly, without a local selection page. Google controls whether scopes have checkboxes or another presentation. Without flags, Read and Write scopes are requested for all registered services except read-only services. Use `--services` or `--read-only` to restrict the request.

Google may grant only part of the request. The CLI stores actual granted scopes and reports partial authorization. Refresh-token expiry or revocation requires another `auth` run.
