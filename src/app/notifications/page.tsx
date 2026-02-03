import { getClients } from "../actions";
import { NotificationsList } from "@/components/NotificationsList";

export const revalidate = 0; // Disable caching for this page

export default async function NotificationsPage() {
  const clients = await getClients();

  // Serialize clients - explicitly map only the fields we need
  const serializedClients = clients.map(c => {
    // Explicitly convert zeroBalanceWarningDismissed to boolean
    const dismissed = c.zeroBalanceWarningDismissed === true;
    const inactiveDismissed = c.inactiveNotificationDismissed === true;
    
    // Get last session date if available
    // The sessions array should be included from getClients
    const lastSessionDate = (c as any).sessions && (c as any).sessions.length > 0 
      ? ((c as any).sessions[0].date instanceof Date 
          ? (c as any).sessions[0].date.toISOString()
          : (c as any).sessions[0].date)
      : null;
    
    return {
      id: c.id,
      name: c.name,
      classPackBalance: c.classPackBalance,
      hasPurchasedPackage: c.hasPurchasedPackage ?? false,
      zeroBalanceWarningDismissed: dismissed,
      inactiveNotificationDismissed: inactiveDismissed,
      status: c.status,
      lastSessionDate,
    };
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h2 className="font-serif text-3xl text-charcoal dark:text-white">Notifications</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">View and manage your studio notifications.</p>
      </div>

      {/* Notifications List */}
      <NotificationsList clients={serializedClients} />
    </div>
  );
}
