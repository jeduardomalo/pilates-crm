import { getClients } from "@/app/actions";
import { AddClient } from "@/components/AddClient";
import { ClientsTable } from "@/components/ClientsTable";

export default async function ClientsPage() {
  const clients = await getClients();

  // Serialize dates and remove sessions (which contain Decimal objects) for client component
  const serializedClients = clients.map(client => ({
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    notes: client.notes,
    status: client.status,
    classPackBalance: client.classPackBalance,
    hasPurchasedPackage: client.hasPurchasedPackage,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-3xl text-charcoal dark:text-white">
            Clients
            <span className="ml-3 text-xl font-normal text-gray-500 dark:text-gray-400">
              ({clients.length})
            </span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your client list and balances.</p>
        </div>
        <AddClient />
      </div>

      <ClientsTable clients={serializedClients} />
    </div>
  );
}
