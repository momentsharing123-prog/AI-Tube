---
name: aitube-download
description: Download YouTube/web video or audio through AI Tube Server API in Claude Code. Use when users ask to download a single link, convert to MP3/MP4, queue playlist downloads, or check download progress/history.
---

# AI Tube Download (Claude Code)

Use this skill to queue downloads on the owner’s AI Tube server via API.

## Config files

Read config from this skill folder:

- `token/aitube-url` — server base URL (for example `http://localhost:6001`)
- `token/aitube-token` — API key

If either value is missing, ask user to provide it and save to the corresponding file.
Always trim whitespace and remove trailing slash from URL.

To verify the API key is valid, POST a dummy URL to `/api/agent/download` and check the response status:
- `400` (bad URL) → key is correct, server rejected the URL as expected → proceed
- `403` (forbidden) → key is wrong → ask user to re-check

Do NOT use `GET /api/download-status` for auth verification — it returns 200 even with a wrong key when login is not required on the server.

## Request handling flow

1. Extract download URL from user message.
2. Infer format:
   - `mp3` for "audio/music/mp3"
   - `mp4` for "video/mp4"
   - default to `mp3` when unspecified
3. Detect playlist/collection by calling `GET /api/detect-url?url=...` first.
   - check `isPlaylist`: `false` or `true`
4. Routing rules:
   - If **not playlist** (`isPlaylist: false`): download directly via `POST /api/agent/download`.
   - If **playlist** (`isPlaylist: true`): ask single item vs full playlist.
5. Full playlist submit path:
   - mp3: `POST /api/download/playlist-mp3`
   - mp4: `POST /api/download/playlist-mp4`
6. Use `X-API-Key` header and summarize result clearly.

## Playlist rules

- If `downloadCollection: true`, route to playlist batch endpoints:
  - MP3 → `/api/download/playlist-mp3`
  - MP4 → `/api/download/playlist-mp4`
- If playlist mode is not confirmed, default to single item (`downloadCollection: false`) via `/api/agent/download`.

## Status checks

When user asks "done?", "progress?", or similar, call `GET /api/download-status`.
Summarize:

- Active downloads: title + progress + speed (if available)
- Queued count
- If both empty: all downloads complete

## API quick reference

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/detect-url` | GET | Check if URL is a playlist/collection and get metadata |
| `/api/agent/download` | POST | Queue single download (mp3/mp4) |
| `/api/download-status` | GET | Show active + queued downloads |
| `/api/downloads/history` | GET | Completed/failed history |
| `/api/playlist-entries` | GET | Enumerate playlist items |
| `/api/download/playlist-mp3` | POST | Queue selected/all playlist tracks as MP3 (web UI path) |
| `/api/download/playlist-mp4` | POST | Queue selected/all playlist videos as MP4 (web UI path) |

For full schema and examples, read: `reference/api-reference.md`.

## Claude Code execution notes

When executing API calls inside Claude Code, use available shell/runtime tools in the current environment (for example curl, PowerShell, or Python), but keep the workflow above as the source of truth.
Avoid hardcoding OS-specific command blocks in this SKILL.md unless explicitly requested.
