"use client";

import { useMemo } from "react";
import { MetricCard } from "@/components/MetricCard";

interface DashboardMetricsProps {
  sessions: any[];
  clients: any[];
}

export function DashboardMetrics({ sessions, clients }: DashboardMetricsProps) {
  // Total Revenue: all sessions (paid + unpaid)
  const totalRevenue = sessions
    .reduce((acc, s) => acc + parseFloat(s.price) * s.clients.length, 0);

  // Uncollected: revenue from unpaid sessions only (to review / collect)
  const uncollectedRevenue = sessions
    .filter((s) => !s.isPaid)
    .reduce((acc, s) => acc + parseFloat(s.price) * s.clients.length, 0);

  // Total classes excludes "Package Purchase" - only count actual class sessions
  const totalSessions = sessions.filter(s => s.type !== "Package Purchase").length;

  // For unique clients, count clients who have sessions in the filtered range
  const uniqueClients = useMemo(() => {
    const clientIds = new Set<string>();
    sessions.forEach((session) => {
      session.clients.forEach((client: any) => {
        clientIds.add(client.id);
      });
    });
    return clientIds.size;
  }, [sessions]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Total Revenue"
        value={`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      />
      <MetricCard
        title="Total Revenue Uncollected / Reviewed"
        value={`$${uncollectedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      />
      <MetricCard title="Total Classes" value={totalSessions.toString()} />
      <MetricCard title="Unique Clients" value={uniqueClients.toString()} />
    </div>
  );
}
