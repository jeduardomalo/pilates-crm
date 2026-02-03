import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Check exact names
  const allClients = await prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: "Frieda", mode: "insensitive" } },
        { name: { contains: "Kim", mode: "insensitive" } }
      ]
    },
    select: {
      id: true,
      name: true,
      zeroBalanceWarningDismissed: true,
      classPackBalance: true
    }
  });
  
  console.log("All matching clients:");
  allClients.forEach(c => {
    console.log(`${c.name}: dismissed=${c.zeroBalanceWarningDismissed}, balance=${c.classPackBalance}`);
  });
  
  // Update them again to be sure
  for (const client of allClients) {
    if (client.name.includes("Frieda") || (client.name.includes("Kim") && client.name.includes("Cayre"))) {
      await prisma.client.update({
        where: { id: client.id },
        data: { zeroBalanceWarningDismissed: true },
      });
      console.log(`Updated ${client.name}`);
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
