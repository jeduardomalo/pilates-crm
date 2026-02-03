"use client";

import { useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { Receipt, Trash2 } from "lucide-react";
import { ReceiptModal } from "./ReceiptModal";
import { deleteSession } from "@/app/actions";
import { useRouter } from "next/navigation";

interface ClassLogTableProps {
  sessions: any[];
  onClientClick?: (clientId: string) => void;
  includePackagePurchases?: boolean; // New prop to control filtering
}

export function ClassLogTable({ sessions, onClientClick, includePackagePurchases = false }: ClassLogTableProps) {
  const router = useRouter();
  const [selectedReceiptSession, setSelectedReceiptSession] = useState<any | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Filter out "Package Purchase" unless explicitly included
  const displaySessions = includePackagePurchases 
    ? sessions 
    : sessions.filter(s => s.type !== "Package Purchase");

  const handleDeleteSession = async (sessionId: string) => {
    setDeletingSessionId(sessionId);
    try {
      const result = await deleteSession(sessionId);
      if (result.success) {
        setShowDeleteConfirm(null);
        router.refresh();
      } else {
        alert("Failed to delete session: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error deleting session:", error);
      alert("Failed to delete session");
    } finally {
      setDeletingSessionId(null);
    }
  };

  const getSessionDescription = (session: any) => {
    const date = format(new Date(session.date), "MMM d, yyyy");
    const clients = session.clients.map((c: any) => c.name).join(", ");
    return `${date} - ${clients} (${session.type})`;
  };

  return (
    <>
      <div className="w-full overflow-x-auto overflow-y-hidden rounded-xl border border-sand-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-sand-50 dark:bg-gray-700 border-b border-sand-200 dark:border-gray-600">
            <tr>
              <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Date</th>
              <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Client(s)</th>
              <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Type</th>
              <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Location</th>
              <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs text-right">Price/Person</th>
              <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs text-right">Status</th>
              <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs text-center">Receipt</th>
              <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs text-center w-16">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100 dark:divide-gray-700">
            {displaySessions.map((session) => (
              <tr key={session.id} className="hover:bg-sand-50/50 dark:hover:bg-gray-700/50 transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">
                  {format(new Date(session.date), "MMM d, yyyy")}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {session.clients.map((client: any, idx: number) => (
                      <span key={client.id}>
                        {onClientClick ? (
                          <button
                            onClick={() => onClientClick(client.id)}
                            className="font-medium text-charcoal dark:text-white hover:text-sage transition-colors hover:underline cursor-pointer"
                          >
                            {client.name}
                          </button>
                        ) : (
                          <Link 
                            href={`/clients/${client.id}`}
                            className="font-medium text-charcoal dark:text-white hover:text-sage transition-colors"
                          >
                            {client.name}
                          </Link>
                        )}
                        {idx < session.clients.length - 1 && <span className="text-gray-400 mr-1">,</span>}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{session.type}</td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{session.location}</td>
                <td className="px-6 py-4 text-right font-serif text-charcoal dark:text-white">
                  ${Number(session.price).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right">
                  {(() => {
                    const isPackageUsage = session.type !== "Package Purchase" && Number(session.price) === 0;
                    const label = isPackageUsage ? "Package" : session.isPaid ? "Paid" : "Pending";
                    const style = isPackageUsage
                      ? "bg-slate-50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      : session.isPaid
                        ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800"
                        : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800";
                    return (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
                        {label}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => setSelectedReceiptSession(session)}
                    className="inline-flex items-center justify-center p-2 text-gray-500 dark:text-gray-400 hover:text-charcoal dark:text-white hover:bg-sand-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="View Receipt"
                  >
                    <Receipt size={18} />
                  </button>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                    title="Delete session"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {displaySessions.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500 italic font-serif">
                  No sessions logged yet. Add your first class.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedReceiptSession && (
        <ReceiptModal
          session={selectedReceiptSession}
          onClose={() => setSelectedReceiptSession(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (() => {
        const session = displaySessions.find(s => s.id === showDeleteConfirm);
        if (!session) return null;
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-sand-200 dark:border-gray-700 p-6 max-w-md w-full animate-in zoom-in-95 duration-200">
              <h3 className="font-serif text-xl text-charcoal dark:text-white mb-2">Delete Session</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Are you sure you want to delete this session?
              </p>
              <div className="bg-sand-50 dark:bg-gray-700 rounded-lg p-3 mb-6 text-sm text-gray-700 dark:text-gray-300">
                <p><strong>Date:</strong> {format(new Date(session.date), "MMM d, yyyy")}</p>
                <p><strong>Clients:</strong> {session.clients.map((c: any) => c.name).join(", ")}</p>
                <p><strong>Type:</strong> {session.type}</p>
                {session.type === "Package Purchase" && (
                  <p className="text-amber-600 mt-2 text-xs">
                    ⚠️ Note: Deleting a package purchase may require manual balance adjustment.
                  </p>
                )}
                {session.isPaid && Number(session.price) === 0 && session.type !== "Package Purchase" && (
                  <p className="text-blue-600 mt-2 text-xs">
                    ℹ️ Class pack balance will be restored for affected clients.
                  </p>
                )}
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={deletingSessionId !== null}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteSession(showDeleteConfirm)}
                  disabled={deletingSessionId !== null}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingSessionId === showDeleteConfirm ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
