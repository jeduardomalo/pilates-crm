import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Dismissing warnings for Frieda Cayre and Kim Cayre...");
  
  // Find and update Frieda Cayre
  const frieda = await prisma.client.findFirst({
    where: {
      name: {
        contains: "Frieda",
        mode: "insensitive"
      }
    }
  });
  
  if (frieda) {
    await prisma.client.update({
      where: { id: frieda.id },
      data: { zeroBalanceWarningDismissed: true },
    });
    console.log(`Dismissed warning for ${frieda.name}`);
  } else {
    console.log("Frieda Cayre not found");
  }
  
  // Find and update Kim Cayre
  const kim = await prisma.client.findFirst({
    where: {
      name: {
        contains: "Kim",
        mode: "insensitive"
      }
    }
  });
  
  if (kim) {
    await prisma.client.update({
      where: { id: kim.id },
      data: { zeroBalanceWarningDismissed: true },
    });
    console.log(`Dismissed warning for ${kim.name}`);
  } else {
    console.log("Kim Cayre not found");
  }
  
  console.log("Warning dismissal complete!");
  console.log("\nPlease restart your Next.js dev server if it's running to see the changes.");
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
