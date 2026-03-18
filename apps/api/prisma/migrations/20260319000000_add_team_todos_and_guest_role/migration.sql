-- AlterEnum: Add GUEST to WorkspaceRole
ALTER TYPE "WorkspaceRole" ADD VALUE 'GUEST';

-- AlterTable: Add description to Workspace
ALTER TABLE "Workspace" ADD COLUMN "description" TEXT;

-- AlterTable: Add teamId to Todo
ALTER TABLE "Todo" ADD COLUMN "teamId" TEXT;

-- AlterTable: Add role to WorkspaceInvite
ALTER TABLE "WorkspaceInvite" ADD COLUMN "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER';

-- CreateIndex
CREATE INDEX "Todo_teamId_idx" ON "Todo"("teamId");

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
