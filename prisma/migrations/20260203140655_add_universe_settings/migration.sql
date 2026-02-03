-- AlterTable
ALTER TABLE "universes" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tags" TEXT[];
