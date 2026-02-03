"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createGoogleEvent, deleteGoogleEvent, updateGoogleEvent } from "@/lib/googleCalendar";

/** Race a promise against a timeout; return fallback if timeout wins. Use so DB hangs don't block the UI. */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

const DB_TIMEOUT_MS = 8000;

export async function getClients() {
  try {
    const clients = await withTimeout(
      db.client.findMany({
      include: {
        sessions: {
          orderBy: { date: "desc" },
          take: 1, // Only get the most recent session
        },
      },
      orderBy: { name: "asc" },
    }    ),
      DB_TIMEOUT_MS,
      [] as Awaited<ReturnType<typeof db.client.findMany>>
    );

    if (clients.length === 0) return [];

    // Get all package purchase sessions to check which clients have purchased packages
    const packagePurchaseSessions = await withTimeout(
      db.session.findMany({
      where: {
        type: "Package Purchase"
      },
      select: {
        clients: {
          select: {
            id: true
          }
        }
      }
    }),
      DB_TIMEOUT_MS,
      [] as { clients: { id: string }[] }[]
    );

    // Create a Set of client IDs who have purchased packages
    const clientsWithPackages = new Set<string>();
    packagePurchaseSessions.forEach(session => {
      session.clients.forEach(client => {
        clientsWithPackages.add(client.id);
      });
    });

    // Calculate status based on last session date (45 days rule)
    const now = new Date();
    const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);

    return clients.map((client) => {
      const lastSession = client.sessions[0];
      const isActive = lastSession 
        ? new Date(lastSession.date) >= fortyFiveDaysAgo
        : false; // If no sessions, consider inactive

      return {
        ...client,
        status: isActive ? "Active" : "Inactive",
        hasPurchasedPackage: clientsWithPackages.has(client.id),
        // Explicitly ensure zeroBalanceWarningDismissed is included as boolean
        zeroBalanceWarningDismissed: client.zeroBalanceWarningDismissed === true,
        inactiveNotificationDismissed: client.inactiveNotificationDismissed === true,
      };
    });
  } catch (error) {
    console.error("Database Error:", error);
    return [];
  }
}

export async function getSessions() {
  try {
    return await withTimeout(
      db.session.findMany({
        include: { clients: true },
        orderBy: { date: "desc" },
      }),
      DB_TIMEOUT_MS,
      []
    );
  } catch (error) {
    console.error("Database Error:", error);
    return [];
  }
}

