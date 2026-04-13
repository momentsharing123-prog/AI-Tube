# AI Tube Download Skill

Help the user download YouTube / web videos or audio via their AI Tube server.

---

## Step 1 — Load stored config

Token and URL are stored inside this skill folder:

- `token/aitube-url` — server base URL (e.g. `http://localhost:6001`)
- `token/aitube-token` — API access key

Resolve the skill folder path and read both files:

```powershell
powershell -Command "
\$skillDir = (Resolve-Path '\$env:USERPROFILE\.claude\skills\aitube-download').Path
\$urlFile   = Join-Path \$skillDir 'token\aitube-url'
\$tokenFile = Join-Path \$skillDir 'token\aitube-token'
if (Test-Path \$urlFile)   { (Get-Content \$urlFile   -Raw).Trim().TrimEnd('/') } else { 'NO_URL' }
if (Test-Path \$tokenFile) { (Get-Content \$tokenFile -Raw).Trim() }             else { 'NO_TOKEN' }
"
```

- If both values are present, store them as `AITUBE_URL` and `AITUBE_TOKEN` and skip to Step 2.
- If `NO_URL` → go to Step 1a.
- If `NO_TOKEN` → go to Step 1b.

### Step 1a — Ask for API URL

Use AskUserQuestion:

> What is your AI Tube server URL (including port)?
>
> Example: `http://localhost:6001` or `http://192.168.1.100:6001`

Save the answer (strip any trailing slash):

```powershell
powershell -Command "
\$skillDir = (Resolve-Path '\$env:USERPROFILE\.claude\skills\aitube-download').Path
\$urlFile  = Join-Path \$skillDir 'token\aitube-url'
Set-Content -Path \$urlFile -Value 'PASTE_URL_HERE' -NoNewline
Write-Output 'URL saved.'
"
```

### Step 1b — Ask for token

Use AskUserQuestion:

> I need your AI Tube API token to continue.
>
> You can find it by running:
> ```
> docker logs ai-tube-prod | grep "API access key"
> ```
>
> Paste your token here:

Save the token:

```powershell
powershell -Command "
\$skillDir   = (Resolve-Path '\$env:USERPROFILE\.claude\skills\aitube-download').Path
\$tokenFile  = Join-Path \$skillDir 'token\aitube-token'
Set-Content -Path \$tokenFile -Value 'PASTE_TOKEN_HERE' -NoNewline
Write-Output 'Token saved.'
"
```

### Step 1c — Verify connection

```powershell
powershell -Command "
\$skillDir = (Resolve-Path '\$env:USERPROFILE\.claude\skills\aitube-download').Path
\$url   = (Get-Content (Join-Path \$skillDir 'token\aitube-url')   -Raw).Trim().TrimEnd('/')
\$token = (Get-Content (Join-Path \$skillDir 'token\aitube-token') -Raw).Trim()
try {
  \$r = Invoke-RestMethod -Uri \"\$url/api/download-status\" -Headers @{'X-API-Key'=\$token}
  Write-Output 'AUTH_OK'
} catch {
  Write-Output ('AUTH_FAIL: ' + \$_.Exception.Message)
}
"
```

- If `AUTH_OK` → proceed to Step 2.
- If `AUTH_FAIL` → tell the user the URL or token didn't work, ask them to re-check, and repeat from Step 1a.

---

## Step 2 — Gather download request

Check what the user has already provided in their message:

- **URL** — did they paste a link? Extract it.
- **Format** — did they say "mp3", "audio", "music"? → `mp3`. Did they say "mp4", "video"? → `mp4`. If unclear, ask.
- **Collection** — did the URL contain `?list=` or `&list=` (YouTube playlist)? If so and format is `mp3`, ask:

> The URL looks like a YouTube playlist. Do you want to download **just this one song** or the **entire playlist as MP3**?
>
> Options:
> - A) Just this song
> - B) Entire playlist as MP3

If URL is missing, use AskUserQuestion:

> What URL do you want to download?

If format is still unclear after reading their message, use AskUserQuestion:

> Do you want the video (MP4) or audio only (MP3)?

Options:
- A) MP4 — Video
- B) MP3 — Audio only

---

## Step 3 — Submit download

### 3a — Single video (default)

Read the saved config and submit:

