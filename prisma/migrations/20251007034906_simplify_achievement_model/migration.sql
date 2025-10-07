/*
  Warnings:

  - You are about to drop the column `criteria` on the `Achievement` table. All the data in the column will be lost.
  - You are about to drop the column `icon` on the `Achievement` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Achievement` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Achievement` table. All the data in the column will be lost.
  - Added the required column `iconName` to the `Achievement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Achievement` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Achievement_type_idx";

-- DropIndex
DROP INDEX "public"."Achievement_type_key";

-- AlterTable
ALTER TABLE "Achievement" DROP COLUMN "criteria",
DROP COLUMN "icon",
DROP COLUMN "title",
DROP COLUMN "type",
ADD COLUMN     "iconName" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;
