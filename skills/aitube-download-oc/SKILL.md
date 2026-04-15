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
   - check "isPlaylist": false, true
   - if `isPlaylist: true`, always report playlist size from `videoCount` in the user-facing reply (for example: "Detected playlist, 805 items")
4. Routing rules:
   - If **not playlist** (`isPlaylist: false`): download directly via `POST /api/agent/download`.
   - If **playlist** (`isPlaylist: true`): first report item count, then ask single item vs full playlist.
5. Full playlist submit path:
   - mp3: `POST /api/download/playlist-mp3`
   - mp4: `POST /api/download/playlist-mp4`
6. Use `X-API-Key` header and summarize result clearly.

## Playlist rules

- If `isPlaylist: true`, include `videoCount` in the reply whenever available.
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

## Windows (PowerShell) API call examples

Use these examples on Windows when `curl` is aliased to PowerShell web cmdlets.

```powershell
# Common setup
$baseUrl = "http://localhost:6001"   # no trailing slash
$apiKey  = "<YOUR_API_KEY>"
$url     = "https://music.youtube.com/watch?v=2mJYSGmvtjk"

$authHeaders = @{ "X-API-Key" = $apiKey }
$jsonHeaders = @{ "X-API-Key" = $apiKey; "Content-Type" = "application/json" }
```

### 1) Detect URL type (playlist vs single)

```powershell
# Some servers reject API key on /api/detect-url, so call without auth header first
Invoke-RestMethod -Method GET -Uri ("$baseUrl/api/detect-url?url=" + [uri]::EscapeDataString($url))
```

### 2) Queue single download (MP3/MP4)

```powershell
$body = @{
  url    = $url
  format = "mp3"   # or "mp4"
} | ConvertTo-Json

Invoke-RestMethod -Method POST -Uri "$baseUrl/api/agent/download" -Headers $jsonHeaders -Body $body
```

### 3) Check active/queued progress

```powershell
Invoke-RestMethod -Method GET -Uri "$baseUrl/api/download-status" -Headers $authHeaders
```

### 4) Read completed/failed history

```powershell
Invoke-RestMethod -Method GET -Uri "$baseUrl/api/downloads/history" -Headers $authHeaders
```

### 5) Enumerate playlist entries

```powershell
$playlistUrl = "https://www.youtube.com/playlist?list=PLxxxx"
Invoke-RestMethod -Method GET -Uri ("$baseUrl/api/playlist-entries?url=" + [uri]::EscapeDataString($playlistUrl)) -Headers $authHeaders
```

### 6) Queue full playlist as MP3

```powershell
$playlistBody = @{ url = $playlistUrl } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "$baseUrl/api/download/playlist-mp3" -Headers $jsonHeaders -Body $playlistBody
```

### 7) Queue full playlist as MP4

```powershell
$playlistBody = @{ url = $playlistUrl } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "$baseUrl/api/download/playlist-mp4" -Headers $jsonHeaders -Body $playlistBody
```

### Error handling pattern (recommended)

```powershell
try {
  $res = Invoke-RestMethod -Method POST -Uri "$baseUrl/api/agent/download" -Headers $jsonHeaders -Body $body -ErrorAction Stop
  $res | ConvertTo-Json -Depth 10
}
catch {
  if ($_.Exception.Response) {
    $code = [int]$_.Exception.Response.StatusCode
    Write-Host "HTTP $code"
  }
  throw
}
```

For full schema and examples, read: `reference/api-reference.md`.
