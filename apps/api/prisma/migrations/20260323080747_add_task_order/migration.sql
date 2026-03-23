-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- Initialize order based on creation date (oldest = lowest order)
UPDATE "Task" SET "order" = sub.rn FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "workspaceId" ORDER BY "createdAt" ASC) - 1 AS rn FROM "Task"
) sub WHERE "Task".id = sub.id;
