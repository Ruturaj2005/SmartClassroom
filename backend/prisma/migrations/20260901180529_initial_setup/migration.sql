-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'FACULTY');

-- CreateEnum
CREATE TYPE "RFIDStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LOST');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "CacheStatus" AS ENUM ('CACHED', 'EXPIRED', 'INVALID');

-- CreateEnum
CREATE TYPE "RetrievalMode" AS ENUM ('CACHE', 'SERVER', 'OFFLINE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('STARTED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'FACULTY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculty" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfid_cards" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "status" "RFIDStatus" NOT NULL DEFAULT 'ACTIVE',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "rfid_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "description" TEXT,
    "department" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_assignments" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classrooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "building" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edge_devices" (
    "id" TEXT NOT NULL,
    "deviceCode" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'OFFLINE',
    "lastSeenAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "softwareVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "edge_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_slots" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "originalFileName" TEXT NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fileHash" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lecture_sessions" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "materialId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "retrievalMode" "RetrievalMode" NOT NULL DEFAULT 'SERVER',
    "status" "SessionStatus" NOT NULL DEFAULT 'STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lecture_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edge_cache_entries" (
    "id" TEXT NOT NULL,
    "edgeDeviceId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "materialVersion" INTEGER NOT NULL,
    "fileHash" TEXT NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" "CacheStatus" NOT NULL DEFAULT 'CACHED',

    CONSTRAINT "edge_cache_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "faculty_userId_key" ON "faculty"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "faculty_employeeId_key" ON "faculty"("employeeId");

-- CreateIndex
CREATE INDEX "faculty_employeeId_idx" ON "faculty"("employeeId");

-- CreateIndex
CREATE INDEX "faculty_userId_idx" ON "faculty"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "rfid_cards_uid_key" ON "rfid_cards"("uid");

-- CreateIndex
CREATE INDEX "rfid_cards_uid_idx" ON "rfid_cards"("uid");

-- CreateIndex
CREATE INDEX "rfid_cards_facultyId_idx" ON "rfid_cards"("facultyId");

-- CreateIndex
CREATE UNIQUE INDEX "courses_courseCode_key" ON "courses"("courseCode");

-- CreateIndex
CREATE INDEX "courses_courseCode_idx" ON "courses"("courseCode");

-- CreateIndex
CREATE INDEX "course_assignments_facultyId_idx" ON "course_assignments"("facultyId");

-- CreateIndex
CREATE INDEX "course_assignments_courseId_idx" ON "course_assignments"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "course_assignments_facultyId_courseId_academicYear_semester_key" ON "course_assignments"("facultyId", "courseId", "academicYear", "semester");

-- CreateIndex
CREATE UNIQUE INDEX "edge_devices_deviceCode_key" ON "edge_devices"("deviceCode");

-- CreateIndex
CREATE UNIQUE INDEX "edge_devices_classroomId_key" ON "edge_devices"("classroomId");

-- CreateIndex
CREATE INDEX "edge_devices_deviceCode_idx" ON "edge_devices"("deviceCode");

-- CreateIndex
CREATE INDEX "timetable_slots_dayOfWeek_idx" ON "timetable_slots"("dayOfWeek");

-- CreateIndex
CREATE INDEX "timetable_slots_classroomId_idx" ON "timetable_slots"("classroomId");

-- CreateIndex
CREATE INDEX "timetable_slots_facultyId_idx" ON "timetable_slots"("facultyId");

-- CreateIndex
CREATE INDEX "timetable_slots_courseId_idx" ON "timetable_slots"("courseId");

-- CreateIndex
CREATE INDEX "materials_courseId_idx" ON "materials"("courseId");

-- CreateIndex
CREATE INDEX "materials_uploadedById_idx" ON "materials"("uploadedById");

-- CreateIndex
CREATE INDEX "lecture_sessions_facultyId_idx" ON "lecture_sessions"("facultyId");

-- CreateIndex
CREATE INDEX "lecture_sessions_courseId_idx" ON "lecture_sessions"("courseId");

-- CreateIndex
CREATE INDEX "lecture_sessions_classroomId_idx" ON "lecture_sessions"("classroomId");

-- CreateIndex
CREATE INDEX "edge_cache_entries_edgeDeviceId_idx" ON "edge_cache_entries"("edgeDeviceId");

-- CreateIndex
CREATE INDEX "edge_cache_entries_materialId_idx" ON "edge_cache_entries"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "edge_cache_entries_edgeDeviceId_materialId_key" ON "edge_cache_entries"("edgeDeviceId", "materialId");

-- AddForeignKey
ALTER TABLE "faculty" ADD CONSTRAINT "faculty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfid_cards" ADD CONSTRAINT "rfid_cards_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edge_devices" ADD CONSTRAINT "edge_devices_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecture_sessions" ADD CONSTRAINT "lecture_sessions_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecture_sessions" ADD CONSTRAINT "lecture_sessions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecture_sessions" ADD CONSTRAINT "lecture_sessions_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecture_sessions" ADD CONSTRAINT "lecture_sessions_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edge_cache_entries" ADD CONSTRAINT "edge_cache_entries_edgeDeviceId_fkey" FOREIGN KEY ("edgeDeviceId") REFERENCES "edge_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edge_cache_entries" ADD CONSTRAINT "edge_cache_entries_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
