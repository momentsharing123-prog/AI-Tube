# AI Tube Unified API Reference (Agent-First)

Base URL: `http://localhost:6001` (or your configured server URL)

## Authentication

Use one of these headers:

- `X-API-Key: <token>` (recommended for agents)
- `Authorization: ApiKey <token>` (also accepted by many endpoints)

Notes:
- `POST /api/agent/download` is agent-focused and should use `X-API-Key`.
- Do **not** use `GET /api/download-status` to validate token correctness (may return 200 in some server modes).
- Reliable auth check: call `POST /api/agent/download` with an intentionally bad URL:
  - `400` => token is valid, URL is invalid (expected)
  - `403` => token invalid

---

## Recommended agent flow

1. Detect URL type via `GET /api/detect-url?url=...`
2. If `isPlaylist=false` → call `POST /api/agent/download`
3. If `isPlaylist=true`:
   - single item → `POST /api/agent/download`
   - full playlist MP3 → `POST /api/download/playlist-mp3`
   - full playlist MP4 → `POST /api/download/playlist-mp4`
4. Monitor with `GET /api/download-status`

---

## 1) URL Detection

### `GET /api/detect-url`
Universal detector for single video vs playlist (YouTube, YouTube Music, Bilibili, Twitch, etc.).

**Query parameters**

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `url` | string | ✅ | Any supported video/playlist URL |

**Sample response (single video)**

```json
{
  "isPlaylist": false,
  "title": "Rick Astley - Never Gonna Give You Up",
  "suggestedApi": "POST /api/agent/download",
  "suggestedBody": { "url": "https://...", "format": "mp3" }
}
```

**Sample response (playlist)**

```json
{
  "isPlaylist": true,
  "title": "My Playlist",
  "videoCount": 24,
  "suggestedApi": "POST /api/download/playlist-mp3  or  POST /api/download/playlist-mp4",
  "suggestedBody": { "playlistUrl": "https://...", "collectionName": "My Playlist" }
}
```

---

## 2) Agent Download (single-item path)

### `POST /api/agent/download`
Queue one item (video/audio). Can also accept playlist URL, but defaults to single-item behavior unless playlist mode is explicitly enabled.

**Body parameters**

| Field | Type | Required | Default | Description |
|---|---|---:|---|---|
| `url` | string | ✅ | — | Video or playlist URL |
| `format` | `"mp4" \| "mp3"` | ❌ | `"mp4"` | Output format |
| `title` | string | ❌ | `"Agent Download"` | Queue display title |
| `downloadCollection` | boolean | ❌ | `false` | Playlist batch mode on this endpoint (MP3 only) |

**Sample response (single item)**

```json
{
  "success": true,
  "downloadId": "1718000000000",
  "status": "queued",
  "message": "Download queued as MP3"
}
```

**Sample response (playlist collection on this endpoint)**

```json
{
  "success": true,
  "status": "queued",
  "message": "Queued 12 tracks as MP3",
  "totalTracks": 12,
  "downloadIds": ["1718000000001_abc12", "1718000000002_def34"]
}
```

**Important**
- `downloadCollection: true` is supported only for MP3 here.
- For MP4 playlists, use `POST /api/download/playlist-mp4`.

---

## 3) Playlist Batch Downloads

### `POST /api/download/playlist-mp3`
Queue selected/all playlist entries as MP3.

### `POST /api/download/playlist-mp4`
Queue selected/all playlist entries as MP4.

**Body parameters** (both endpoints)

| Field | Type | Required | Description |
|---|---|---:|---|
| `playlistUrl` | string | Conditional | Playlist URL for "download all" mode |
| `entries` | array of `{url, title}` | Conditional | Explicit selected entries; if present, takes priority |
| `collectionName` | string | ❌ | Optional grouping label |

(`playlistUrl` or `entries` should be provided.)

**Sample response (`playlist-mp3`)**

```json
{
  "success": true,
  "status": "queued",
  "message": "Queued 8 tracks as MP3",
  "totalTracks": 8,
  "collectionId": "1718000000000",
  "downloadIds": ["..."]
}
```

**Sample response (`playlist-mp4`)**

```json
{
  "success": true,
  "status": "queued",
  "message": "Queued 8 videos as MP4",
  "totalVideos": 8,
  "collectionId": "1718000000000",
  "downloadIds": ["..."]
}
```

---

## 4) Download Status

### `GET /api/download-status`
Returns currently active and queued tasks.

**Sample response**

