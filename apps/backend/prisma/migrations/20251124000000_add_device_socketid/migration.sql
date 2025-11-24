-- Add socketId column to DeviceToken
ALTER TABLE "DeviceToken" ADD COLUMN "socketId" TEXT;

-- Optional: create an index for socketId to speed lookup
CREATE INDEX IF NOT EXISTS "DeviceToken_socketId_idx" ON "DeviceToken" ("socketId");
