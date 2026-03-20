-- AlterTable
ALTER TABLE "ThreadLink" ADD COLUMN "groupId" TEXT;

-- CreateIndex
CREATE INDEX "ThreadLink_groupId_idx" ON "ThreadLink"("groupId");