```json
{
  "activeDownloads": [
    {
      "id": "1718000000000",
      "title": "My Video",
      "url": "https://youtu.be/...",
      "progress": 42,
      "speed": "1.2 MiB/s",
      "totalSize": "15.3 MiB",
      "startedAt": "2024-06-10T12:00:00.000Z"
    }
  ],
  "queuedDownloads": [
    {
      "id": "1718000000001",
      "title": "Next Video",
      "url": "https://youtu.be/..."
    }
  ]
}
```

---

## 5) Playlist Utilities

### `GET /api/playlist-entries`
Enumerate playlist items without downloading.

**Query parameters**

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `url` | string | ✅ | Playlist URL |

**Sample response (success)**

```json
{
  "success": true,
  "entries": [
    { "url": "https://youtu.be/abc", "title": "Track 1" },
    { "url": "https://youtu.be/def", "title": "Track 2" }
  ]
}
```

**Sample response (cannot enumerate, e.g. Mix/Radio)**

```json
{
  "success": false,
  "error": "Failed to fetch playlist entries",
  "entries": []
}
```


## 6) History + Queue Management

### `GET /api/downloads/history`
Return completed/failed history items.

**Sample response**

```json
[
  {
    "id": "1718000000000",
    "title": "My Video",
    "url": "https://youtu.be/...",
    "status": "completed",
    "downloadedAt": "2024-06-10T12:01:00.000Z"
  }
]
```

### `DELETE /api/downloads/history/:id`
Delete one history record.

**Path parameters**

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `id` | string | ✅ | History item ID |

### `DELETE /api/downloads/history`
Clear all history records.

### `POST /api/downloads/cancel/:id`
Cancel an active task.

**Path parameters**

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `id` | string | ✅ | Active download ID |

### `DELETE /api/downloads/queue/:id`
Remove one queued task.

**Path parameters**

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `id` | string | ✅ | Queued task ID |

### `DELETE /api/downloads/queue`
Clear full queue.

---

## 7) Web UI Helpers (optional for agents)

### `POST /api/download`
Web UI single download endpoint (supports extra flags such as Bilibili collection behaviors).

**Body parameters**

| Field | Type | Required | Description |
|---|---|---:|---|
| `youtubeUrl` | string | ✅ | Target URL |
| `format` | `"mp4" \| "mp3"` | ❌ | Output format |
| `collectionName` | string | ❌ | Group label |
| `forceDownload` | boolean | ❌ | Force re-download |
| `downloadAllParts` | boolean | ❌ | Bilibili multi-part full download |
| `downloadCollection` | boolean | ❌ | Bilibili collection/series download |
| `collectionInfo` | object | ❌ | Collection metadata |

**Sample response**

```json
{
  "success": true,
  "message": "Download queued",
  "downloadId": "1718000000000"
}
```

### `GET /api/check-video-download`
Check whether a URL was already downloaded.

**Query parameters**

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `url` | string | ✅ | Video URL |

**Sample response (found)**

```json
{
  "found": true,
  "status": "exists",
  "videoId": "abc123",
  "title": "My Video",
  "author": "Channel Name",
  "downloadedAt": "2024-06-10T12:00:00.000Z",
  "videoPath": "/path/to/video.mp4",
  "thumbnailPath": "/path/to/thumb.jpg"
}
```

**Sample response (not found)**

```json
{ "found": false }
```

### `GET /api/search`
Search YouTube.

**Query parameters**

| Parameter | Type | Required | Default | Description |
|---|---|---:|---|---|
| `query` | string | ✅ | — | Search text |
| `limit` | number | ❌ | `8` | Max results |
| `offset` | number | ❌ | `1` | Pagination offset |

**Sample response**

```json
{
  "results": [
    {
      "id": "abc123",
      "title": "Video Title",
      "url": "https://youtu.be/abc123",
      "thumbnail": "...",
      "duration": "3:45",
      "author": "Channel"
    }
  ]
}
```

---

## Supported sources (summary)

| Platform | Single | Playlist MP3 | Playlist MP4 | Notes |
|---|---|---|---|---|
| YouTube | ✅ | ✅ | ✅ | Mix/Radio playlists may not enumerate; fallback behavior depends on endpoint |
| Bilibili | ✅ | ⚠️ | ⚠️ | Collections/multi-part mainly via web UI endpoint |
| Twitch | ✅ | ❌ | ❌ | VOD-focused |
| MissAV / 123av | ✅ | ❌ | ❌ | |
| Other yt-dlp sources | ✅ | depends | depends | |

---

## Skill-local token files (OpenClaw skill)

- `../tokens/aitube-url`
- `../tokens/aitube-token`
