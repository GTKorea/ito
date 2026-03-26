-- AlterTable
ALTER TABLE "TaskGroup" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;

-- Mark existing "My Tasks" private groups as system groups
UPDATE "TaskGroup" SET "isSystem" = true WHERE "name" = 'My Tasks' AND "isPrivate" = true;
