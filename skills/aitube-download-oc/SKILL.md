---
name: aitube-download-oc
description: Download YouTube/web video or audio through AI Tube Server API from OpenClaw. Use when users ask to download a single link, convert to MP3/MP4, queue playlist downloads, or check download progress/history.
---

# AI Tube Download (OpenClaw)

Use this skill to queue downloads on the owner’s AI Tube server via API.

## Config files

Read config from this skill folder:

- `tokens/aitube-url` — server base URL (for example `http://localhost:6001`)
- `tokens/aitube-token` — API key

If either value is missing, ask user to provide it and save to the corresponding file.
Always trim whitespace and remove trailing slash from URL.

## Request handling flow

1. Extract download URL from user message.
2. Infer format:
   - `mp3` for "audio/music/mp3"
   - `mp4` for "video/mp4"
   - default to `mp3` when unspecified
3. Detect playlist/collection by calling `GET /api/check-playlist?url=...` first.
   - If API check fails, fallback to `list=` URL heuristic.
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
| `/api/agent/download` | POST | Queue single download (mp3/mp4) |
| `/api/download-status` | GET | Show active + queued downloads |
| `/api/downloads/history` | GET | Completed/failed history |
| `/api/playlist-entries` | GET | Enumerate playlist items |
| `/api/download/playlist-mp3` | POST | Queue selected/all playlist tracks as MP3 (web UI path) |
| `/api/download/playlist-mp4` | POST | Queue selected/all playlist videos as MP4 (web UI path) |

For full schema and examples, read: `reference/api-reference.md`.
