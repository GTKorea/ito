-- Rename Todo table to Task
ALTER TABLE "Todo" RENAME TO "Task";

-- Rename TodoStatus enum to TaskStatus
ALTER TYPE "TodoStatus" RENAME TO "TaskStatus";

-- Rename NotificationType enum values
ALTER TYPE "NotificationType" RENAME VALUE 'TODO_ASSIGNED' TO 'TASK_ASSIGNED';
ALTER TYPE "NotificationType" RENAME VALUE 'TODO_COMPLETED' TO 'TASK_COMPLETED';

-- Rename todoId columns to taskId
ALTER TABLE "ThreadLink" RENAME COLUMN "todoId" TO "taskId";
ALTER TABLE "File" RENAME COLUMN "todoId" TO "taskId";
ALTER TABLE "ChatMessage" RENAME COLUMN "todoId" TO "taskId";

-- Rename indexes on Task table (formerly Todo)
ALTER INDEX "Todo_pkey" RENAME TO "Task_pkey";
ALTER INDEX "Todo_assigneeId_idx" RENAME TO "Task_assigneeId_idx";
ALTER INDEX "Todo_creatorId_idx" RENAME TO "Task_creatorId_idx";
ALTER INDEX "Todo_workspaceId_idx" RENAME TO "Task_workspaceId_idx";
ALTER INDEX "Todo_teamId_idx" RENAME TO "Task_teamId_idx";
ALTER INDEX "Todo_sharedSpaceId_idx" RENAME TO "Task_sharedSpaceId_idx";

-- Rename indexes referencing todoId
ALTER INDEX "ThreadLink_todoId_chainIndex_idx" RENAME TO "ThreadLink_taskId_chainIndex_idx";
ALTER INDEX "File_todoId_idx" RENAME TO "File_taskId_idx";
ALTER INDEX "ChatMessage_todoId_createdAt_idx" RENAME TO "ChatMessage_taskId_createdAt_idx";

-- Rename foreign key constraints
ALTER TABLE "Task" RENAME CONSTRAINT "Todo_creatorId_fkey" TO "Task_creatorId_fkey";
ALTER TABLE "Task" RENAME CONSTRAINT "Todo_assigneeId_fkey" TO "Task_assigneeId_fkey";
ALTER TABLE "Task" RENAME CONSTRAINT "Todo_workspaceId_fkey" TO "Task_workspaceId_fkey";
ALTER TABLE "Task" RENAME CONSTRAINT "Todo_teamId_fkey" TO "Task_teamId_fkey";
ALTER TABLE "Task" RENAME CONSTRAINT "Todo_sharedSpaceId_fkey" TO "Task_sharedSpaceId_fkey";
ALTER TABLE "ThreadLink" RENAME CONSTRAINT "ThreadLink_todoId_fkey" TO "ThreadLink_taskId_fkey";
ALTER TABLE "File" RENAME CONSTRAINT "File_todoId_fkey" TO "File_taskId_fkey";
ALTER TABLE "ChatMessage" RENAME CONSTRAINT "ChatMessage_todoId_fkey" TO "ChatMessage_taskId_fkey";
