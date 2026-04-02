-- CreateEnum
CREATE TYPE "KpiIndicatorType" AS ENUM ('LEADING', 'LAGGING');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPROVAL_PENDING', 'VALUE_APPROVED', 'VALUE_REJECTED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "rag_amber_min" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "rag_green_min" INTEGER NOT NULL DEFAULT 75;

-- AlterTable
ALTER TABLE "entities" ADD COLUMN     "indicator_type" "KpiIndicatorType",
ADD COLUMN     "max_value" DOUBLE PRECISION,
ADD COLUMN     "min_value" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "entity_id" TEXT,
    "entity_value_id" TEXT,
    "message" TEXT NOT NULL,
    "message_ar" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_org_id_idx" ON "notifications"("org_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
