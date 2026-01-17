-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('DISCHARGE_SUMMARY', 'LAB_RESULT', 'CONSULTATION_NOTE', 'PRESCRIPTION', 'RADIOLOGY_REPORT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('DIAGNOSIS', 'MEDICATION_START', 'MEDICATION_STOP', 'MEDICATION_CHANGE', 'PROCEDURE', 'LAB_RESULT', 'HOSPITAL_ADMISSION', 'HOSPITAL_DISCHARGE', 'OFFICE_VISIT', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "profilePicture" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "externalId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "storage_bucket" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "documentType" "DocumentType",
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "processingStartedAt" TIMESTAMP(3),
    "processingCompletedAt" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_extractions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "extractedData" JSONB NOT NULL,
    "confidenceScore" DOUBLE PRECISION,
    "processingTimeMs" INTEGER,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validationWarnings" JSONB,
    "validationErrors" JSONB,

    CONSTRAINT "document_extractions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_events" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "extractionId" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "structuredData" JSONB,
    "confidence" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "document_extractions_documentId_key" ON "document_extractions"("documentId");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_extractions" ADD CONSTRAINT "document_extractions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_extractionId_fkey" FOREIGN KEY ("extractionId") REFERENCES "document_extractions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
