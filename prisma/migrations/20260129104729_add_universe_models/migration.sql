-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('SCENE', 'NPC', 'ENEMY', 'ITEM');

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "universe_id" INTEGER;

-- CreateTable
CREATE TABLE "universes" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cover_url" TEXT,
    "gm_id" TEXT NOT NULL,
    "rules_config" JSONB,

    CONSTRAINT "universes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "universe_id" INTEGER NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "universes" ADD CONSTRAINT "universes_gm_id_fkey" FOREIGN KEY ("gm_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_universe_id_fkey" FOREIGN KEY ("universe_id") REFERENCES "universes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_universe_id_fkey" FOREIGN KEY ("universe_id") REFERENCES "universes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
