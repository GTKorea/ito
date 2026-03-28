/*
  Warnings:

  - You are about to drop the column `industry` on the `Workspace` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'MEETING_INVITED';
ALTER TYPE "NotificationType" ADD VALUE 'MEETING_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE 'MEETING_RESCHEDULED';

-- AlterEnum
ALTER TYPE "TaskType" ADD VALUE 'MEETING';

-- AlterTable
ALTER TABLE "Workspace" DROP COLUMN "industry";

-- CreateTable
CREATE TABLE "MeetingDismissal" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeetingDismissal_userId_idx" ON "MeetingDismissal"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingDismissal_taskId_userId_key" ON "MeetingDismissal"("taskId", "userId");

-- AddForeignKey
ALTER TABLE "MeetingDismissal" ADD CONSTRAINT "MeetingDismissal_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingDismissal" ADD CONSTRAINT "MeetingDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
