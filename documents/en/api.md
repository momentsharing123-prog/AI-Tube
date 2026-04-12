# AI Tube API Documentation

## Base URL

```
http://localhost:6001/api
```

---

## Authentication

AI Tube supports two authentication methods:

### 1. API Key (Recommended for agents & automation)

Include in **one** of these headers:

```http
X-API-Key: your-api-key
```
```http
Authorization: ApiKey your-api-key
```

> **Note:** API key auth is limited to download submission endpoints only (`POST /download` and `POST /agent/download`). For full API access, use session auth.

### 2. Session Cookie (Browser)

Authenticate via `POST /settings/verify-password` to receive a session cookie. Applicable when `loginEnabled` is `true` in settings.

---

## How to Get Your API Token

There are two ways to enable API token authentication:

---

### Method 1 — Environment Variables (Recommended for Docker / automation)

Set these in your `.env` file before starting the container:

```env
# Enable API auth on startup
AITUBE_API_ENABLED=true

# Option A: Fixed token (use your own value)
AITUBE_API_TOKEN=my-secret-token-here

# Option B: Leave blank — a secure token is auto-generated and printed to logs
AITUBE_API_TOKEN=
```

On startup, the active token is always printed to container logs:

```bash
docker logs ai-tube-prod | grep "API Token"
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# API Token: a3f9bc2e...
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Behaviour:**

| `AITUBE_API_ENABLED` | `AITUBE_API_TOKEN` | Result |
|---|---|---|
| `true` | set to value | Use that exact token |
| `true` | blank | Auto-generate token (only on first start; reuses on restart) |
| `false` / not set | any | No changes — UI settings take effect |

---

### Method 2 — Settings UI

> Requires **Login** to be enabled first.

1. Open AI Tube at `http://localhost:6001`
2. Go to **Settings** → **Security** tab
3. Enable the **"Login"** toggle
4. Enable **"Enable API Key Authentication"** toggle
5. Your token is auto-generated — click **Copy**
6. Click **Save Settings**

To rotate the token: click **Refresh** next to the API key field.

---

### Both methods work simultaneously

The env-var token and the UI token are stored in the same field. Whichever was applied last wins. If you set `AITUBE_API_TOKEN` in env, the UI will reflect that value.

---

## Endpoints

### Downloads

#### `POST /download`
Queue a video download from the UI or API.

**Auth:** Session cookie or API key

**Request body:**
```json
{
  "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "format": "mp4",
  "forceDownload": false
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `youtubeUrl` | string | ✅ | — | Video URL (YouTube, Bilibili, Twitch, etc.) |
| `format` | `"mp4"` \| `"mp3"` | ❌ | `"mp4"` | Output format |
| `forceDownload` | boolean | ❌ | `false` | Re-download even if previously deleted |
| `downloadAllParts` | boolean | ❌ | `false` | Download all parts (Bilibili multi-part) |
| `downloadCollection` | boolean | ❌ | `false` | Download as collection (Bilibili) |
| `collectionName` | string | ❌ | — | Name for the collection |

**Response:**
```json
{
  "success": true,
  "message": "Download queued",
  "downloadId": "1712345678901"
}
```

---

#### `POST /agent/download`
Clean AI-agent-friendly download endpoint. Requires API key.

**Auth:** API key only

**Request body:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "format": "mp3",
  "title": "Optional label shown in queue"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `url` | string | ✅ | — | Any URL supported by yt-dlp |
| `format` | `"mp4"` \| `"mp3"` | ❌ | `"mp4"` | `mp4` = video, `mp3` = audio only |
| `title` | string | ❌ | `"Agent Download"` | Label shown in the download queue |

**Response:**
```json
{
  "success": true,
  "downloadId": "1712345678901",
  "status": "queued",
  "message": "Download queued as MP3"
}
```

**Example — curl:**
```bash
# Download video as MP4
curl -X POST http://localhost:6001/api/agent/download \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "format": "mp4"}'

