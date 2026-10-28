# Changelog

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
