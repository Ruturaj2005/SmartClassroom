import { PrismaClient, DayOfWeek } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SmartClass database...');

  // ── Clear existing data (dev only) ──────────────────────────────────────────
  await prisma.edgeCacheEntry.deleteMany();
  await prisma.lectureSession.deleteMany();
  await prisma.material.deleteMany();
  await prisma.timetableSlot.deleteMany();
  await prisma.courseAssignment.deleteMany();
  await prisma.rFIDCard.deleteMany();
  await prisma.edgeDevice.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.course.deleteMany();
  await prisma.faculty.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleared existing data');

  // ── Admin user ───────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@smartclass.edu',
      passwordHash: adminHash,
      role: 'ADMIN',
      faculty: {
        create: {
          employeeId: 'ADM001',
          name: 'System Administrator',
          department: 'Administration',
          designation: 'System Admin',
        },
      },
    },
    include: { faculty: true },
  });

  console.log('✅ Admin created:', admin.email);

  // ── Faculty members ──────────────────────────────────────────────────────────
  const facultyData = [
    {
      email: 'priya.sharma@smartclass.edu',
      employeeId: 'FAC001',
      name: 'Dr. Priya Sharma',
      department: 'Computer Science',
      designation: 'Associate Professor',
      rfidUid: '04:A1:B2:C3:D4',
    },
    {
      email: 'rahul.mehta@smartclass.edu',
      employeeId: 'FAC002',
      name: 'Prof. Rahul Mehta',
      department: 'Electronics',
      designation: 'Assistant Professor',
      rfidUid: '04:E5:F6:07:18',
    },
    {
      email: 'kavita.nair@smartclass.edu',
      employeeId: 'FAC003',
      name: 'Dr. Kavita Nair',
      department: 'Computer Science',
      designation: 'Professor',
      rfidUid: '04:29:3A:4B:5C',
    },
    {
      email: 'arun.kumar@smartclass.edu',
      employeeId: 'FAC004',
      name: 'Prof. Arun Kumar',
      department: 'Information Technology',
      designation: 'Senior Lecturer',
      rfidUid: '04:6D:7E:8F:90',
    },
  ];

  const facultyPassword = await bcrypt.hash('Faculty@123', 12);
  const createdFaculty: Record<string, { userId: string; facultyId: string; rfidId: string }> = {};

  for (const fd of facultyData) {
    const user = await prisma.user.create({
      data: {
        email: fd.email,
        passwordHash: facultyPassword,
        role: 'FACULTY',
        faculty: {
          create: {
            employeeId: fd.employeeId,
            name: fd.name,
            department: fd.department,
            designation: fd.designation,
          },
        },
      },
      include: { faculty: true },
    });

    const rfid = await prisma.rFIDCard.create({
      data: {
        uid: fd.rfidUid,
        facultyId: user.faculty!.id,
        status: 'ACTIVE',
      },
    });

    createdFaculty[fd.employeeId] = {
      userId: user.id,
      facultyId: user.faculty!.id,
      rfidId: rfid.id,
    };

    console.log(`✅ Faculty created: ${fd.name} (RFID: ${fd.rfidUid})`);
  }

  // ── Courses ───────────────────────────────────────────────────────────────────
  const courses = await prisma.course.createMany({
    data: [
      {
        courseCode: 'IOT301',
        courseName: 'Internet of Things',
        department: 'Computer Science',
        description: 'Fundamentals of IoT architecture, protocols, and embedded systems.',
      },
      {
        courseCode: 'DBMS201',
        courseName: 'Database Management Systems',
        department: 'Computer Science',
        description: 'Relational databases, SQL, normalization, and transaction management.',
      },
      {
        courseCode: 'OS401',
        courseName: 'Operating Systems',
        department: 'Computer Science',
        description: 'Process management, memory management, file systems, and concurrency.',
      },
      {
        courseCode: 'VLSI302',
        courseName: 'VLSI Design',
        department: 'Electronics',
        description: 'CMOS design, digital circuits, and FPGA programming.',
      },
      {
        courseCode: 'ML501',
        courseName: 'Machine Learning',
        department: 'Information Technology',
        description: 'Supervised and unsupervised learning, neural networks, and model evaluation.',
      },
    ],
  });

  const allCourses = await prisma.course.findMany();
  const courseMap: Record<string, string> = {};
  for (const c of allCourses) { courseMap[c.courseCode] = c.id; }

  console.log(`✅ ${allCourses.length} courses created`);

  // ── Course assignments ─────────────────────────────────────────────────────
  await prisma.courseAssignment.createMany({
    data: [
      {
        facultyId: createdFaculty['FAC001'].facultyId,
        courseId: courseMap['IOT301'],
        academicYear: '2025-2026',
        semester: 'Semester 5',
      },
      {
        facultyId: createdFaculty['FAC003'].facultyId,
        courseId: courseMap['DBMS201'],
        academicYear: '2025-2026',
        semester: 'Semester 3',
      },
      {
        facultyId: createdFaculty['FAC003'].facultyId,
        courseId: courseMap['OS401'],
        academicYear: '2025-2026',
        semester: 'Semester 7',
      },
      {
        facultyId: createdFaculty['FAC002'].facultyId,
        courseId: courseMap['VLSI302'],
        academicYear: '2025-2026',
        semester: 'Semester 5',
      },
      {
        facultyId: createdFaculty['FAC004'].facultyId,
        courseId: courseMap['ML501'],
        academicYear: '2025-2026',
        semester: 'Semester 7',
      },
    ],
  });

  console.log('✅ Course assignments created');

  // ── Classrooms ─────────────────────────────────────────────────────────────
  const classrooms = await prisma.classroom.createMany({
    data: [
      { name: 'C-302', building: 'C Block', floor: '3rd', roomNumber: '302' },
      { name: 'C-303', building: 'C Block', floor: '3rd', roomNumber: '303' },
      { name: 'A-101', building: 'A Block', floor: '1st', roomNumber: '101' },
    ],
  });

  const allClassrooms = await prisma.classroom.findMany();
  const classroomMap: Record<string, string> = {};
  for (const c of allClassrooms) { classroomMap[c.name] = c.id; }

  console.log(`✅ ${allClassrooms.length} classrooms created`);

  // ── Edge devices ───────────────────────────────────────────────────────────
  await prisma.edgeDevice.create({
    data: {
      deviceCode: 'PI-C302',
      classroomId: classroomMap['C-302'],
      status: 'OFFLINE',
      softwareVersion: '1.0.0',
    },
  });

  console.log('✅ Edge device PI-C302 registered (offline, pending hardware)');

  // ── Timetable slots ─────────────────────────────────────────────────────────
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

  await prisma.timetableSlot.createMany({
    data: [
      // IoT - Mon/Wed 10:00–11:00 in C-302 with Dr. Priya Sharma
      {
        courseId: courseMap['IOT301'],
        facultyId: createdFaculty['FAC001'].facultyId,
        classroomId: classroomMap['C-302'],
        dayOfWeek: 'MONDAY',
        startTime: '10:00',
        endTime: '11:00',
        academicYear: '2025-2026',
        semester: 'Semester 5',
      },
      {
        courseId: courseMap['IOT301'],
        facultyId: createdFaculty['FAC001'].facultyId,
        classroomId: classroomMap['C-302'],
        dayOfWeek: 'WEDNESDAY',
        startTime: '10:00',
        endTime: '11:00',
        academicYear: '2025-2026',
        semester: 'Semester 5',
      },
      // DBMS - Tue/Thu 11:30–12:30 in C-303 with Dr. Kavita Nair
      {
        courseId: courseMap['DBMS201'],
        facultyId: createdFaculty['FAC003'].facultyId,
        classroomId: classroomMap['C-303'],
        dayOfWeek: 'TUESDAY',
        startTime: '11:30',
        endTime: '12:30',
        academicYear: '2025-2026',
        semester: 'Semester 3',
      },
      {
        courseId: courseMap['DBMS201'],
        facultyId: createdFaculty['FAC003'].facultyId,
        classroomId: classroomMap['C-303'],
        dayOfWeek: 'THURSDAY',
        startTime: '11:30',
        endTime: '12:30',
        academicYear: '2025-2026',
        semester: 'Semester 3',
      },
      // OS - Mon 14:00–15:00 in A-101 with Dr. Kavita Nair
      {
        courseId: courseMap['OS401'],
        facultyId: createdFaculty['FAC003'].facultyId,
        classroomId: classroomMap['A-101'],
        dayOfWeek: 'MONDAY',
        startTime: '14:00',
        endTime: '15:00',
        academicYear: '2025-2026',
        semester: 'Semester 7',
      },
      // VLSI - Fri 09:00–10:30 in C-302 with Prof. Rahul Mehta
      {
        courseId: courseMap['VLSI302'],
        facultyId: createdFaculty['FAC002'].facultyId,
        classroomId: classroomMap['C-302'],
        dayOfWeek: 'FRIDAY',
        startTime: '09:00',
        endTime: '10:30',
        academicYear: '2025-2026',
        semester: 'Semester 5',
      },
      // ML - Wed 14:00–15:30 in A-101 with Prof. Arun Kumar
      {
        courseId: courseMap['ML501'],
        facultyId: createdFaculty['FAC004'].facultyId,
        classroomId: classroomMap['A-101'],
        dayOfWeek: 'WEDNESDAY',
        startTime: '14:00',
        endTime: '15:30',
        academicYear: '2025-2026',
        semester: 'Semester 7',
      },
    ],
  });

  console.log('✅ Timetable slots created');

  console.log('\n🎉 Seed completed!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Login credentials:');
  console.log('  Admin:   admin@smartclass.edu / Admin@123');
  console.log('  Faculty: priya.sharma@smartclass.edu / Faculty@123');
  console.log('  Faculty: rahul.mehta@smartclass.edu / Faculty@123');
  console.log('  Faculty: kavita.nair@smartclass.edu / Faculty@123');
  console.log('  Faculty: arun.kumar@smartclass.edu / Faculty@123');
  console.log('\nRFID UIDs (for RFID Test Console):');
  console.log('  Dr. Priya Sharma: 04:A1:B2:C3:D4');
  console.log('  Prof. Rahul Mehta: 04:E5:F6:07:18');
  console.log('  Dr. Kavita Nair: 04:29:3A:4B:5C');
  console.log('  Prof. Arun Kumar: 04:6D:7E:8F:90');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
