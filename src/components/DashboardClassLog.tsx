"use client";

import { useState } from "react";
import { ClassLogTable } from "@/components/ClassLogTable";
import { ClientDetailModal } from "@/components/ClientDetailModal";

interface DashboardClassLogProps {
  sessions: any[];
}

export function DashboardClassLog({ sessions }: DashboardClassLogProps) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  return (
    <>
      <ClassLogTable 
        sessions={sessions} 
        onClientClick={(clientId) => setSelectedClientId(clientId)}
        includePackagePurchases={true}
      />
      <ClientDetailModal 
        clientId={selectedClientId} 
        onClose={() => setSelectedClientId(null)} 
      />
    </>
  );
}
