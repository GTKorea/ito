-- CreateTable
CREATE TABLE "TaskCoCreator" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskCoCreator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskCoCreator_taskId_idx" ON "TaskCoCreator"("taskId");

-- CreateIndex
CREATE INDEX "TaskCoCreator_userId_idx" ON "TaskCoCreator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskCoCreator_taskId_userId_key" ON "TaskCoCreator"("taskId", "userId");

-- AddForeignKey
ALTER TABLE "TaskCoCreator" ADD CONSTRAINT "TaskCoCreator_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCoCreator" ADD CONSTRAINT "TaskCoCreator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