export async function addSession(formData: FormData) {
  try {
    const sessionType = formData.get("sessionType") as string;
    const dateStr = formData.get("date") as string;
    const location = formData.get("location") as string;
    const type = formData.get("type") as string;
    
    // Parse date string as local date to avoid timezone issues
    const [year, month, day] = dateStr.split("-").map(Number);
    const sessionDate = new Date(year, month - 1, day);

    if (sessionType === "Single") {
      const clientId = formData.get("clientId") as string;
      const priceStr = formData.get("price") as string;
      const price = parseFloat(priceStr) || 0;
      const usePackage = formData.get("usePackage") === "true";
      // Package-usage sessions are "covered" by the pack → store as paid so they don't show in Collectibles
      const isPaid = usePackage ? true : formData.get("isPaid") === "true";

      await db.$transaction(async (tx) => {
        // Create session
        const session = await tx.session.create({
          data: {
            date: sessionDate,
            type: type || "Single",
            location: location || "In-Studio",
            price: price,
            isPaid,
            clients: {
              connect: { id: clientId }
            }
          }
        });

        // When Use Package is checked, always deduct from class pack (session is covered by package)
        if (usePackage) {
          await tx.client.update({
            where: { id: clientId },
            data: {
              classPackBalance: { decrement: 1 }
            }
          });
        }

        // Reset inactive notification when client has a new session (becomes active)
        await tx.client.update({
          where: { id: clientId },
          data: {
            inactiveNotificationDismissed: false
          }
        });
      });

      revalidatePath("/");
      revalidatePath("/collectibles");
      revalidatePath("/clients");
      return { success: true };
    } else if (sessionType === "Group") {
      const clientId1 = formData.get("clientId1") as string;
      const clientId2 = formData.get("clientId2") as string;
      const price1Str = formData.get("price1") as string;
      const price2Str = formData.get("price2") as string;
      const price1 = parseFloat(price1Str) || 0;
      const price2 = parseFloat(price2Str) || 0;
      const usePackage1 = formData.get("usePackage1") === "true";
      const usePackage2 = formData.get("usePackage2") === "true";
      // Package-usage sessions are "covered" by the pack → store as paid so they don't show in Collectibles
      const isPaid1 = usePackage1 ? true : formData.get("isPaid1") === "true";
      const isPaid2 = usePackage2 ? true : formData.get("isPaid2") === "true";

      await db.$transaction(async (tx) => {
        // Create first session
        const session1 = await tx.session.create({
          data: {
            date: sessionDate,
            type: type || "Group",
            location: location || "In-Studio",
            price: price1,
            isPaid: isPaid1,
            clients: {
              connect: { id: clientId1 }
            }
          }
        });

        // Create second session
        const session2 = await tx.session.create({
          data: {
            date: sessionDate,
            type: type || "Group",
            location: location || "In-Studio",
            price: price2,
            isPaid: isPaid2,
            clients: {
              connect: { id: clientId2 }
            }
          }
        });

        // When Use Package is checked, always deduct from class pack (session is covered by package)
        if (usePackage1) {
          await tx.client.update({
            where: { id: clientId1 },
            data: {
              classPackBalance: { decrement: 1 }
            }
          });
        }

        if (usePackage2) {
          await tx.client.update({
            where: { id: clientId2 },
            data: {
              classPackBalance: { decrement: 1 }
            }
          });
        }

        // Reset inactive notification when clients have new sessions (become active)
        await tx.client.updateMany({
          where: { id: { in: [clientId1, clientId2] } },
          data: {
            inactiveNotificationDismissed: false
          }
        });
      });

      revalidatePath("/");
      revalidatePath("/collectibles");
      revalidatePath("/clients");
      revalidatePath("/collectibles");
      return { success: true };
    }

    return { success: false, error: "Invalid session type" };
  } catch (error) {
    console.error("Failed to add session:", error);
    return { success: false, error: "Failed to add session" };
  }
}

export async function getClientById(id: string) {
  try {
    const client = await db.client.findUnique({
      where: { id },
      include: { 
        sessions: { 
          orderBy: { date: 'desc' },
          include: { clients: true }
        } 
      }
    });

    if (!client) return null;

    // Check if client has ever purchased a package
    const hasPurchasedPackage = client.sessions.some(s => s.type === "Package Purchase");

    // Serialize for client component
    const sessions = client.sessions.map(s => ({
      ...s,
      date: s.date.toISOString(),
      price: s.price.toString(),
      createdAt: s.createdAt.toISOString(),
      clients: s.clients.map(c => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString()
      }))
    }));

    return {
      ...client,
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
      sessions,
      hasPurchasedPackage,
      zeroBalanceWarningDismissed: client.zeroBalanceWarningDismissed ?? false,
      inactiveNotificationDismissed: client.inactiveNotificationDismissed ?? false,
    };
  } catch (error) {
    console.error("Database Error:", error);
    return null;
  }
}

export async function updateClient(clientId: string, data: { name?: string; email?: string; phone?: string | null }) {
  try {
    await db.client.update({
      where: { id: clientId },
      data,
    });
    revalidatePath("/clients");
      revalidatePath("/collectibles");
    return { success: true };
  } catch (error) {
    console.error("Failed to update client:", error);
    return { success: false, error: "Failed to update client" };
  }
}

export async function updateClientBalance(clientId: string, balance: number) {
  try {
    await db.client.update({
      where: { id: clientId },
      data: { classPackBalance: balance },
    });
    revalidatePath("/clients");
      revalidatePath("/collectibles");
    revalidatePath("/");
      revalidatePath("/collectibles");
    return { success: true };
  } catch (error) {
    console.error("Failed to update balance:", error);
    return { success: false, error: "Failed to update balance" };
  }
}

export async function getUnpaidSessions() {
  try {
    const sessions = await db.session.findMany({
      where: {
        isPaid: false,
      },
      include: { clients: true },
      orderBy: { date: "desc" },
    });

    return sessions.map(s => ({
      ...s,
      date: s.date.toISOString(),
      price: s.price.toString(),
      createdAt: s.createdAt.toISOString(),
      clients: s.clients.map(c => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString()
      }))
    }));
  } catch (error) {
    console.error("Database Error:", error);
    return [];
  }
}

