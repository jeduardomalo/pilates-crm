import { db } from "@/lib/db";
import { format } from "date-fns";
import { ClassLogTable } from "@/components/ClassLogTable";
import { MetricCard } from "@/components/MetricCard";

export default async function ClientDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  
  const client = await db.client.findUnique({
    where: { id: params.id },
    include: { 
      sessions: { 
        orderBy: { date: 'desc' },
        include: { clients: true }
      } 
    }
  });

  if (!client) {
    return <div className="p-12 text-center text-gray-500">Client not found</div>;
  }

  // Serialize
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

  const totalSpent = sessions
    .filter(s => s.isPaid)
    .reduce((acc, s) => acc + parseFloat(s.price), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="font-serif text-3xl text-charcoal">{client.name}</h2>
        <div className="flex gap-4 mt-2 text-sm text-gray-500">
          <span>{client.email}</span>
          <span>•</span>
          <span className={client.classPackBalance > 0 ? "text-sage font-medium" : "text-gray-500"}>
            {client.classPackBalance} classes remaining
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricCard 
          title="Class Pack Balance" 
          value={client.classPackBalance.toString()} 
          trend={client.classPackBalance < 2 ? "Low Balance" : "Active"}
        />
        <MetricCard 
          title="Lifetime Spend" 
          value={`$${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
        />
      </div>

      <div className="space-y-4">
        <h3 className="font-serif text-xl text-charcoal">Session History</h3>
        <ClassLogTable sessions={sessions} />
      </div>
    </div>
  );
}