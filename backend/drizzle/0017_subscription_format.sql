ALTER TABLE "subscriptions" ADD COLUMN "format" text NOT NULL DEFAULT 'mp4';
--> statement-breakpoint
ALTER TABLE "continuous_download_tasks" ADD COLUMN "format" text NOT NULL DEFAULT 'mp4';