export async function addClient(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const classPackBalance = parseInt(formData.get("classPackBalance") as string) || 0;

    await db.client.create({
      data: {
        name,
        email: email || null,
        classPackBalance,
      },
    });

    revalidatePath("/clients");
      revalidatePath("/collectibles");
    return { success: true };
  } catch (error) {
    console.error("Failed to add client:", error);
    return { success: false, error: "Failed to add client" };
  }
}

export async function addPackage(formData: FormData) {
  try {
    const clientId = formData.get("clientId") as string;
    const classes = parseInt(formData.get("classes") as string) || 0;
    const priceStr = formData.get("price") as string;
    const price = parseFloat(priceStr) || 0;
    const isPaid = formData.get("isPaid") === "true";
    const dateStr = (formData.get("date") as string) || "";
    let sessionDate: Date;
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split("-").map(Number);
      sessionDate = new Date(year, month - 1, day);
    } else {
      sessionDate = new Date();
    }

    if (!clientId || classes < 1) {
      return { success: false, error: "Invalid client or number of classes." };
    }

    await db.$transaction(async (tx) => {
      // Create package purchase session
      await tx.session.create({
        data: {
          date: sessionDate,
          type: "Package Purchase",
          location: "In-Studio",
          price: price,
          isPaid,
          clients: {
            connect: { id: clientId }
          }
        }
      });

      // Update client balance
      await tx.client.update({
        where: { id: clientId },
        data: {
          classPackBalance: { increment: classes }
        }
      });

      // Reset inactive notification when client purchases a package (becomes active)
      await tx.client.update({
        where: { id: clientId },
        data: {
          inactiveNotificationDismissed: false
        }
      });
    });

    revalidatePath("/clients");
      revalidatePath("/collectibles");
    revalidatePath("/");
      revalidatePath("/collectibles");
    return { success: true };
  } catch (error) {
    console.error("Failed to add package:", error);
    return { success: false, error: "Failed to add package" };
  }
}

export async function markSessionAsPaid(sessionId: string) {
  try {
    await db.session.update({
      where: { id: sessionId },
      data: { isPaid: true },
    });
    revalidatePath("/collectibles");
    return { success: true };
  } catch (error) {
    console.error("Failed to mark session as paid:", error);
    return { success: false, error: "Failed to mark session as paid" };
  }
}

export async function getNotificationsCount() {
  try {
    const clients = await getClients();
    
    const zeroBalance = clients.filter(c => 
      c.classPackBalance === 0 && 
      c.hasPurchasedPackage === true && 
      c.zeroBalanceWarningDismissed === false 
    );

    const lowBalance = clients.filter(c => 
      c.classPackBalance > 0 && 
      c.classPackBalance <= 3 && 
      c.hasPurchasedPackage === true 
    );

    // Inactive clients - same filter as NotificationsList
    // Only count those who had a session within the last 60 days
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    const inactive = clients.filter(c => {
      if (c.status !== "Inactive") return false;
      if (c.inactiveNotificationDismissed === true) return false;
      
      // Access sessions from the client object (getClients includes sessions)
      const lastSession = (c as { sessions?: Array<{ date: Date | string }> }).sessions?.[0];
      if (!lastSession?.date) return false; // No sessions = old client, don't notify
      
      // Only count if they had a session within the last 60 days (recently active)
      const lastSessionDate = new Date(lastSession.date);
      return lastSessionDate >= sixtyDaysAgo;
    });

    return zeroBalance.length + lowBalance.length + inactive.length;
  } catch (error) {
    console.error("Failed to get notifications count:", error);
    return 0;
  }
}

