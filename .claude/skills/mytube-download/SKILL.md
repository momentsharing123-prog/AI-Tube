# MyTube Download Skill

Help the user download YouTube / web videos or audio via the local MyTube server.

---

## Step 1 — Load stored token

Check if a token is already saved:

```bash
cat ~/.mytube-token 2>/dev/null || echo "NO_TOKEN"
```

- If a token exists, store it as `MYTUBE_TOKEN` and skip to Step 2.
- If `NO_TOKEN`, go to Step 1a.

### Step 1a — Ask for token

Use AskUserQuestion:

> I need your MyTube API token to continue.
>
> You can find it by running:
> ```
> docker logs mytube-api | grep "API access key"
> ```
>
> Paste your token here:

Take the user's answer, save it, and confirm:

```bash
echo "PASTE_TOKEN_HERE" > ~/.mytube-token
chmod 600 ~/.mytube-token
echo "Token saved."
```

Replace `PASTE_TOKEN_HERE` with the actual token value the user provided.

Then verify it works:

```powershell
powershell -Command "
try {
  \$r = Invoke-RestMethod -Uri 'http://localhost:6001/api/download-status' -Headers @{'X-API-Key'='PASTE_TOKEN_HERE'}
  Write-Output 'AUTH_OK'
} catch {
  Write-Output ('AUTH_FAIL: ' + \$_.Exception.Message)
}
"
```

- If `AUTH_OK` → proceed to Step 2.
- If `AUTH_FAIL` → tell the user the token didn't work and ask them to re-check it. Repeat Step 1a.

---

## Step 2 — Gather download request

Check what the user has already provided in their message:

- **URL** — did they paste a link? Extract it.
- **Format** — did they say "mp3", "audio", "music"? → `mp3`. Did they say "mp4", "video"? → `mp4`. If unclear, ask.

If URL is missing, use AskUserQuestion:

> What URL do you want to download?

If format is still unclear after reading their message, use AskUserQuestion:

> Do you want the video (MP4) or audio only (MP3)?

Options:
- A) MP4 — Video
- B) MP3 — Audio only

---

## Step 3 — Submit download

Read the saved token:

```bash
MYTUBE_TOKEN=$(cat ~/.mytube-token)
echo "Token loaded: ${MYTUBE_TOKEN:0:8}..."
```

Submit via the local REST API:

```powershell
powershell -Command "
\$token = (Get-Content '\$env:USERPROFILE\.mytube-token' -Raw).Trim()
\$body = ConvertTo-Json @{
  url    = 'VIDEO_URL'
  format = 'FORMAT'
  title  = 'TITLE'
}
try {
  \$r = Invoke-RestMethod -Uri 'http://localhost:6001/api/agent/download' \`
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
> ✅ Queued as **FORMAT** (ID: `downloadId`). Downloading now — check http://localhost:6001 for progress.

**On error**: Show the error message and ask the user if they want to retry.

---

## Step 4 — Poll progress (optional)

If the user asks "is it done?" or "how's the download?", check status:

```powershell
powershell -Command "
\$token = (Get-Content '\$env:USERPROFILE\.mytube-token' -Raw).Trim()
\$r = Invoke-RestMethod -Uri 'http://localhost:6001/api/download-status' \`
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

**Server:** `http://localhost:6001`
**Token file:** `~/.mytube-token`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/agent/download` | POST | Queue a download |
| `/api/download-status` | GET | Check active/queued downloads |
| `/api/downloads/history` | GET | View completed downloads |

**Supported formats:**
- `mp4` — best quality video + audio
- `mp3` — audio only, best quality

**Supported sources:** YouTube, Bilibili, Twitch, Twitter/X, and anything yt-dlp supports.
