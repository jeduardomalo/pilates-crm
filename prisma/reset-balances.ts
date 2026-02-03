import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Resetting class pack balances...");
  
  // Reset all clients to 0
  const resetAll = await prisma.client.updateMany({
    data: {
      classPackBalance: 0,
    },
  });
  console.log(`Reset ${resetAll.count} clients to 0`);
  
  // Set Tara Rowghani to 9
  const tara = await prisma.client.findFirst({
    where: {
      name: {
        contains: "Tara",
        mode: "insensitive"
      }
    }
  });
  
  if (tara) {
    await prisma.client.update({
      where: { id: tara.id },
      data: { classPackBalance: 9 },
    });
    console.log(`Set ${tara.name} to 9 classes`);
  } else {
    console.log("Tara Rowghani not found");
  }
  
  // Set Leandra Medine to 1
  const leandra = await prisma.client.findFirst({
    where: {
      name: {
        contains: "Leandra",
        mode: "insensitive"
      }
    }
  });
  
  if (leandra) {
    await prisma.client.update({
      where: { id: leandra.id },
      data: { classPackBalance: 1 },
    });
    console.log(`Set ${leandra.name} to 1 class`);
  } else {
    console.log("Leandra Medine not found");
  }
  
  console.log("Balance reset complete!");
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
