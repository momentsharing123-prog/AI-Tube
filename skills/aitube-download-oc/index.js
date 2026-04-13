// Minimal stub for API proxying (implementation logic goes in agent; you can expand or Pythonize as needed)

const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');

async function loadConfig() {
  const tokenDir = path.join(__dirname, 'tokens');
  function safeRead(...parts) {
    try { return fs.readFileSync(path.join(...parts), 'utf-8').trim(); } catch { return null; }
  }
  return {
    url: (safeRead(tokenDir, 'aitube-url') || '').replace(/\/$/, ''),
    token: safeRead(tokenDir, 'aitube-token') || '',
  };
}

async function detectCollection(url) {
  const cfg = await loadConfig();
  if (!cfg.url || !cfg.token) throw new Error('Missing AI Tube API URL or token config');

  // Keep heuristic only as emergency fallback if detect endpoint is unavailable.
  const hasListParam = /[?&]list=/.test(url || '');

  try {
    const res = await axios.get(cfg.url + '/api/detect-url', {
      headers: { 'X-API-Key': cfg.token },
      params: { url },
    });

    const data = res.data || {};
    return {
      isCollection: !!data.isPlaylist,
      title: data.title || null,
      videoCount: typeof data.videoCount === 'number' ? data.videoCount : null,
      suggestedApi: data.suggestedApi || null,
      suggestedBody: data.suggestedBody || null,
      source: 'api',
      heuristic: hasListParam,
      raw: data,
    };
  } catch {
    // Fallback to heuristic if detect API fails.
    return {
      isCollection: hasListParam,
      title: null,
      videoCount: null,
      suggestedApi: null,
      suggestedBody: null,
      source: 'heuristic',
      heuristic: hasListParam,
    };
  }
}

async function queueDownload({ url, format, title, downloadCollection }) {
  const cfg = await loadConfig();
  if (!cfg.url || !cfg.token) throw new Error('Missing AI Tube API URL or token config');

  const normalizedFormat = (format || 'mp3').toLowerCase();
  const isCollection = !!downloadCollection;

  // Playlist batch endpoints (support both mp3 and mp4)
  if (isCollection) {
    const endpoint = normalizedFormat === 'mp4'
      ? '/api/download/playlist-mp4'
      : '/api/download/playlist-mp3';

    const collectionBody = {
      playlistUrl: url,
      collectionName: title || 'Download',
    };

    const playlistRes = await axios.post(cfg.url + endpoint, collectionBody, {
      headers: { 'X-API-Key': cfg.token, 'Content-Type': 'application/json' },
    });
    return playlistRes.data;
  }

  // Single item endpoint
  const singleBody = {
    url,
    format: normalizedFormat,
    title: title || 'Download',
  };

  const res = await axios.post(cfg.url + '/api/agent/download', singleBody, {
    headers: { 'X-API-Key': cfg.token, 'Content-Type': 'application/json' },
  });
  return res.data;
}

async function pollStatus() {
  const cfg = await loadConfig();
  if (!cfg.url || !cfg.token) throw new Error('Missing AI Tube API URL or token config');
  const res = await axios.get(cfg.url + '/api/download-status', {
    headers: { 'X-API-Key': cfg.token },
  });
  return res.data;
}

module.exports = {
  detectCollection,
  queueDownload,
  pollStatus,
};
