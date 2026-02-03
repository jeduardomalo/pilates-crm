import { getUnpaidSessions } from "@/app/actions";
import { CollectiblesTable } from "@/components/CollectiblesTable";

export const revalidate = 0; // Disable caching for this page
export default async function CollectiblesPage() {
  const unpaidSessions = await getUnpaidSessions();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="font-serif text-3xl text-charcoal">Collectibles</h2>
        <p className="text-gray-500 mt-1">Outstanding payments and unpaid sessions.</p>
      </div>

      <CollectiblesTable sessions={unpaidSessions} />
    </div>
  );
}
