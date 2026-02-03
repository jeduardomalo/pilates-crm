import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2] ?? "admin";
  const password = process.argv[3] ?? "admin123";
  const email = process.argv[4] ?? "admin@example.com";
  const name = process.argv[5] ?? "Admin";

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const admin = await prisma.admin.upsert({
      where: { email },
      update: {
        username,
        password: hashedPassword,
        name,
      },
      create: {
        username,
        email,
        password: hashedPassword,
        name,
      },
    });

    console.log(`✅ Admin user created/updated successfully!`);
    console.log(`   Username: ${admin.username ?? "(same as email)"}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.name || "N/A"}`);
    console.log(`   Use username "${username}" and your password to log in.`);
  } catch (error) {
    console.error("❌ Error creating admin:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
