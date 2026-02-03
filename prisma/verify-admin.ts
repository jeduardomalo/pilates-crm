/**
 * One-off script to verify admin exists and password "admin123" matches.
 * Run: TS_NODE_COMPILER_OPTIONS='{"module":"commonjs"}' npx ts-node prisma/verify-admin.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.admin.findFirst({
    where: {
      OR: [{ username: "admin" }, { email: "admin@example.com" }],
    },
  });
  if (!admin) {
    console.error("No admin found with username 'admin' or email 'admin@example.com'.");
    process.exit(1);
  }
  console.log("Admin found:", { id: admin.id, username: admin.username, email: admin.email });
  const ok = await bcrypt.compare("admin123", admin.password);
  if (!ok) {
    console.error("Password 'admin123' does NOT match. Run: npm run create-admin");
    process.exit(1);
  }
  console.log("Password 'admin123' matches.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