export async function dismissZeroBalanceWarning(clientId: string) {
  try {
    console.log(`[SERVER] dismissZeroBalanceWarning called for clientId: ${clientId}`);
    
    const before = await db.client.findUnique({
      where: { id: clientId },
    });
    
    if (!before) {
      console.error(`[SERVER] Client not found: ${clientId}`);
      return { success: false, error: "Client not found" };
    }
    
    console.log(`[SERVER] Before update - ${before.name}:`, {
      id: before.id,
      zeroBalanceWarningDismissed: before.zeroBalanceWarningDismissed,
      zeroBalanceWarningDismissedType: typeof before.zeroBalanceWarningDismissed,
      classPackBalance: before.classPackBalance,
    });
    
    const result = await db.client.update({
      where: { id: clientId },
      data: {
        zeroBalanceWarningDismissed: true,
      },
    });
    
    console.log(`[SERVER] After update - ${result.name}:`, {
      id: result.id,
      zeroBalanceWarningDismissed: result.zeroBalanceWarningDismissed,
      zeroBalanceWarningDismissedType: typeof result.zeroBalanceWarningDismissed,
      classPackBalance: result.classPackBalance,
    });
    
    const verify = await db.client.findUnique({
      where: { id: clientId },
    });
    
    console.log(`[SERVER] Verification - ${result.name}:`, {
      zeroBalanceWarningDismissed: verify?.zeroBalanceWarningDismissed,
    });
    
    revalidatePath("/notifications");
    revalidatePath("/");
      revalidatePath("/collectibles");
    revalidatePath("/clients");
      revalidatePath("/collectibles");
    
    console.log(`[SERVER] Successfully dismissed warning for ${result.name}`);
    return { success: true };
  } catch (error) {
    console.error("[SERVER] Failed to dismiss warning:", error);
    console.error("[SERVER] Error details:", error);
    return { success: false, error: "Failed to dismiss warning" };
  }
}

export async function dismissInactiveNotification(clientId: string) {
  try {
    console.log(`[SERVER] dismissInactiveNotification called for clientId: ${clientId}`);
    
    const before = await db.client.findUnique({
      where: { id: clientId },
    });
    
    if (!before) {
      console.error(`[SERVER] Client not found: ${clientId}`);
      return { success: false, error: "Client not found" };
    }
    
    console.log(`[SERVER] Before update - ${before.name}:`, {
      id: before.id,
      inactiveNotificationDismissed: before.inactiveNotificationDismissed,
      inactiveNotificationDismissedType: typeof before.inactiveNotificationDismissed,
    });
    
    const result = await db.client.update({
      where: { id: clientId },
      data: {
        inactiveNotificationDismissed: true,
      },
    });
    
    console.log(`[SERVER] After update - ${result.name}:`, {
      id: result.id,
      inactiveNotificationDismissed: result.inactiveNotificationDismissed,
      inactiveNotificationDismissedType: typeof result.inactiveNotificationDismissed,
    });
    
    revalidatePath("/notifications");
    revalidatePath("/");
      revalidatePath("/collectibles");
    revalidatePath("/clients");
      revalidatePath("/collectibles");
    
    console.log(`[SERVER] Successfully dismissed inactive notification for ${result.name}`);
    return { success: true };
  } catch (error) {
    console.error("[SERVER] Failed to dismiss inactive notification:", error);
    console.error("[SERVER] Error details:", error);
    console.error("[SERVER] Error message:", error instanceof Error ? error.message : String(error));
    console.error("[SERVER] Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to dismiss inactive notification" 
    };
  }
}

export async function deleteClient(clientId: string) {
  try {
    // First delete all sessions associated with this client
    await db.session.deleteMany({
      where: {
        clients: {
          some: { id: clientId }
        }
      }
    });

    // Then delete the client
    await db.client.delete({
      where: { id: clientId },
    });

    revalidatePath("/clients");
      revalidatePath("/collectibles");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete client:", error);
    return { success: false, error: "Failed to delete client" };
  }
}

export async function deleteSession(sessionId: string) {
  try {
    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: { clients: true },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    await db.$transaction(async (tx) => {
      // Delete the session
      await tx.session.delete({
        where: { id: sessionId },
      });

      // If it was a paid $0 session (not a package purchase), restore class pack balance
      if (session.isPaid && Number(session.price) === 0 && session.type !== "Package Purchase") {
        for (const client of session.clients) {
          await tx.client.update({
            where: { id: client.id },
            data: {
              classPackBalance: { increment: 1 }
            }
          });
        }
      }
    });

    revalidatePath("/");
      revalidatePath("/collectibles");
    revalidatePath("/clients");
      revalidatePath("/collectibles");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete session:", error);
    return { success: false, error: "Failed to delete session" };
  }
}

