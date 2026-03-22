-- AlterTable: convert calendarId (single) to calendarIds (array)
ALTER TABLE "CalendarIntegration" ADD COLUMN "calendarIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing data: copy calendarId into calendarIds array
UPDATE "CalendarIntegration"
SET "calendarIds" = ARRAY["calendarId"]
WHERE "calendarId" IS NOT NULL;

-- Drop old column
ALTER TABLE "CalendarIntegration" DROP COLUMN "calendarId";
