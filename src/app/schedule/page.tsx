import { getClients } from "@/app/actions";
import { SchedulePageClient } from "@/components/SchedulePageClient";
import { getGoogleConnectionStatus } from "@/lib/googleCalendar";

export const revalidate = 0;

export default async function SchedulePage() {
  const clients = await getClients();
  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name }));

  const google = await getGoogleConnectionStatus();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl text-charcoal dark:text-white">Schedule</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Plan upcoming sessions. Post completed classes when they are ready to enter revenue and client history.
          </p>
        </div>
      </div>

      <SchedulePageClient
        clients={clientOptions}
        googleStatus={google}
      />
    </div>
  );
}