type ScheduledParticipantInput = {
  clientId: string;
  price: number;
  isPaid: boolean;
  usePackage: boolean;
};

type ScheduledClassInput = {
  start: string; // ISO
  end: string; // ISO
  type: string;
  location: string;
  notes?: string | null;
  participants: ScheduledParticipantInput[];
};

function buildGoogleSummary(type: string, clientNames: string) {
  return `Pilates (${type}) - ${clientNames}`;
}

function buildGoogleDescription(input: {
  type: string;
  location: string;
  notes?: string | null;
  participants: Array<{ name: string; price: number; isPaid: boolean; usePackage: boolean }>;
}) {
  const lines: string[] = [];
  lines.push(`Type: ${input.type}`);
  lines.push(`Location: ${input.location}`);
  lines.push("");
  lines.push("Participants:");
  for (const p of input.participants) {
    const flags = [
      p.isPaid ? "Paid" : "Pending",
      p.usePackage ? "Uses package" : null,
    ].filter(Boolean);
    lines.push(`- ${p.name}: $${p.price.toFixed(2)}${flags.length ? ` (${flags.join(", ")})` : ""}`);
  }
  if (input.notes && input.notes.trim()) {
    lines.push("");
    lines.push("Notes:");
    lines.push(input.notes.trim());
  }
  return lines.join("\n");
}

function ensureScheduledClassModel() {
  if (typeof (db as { scheduledClass?: { findMany: unknown } }).scheduledClass?.findMany !== "function") {
    throw new Error(
      "Prisma client is out of date (missing ScheduledClass). Run: npx prisma generate. Then restart the dev server (npm run dev)."
    );
  }
}

