# AI Tube API Reference

Base URL: `http://localhost:6001` (or your configured server URL)

Authentication: all endpoints require either a session cookie (browser) or `X-API-Key: <token>` header. The agent-only endpoint **only** accepts `X-API-Key`.

---

## Agent Download

### `POST /api/agent/download`

**Requires:** `X-API-Key` header (no session cookie accepted)

Queue a single video or an entire MP3 playlist. Designed for AI agent use — clean schema, returns immediately.

**Request body:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `url` | string | ✅ | — | Video or playlist URL |
| `format` | `"mp4"` \| `"mp3"` | ❌ | `"mp4"` | Output format |
| `title` | string | ❌ | `"Agent Download"` | Label shown in the download queue |
| `downloadCollection` | boolean | ❌ | `false` | When `true` + `format="mp3"`: enumerate and queue every track in the playlist as MP3. Only supported for `mp3`. |

**Single video response (default):**
```json
{
  "success": true,
  "downloadId": "1718000000000",
  "status": "queued",
  "message": "Download queued as MP3"
}
```

**Playlist collection response (`downloadCollection: true`):**
```json
{
  "success": true,
  "status": "queued",
  "message": "Queued 12 tracks as MP3",
  "totalTracks": 12,
  "downloadIds": ["1718000000001_abc12", "1718000000002_def34", "..."]
}
```

**Notes:**
- `downloadCollection: true` is only supported for `format="mp3"`. For MP4 playlists use the web UI (`POST /api/download/playlist-mp4`).
- When `downloadCollection` is omitted or `false`, a playlist URL downloads only the single video/track in the URL (uses `--no-playlist` internally).

---

## Download Status

### `GET /api/download-status`

Returns active and queued downloads.

**Response:**
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

## Download History

### `GET /api/downloads/history`

Returns all completed downloads (both success and failed).

**Response:** array of history items:
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

Remove a single entry from history.

### `DELETE /api/downloads/history`

Clear all history entries.

---

## Download Management

### `POST /api/downloads/cancel/:id`

Cancel an active download.

### `DELETE /api/downloads/queue/:id`

Remove a task from the queue (before it starts).

### `DELETE /api/downloads/queue`

Clear the entire queue.

---

## Web UI Playlist Downloads

These endpoints are used by the web UI playlist picker. They accept either a full playlist URL (download all) or a pre-selected list of entries.

### `POST /api/download/playlist-mp3`

Download selected YouTube playlist tracks as individual MP3 files.

**Request body:**

| Field | Type | Description |
|-------|------|-------------|
| `playlistUrl` | string | Playlist URL — download **all** tracks (mutually exclusive with `entries`) |
| `entries` | `[{url, title}]` | Selected tracks to download (takes priority over `playlistUrl`) |
| `collectionName` | string? | If set, all downloaded tracks are grouped into a collection with this name |

**Response:**
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

### `POST /api/download/playlist-mp4`

Download selected YouTube playlist videos as individual MP4 files. Same body schema as `playlist-mp3`.

**Response:**
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

## Playlist Utilities

### `GET /api/playlist-entries?url=<playlistUrl>`

Enumerate all tracks/videos in a playlist without downloading. Used by the web UI picker. Timeout: up to 60 seconds for large playlists.

**Response:**
```json
{
  "success": true,
  "entries": [
    { "url": "https://youtu.be/abc", "title": "Track 1" },
    { "url": "https://youtu.be/def", "title": "Track 2" }
  ]
}
```

**Error (Radio/Mix playlists that can't be enumerated):**
```json
{
  "success": false,
  "error": "Failed to fetch playlist entries",
  "entries": []
}
```

### `GET /api/check-playlist?url=<url>`

Check if a URL points to a valid enumerable playlist.

**Response:**
```json
{ "success": true, "isPlaylist": true, "title": "My Playlist" }
```

---

## Single Video Download (Web UI)

### `POST /api/download`

Queue a single video or audio download (web UI endpoint, supports Bilibili collections too).

**Request body:**

| Field | Type | Description |
|-------|------|-------------|
| `youtubeUrl` | string | Video URL (YouTube, Bilibili, Twitch, MissAV, etc.) |
| `format` | `"mp4"` \| `"mp3"` | Output format, defaults to `"mp4"` |
| `collectionName` | string? | Add to a named collection |
| `forceDownload` | boolean? | Re-download even if previously downloaded |
| `downloadAllParts` | boolean? | Bilibili multi-part: download all parts |
| `downloadCollection` | boolean? | Bilibili collection/series download |
| `collectionInfo` | object? | Bilibili collection metadata |

**Response:**
```json
{
  "success": true,
  "message": "Download queued",
  "downloadId": "1718000000000"
}
```

---

## Video Check

### `GET /api/check-video-download?url=<url>`

Check if a URL has already been downloaded.

**Response (found + file exists):**
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

**Response (not found):**
```json
{ "found": false }
```

---

## Search

### `GET /api/search?query=<term>&limit=8&offset=1`

Search YouTube for videos.

**Response:**
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

## Authentication

### Token location

The API token is stored at:
```
~/.claude/skills/aitube-download/token/aitube-token
~/.claude/skills/aitube-download/token/aitube-url
```

### Header formats accepted

```
X-API-Key: <token>
Authorization: ApiKey <token>
```

---

## Supported Sources

| Platform | Single | Playlist (MP3) | Playlist (MP4) | Notes |
|----------|--------|----------------|----------------|-------|
| YouTube | ✅ | ✅ | ✅ | Radio/Mix playlists (`RD` prefix) cannot be enumerated — download-all fallback |
| Bilibili | ✅ | ❌ | ❌ | Multi-part & collections via web UI |
| Twitch | ✅ | ❌ | ❌ | VODs |
| MissAV / 123av | ✅ | ❌ | ❌ | |
| Any yt-dlp source | ✅ | ❌ | ❌ | |
