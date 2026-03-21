-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CHAT_MESSAGE';

-- AlterTable
ALTER TABLE "SlackWorkspace" ALTER COLUMN "updatedAt" DROP DEFAULT;
