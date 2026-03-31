-- CreateEnum
CREATE TYPE "EntityAttachmentType" AS ENUM ('FILE', 'URL');

-- CreateTable
CREATE TABLE "entity_attachments" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "type" "EntityAttachmentType" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "storage_path" TEXT,
    "uploaded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entity_attachments_entity_id_idx" ON "entity_attachments"("entity_id");

-- CreateIndex
CREATE INDEX "entity_attachments_uploaded_by_idx" ON "entity_attachments"("uploaded_by");

-- CreateIndex
CREATE INDEX "entity_attachments_created_at_idx" ON "entity_attachments"("created_at");

-- AddForeignKey
ALTER TABLE "entity_attachments" ADD CONSTRAINT "entity_attachments_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_attachments" ADD CONSTRAINT "entity_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
