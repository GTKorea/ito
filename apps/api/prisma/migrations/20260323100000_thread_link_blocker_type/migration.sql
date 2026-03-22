-- CreateEnum
CREATE TYPE "ThreadLinkType" AS ENUM ('PERSON', 'BLOCKER');

-- AlterTable: add type and blockerNote columns
ALTER TABLE "ThreadLink" ADD COLUMN "type" "ThreadLinkType" NOT NULL DEFAULT 'PERSON';
ALTER TABLE "ThreadLink" ADD COLUMN "blockerNote" TEXT;

-- Make toUserId optional (nullable) for BLOCKER type links
ALTER TABLE "ThreadLink" ALTER COLUMN "toUserId" DROP NOT NULL;
