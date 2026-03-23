-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('STANDARD', 'VOTE');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'VOTE_COMPLETE';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "type" "TaskType" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "voteConfig" JSONB;

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vote_taskId_idx" ON "Vote"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_taskId_userId_key" ON "Vote"("taskId", "userId");

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
