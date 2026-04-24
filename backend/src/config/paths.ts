import path from "path";

// Assuming the application is started from the 'backend' directory
export const ROOT_DIR: string = process.cwd();

export const UPLOADS_DIR: string =
  process.env.AITUBE_UPLOADS_DIR ?? path.join(ROOT_DIR, "uploads");

// AITUBE_VIDEOS_DIR / AITUBE_MUSIC_DIR let you mount video and music
// libraries into separate host paths or volumes.  When unset they fall back
// to the conventional subdirectories under UPLOADS_DIR.
export const VIDEOS_DIR: string =
  process.env.AITUBE_VIDEOS_DIR ?? path.join(UPLOADS_DIR, "videos");
export const MUSIC_DIR: string =
  process.env.AITUBE_MUSIC_DIR ?? path.join(UPLOADS_DIR, "music");

export const IMAGES_DIR: string = path.join(UPLOADS_DIR, "images");
export const IMAGES_SMALL_DIR: string = path.join(UPLOADS_DIR, "images-small");
export const AVATARS_DIR: string = path.join(UPLOADS_DIR, "avatars");
export const SUBTITLES_DIR: string = path.join(UPLOADS_DIR, "subtitles");
export const CLOUD_THUMBNAIL_CACHE_DIR: string = path.join(
  UPLOADS_DIR,
  "cloud-thumbnail-cache"
);
export const DATA_DIR: string =
  process.env.AITUBE_DATA_DIR ?? path.join(ROOT_DIR, "data");

export const VIDEOS_DATA_PATH: string = path.join(DATA_DIR, "videos.json");
export const STATUS_DATA_PATH: string = path.join(DATA_DIR, "status.json");
export const COLLECTIONS_DATA_PATH: string = path.join(
  DATA_DIR,
  "collections.json"
);
export const HOOKS_DIR: string = path.join(DATA_DIR, "hooks");
export const LOGS_DIR: string = path.join(DATA_DIR, "logs");
