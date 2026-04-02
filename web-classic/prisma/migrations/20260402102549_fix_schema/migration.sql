-- AlterTable
ALTER TABLE "entities" ADD COLUMN     "parent_id" TEXT;

-- CreateIndex
CREATE INDEX "entities_parent_id_idx" ON "entities"("parent_id");

-- AddForeignKey
ALTER TABLE "entities" ADD CONSTRAINT "entities_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