```powershell
powershell -Command "
\$skillDir = (Resolve-Path '\$env:USERPROFILE\.claude\skills\aitube-download').Path
\$url   = (Get-Content (Join-Path \$skillDir 'token\aitube-url')   -Raw).Trim().TrimEnd('/')
\$token = (Get-Content (Join-Path \$skillDir 'token\aitube-token') -Raw).Trim()
\$body = ConvertTo-Json @{
  url    = 'VIDEO_URL'
  format = 'FORMAT'
  title  = 'TITLE'
}
try {
  \$r = Invoke-RestMethod -Uri \"\$url/api/agent/download\" \`
    -Method POST \`
    -Headers @{'Content-Type'='application/json'; 'X-API-Key'=\$token} \`
    -Body \$body
  Write-Output (\$r | ConvertTo-Json)
} catch {
  Write-Output ('ERROR: ' + \$_.Exception.Message)
}
"
```

Replace:
- `VIDEO_URL` with the actual URL
- `FORMAT` with `mp4` or `mp3`
- `TITLE` with a short descriptive label (e.g. the video title if known, otherwise `"Download"`)

**On success** (`success: true`): Tell the user:
> ✅ Queued as **FORMAT** (ID: `downloadId`). Downloading now — check `AITUBE_URL` for progress.

**On error**: Show the error message and ask the user if they want to retry.

### 3b — Entire playlist as MP3 (when user chose "entire playlist")

```powershell
powershell -Command "
\$skillDir = (Resolve-Path '\$env:USERPROFILE\.claude\skills\aitube-download').Path
\$url   = (Get-Content (Join-Path \$skillDir 'token\aitube-url')   -Raw).Trim().TrimEnd('/')
\$token = (Get-Content (Join-Path \$skillDir 'token\aitube-token') -Raw).Trim()
\$body = ConvertTo-Json @{
  url                = 'PLAYLIST_URL'
  format             = 'mp3'
  downloadCollection = \$true
}
try {
  \$r = Invoke-RestMethod -Uri \"\$url/api/agent/download\" \`
    -Method POST \`
    -Headers @{'Content-Type'='application/json'; 'X-API-Key'=\$token} \`
    -Body \$body
  Write-Output (\$r | ConvertTo-Json)
} catch {
  Write-Output ('ERROR: ' + \$_.Exception.Message)
}
"
```

**On success**: Tell the user:
> ✅ Queued **N tracks** as MP3. Downloading now — check `AITUBE_URL` for progress.

**On error**: Show the error message and ask the user if they want to retry.

---

## Step 4 — Poll progress (optional)

If the user asks "is it done?" or "how's the download?", check status:

```powershell
powershell -Command "
\$skillDir = (Resolve-Path '\$env:USERPROFILE\.claude\skills\aitube-download').Path
\$url   = (Get-Content (Join-Path \$skillDir 'token\aitube-url')   -Raw).Trim().TrimEnd('/')
\$token = (Get-Content (Join-Path \$skillDir 'token\aitube-token') -Raw).Trim()
\$r = Invoke-RestMethod -Uri \"\$url/api/download-status\" \`
  -Headers @{'X-API-Key'=\$token}
\$r | ConvertTo-Json -Depth 5
"
```

Parse and summarise:
- `activeDownloads` → show title + progress % + speed if available
- `queuedDownloads` → show count waiting
- Both empty → "All downloads complete!"

---

## Reference

**Config files (inside this skill folder):**
- `token/aitube-url` — server URL with port (e.g. `http://localhost:6001`)
- `token/aitube-token` — API access key

See `reference/api-reference.md` for the full API documentation.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/agent/download` | POST | Queue a download (API key only) |
| `/api/download-status` | GET | Check active/queued downloads |
| `/api/downloads/history` | GET | View completed downloads |
| `/api/playlist-entries` | GET | List tracks in a playlist |
| `/api/download/playlist-mp3` | POST | Queue selected playlist tracks as MP3 |
| `/api/download/playlist-mp4` | POST | Queue selected playlist videos as MP4 |

**Supported formats:**
- `mp4` — best quality video + audio
- `mp3` — audio only, best quality

**Supported sources:** YouTube, Bilibili, Twitch, Twitter/X, MissAV, and anything yt-dlp supports.
