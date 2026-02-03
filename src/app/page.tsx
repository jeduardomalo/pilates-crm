import { getClients, getSessions } from "./actions";
import { DashboardWrapper } from "@/components/DashboardWrapper";
import { QuickAddSession } from "@/components/QuickAddSession";

export const revalidate = 0; // Disable caching for this page

export default async function Home() {
  const clients = await getClients();
  const rawSessions = await getSessions();

  // Serialize data for Client Components
  const sessions = rawSessions.map(s => ({
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

  // Serialize clients to ensure all fields are included
  const serializedClients = clients.map(c => ({
    ...c,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
    zeroBalanceWarningDismissed: c.zeroBalanceWarningDismissed ?? false,
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl text-charcoal dark:text-white">Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Welcome back. Here is your studio overview.</p>
        </div>
        <div className="flex gap-2 sm:gap-4 min-w-0">
           <QuickAddSession clients={serializedClients} />
        </div>
      </div>

      {/* Dashboard with Date Filter */}
      <DashboardWrapper sessions={sessions} clients={serializedClients} />
    </div>
  );
}
