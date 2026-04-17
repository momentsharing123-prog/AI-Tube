import { Request, Response } from "express";
import downloadManager from "../services/downloadManager";
import * as downloadService from "../services/downloadService";
import { logger } from "../utils/logger";
import { sendBadRequest, sendData } from "../utils/response";
import { validateUrl } from "../utils/security";

/**
 * AI Agent download endpoint
 *
 * Accepts a clean, minimal request schema designed for AI agent use:
 *   POST /api/agent/download
 *   Headers: X-API-Key: <key>
 *   Body: {
 *     url: string,
 *     format?: "mp4" | "mp3",
 *     title?: string,
 *     downloadCollection?: boolean   // when true + format=mp3, downloads every video in the playlist as MP3
 *   }
 *
 * Default (downloadCollection omitted / false): downloads only the single video even if the URL
 * contains a playlist parameter (--no-playlist behaviour).
 *
 * Requires API key authentication. Queues a download and returns immediately.
 */
export const agentDownload = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // Enforce API key auth — this endpoint is for agents, not browser sessions
  if (!req.apiKeyAuthenticated) {
    res.status(403).json({
      success: false,
      error: "API key required. Include X-API-Key header or Authorization: ApiKey <key>.",
    });
    return;
  }

  const { url, format, title, downloadCollection } = req.body;

  if (!url || typeof url !== "string") {
    sendBadRequest(res, "url is required");
    return;
  }

  let validatedUrl: string;
  try {
    validatedUrl = validateUrl(url);
  } catch (error) {
    sendBadRequest(
      res,
      error instanceof Error ? error.message : "Invalid URL",
    );
    return;
  }

  const downloadFormat: "mp4" | "mp3" = format === "mp3" ? "mp3" : "mp4";
  const shouldDownloadCollection = downloadCollection === true;

  // ── Collection / playlist download (MP3 only) ─────────────────────────────
  if (shouldDownloadCollection) {
    if (downloadFormat !== "mp3") {
      sendBadRequest(res, "downloadCollection is only supported for format=mp3. Use the web UI for MP4 playlist downloads.");
      return;
    }

    let entries: Array<{ url: string; title: string }>;
    try {
      ({ entries } = await downloadService.getPlaylistEntries(validatedUrl));
    } catch (error) {
      sendBadRequest(res, error instanceof Error ? error.message : "Failed to fetch playlist entries");
      return;
    }

    if (entries.length === 0) {
      sendBadRequest(res, "No videos found in playlist. Check that the URL contains a valid playlist parameter.");
      return;
    }

    const downloadIds: string[] = [];

    for (const entry of entries) {
      const entryId = Date.now().toString() + "_" + Math.random().toString(36).slice(2, 7);
      const entryTitle = entry.title;
      const entryUrl = entry.url;
      downloadIds.push(entryId);

      const downloadTask = async (registerCancel: (cancel: () => void) => void) => {
        const videoData = await downloadService.downloadYouTubeVideo(
          entryUrl,
          entryId,
          registerCancel,
          "mp3",
          { noPlaylist: true },
        );
        return { success: true, video: videoData };
      };

      downloadManager
        .addDownload(downloadTask, entryId, entryTitle, entryUrl, "youtube")
        .then(() => logger.info("Agent playlist MP3 download completed:", entryId))
        .catch((error) => logger.error("Agent playlist MP3 download failed:", { entryId, error }));
    }

    sendData(res, {
      success: true,
      status: "queued",
      message: `Queued ${entries.length} tracks as MP3`,
      totalTracks: entries.length,
      downloadIds,
    });
    return;
  }

  // ── Single video download (default) ──────────────────────────────────────
  // Use --no-playlist so playlist parameters in the URL are ignored
  const downloadId = Date.now().toString();
  const initialTitle = (typeof title === "string" && title.trim()) ? title.trim() : "Agent Download";

  const downloadTask = async (registerCancel: (cancel: () => void) => void) => {
    const videoData = await downloadService.downloadYouTubeVideo(
      validatedUrl,
      downloadId,
      registerCancel,
      downloadFormat,
      { noPlaylist: true },
    );
    return { success: true, video: videoData };
  };

  downloadManager
    .addDownload(downloadTask, downloadId, initialTitle, validatedUrl, "youtube")
    .then(() => logger.info("Agent download completed:", downloadId))
    .catch((error) => logger.error("Agent download failed:", { downloadId, error }));

  sendData(res, {
    success: true,
    downloadId,
    status: "queued",
    message: `Download queued as ${downloadFormat.toUpperCase()}`,
  });
};