export async function getScheduleWeek(weekStartIso: string) {
  ensureScheduledClassModel();
  const start = new Date(weekStartIso);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  const items = await db.scheduledClass.findMany({
    where: {
      start: { gte: start, lt: end },
    },
    include: {
      participants: {
        include: { client: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { start: "asc" },
  });

  return items.map((sc) => ({
    id: sc.id,
    start: sc.start.toISOString(),
    end: sc.end.toISOString(),
    type: sc.type,
    location: sc.location,
    notes: sc.notes,
    status: sc.status,
    googleEventId: sc.googleEventId,
    participants: sc.participants.map((p) => ({
      id: p.id,
      clientId: p.clientId,
      clientName: p.client.name,
      price: p.price.toString(),
      isPaid: p.isPaid,
      usePackage: p.usePackage,
      postedSessionId: p.postedSessionId,
    })),
  }));
}

export async function createScheduledClass(input: ScheduledClassInput) {
  try {
    const start = new Date(input.start);
    const end = new Date(input.end);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return { success: false, error: "Invalid start/end time." };
    }
    if (!input.participants?.length || input.participants.length > 2) {
      return { success: false, error: "Must have 1–2 participants." };
    }
    const uniqueClientIds = new Set(input.participants.map((p) => p.clientId));
    if (uniqueClientIds.size !== input.participants.length) {
      return { success: false, error: "Duplicate client selected." };
    }

    const created = await db.scheduledClass.create({
      data: {
        start,
        end,
        type: input.type,
        location: input.location,
        notes: input.notes ?? null,
        participants: {
          create: input.participants.map((p) => ({
            clientId: p.clientId,
            price: p.price,
            isPaid: p.isPaid,
            usePackage: p.usePackage,
          })),
        },
      },
      include: {
        participants: { include: { client: true } },
      },
    });

    // Google sync (one-way CRM -> Google)
    const clientNames = created.participants.map((p) => p.client.name).join(" + ");
    const eventId = await createGoogleEvent({
      scheduledClassId: created.id,
      start: created.start,
      end: created.end,
      summary: buildGoogleSummary(created.type, clientNames),
      location: created.location,
      description: buildGoogleDescription({
        type: created.type,
        location: created.location,
        notes: created.notes,
        participants: created.participants.map((p) => ({
          name: p.client.name,
          price: Number(p.price),
          isPaid: p.isPaid,
          usePackage: p.usePackage,
        })),
      }),
    });

    if (eventId) {
      await db.scheduledClass.update({
        where: { id: created.id },
        data: { googleEventId: eventId },
      });
    }

    revalidatePath("/schedule");
    return { success: true, id: created.id };
  } catch (error) {
    console.error("Failed to create scheduled class:", error);
    return { success: false, error: "Failed to create scheduled class" };
  }
}

export async function createScheduledClasses(inputs: ScheduledClassInput[]) {
  if (!inputs.length) {
    return { success: false, error: "No classes to create.", count: 0 };
  }
  let created = 0;
  try {
    for (const input of inputs) {
      const start = new Date(input.start);
      const end = new Date(input.end);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        return { success: false, error: "Invalid start/end time.", count: created };
      }
      if (!input.participants?.length || input.participants.length > 2) {
        return { success: false, error: "Must have 1–2 participants.", count: created };
      }
      const uniqueClientIds = new Set(input.participants.map((p) => p.clientId));
      if (uniqueClientIds.size !== input.participants.length) {
        return { success: false, error: "Duplicate client selected.", count: created };
      }

      const record = await db.scheduledClass.create({
        data: {
          start,
          end,
          type: input.type,
          location: input.location,
          notes: input.notes ?? null,
          participants: {
            create: input.participants.map((p) => ({
              clientId: p.clientId,
              price: p.price,
              isPaid: p.isPaid,
              usePackage: p.usePackage,
            })),
          },
        },
        include: {
          participants: { include: { client: true } },
        },
      });

      const clientNames = record.participants.map((p) => p.client.name).join(" + ");
      const eventId = await createGoogleEvent({
        scheduledClassId: record.id,
        start: record.start,
        end: record.end,
        summary: buildGoogleSummary(record.type, clientNames),
        location: record.location,
        description: buildGoogleDescription({
          type: record.type,
          location: record.location,
          notes: record.notes,
          participants: record.participants.map((p) => ({
            name: p.client.name,
            price: Number(p.price),
            isPaid: p.isPaid,
            usePackage: p.usePackage,
          })),
        }),
      });

      if (eventId) {
        await db.scheduledClass.update({
          where: { id: record.id },
          data: { googleEventId: eventId },
        });
      }
      created++;
    }
    revalidatePath("/schedule");
    return { success: true, count: created };
  } catch (error) {
    console.error("Failed to create scheduled classes:", error);
    return { success: false, error: "Failed to create scheduled classes.", count: created };
  }
}

export async function updateScheduledClass(id: string, input: ScheduledClassInput) {
  try {
    const existing = await db.scheduledClass.findUnique({
      where: { id },
      include: { participants: { include: { client: true } } },
    });
    if (!existing) return { success: false, error: "Scheduled class not found." };
    if (existing.status !== "SCHEDULED") {
      return { success: false, error: "Only scheduled classes can be edited." };
    }

    const start = new Date(input.start);
    const end = new Date(input.end);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return { success: false, error: "Invalid start/end time." };
    }
    if (!input.participants?.length || input.participants.length > 2) {
      return { success: false, error: "Must have 1–2 participants." };
    }
    const uniqueClientIds = new Set(input.participants.map((p) => p.clientId));
    if (uniqueClientIds.size !== input.participants.length) {
      return { success: false, error: "Duplicate client selected." };
    }

    const updated = await db.$transaction(async (tx) => {
      await tx.scheduledParticipant.deleteMany({ where: { scheduledClassId: id } });
      return tx.scheduledClass.update({
        where: { id },
        data: {
          start,
          end,
          type: input.type,
          location: input.location,
          notes: input.notes ?? null,
          participants: {
            create: input.participants.map((p) => ({
              clientId: p.clientId,
              price: p.price,
              isPaid: p.isPaid,
              usePackage: p.usePackage,
            })),
          },
        },
        include: { participants: { include: { client: true } } },
      });
    });

    const clientNames = updated.participants.map((p) => p.client.name).join(" + ");
    const summary = buildGoogleSummary(updated.type, clientNames);
    const description = buildGoogleDescription({
      type: updated.type,
      location: updated.location,
      notes: updated.notes,
      participants: updated.participants.map((p) => ({
        name: p.client.name,
        price: Number(p.price),
        isPaid: p.isPaid,
        usePackage: p.usePackage,
      })),
    });

    if (updated.googleEventId) {
      await updateGoogleEvent({
        googleEventId: updated.googleEventId,
        scheduledClassId: updated.id,
        start: updated.start,
        end: updated.end,
        summary,
        location: updated.location,
        description,
      });
    } else {
      const eventId = await createGoogleEvent({
        scheduledClassId: updated.id,
        start: updated.start,
        end: updated.end,
        summary,
        location: updated.location,
        description,
      });
      if (eventId) {
        await db.scheduledClass.update({
          where: { id: updated.id },
          data: { googleEventId: eventId },
        });
      }
    }

    revalidatePath("/schedule");
    return { success: true };
  } catch (error) {
    console.error("Failed to update scheduled class:", error);
    return { success: false, error: "Failed to update scheduled class" };
  }
}

