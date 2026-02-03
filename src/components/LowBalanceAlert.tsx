"use client";

import { AlertTriangle, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface LowBalanceAlertProps {
  clients: Array<{
    id: string;
    name: string;
    classPackBalance: number;
    hasPurchasedPackage?: boolean;
    zeroBalanceWarningDismissed?: boolean;
  }>;
  onDismiss?: () => void;
}

export function LowBalanceAlert({ clients, onDismiss }: LowBalanceAlertProps) {
  const router = useRouter();
  
  // Only show alerts for clients who have purchased a package before AND haven't dismissed the warning
  // Ensure we explicitly check for false/undefined, not just truthy
  const zeroBalance = clients.filter(c => {
    const dismissed = c.zeroBalanceWarningDismissed === true;
    return c.classPackBalance === 0 && 
           c.hasPurchasedPackage === true && 
           !dismissed;
  });
  
  const lowBalance = clients.filter(c => 
    c.classPackBalance > 0 && 
    c.classPackBalance <= 3 && 
    c.hasPurchasedPackage === true
  );

  if (zeroBalance.length === 0 && lowBalance.length === 0) {
    return null;
  }

  const handleClientClick = () => {
    router.push("/clients");
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-medium text-amber-900 mb-2">Package Balance Alerts</h4>
            
            {zeroBalance.length > 0 && (
              <div className="mb-2">
                <p className="text-sm font-medium text-red-700 mb-1">
                  {zeroBalance.length} client{zeroBalance.length > 1 ? 's' : ''} with zero balance:
                </p>
                <div className="flex flex-wrap gap-2">
                  {zeroBalance.map(client => (
                    <button
                      key={client.id}
                      onClick={handleClientClick}
                      className="text-sm text-red-700 hover:text-red-900 hover:underline"
                    >
                      {client.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {lowBalance.length > 0 && (
              <div>
                <p className="text-sm font-medium text-amber-700 mb-1">
                  {lowBalance.length} client{lowBalance.length > 1 ? 's' : ''} with low balance (≤3 classes):
                </p>
                <div className="flex flex-wrap gap-2">
                  {lowBalance.map(client => (
                    <button
                      key={client.id}
                      onClick={handleClientClick}
                      className="text-sm text-amber-700 hover:text-amber-900 hover:underline"
                    >
                      {client.name} ({client.classPackBalance})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-amber-600 hover:text-amber-800 transition-colors ml-2"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
