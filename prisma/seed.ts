import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const hashedAdminPassword = await bcrypt.hash("admin123", 10);
  const hashedLecturerPassword = await bcrypt.hash("lecturer123", 10);

  await prisma.user.upsert({
    where: { email: "admin@unpad.ac.id" },
    update: {},
    create: {
      email: "admin@unpad.ac.id",
      passwordHash: hashedAdminPassword,
      role: "ADMIN",
      isVerified: true,
      adminProfile: {
        create: {
          fullName: "Super Admin SuaraUnpad",
          department: "Biro Kemahasiswaan",
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "lecturer@unpad.ac.id" },
    update: {},
    create: {
      email: "lecturer@unpad.ac.id",
      passwordHash: hashedLecturerPassword,
      role: "LECTURER",
      isVerified: true,
      lecturerProfile: {
        create: {
          fullName: "Dosen SuaraUnpad",
          employeeId: "LTC-123456",
          faculty: "FMIPA",
        },
      },
    },
  });

  console.log("Seed berhasil");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());