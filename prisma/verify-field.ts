import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Try to update a client with the field
  const testClient = await prisma.client.findFirst();
  if (!testClient) {
    console.log("No clients found");
    return;
  }
  
  console.log("Testing update with zeroBalanceWarningDismissed field...");
  try {
    const result = await prisma.client.update({
      where: { id: testClient.id },
      data: {
        zeroBalanceWarningDismissed: true,
      },
    });
    console.log("✅ SUCCESS! Field exists and can be updated");
    console.log("Updated client:", result.name, "dismissed:", result.zeroBalanceWarningDismissed);
  } catch (error: any) {
    console.error("❌ ERROR:", error.message);
    if (error.message.includes("Unknown argument")) {
      console.error("The Prisma client doesn't recognize this field!");
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
