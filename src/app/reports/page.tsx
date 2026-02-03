import { getSessions } from "@/app/actions";
import { ReportsWrapper } from "@/components/ReportsWrapper";

export default async function ReportsPage() {
  const sessions = await getSessions();

  // Serialize sessions
  const serializedSessions = sessions.map(s => ({
    ...s,
    date: s.date instanceof Date ? s.date.toISOString() : s.date,
    price: s.price.toString(),
    createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="font-serif text-3xl text-charcoal">Analytics</h2>
        <p className="text-gray-500 mt-1">Revenue breakdown and performance metrics.</p>
      </div>

      <ReportsWrapper sessions={serializedSessions} />
    </div>
  );
}
