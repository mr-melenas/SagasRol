-- AlterTable
ALTER TABLE "universes" ADD COLUMN     "sheetTemplateId" TEXT;

-- CreateTable
CREATE TABLE "character_sheet_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "structure" JSONB NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "character_sheet_templates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "universes" ADD CONSTRAINT "universes_sheetTemplateId_fkey" FOREIGN KEY ("sheetTemplateId") REFERENCES "character_sheet_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
