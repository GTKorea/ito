-- CreateTable
CREATE TABLE "TaskCompletionWatcher" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "watcherId" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "threadLinkId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskCompletionWatcher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskCompletionWatcher_taskId_idx" ON "TaskCompletionWatcher"("taskId");

-- CreateIndex
CREATE INDEX "TaskCompletionWatcher_watcherId_idx" ON "TaskCompletionWatcher"("watcherId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskCompletionWatcher_taskId_watcherId_addedById_key" ON "TaskCompletionWatcher"("taskId", "watcherId", "addedById");

-- AddForeignKey
ALTER TABLE "TaskCompletionWatcher" ADD CONSTRAINT "TaskCompletionWatcher_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCompletionWatcher" ADD CONSTRAINT "TaskCompletionWatcher_watcherId_fkey" FOREIGN KEY ("watcherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCompletionWatcher" ADD CONSTRAINT "TaskCompletionWatcher_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