export async function cancelScheduledClass(
  id: string,
  status: "CANCELLED" | "NO_SHOW" = "CANCELLED"
) {
  try {
    const existing = await db.scheduledClass.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Scheduled class not found." };
    if (existing.status !== "SCHEDULED") {
      return { success: false, error: "Only scheduled classes can be cancelled." };
    }

    await db.scheduledClass.update({
      where: { id },
      data: { status },
    });

    if (existing.googleEventId) {
      await deleteGoogleEvent(existing.googleEventId);
    }

    revalidatePath("/schedule");
    return { success: true };
  } catch (error) {
    console.error("Failed to cancel scheduled class:", error);
    return { success: false, error: "Failed to cancel scheduled class" };
  }
}

export async function postScheduledClass(
  id: string,
  resolution: "posted" | "cancelled" | "no_show"
) {
  try {
    const scheduled = await db.scheduledClass.findUnique({
      where: { id },
      include: {
        participants: { include: { client: true }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!scheduled) return { success: false, error: "Scheduled class not found." };
    if (scheduled.status !== "SCHEDULED") {
      return { success: false, error: "This class has already been resolved." };
    }

    if (resolution === "cancelled" || resolution === "no_show") {
      await db.scheduledClass.update({
        where: { id },
        data: { status: resolution === "cancelled" ? "CANCELLED" : "NO_SHOW" },
      });
      if (scheduled.googleEventId) {
        await deleteGoogleEvent(scheduled.googleEventId);
      }
      revalidatePath("/schedule");
      return { success: true };
    }

    const now = new Date();
    const clientIds = scheduled.participants.map((p) => p.clientId);

    await db.$transaction(async (tx) => {
      for (const participant of scheduled.participants) {
        const session = await tx.session.create({
          data: {
            date: scheduled.start,
            type: scheduled.type,
            location: scheduled.location,
            price: Number(participant.price),
            isPaid: false, // Posted from schedule: leave unpaid for verification in Collectibles
            clients: { connect: { id: participant.clientId } },
          },
        });

        await tx.scheduledParticipant.update({
          where: { id: participant.id },
          data: { postedSessionId: session.id },
        });

        if (participant.usePackage) {
          await tx.client.update({
            where: { id: participant.clientId },
            data: { classPackBalance: { decrement: 1 } },
          });
        }
      }

      await tx.client.updateMany({
        where: { id: { in: clientIds } },
        data: { inactiveNotificationDismissed: false },
      });

      await tx.scheduledClass.update({
        where: { id },
        data: { status: "POSTED", postedAt: now },
      });
    });

    revalidatePath("/schedule");
    revalidatePath("/");
    revalidatePath("/clients");
    revalidatePath("/reports");
    revalidatePath("/collectibles");
    revalidatePath("/notifications");

    return { success: true };
  } catch (error) {
    console.error("Failed to post scheduled class:", error);
    return { success: false, error: "Failed to post scheduled class" };
  }
}

/** Find overdue SCHEDULED classes and post them into sessions (unpaid) for verification in Collectibles. */
export async function postOverdueScheduledClasses() {
  ensureScheduledClassModel();
  const now = new Date();
  const overdue = await db.scheduledClass.findMany({
    where: { status: "SCHEDULED", end: { lte: now } },
    select: { id: true },
  });
  for (const { id } of overdue) {
    await postScheduledClass(id, "posted");
  }
}
