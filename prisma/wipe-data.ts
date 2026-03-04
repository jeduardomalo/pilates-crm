/**
 * Wipes all business data: ScheduledParticipant, ScheduledClass, Session, Client.
 * Leaves Admin and GoogleIntegration intact so you can still log in.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Wiping data (order: ScheduledParticipant → ScheduledClass → Session → Client)...");

  const deletedParticipants = await prisma.scheduledParticipant.deleteMany({});
  console.log(`  Deleted ${deletedParticipants.count} scheduled participant(s).`);

  const deletedClasses = await prisma.scheduledClass.deleteMany({});
  console.log(`  Deleted ${deletedClasses.count} scheduled class(es).`);

  const deletedSessions = await prisma.session.deleteMany({});
  console.log(`  Deleted ${deletedSessions.count} session(s).`);

  const deletedClients = await prisma.client.deleteMany({});
  console.log(`  Deleted ${deletedClients.count} client(s).`);

  console.log("Done. Admin and GoogleIntegration were left unchanged.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
