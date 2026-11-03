import { PaymentMethod, PaymentStatus, PrismaClient, TermName, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("Educare123!", 12);
  const school = await prisma.school.upsert({
    where: { slug: "educare-demo-school" },
    update: {},
    create: {
      name: "Learnzy Hub Demo School",
      slug: "educare-demo-school",
      email: "admin@educare.demo",
      phone: "+234 800 000 0000",
      address: "16B, Alhaji Hussein Sunmonu Street, Lekki Phase 1, Lagos",
    },
  });

  const session = await prisma.academicSession.upsert({
    where: { schoolId_name: { schoolId: school.id, name: "2026/2027" } },
    update: { isCurrent: true },
    create: {
      schoolId: school.id,
      name: "2026/2027",
      startsOn: new Date("2026-09-01"),
      endsOn: new Date("2027-07-31"),
      isCurrent: true,
    },
  });

  const terms = await Promise.all(
    [
      [TermName.FIRST, "2026-09-01", "2026-12-18"],
      [TermName.SECOND, "2027-01-11", "2027-04-02"],
      [TermName.THIRD, "2027-04-26", "2027-07-31"],
    ].map(([name, startsOn, endsOn]) =>
      prisma.term.upsert({
        where: { sessionId_name: { sessionId: session.id, name: name as TermName } },
        update: { isCurrent: name === TermName.FIRST },
        create: {
          schoolId: school.id,
          sessionId: session.id,
          name: name as TermName,
          startsOn: new Date(startsOn as string),
          endsOn: new Date(endsOn as string),
          isCurrent: name === TermName.FIRST,
        },
      }),
    ),
  );
  await prisma.school.update({
    where: { id: school.id },
    data: { currentSessionId: session.id, currentTermId: terms[0].id },
  });

  const classNames = ["JSS1", "JSS2", "SS1"];
  const arms = [];
  for (const [index, name] of classNames.entries()) {
    const schoolClass = await prisma.schoolClass.upsert({
      where: { schoolId_name: { schoolId: school.id, name } },
      update: {},
      create: { schoolId: school.id, name, level: index + 1 },
    });
    arms.push(
      await prisma.classArm.upsert({
        where: { classId_name: { classId: schoolClass.id, name: "A" } },
        update: {},
        create: { schoolId: school.id, classId: schoolClass.id, name: "A" },
      }),
    );
  }

  const subjects = await Promise.all(
    [
      ["Mathematics", "MTH"],
      ["English Language", "ENG"],
      ["Basic Science", "BSC"],
      ["Civic Education", "CIV"],
    ].map(([name, code]) =>
      prisma.subject.upsert({
        where: { schoolId_code: { schoolId: school.id, code } },
        update: {},
        create: { schoolId: school.id, name, code },
      }),
    ),
  );
  for (const schoolClass of await prisma.schoolClass.findMany({ where: { schoolId: school.id } })) {
    for (const subject of subjects) {
      await prisma.classSubject.upsert({
        where: { classId_subjectId: { classId: schoolClass.id, subjectId: subject.id } },
        update: {},
        create: { classId: schoolClass.id, subjectId: subject.id },
      });
    }
  }

  const adminUser = await prisma.user.upsert({
    where: { schoolId_email: { schoolId: school.id, email: "admin@educare.demo" } },
    update: {},
    create: { schoolId: school.id, email: "admin@educare.demo", passwordHash, firstName: "Ada", lastName: "Okafor", role: UserRole.SUPER_ADMIN },
  });
  const teachers = [];
  for (const [index, name] of ["Chinedu Obi", "Amina Yusuf", "Tunde Balogun"].entries()) {
    const [firstName, lastName] = name.split(" ");
    const user = await prisma.user.upsert({
      where: { schoolId_email: { schoolId: school.id, email: `teacher${index + 1}@educare.demo` } },
      update: {},
      create: { schoolId: school.id, email: `teacher${index + 1}@educare.demo`, passwordHash, firstName, lastName, role: UserRole.TEACHER },
    });
    teachers.push(await prisma.staff.upsert({
      where: { userId: user.id },
      update: {},
      create: { schoolId: school.id, userId: user.id, staffNo: `STF/${String(index + 1).padStart(3, "0")}`, jobTitle: "Teacher" },
    }));
  }

  const guardians = [];
  for (const [index, name] of ["Ngozi Eze", "Ibrahim Musa"].entries()) {
    const [firstName, lastName] = name.split(" ");
    const user = await prisma.user.upsert({
      where: { schoolId_email: { schoolId: school.id, email: `parent${index + 1}@educare.demo` } },
      update: {},
      create: { schoolId: school.id, email: `parent${index + 1}@educare.demo`, passwordHash, firstName, lastName, role: UserRole.PARENT },
    });
    guardians.push(await prisma.guardian.upsert({
      where: { userId: user.id },
      update: {},
      create: { schoolId: school.id, userId: user.id, firstName, lastName, phone: `+234 801 000 000${index + 1}` },
    }));
  }

  const students = [];
  for (let index = 0; index < 10; index += 1) {
    const student = await prisma.student.upsert({
      where: { schoolId_admissionNo: { schoolId: school.id, admissionNo: `EDU/2026/${String(index + 1).padStart(4, "0")}` } },
      update: {},
      create: {
        schoolId: school.id,
        admissionNo: `EDU/2026/${String(index + 1).padStart(4, "0")}`,
        firstName: `Student${index + 1}`,
        lastName: index % 2 === 0 ? "Eze" : "Musa",
        sessionId: session.id,
        armId: arms[index % arms.length].id,
      },
    });
    const guardian = guardians[index % guardians.length];
    await prisma.studentGuardian.upsert({
      where: { studentId_guardianId: { studentId: student.id, guardianId: guardian.id } },
      update: {},
      create: { studentId: student.id, guardianId: guardian.id, relationship: "Parent", isPrimary: true },
    });
    if (index === 0) {
      const studentUser = await prisma.user.upsert({
        where: { schoolId_email: { schoolId: school.id, email: "student1@educare.demo" } },
        update: { firstName: student.firstName, lastName: student.lastName, role: UserRole.STUDENT },
        create: {
          schoolId: school.id,
          email: "student1@educare.demo",
          passwordHash,
          firstName: student.firstName,
          lastName: student.lastName,
          role: UserRole.STUDENT,
        },
      });
      await prisma.student.update({ where: { id: student.id }, data: { userId: studentUser.id } });
    }
    students.push(student);
  }

  for (const [index, staff] of teachers.entries()) {
    await prisma.teacherClass.upsert({
      where: { staffId_armId: { staffId: staff.id, armId: arms[index].id } },
      update: {},
      create: { staffId: staff.id, armId: arms[index].id },
    });
    await prisma.teacherSubject.upsert({
      where: { staffId_subjectId: { staffId: staff.id, subjectId: subjects[index].id } },
      update: {},
      create: { staffId: staff.id, subjectId: subjects[index].id },
    });
  }

  const fee = await prisma.feeStructure.create({
    data: { schoolId: school.id, sessionId: session.id, termId: terms[0].id, classId: (await prisma.schoolClass.findFirstOrThrow({ where: { schoolId: school.id } })).id, name: "Tuition", amount: 125000 },
  });
  for (const [index, student] of students.slice(0, 4).entries()) {
    await prisma.payment.upsert({
      where: { reference: `DEMO-PAY-${index + 1}` },
      update: {},
      create: { schoolId: school.id, studentId: student.id, guardianId: guardians[index % guardians.length].id, feeId: fee.id, reference: `DEMO-PAY-${index + 1}`, amount: 125000, method: PaymentMethod.CASH, status: PaymentStatus.PAID, paidAt: new Date() },
    });
  }

  console.log(`Seeded ${school.name}. Admin login: ${adminUser.email} / Educare123!`);
  console.log("Student login: student1@educare.demo / Educare123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
