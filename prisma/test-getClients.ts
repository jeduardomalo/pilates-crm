import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Simulate getClients logic
  const clients = await prisma.client.findMany({
    include: {
      sessions: {
        orderBy: { date: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  const packagePurchaseSessions = await prisma.session.findMany({
    where: { type: "Package Purchase" },
    select: {
      clients: {
        select: { id: true }
      }
    }
  });

  const clientsWithPackages = new Set<string>();
  packagePurchaseSessions.forEach(session => {
    session.clients.forEach(client => {
      clientsWithPackages.add(client.id);
    });
  });

  const result = clients.map((client) => {
    return {
      id: client.id,
      name: client.name,
      classPackBalance: client.classPackBalance,
      hasPurchasedPackage: clientsWithPackages.has(client.id),
      zeroBalanceWarningDismissed: client.zeroBalanceWarningDismissed ?? false,
    };
  });

  console.log("\n=== Clients with zero balance and packages ===");
  result.forEach(c => {
    if (c.classPackBalance === 0 && c.hasPurchasedPackage) {
      console.log(`${c.name}: dismissed=${c.zeroBalanceWarningDismissed}`);
    }
  });
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
