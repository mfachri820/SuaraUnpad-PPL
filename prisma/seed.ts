import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@unpad.ac.id" },
    update: {},
    create: {
      email: "admin@unpad.ac.id",
      passwordHash: hashedPassword,
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

  console.log("Seed berhasil");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());