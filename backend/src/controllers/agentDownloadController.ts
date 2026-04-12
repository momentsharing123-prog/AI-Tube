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
 *   Body: { url: string, format?: "mp4" | "mp3", title?: string }
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

  const { url, format, title } = req.body;

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
  const downloadId = Date.now().toString();
  const initialTitle = (typeof title === "string" && title.trim()) ? title.trim() : "Agent Download";

  const downloadTask = async (registerCancel: (cancel: () => void) => void) => {
    const videoData = await downloadService.downloadYouTubeVideo(
      validatedUrl,
      downloadId,
      registerCancel,
      downloadFormat,
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
