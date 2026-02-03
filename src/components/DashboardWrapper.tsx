"use client";

import { useState, useMemo } from "react";
import { DashboardMetrics } from "@/components/DashboardMetrics";
import { DashboardClassLog } from "@/components/DashboardClassLog";
import { DateFilter, DateFilterOption } from "@/components/DateFilter";

interface DashboardWrapperProps {
  sessions: any[];
  clients: any[];
}

export function DashboardWrapper({ sessions, clients }: DashboardWrapperProps) {
  const [dateFilter, setDateFilter] = useState<DateFilterOption>("all-time");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const filteredSessions = useMemo(() => {
    if (!startDate && !endDate) {
      return sessions;
    }

    return sessions.filter((session) => {
      const sessionDate = new Date(session.date);
      if (startDate && sessionDate < startDate) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (sessionDate > end) return false;
      }
      return true;
    });
  }, [sessions, startDate, endDate]);

  const handleDateFilterChange = (option: DateFilterOption, start?: Date, end?: Date) => {
    setDateFilter(option);
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <>
      <div className="flex items-center justify-end mb-6">
        <DateFilter value={dateFilter} onChange={handleDateFilterChange} />
      </div>
      
      <DashboardMetrics sessions={filteredSessions} clients={clients} />
      <div className="space-y-4 mt-8">
        <h3 className="font-serif text-xl text-charcoal dark:text-white">Studio Log</h3>
        <DashboardClassLog sessions={filteredSessions} />
      </div>
    </>
  );
}
