# Changelog

## Unreleased

### Added

- `setup` installs a downloaded Desktop app client into an owner-only `config.json`, so no environment variables are required afterwards.
- `doctor` probes each service and reports `enabled`, `disabled` with an enable URL, `unauthorized`, `forbidden`, or `error`.
- `auth --window` opens a terminal for the consent flow when the caller has no TTY, so an agent can start authorization and then poll `auth-status`.
- `references/public-setup.md` covers the External consent screen, the test-user list, and verification limits for accounts outside one organization.
- `references/agent-playbook.md` gives the end-to-end install, authorize, and verify sequence with its failure matrix.
- `references/console-setup-guide.md` walks a user through the four Console steps, with the scope list, hand-off checks, and consent branches.

## 0.1.0 - 2026-10-28

### Added

- Local TypeScript skill for Kimi Code, Claude Code, and OpenPave on Node 24.22.1.
- Ordinary Google REST API operations for Gmail, Drive, Calendar, People, Docs, Sheets, Slides, Chat, Classroom, Tasks, Forms, and Apps Script.
- Direct Google OAuth with PKCE, local token refresh, per-service Read/Write scope selection, and secure token storage.
- Static just-in-time tool schemas, strict argument validation, read/mutation separation, and bounded JSON and streamed binary results.
- Local federated search across Gmail, Drive, Calendar, and Chat with per-product failure isolation.
- Windows, macOS, and Linux CI with a live ordinary Gmail API acceptance path.

### Hardened

- Metadata-only Drive mutations never upload an empty media part.
- Calendar responses preserve all other attendees.
- Universal-only authorization creates the grants needed by federated product searches.
- Unknown mutation outcomes return exit code 3 and are never retried automatically.
