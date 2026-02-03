"use client";

import { useState, useEffect, useRef } from "react";
import { getClientById, updateClientBalance } from "@/app/actions";
import { ClassLogTable } from "@/components/ClassLogTable";
import { MetricCard } from "@/components/MetricCard";
import { AddPackage } from "@/components/AddPackage";
import { X, AlertTriangle, Edit2, Check } from "lucide-react";

interface ClientDetailModalProps {
  clientId: string | null;
  onClose: () => void;
  onClientClick?: (clientId: string) => void;
}

export function ClientDetailModal({ clientId, onClose, onClientClick }: ClientDetailModalProps) {
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [editBalanceValue, setEditBalanceValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const loadClient = () => {
    if (clientId) {
      setLoading(true);
      getClientById(clientId).then((data) => {
        setClient(data);
        setLoading(false);
      });
    } else {
      setClient(null);
    }
  };

  useEffect(() => {
    loadClient();
  }, [clientId]);

  useEffect(() => {
    if (isEditingBalance && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingBalance]);

  const handleSaveBalance = async () => {
    if (!client) return;
    
    const newBalance = parseInt(editBalanceValue);
    if (isNaN(newBalance) || newBalance < 0) {
      alert("Please enter a valid number (0 or greater)");
      return;
    }

    const result = await updateClientBalance(client.id, newBalance);
    if (result.success) {
      setClient({ ...client, classPackBalance: newBalance });
      setIsEditingBalance(false);
      loadClient(); // Refresh to get updated data
    } else {
      alert("Failed to update balance: " + (result.error || "Unknown error"));
    }
  };

  const handleCancelEdit = () => {
    setIsEditingBalance(false);
    setEditBalanceValue("");
  };

  if (!clientId) return null;

  // Revenue includes ALL paid sessions (including package purchases)
  const totalSpent = client?.sessions
    ?.filter((s: any) => s.isPaid)
    .reduce((acc: number, s: any) => acc + parseFloat(s.price), 0) || 0;

  // Calculate lifetime classes - count all sessions except package purchases
  const lifetimeClasses = client?.sessions
    ?.filter((s: any) => s.type !== "Package Purchase")
    .length || 0;

  // Include all sessions (including package purchases) for client history
  const allSessions = client?.sessions || [];

  // Only show warning if client has purchased a package before AND balance is zero AND warning hasn't been dismissed
  const hasZeroBalance = client?.classPackBalance === 0 && 
                         client?.hasPurchasedPackage && 
                         !client?.zeroBalanceWarningDismissed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-xl shadow-xl border border-sand-200 animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-sand-200">
          <div>
            {loading ? (
              <div className="h-8 w-48 bg-sand-100 rounded animate-pulse" />
            ) : (
              <>
                <h2 className="font-serif text-3xl text-charcoal">{client?.name}</h2>
                <div className="flex gap-4 mt-2 text-sm text-gray-500">
                  <span>{client?.email}</span>
                  <span>•</span>
                  <span className={
                    client?.classPackBalance > 0 
                      ? "text-sage font-medium" 
                      : client?.hasPurchasedPackage && !client?.zeroBalanceWarningDismissed
                      ? "text-red-600 font-medium" 
                      : "text-gray-500"
                  }>
                    {client?.classPackBalance} classes remaining
                  </span>
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-sand-50 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {loading ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="h-32 bg-sand-100 rounded-lg animate-pulse" />
                <div className="h-32 bg-sand-100 rounded-lg animate-pulse" />
                <div className="h-32 bg-sand-100 rounded-lg animate-pulse" />
              </div>
              <div className="h-64 bg-sand-100 rounded-lg animate-pulse" />
            </div>
          ) : client ? (
            <>
              {/* Zero Balance Warning - only if they've purchased a package before and haven't dismissed */}
              {hasZeroBalance && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium text-red-900 mb-1">Package Balance is Zero</h4>
                      <p className="text-sm text-red-700">
                        This client has no remaining classes in their package. Consider adding a new package to continue their sessions.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="relative">
                  <div className="bg-white p-6 rounded-xl border border-sand-200 shadow-sm pb-16">
                    <h3 className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-2">Class Pack Balance</h3>
                    <div className="flex items-baseline gap-2">
                      {isEditingBalance ? (
                        <>
                          <input
                            ref={inputRef}
                            type="number"
                            min="0"
                            value={editBalanceValue}
                            onChange={(e) => setEditBalanceValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSaveBalance();
                              } else if (e.key === "Escape") {
                                handleCancelEdit();
                              }
                            }}
                            className="font-serif text-3xl text-charcoal w-24 border border-sand-300 rounded px-2 py-1 focus:outline-none focus:border-sage"
                          />
                          <button
                            onClick={handleSaveBalance}
                            className="p-1 text-sage hover:text-sage-700 hover:bg-sage-50 rounded transition-colors"
                            title="Save"
                          >
                            <Check size={20} />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors"
                            title="Cancel"
                          >
                            <X size={20} />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="font-serif text-3xl text-charcoal">{client.classPackBalance}</span>
                          <button
                            onClick={() => {
                              setEditBalanceValue(client.classPackBalance.toString());
                              setIsEditingBalance(true);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-sand-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                            title="Edit balance"
                          >
                            <Edit2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="absolute bottom-6 right-6 flex gap-2">
                    {!isEditingBalance && (
                      <button
                        onClick={() => {
                          setEditBalanceValue(client.classPackBalance.toString());
                          setIsEditingBalance(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-sand-50 rounded transition-colors"
                        title="Edit balance"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    <AddPackage clientId={client.id} onSuccess={loadClient} />
                  </div>
                </div>
                <MetricCard 
                  title="Lifetime Classes" 
                  value={lifetimeClasses.toString()} 
                />
                <MetricCard 
                  title="Lifetime Spend" 
                  value={`$${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-serif text-xl text-charcoal">Client History</h3>
                <ClassLogTable 
                  sessions={allSessions} 
                  onClientClick={onClientClick}
                  includePackagePurchases={true}
                />
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-12">
              Client not found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
