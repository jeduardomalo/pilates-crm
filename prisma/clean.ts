import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning database...");
  
  // Delete all sessions first (due to foreign key constraints)
  const deletedSessions = await prisma.session.deleteMany({});
  console.log(`Deleted ${deletedSessions.count} sessions`);
  
  // Delete all clients
  const deletedClients = await prisma.client.deleteMany({});
  console.log(`Deleted ${deletedClients.count} clients`);
  
  console.log("Database cleaned successfully!");
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
