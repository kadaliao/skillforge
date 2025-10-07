/*
  Warnings:

  - You are about to drop the column `notes` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `Activity` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Activity_userId_timestamp_idx";

-- AlterTable
ALTER TABLE "Activity" DROP COLUMN "notes",
DROP COLUMN "timestamp",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "submission" TEXT;

-- CreateIndex
CREATE INDEX "Activity_userId_createdAt_idx" ON "Activity"("userId", "createdAt");
