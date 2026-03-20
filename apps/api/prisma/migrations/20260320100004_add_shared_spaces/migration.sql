-- CreateEnum
CREATE TYPE "SharedSpaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'SHARED_SPACE_INVITE';

-- AlterTable
ALTER TABLE "Todo" ADD COLUMN "sharedSpaceId" TEXT;

-- CreateTable
CREATE TABLE "SharedSpace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedSpace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedSpaceParticipant" (
    "id" TEXT NOT NULL,
    "sharedSpaceId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "SharedSpaceRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedSpaceParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedSpaceInvite" (
    "id" TEXT NOT NULL,
    "sharedSpaceId" TEXT NOT NULL,
    "workspaceSlug" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedSpaceInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SharedSpace_createdById_idx" ON "SharedSpace"("createdById");

-- CreateIndex
CREATE INDEX "SharedSpaceParticipant_workspaceId_idx" ON "SharedSpaceParticipant"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedSpaceParticipant_sharedSpaceId_workspaceId_key" ON "SharedSpaceParticipant"("sharedSpaceId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedSpaceInvite_token_key" ON "SharedSpaceInvite"("token");

-- CreateIndex
CREATE INDEX "SharedSpaceInvite_sharedSpaceId_idx" ON "SharedSpaceInvite"("sharedSpaceId");

-- CreateIndex
CREATE INDEX "SharedSpaceInvite_workspaceSlug_idx" ON "SharedSpaceInvite"("workspaceSlug");

-- CreateIndex
CREATE INDEX "Todo_sharedSpaceId_idx" ON "Todo"("sharedSpaceId");

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_sharedSpaceId_fkey" FOREIGN KEY ("sharedSpaceId") REFERENCES "SharedSpace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedSpace" ADD CONSTRAINT "SharedSpace_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedSpaceParticipant" ADD CONSTRAINT "SharedSpaceParticipant_sharedSpaceId_fkey" FOREIGN KEY ("sharedSpaceId") REFERENCES "SharedSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedSpaceParticipant" ADD CONSTRAINT "SharedSpaceParticipant_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedSpaceInvite" ADD CONSTRAINT "SharedSpaceInvite_sharedSpaceId_fkey" FOREIGN KEY ("sharedSpaceId") REFERENCES "SharedSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
