-- CreateTable
CREATE TABLE "SlackWorkspace" (
    "id" TEXT NOT NULL,
    "slackTeamId" TEXT NOT NULL,
    "slackTeamName" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlackWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlackUser" (
    "id" TEXT NOT NULL,
    "slackUserId" TEXT NOT NULL,
    "slackWorkspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slackChannelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlackUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlackWorkspace_slackTeamId_key" ON "SlackWorkspace"("slackTeamId");

-- CreateIndex
CREATE INDEX "SlackWorkspace_workspaceId_idx" ON "SlackWorkspace"("workspaceId");

-- CreateIndex
CREATE INDEX "SlackUser_userId_idx" ON "SlackUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SlackUser_slackUserId_slackWorkspaceId_key" ON "SlackUser"("slackUserId", "slackWorkspaceId");

-- AddForeignKey
ALTER TABLE "SlackWorkspace" ADD CONSTRAINT "SlackWorkspace_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlackUser" ADD CONSTRAINT "SlackUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlackUser" ADD CONSTRAINT "SlackUser_slackWorkspaceId_fkey" FOREIGN KEY ("slackWorkspaceId") REFERENCES "SlackWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
