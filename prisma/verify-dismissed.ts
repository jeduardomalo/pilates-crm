import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: "Frieda", mode: "insensitive" } },
        { name: { contains: "Kim", mode: "insensitive" } }
      ]
    },
    select: {
      id: true,
      name: true,
      classPackBalance: true,
      zeroBalanceWarningDismissed: true,
      sessions: {
        where: { type: "Package Purchase" },
        take: 1,
        select: { id: true }
      }
    }
  });
  
  console.log("\n=== Client Status ===");
  clients.forEach(c => {
    console.log(`${c.name}:`);
    console.log(`  Balance: ${c.classPackBalance}`);
    console.log(`  Dismissed: ${c.zeroBalanceWarningDismissed}`);
    console.log(`  Has Package: ${c.sessions.length > 0}`);
    console.log(`  Should show in notifications: ${c.classPackBalance === 0 && c.sessions.length > 0 && !c.zeroBalanceWarningDismissed}`);
  });
  
  // Ensure they're dismissed
  for (const client of clients) {
    if (client.name.includes("Frieda") || (client.name.includes("Kim") && client.name.includes("Cayre"))) {
      await prisma.client.update({
        where: { id: client.id },
        data: { zeroBalanceWarningDismissed: true },
      });
      console.log(`\n✓ Ensured ${client.name} is dismissed`);
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
