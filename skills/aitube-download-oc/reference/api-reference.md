# AI Tube API Reference

Base URL: `http://localhost:6001` (or configured server URL)

Authentication:
- Most endpoints: session cookie (web UI) or `X-API-Key`
- Agent endpoint (`/api/agent/download`): use `X-API-Key`

---

## Agent download

### `POST /api/agent/download`

Queue one video/audio task (single-item path).

Request body:

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `url` | string | ✅ | — | Video or playlist URL |
| `format` | `"mp4" \| "mp3"` | ❌ | `"mp4"` | Output format |
| `title` | string | ❌ | `"Agent Download"` | Queue display name |
| `downloadCollection` | boolean | ❌ | `false` | Optional legacy playlist behavior (mp3 only); prefer dedicated playlist endpoints below |

Single item response example:

```json
{
  "success": true,
  "downloadId": "1718000000000",
  "status": "queued",
  "message": "Download queued as MP3"
}
```

Playlist response example:

```json
{
  "success": true,
  "status": "queued",
  "message": "Queued 12 tracks as MP3",
  "totalTracks": 12,
  "downloadIds": ["1718000000001_abc12", "1718000000002_def34"]
}
```

Notes:
- `downloadCollection: true` is only supported for MP3 on this endpoint.
- If `downloadCollection` is omitted/false, playlist URL behaves like single-item download.

---

## Download status

### `GET /api/download-status`

Returns active + queued downloads.

```json
{
  "activeDownloads": [
    {
      "id": "1718000000000",
      "title": "My Video",
      "progress": 42,
      "speed": "1.2 MiB/s"
    }
  ],
  "queuedDownloads": [
    {
      "id": "1718000000001",
      "title": "Next Video"
    }
  ]
}
```

---

## History + queue management

- `GET /api/downloads/history` — list completed/failed tasks
- `DELETE /api/downloads/history/:id` — remove one history item
- `DELETE /api/downloads/history` — clear history
- `POST /api/downloads/cancel/:id` — cancel active task
- `DELETE /api/downloads/queue/:id` — remove queued task
- `DELETE /api/downloads/queue` — clear queue

---

## Playlist utilities

- `GET /api/playlist-entries?url=<playlistUrl>` — list playlist entries
- `GET /api/check-playlist?url=<url>` — detect whether URL is a valid/enumerable playlist

---

## Playlist batch endpoints (mp3 + mp4)

### `POST /api/download/playlist-mp3`
Queue selected/all playlist entries as MP3.

### `POST /api/download/playlist-mp4`
Queue selected/all playlist entries as MP4.

Typical request body:

| Field | Type | Description |
|---|---|---|
| `playlistUrl` | string | Download all entries in the playlist |
| `entries` | `[{url,title}]` | Optional selected entries |
| `collectionName` | string | Optional collection label |

---

## Local token files for this OpenClaw skill

- `~/.openclaw/workspace/skills/aitube-download-oc/tokens/aitube-url`
- `~/.openclaw/workspace/skills/aitube-download-oc/tokens/aitube-token`
