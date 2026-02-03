"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, DollarSign } from "lucide-react";
import { markSessionAsPaid } from "@/app/actions";
import { useRouter } from "next/navigation";

interface CollectiblesTableProps {
  sessions: any[];
}

export function CollectiblesTable({ sessions: initialSessions }: CollectiblesTableProps) {
  const [sessions, setSessions] = useState(initialSessions);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const router = useRouter();

  const handleMarkAsPaid = async (sessionId: string) => {
    setProcessingId(sessionId);
    const result = await markSessionAsPaid(sessionId);
    if (result.success) {
      setSessions(sessions.filter(s => s.id !== sessionId));
      router.refresh();
    }
    setProcessingId(null);
  };

  const totalOutstanding = sessions.reduce((acc, session) => {
    return acc + (parseFloat(session.price) * session.clients.length);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-white p-6 rounded-xl border border-sand-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-2">
              Total Outstanding
            </h3>
            <p className="font-serif text-3xl text-charcoal">
              ${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg">
            <DollarSign className="text-amber-600" size={32} />
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="w-full overflow-x-auto overflow-y-hidden rounded-xl border border-sand-200 shadow-sm bg-white dark:bg-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-sand-50 border-b border-sand-200">
            <tr>
              <th className="px-6 py-4 font-medium text-gray-500 uppercase tracking-wider text-xs">Date</th>
              <th className="px-6 py-4 font-medium text-gray-500 uppercase tracking-wider text-xs">Client(s)</th>
              <th className="px-6 py-4 font-medium text-gray-500 uppercase tracking-wider text-xs">Type</th>
              <th className="px-6 py-4 font-medium text-gray-500 uppercase tracking-wider text-xs">Location</th>
              <th className="px-6 py-4 font-medium text-gray-500 uppercase tracking-wider text-xs text-right">Amount</th>
              <th className="px-6 py-4 font-medium text-gray-500 uppercase tracking-wider text-xs text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {sessions.map((session) => (
              <tr key={session.id} className="hover:bg-sand-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {format(new Date(session.date), "MMM d, yyyy")}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {session.clients.map((client: any, idx: number) => (
                      <span key={client.id} className="font-medium text-charcoal">
                        {client.name}
                        {idx < session.clients.length - 1 && <span className="text-gray-400 mr-1">,</span>}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{session.type}</td>
                <td className="px-6 py-4 text-gray-600">{session.location}</td>
                <td className="px-6 py-4 text-right font-serif font-medium">
                  ${(parseFloat(session.price) * session.clients.length).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleMarkAsPaid(session.id)}
                    disabled={processingId === session.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 size={14} />
                    {processingId === session.id ? "Marking..." : "Mark as Paid"}
                  </button>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic font-serif">
                  No outstanding payments. All sessions are paid.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
