-- CreateEnum
CREATE TYPE "ConversionStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "edge_devices" ADD COLUMN "apiKeyHash" TEXT;

-- AlterTable
ALTER TABLE "materials" ADD COLUMN "pdfRelativePath" TEXT,
ADD COLUMN "conversionStatus" "ConversionStatus" NOT NULL DEFAULT 'NOT_REQUIRED';

-- CreateIndex
CREATE UNIQUE INDEX "edge_devices_apiKeyHash_key" ON "edge_devices"("apiKeyHash");
