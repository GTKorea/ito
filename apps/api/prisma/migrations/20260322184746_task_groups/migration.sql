-- DropForeignKey
ALTER TABLE "ThreadLink" DROP CONSTRAINT "ThreadLink_toUserId_fkey";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "taskGroupId" TEXT;

-- CreateTable
CREATE TABLE "TaskGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "workspaceId" TEXT,
    "sharedSpaceId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskGroupMember" (
    "id" TEXT NOT NULL,
    "taskGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskGroup_workspaceId_idx" ON "TaskGroup"("workspaceId");

-- CreateIndex
CREATE INDEX "TaskGroup_sharedSpaceId_idx" ON "TaskGroup"("sharedSpaceId");

-- CreateIndex
CREATE INDEX "TaskGroupMember_taskGroupId_idx" ON "TaskGroupMember"("taskGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskGroupMember_taskGroupId_userId_key" ON "TaskGroupMember"("taskGroupId", "userId");

-- CreateIndex
CREATE INDEX "Task_taskGroupId_idx" ON "Task"("taskGroupId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_taskGroupId_fkey" FOREIGN KEY ("taskGroupId") REFERENCES "TaskGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadLink" ADD CONSTRAINT "ThreadLink_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskGroup" ADD CONSTRAINT "TaskGroup_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskGroup" ADD CONSTRAINT "TaskGroup_sharedSpaceId_fkey" FOREIGN KEY ("sharedSpaceId") REFERENCES "SharedSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskGroup" ADD CONSTRAINT "TaskGroup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskGroupMember" ADD CONSTRAINT "TaskGroupMember_taskGroupId_fkey" FOREIGN KEY ("taskGroupId") REFERENCES "TaskGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskGroupMember" ADD CONSTRAINT "TaskGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
