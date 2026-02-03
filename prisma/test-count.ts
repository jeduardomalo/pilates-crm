import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Replicate the exact query from getLowBalanceClientsCount
  const clients = await prisma.client.findMany({
    include: {
      sessions: {
        where: {
          type: "Package Purchase"
        },
        take: 1
      }
    },
  });

  console.log("\n=== All clients with packages ===");
  clients.forEach(c => {
    if (c.sessions.length > 0) {
      console.log(`${c.name}: balance=${c.classPackBalance}, dismissed=${c.zeroBalanceWarningDismissed}, hasPackage=${c.sessions.length > 0}`);
    }
  });

  // Filter exactly like getLowBalanceClientsCount
  const zeroBalance = clients.filter(c => 
    c.classPackBalance === 0 && 
    c.sessions.length > 0 && 
    !c.zeroBalanceWarningDismissed
  );
  
  const lowBalance = clients.filter(c => 
    c.classPackBalance > 0 && 
    c.classPackBalance <= 3 && 
    c.sessions.length > 0
  );
  
  console.log(`\n=== Count Results ===`);
  console.log(`Zero balance (not dismissed): ${zeroBalance.length}`);
  zeroBalance.forEach(c => console.log(`  - ${c.name}`));
  console.log(`Low balance: ${lowBalance.length}`);
  lowBalance.forEach(c => console.log(`  - ${c.name} (${c.classPackBalance})`));
  console.log(`Total: ${zeroBalance.length + lowBalance.length}`);
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
