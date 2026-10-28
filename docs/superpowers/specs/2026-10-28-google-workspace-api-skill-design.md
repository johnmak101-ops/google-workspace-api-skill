# Google Workspace API Skill Design

## Intent

Provide a general local skill for people who want Google Workspace access from Kimi Code, Claude Code, or OpenPave without operating a broker or trusting a third-party server. Ordinary Google APIs avoid the Developer Preview eligibility gate of Google Workspace MCP.

## Trust boundary

The AI host invokes a local Node 24.22.1 CLI. The CLI obtains Google OAuth tokens through a Desktop app OAuth client and stores them only on the user's machine. Workspace data travels only between the local CLI and allowlisted Google REST API origins. There is no membership service, hosted connector, MCP server, or intermediate token service.

## User experience

After one-time Google Cloud and OAuth setup, `auth` opens Google's consent UI directly. `--services` limits requested products and `--read-only` omits write scopes. Google decides how consent and scope checkboxes appear. The CLI records actual granted scopes and refreshes tokens locally. Later read and confirmed write commands do not require a browser while the refresh grant remains valid.

## Operation model

A static catalog defines each supported Google REST operation, its OAuth scopes, friendly-to-wire argument mapping, JSON/multipart body shape, and read-only classification. Catalog metadata is the sole mutation-classification authority. Tool lists contain only names and descriptions; a full schema loads only for one explicitly requested tool.

The initial service set is Gmail, Drive, Calendar, People, Docs, Sheets, Slides, Chat, Classroom, Tasks, Forms, Apps Script, and local federated search. Apps Script execution is limited to same-project API-executable deployments. Chat and Classroom depend on the account's product eligibility. Directory search requires an administrator grant.

Universal search is local aggregation over bounded Gmail, Drive, Calendar, and Chat reads. It is not Google Universal Search MCP. Chat search lists a bounded number of spaces and messages and filters locally because Chat has no general global message-query endpoint.

## Safety

Only declared arguments reach a request. The client never accepts a raw URL or alternate origin. Read calls may refresh once after a confirmed 401; mutations are never replayed. Ambiguous post-dispatch outcomes are reported as unknown rather than retried. Arguments, responses, and errors are bounded. Binary downloads stream to protected result files with a hard cap. Workspace content is untrusted data, not instructions.

## Non-goals for v0.1.0

- No broker or multi-user hosted token vault.
- No third-party or official remote MCP endpoints.
- No public-web Custom Search integration.
- No arbitrary REST proxy or claim of complete coverage of every Google API.
- No guarantee that a Google account supports every Workspace product.

## Verification

Unit and local fake-server tests cover OAuth, grants, scopes, request construction, REST behavior, mutation outcomes, output bounds, and host manifests. CI runs Node 24.22.1 on Windows, macOS, and Linux. The release also requires a bounded live read through the ordinary Gmail API without using MCP or Developer Preview access.
