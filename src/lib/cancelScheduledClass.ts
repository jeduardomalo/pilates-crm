import type { PrismaClient, ScheduledClassStatus } from "@prisma/client";

/** Keep the class for audit/restore, reversing only its posted accounting entries. */
export async function cancelScheduledClassRecord(
  db: PrismaClient,
  id: string,
  expectedStatus: ScheduledClassStatus,
  status: "CANCELLED" | "NO_SHOW"
) {
  if (expectedStatus !== "SCHEDULED" && expectedStatus !== "POSTED") {
    return { success: false, error: "Only scheduled or posted classes can be cancelled." };
  }
  return db.$transaction(async (tx) => {
    // Claim the transition before refunding credits. A concurrent/repeated cancel
    // must not reverse the same accounting entries twice.
    const changed = await tx.scheduledClass.updateMany({
      where: { id, status: expectedStatus },
      data: { status, postedAt: null, googleEventId: null },
    });
    if (changed.count !== 1) {
      return { success: false, error: "This class has changed. Refresh the schedule and try again." };
    }
    if (expectedStatus === "POSTED") {
      const participants = await tx.scheduledParticipant.findMany({ where: { scheduledClassId: id } });
      for (const participant of participants) {
        // Clear the link first; the participant remains available for Restore.
        await tx.scheduledParticipant.update({
          where: { id: participant.id },
          data: { postedSessionId: null },
        });
        if (participant.postedSessionId) {
          await tx.session.deleteMany({ where: { id: participant.postedSessionId } });
        }
        if (participant.usePackage) {
          await tx.client.update({
            where: { id: participant.clientId },
            data: { classPackBalance: { increment: 1 } },
          });
        }
      }
    }
    return { success: true };
  });
}
