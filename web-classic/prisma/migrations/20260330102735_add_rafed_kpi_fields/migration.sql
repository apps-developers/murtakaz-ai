-- CreateEnum
CREATE TYPE "ComplexityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('KEEP', 'MODIFY', 'REMOVE');

-- AlterTable
ALTER TABLE "entities" ADD COLUMN     "complexity_level" "ComplexityLevel",
ADD COLUMN     "long_term_target" DOUBLE PRECISION,
ADD COLUMN     "review_decision" "ReviewDecision",
ADD COLUMN     "sector" TEXT;