# Extract audio as MP3
curl -X POST http://localhost:6001/api/agent/download \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "format": "mp3", "title": "Rick Astley - Never Gonna Give You Up"}'
```

---

#### `GET /download-status`
Get currently active and queued downloads with progress.

**Auth:** Session cookie or API key

**Response:**
```json
{
  "activeDownloads": [
    {
      "id": "1712345678901",
      "title": "Video Title",
      "progress": 45,
      "speed": "2.50MiB/s",
      "totalSize": "150.00MiB",
      "downloadedSize": "67.50MiB",
      "filename": "video.mp4",
      "sourceUrl": "https://youtube.com/..."
    }
  ],
  "queuedDownloads": [
    {
      "id": "1712345678902",
      "title": "Pending...",
      "sourceUrl": "https://youtube.com/..."
    }
  ]
}
```

---

#### `GET /check-video-download`
Check if a URL has already been downloaded.

**Query params:** `url` (required)

**Response:**
```json
{
  "found": true,
  "status": "exists",
  "videoId": "abc123",
  "title": "Video Title",
  "author": "Channel Name",
  "downloadedAt": "2024-01-01T00:00:00.000Z",
  "videoPath": "/videos/filename.mp4",
  "thumbnailPath": "/images/filename.jpg"
}
```

---

#### `POST /downloads/cancel/:id`
Cancel an active download.

**Path param:** `id` — download ID

**Response:**
```json
{ "success": true }
```

---

#### `DELETE /downloads/queue/:id`
Remove a queued (not yet started) download.

---

#### `DELETE /downloads/queue`
Clear the entire download queue.

---

#### `GET /downloads/history`
Get download history.

**Response:**
```json
[
  {
    "id": "1712345678901",
    "title": "Video Title",
    "sourceUrl": "https://...",
    "downloadedAt": "2024-01-01T00:00:00.000Z",
    "status": "completed"
  }
]
```

---

#### `DELETE /downloads/history/:id`
Remove one item from download history.

---

#### `DELETE /downloads/history`
Clear all download history.

---

### Videos

#### `GET /videos`
List all downloaded videos.

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |
| `sort` | string | Sort field |
| `order` | `asc` \| `desc` | Sort order |
| `search` | string | Search by title/author |

**Response:**
```json
{
  "videos": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

---

#### `GET /videos/:id`
Get a single video by ID.

---

#### `PUT /videos/:id`
Update video metadata (title, author, description, tags).

**Request body:**
```json
{
  "title": "New Title",
  "author": "New Author",
  "description": "New description",
  "tags": ["tag1", "tag2"]
}
```

---

#### `DELETE /videos/:id`
Delete a video and its files.

---

#### `GET /search`
Search YouTube for videos (does not download).

**Query params:** `query` (required), `limit` (default: 8), `offset` (default: 1)

**Response:**
```json
{
  "results": [
    {
      "id": "dQw4w9WgXcQ",
      "title": "Rick Astley - Never Gonna Give You Up",
      "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "thumbnail": "https://...",
      "duration": "3:32",
      "author": "Rick Astley"
    }
  ]
}
```

---

### Collections

#### `GET /collections`
List all collections.

#### `POST /collections`
Create a new collection.

```json
{ "name": "My Playlist", "videoIds": ["id1", "id2"] }
```

#### `PUT /collections/:id`
Update a collection.

#### `DELETE /collections/:id`
Delete a collection.

---

### Subscriptions

#### `GET /subscriptions`
List all channel/playlist subscriptions.

#### `POST /subscriptions`
Subscribe to a YouTube channel.

```json
{
  "url": "https://www.youtube.com/@channel",
  "interval": 60
}
```

#### `PUT /subscriptions/:id/pause`
Pause a subscription.

#### `PUT /subscriptions/:id/resume`
Resume a subscription.

#### `DELETE /subscriptions/:id`
Delete a subscription.

---

### System

#### `GET /system/version`
Get the latest available version info.

---

## Supported Video Sources

| Platform | URL Example |
|----------|-------------|
| YouTube | `https://youtube.com/watch?v=...` |
| YouTube Shorts | `https://youtube.com/shorts/...` |
| Bilibili | `https://bilibili.com/video/BV...` |
| Twitch VOD | `https://twitch.tv/videos/...` |
| Twitter/X | `https://x.com/user/status/...` |
| Any yt-dlp source | See [yt-dlp supported sites](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md) |

---

## Format Reference

| Format | Description | File |
|--------|-------------|------|
| `mp4` | Best quality video + audio (H.264) | `.mp4` |
| `mp3` | Audio only, best quality | `.mp3` |

> Format can be set per-request via the `format` field, or via the MP4/MP3 toggle in the UI.

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

| HTTP Code | Meaning |
|-----------|---------|
| `400` | Bad request — invalid input |
| `401` | Unauthorized — login required |
| `403` | Forbidden — insufficient permissions or missing API key |
| `404` | Not found |
| `500` | Internal server error |
