import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking all clients with zero balance and package purchases...");
  
  // Get all clients with package purchases
  const clientsWithPackages = await prisma.client.findMany({
    where: {
      sessions: {
        some: {
          type: "Package Purchase"
        }
      },
      classPackBalance: 0
    },
    select: {
      name: true,
      zeroBalanceWarningDismissed: true,
      classPackBalance: true
    }
  });
  
  console.log("\nClients with zero balance who purchased packages:");
  clientsWithPackages.forEach(c => {
    console.log(`${c.name}: dismissed=${c.zeroBalanceWarningDismissed}, balance=${c.classPackBalance}`);
  });
  
  const notDismissed = clientsWithPackages.filter(c => !c.zeroBalanceWarningDismissed);
  console.log(`\nNot dismissed: ${notDismissed.length}`);
  notDismissed.forEach(c => console.log(`  - ${c.name}`));
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
