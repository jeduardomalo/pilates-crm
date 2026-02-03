"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { dismissZeroBalanceWarning, dismissInactiveNotification } from "@/app/actions";
import { useState, useEffect, useMemo } from "react";

interface NotificationsListProps {
  clients: Array<{
    id: string;
    name: string;
    classPackBalance: number;
    hasPurchasedPackage?: boolean;
    zeroBalanceWarningDismissed?: boolean;
    inactiveNotificationDismissed?: boolean;
    status?: string;
    lastSessionDate?: string | null;
  }>;
}

export function NotificationsList({ clients: initialClients }: NotificationsListProps) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  
  // Sync with server data when initialClients changes (after refresh)
  useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);
  
  // Only show alerts for clients who have purchased a package before AND haven't dismissed the warning
  const zeroBalance = useMemo(() => {
    return clients.filter(c => {
      const isDismissed = c.zeroBalanceWarningDismissed === true;
      const hasPackage = c.hasPurchasedPackage === true;
      const isZero = c.classPackBalance === 0;
      
      const shouldInclude = isZero && hasPackage && !isDismissed;
      
      return shouldInclude;
    });
  }, [clients]);
  
  const lowBalance = useMemo(() => {
    return clients.filter(c => 
      c.classPackBalance > 0 && 
      c.classPackBalance <= 3 && 
      c.hasPurchasedPackage === true
    );
  }, [clients]);

  // Show inactive clients who:
  // 1. Are currently inactive
  // 2. Haven't dismissed the notification
  // 3. Had a session within the last 60 days (meaning they were recently active)
  const inactiveClients = useMemo(() => {
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    return clients.filter(c => {
      if (c.status !== "Inactive") return false;
      if (c.inactiveNotificationDismissed === true) return false;
      if (!c.lastSessionDate) return false; // No sessions = old client, don't notify
      
      // Only show if they had a session within the last 60 days (recently active)
      try {
        const lastSession = new Date(c.lastSessionDate);
        return lastSession >= sixtyDaysAgo;
      } catch (e) {
        return false;
      }
    });
  }, [clients]);

  const handleDismissWarning = async (clientId: string) => {
    if (dismissing.has(clientId)) {
      return;
    }
    
    setDismissing(prev => new Set(prev).add(clientId));
    
    try {
      const result = await dismissZeroBalanceWarning(clientId);
      
      if (result.success) {
        setClients(prevClients => {
          return prevClients.map(c =>
            c.id === clientId
              ? { ...c, zeroBalanceWarningDismissed: true }
              : c
          );
        });
        
        setTimeout(() => {
          setDismissing(prev => {
            const next = new Set(prev);
            next.delete(clientId);
            return next;
          });
        }, 500);
        
        router.refresh();
      } else {
        setDismissing(prev => {
          const next = new Set(prev);
          next.delete(clientId);
          return next;
        });
        alert("Failed to dismiss notification: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error dismissing warning:", error);
      setDismissing(prev => {
        const next = new Set(prev);
        next.delete(clientId);
        return next;
      });
      alert("Failed to dismiss notification. Please try again.");
    }
  };

  const handleDismissInactive = async (clientId: string) => {
    if (dismissing.has(clientId)) {
      return;
    }
    
    setDismissing(prev => new Set(prev).add(clientId));
    
    try {
      console.log("Dismissing inactive notification for client:", clientId);
      const result = await dismissInactiveNotification(clientId);
      console.log("Dismiss result:", result);
      
      if (result.success) {
        // Optimistically update the client in the local state
        setClients(prevClients => {
          const updated = prevClients.map(c =>
            c.id === clientId
              ? { ...c, inactiveNotificationDismissed: true }
              : c
          );
          console.log("Updated clients state, client should be dismissed now");
          return updated;
        });
        
        setTimeout(() => {
          setDismissing(prev => {
            const next = new Set(prev);
            next.delete(clientId);
            return next;
          });
        }, 500);
        
        // Refresh to get latest data from server
        router.refresh();
      } else {
        // Remove from dismissing set on error
        setDismissing(prev => {
          const next = new Set(prev);
          next.delete(clientId);
          return next;
        });
        alert("Failed to dismiss notification: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error dismissing inactive notification:", error);
      setDismissing(prev => {
        const next = new Set(prev);
        next.delete(clientId);
        return next;
      });
      alert("Failed to dismiss notification. Please try again.");
    }
  };

  const handleClientClick = (clientId: string) => {
    router.push(`/clients/${clientId}`);
  };

  if (zeroBalance.length === 0 && lowBalance.length === 0 && inactiveClients.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-sand-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No notifications at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {inactiveClients.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-900 dark:text-red-200">Client Status Alerts - Inactive Clients</h4>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {inactiveClients.length} client{inactiveClients.length > 1 ? 's' : ''} {inactiveClients.length > 1 ? 'have' : 'has'} turned inactive
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            {inactiveClients.map(client => {
              const isDismissing = dismissing.has(client.id);
              return (
                <div
                  key={client.id}
                  className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 border border-red-200 dark:border-red-800"
                >
                  <button
                    onClick={() => handleClientClick(client.id)}
                    className="text-sm font-medium text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-200 hover:underline flex-1 text-left"
                    disabled={isDismissing}
                  >
                    {client.name}
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDismissInactive(client.id);
                    }}
                    disabled={isDismissing}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 px-2 py-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDismissing ? "Dismissing..." : "Dismiss"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {zeroBalance.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-amber-900 dark:text-amber-200">Package Balance Alerts - Zero Balance</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  {zeroBalance.length} client{zeroBalance.length > 1 ? 's' : ''} with zero balance
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            {zeroBalance.map(client => {
              const isDismissing = dismissing.has(client.id);
              return (
                <div
                  key={client.id}
                  className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 border border-amber-200 dark:border-amber-800"
                >
                  <button
                    onClick={() => handleClientClick(client.id)}
                    className="text-sm font-medium text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-200 hover:underline flex-1 text-left"
                    disabled={isDismissing}
                  >
                    {client.name}
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDismissWarning(client.id);
                    }}
                    disabled={isDismissing}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 px-2 py-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDismissing ? "Dismissing..." : "Dismiss"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {lowBalance.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-amber-900 dark:text-amber-200">Package Balance Alerts - Low Balance</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  {lowBalance.length} client{lowBalance.length > 1 ? 's' : ''} with low balance (≤3 classes)
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            {lowBalance.map(client => (
              <div
                key={client.id}
                className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 border border-amber-200 dark:border-amber-800"
              >
                <button
                  onClick={() => handleClientClick(client.id)}
                  className="text-sm font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 hover:underline flex-1 text-left"
                >
                  {client.name} ({client.classPackBalance} classes remaining)
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
