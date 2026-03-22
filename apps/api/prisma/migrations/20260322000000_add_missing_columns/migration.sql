-- Add missing columns to ChatMessage (parentId, replyCount)
ALTER TABLE "ChatMessage" ADD COLUMN "parentId" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN "replyCount" INTEGER NOT NULL DEFAULT 0;

-- Add missing column to File (chatMessageId)
ALTER TABLE "File" ADD COLUMN "chatMessageId" TEXT;

-- Create indexes
CREATE INDEX "ChatMessage_parentId_idx" ON "ChatMessage"("parentId");
CREATE INDEX "File_chatMessageId_idx" ON "File"("chatMessageId");

-- Add foreign keys
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "File" ADD CONSTRAINT "File_chatMessageId_fkey" FOREIGN KEY ("chatMessageId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create SlackLinkCode table
CREATE TABLE "SlackLinkCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlackLinkCode_pkey" PRIMARY KEY ("id")
);

-- Create unique index on code
CREATE UNIQUE INDEX "SlackLinkCode_code_key" ON "SlackLinkCode"("code");

-- Create index on userId
CREATE INDEX "SlackLinkCode_userId_idx" ON "SlackLinkCode"("userId");

-- Add foreign key
ALTER TABLE "SlackLinkCode" ADD CONSTRAINT "SlackLinkCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
