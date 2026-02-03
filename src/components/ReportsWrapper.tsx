"use client";

import { useState, useMemo } from "react";
import { DateFilter, DateFilterOption } from "@/components/DateFilter";
import { RevenueChart } from "@/components/RevenueChart";
import { LineChart } from "@/components/LineChart";
import { PieChart } from "@/components/PieChart";

interface ReportsWrapperProps {
  sessions: any[];
}

export function ReportsWrapper({ sessions }: ReportsWrapperProps) {
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

  // Revenue by Location
  const byLocation: Record<string, number> = {};
  // Revenue by Type
  const byType: Record<string, number> = {};
  // Monthly Revenue
  const monthlyRevenue: Record<string, number> = {};
  // Revenue by Day of Week
  const dayOfWeekRevenue: Record<string, number> = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  // Session Count by Type (excluding package purchases)
  const sessionCountByType: Record<string, number> = {};
  // Payment Status
  let paidCount = 0;
  let unpaidCount = 0;
  let paidRevenue = 0;
  let unpaidRevenue = 0;
  // Top Clients by Revenue
  const clientRevenue: Record<string, number> = {};
  // Package vs Single Session Revenue
  let packageRevenue = 0;
  let singleSessionRevenue = 0;
  let groupSessionRevenue = 0;

  filteredSessions.forEach(s => {
    const sessionDate = new Date(s.date);
    const revenue = Number(s.price) * s.clients.length;
    const monthKey = sessionDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const dayOfWeek = dayNames[sessionDate.getDay()];

    // Revenue by Location (paid only)
    if (s.isPaid) {
      byLocation[s.location] = (byLocation[s.location] || 0) + revenue;
      byType[s.type] = (byType[s.type] || 0) + revenue;
      monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + revenue;
      dayOfWeekRevenue[dayOfWeek] = (dayOfWeekRevenue[dayOfWeek] || 0) + revenue;

      // Package vs Single/Group
      if (s.type === "Package Purchase") {
        packageRevenue += revenue;
      } else if (s.type === "Single") {
        singleSessionRevenue += revenue;
      } else if (s.type === "Group") {
        groupSessionRevenue += revenue;
      }
    }

    // Session Count by Type (excluding package purchases)
    if (s.type !== "Package Purchase") {
      sessionCountByType[s.type] = (sessionCountByType[s.type] || 0) + 1;
    }

    // Payment Status
    if (s.isPaid) {
      paidCount++;
      paidRevenue += revenue;
    } else {
      unpaidCount++;
      unpaidRevenue += revenue;
    }

    // Top Clients by Revenue
    s.clients.forEach((client: any) => {
      if (s.isPaid) {
        clientRevenue[client.name] = (clientRevenue[client.name] || 0) + Number(s.price);
      }
    });
  });

  // Prepare chart data
  const locationData = Object.entries(byLocation).map(([name, value]) => ({ name, value }));
  const typeData = Object.entries(byType).map(([name, value]) => ({ name, value }));

  // Monthly Revenue (sorted by date)
  const monthlyData = Object.entries(monthlyRevenue)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => {
      const dateA = new Date(a.name);
      const dateB = new Date(b.name);
      return dateA.getTime() - dateB.getTime();
    });

  // Day of Week Revenue (ordered)
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayData = dayOrder
    .map(day => ({ name: day, value: dayOfWeekRevenue[day] || 0 }))
    .filter(d => d.value > 0);

  // Session Count by Type
  const sessionTypeData = Object.entries(sessionCountByType).map(([name, value]) => ({ name, value }));

  // Payment Status
  const paymentStatusData = [
    { name: 'Paid', value: paidRevenue },
    { name: 'Unpaid', value: unpaidRevenue }
  ].filter(d => d.value > 0);

  // Package vs Sessions Revenue
  const revenueBreakdownData = [
    { name: 'Packages', value: packageRevenue },
    { name: 'Single Sessions', value: singleSessionRevenue },
    { name: 'Group Sessions', value: groupSessionRevenue }
  ].filter(d => d.value > 0);

  // Top 10 Clients by Revenue
  const topClientsData = Object.entries(clientRevenue)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Calculate metrics: Total Revenue = paid + unpaid; Uncollected = unpaid only
  const totalRevenue = paidRevenue + unpaidRevenue;
  const totalSessions = filteredSessions.filter(s => s.type !== "Package Purchase").length;
  const avgRevenuePerSession = totalSessions > 0 ? totalRevenue / totalSessions : 0;
  const paymentRate = (paidCount / (paidCount + unpaidCount)) * 100 || 0;

  // Calculate Average Weekly Sessions
  const calculateAverageWeeklySessions = () => {
    if (totalSessions === 0) return 0;
    
    let rangeStart: Date;
    let rangeEnd: Date;
    
    if (startDate && endDate) {
      rangeStart = new Date(startDate);
      rangeEnd = new Date(endDate);
    } else if (startDate) {
      rangeStart = new Date(startDate);
      rangeEnd = new Date();
    } else if (endDate) {
      // If only end date, find the earliest session date
      const sessionDates = filteredSessions.map(s => new Date(s.date));
      rangeStart = sessionDates.length > 0 ? new Date(Math.min(...sessionDates.map(d => d.getTime()))) : new Date();
      rangeEnd = new Date(endDate);
    } else {
      // All time - use earliest and latest session dates
      const sessionDates = filteredSessions.map(s => new Date(s.date));
      if (sessionDates.length === 0) return 0;
      rangeStart = new Date(Math.min(...sessionDates.map(d => d.getTime())));
      rangeEnd = new Date(Math.max(...sessionDates.map(d => d.getTime())));
    }
    
    // Calculate number of weeks
    const timeDiff = rangeEnd.getTime() - rangeStart.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    const weeks = daysDiff / 7;
    
    // Avoid division by zero
    if (weeks === 0) return totalSessions;
    
    return totalSessions / weeks;
  };

  const avgWeeklySessions = calculateAverageWeeklySessions();

  return (
    <>
      <div className="flex items-center justify-end mb-6">
        <DateFilter value={dateFilter} onChange={handleDateFilterChange} />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-sand-200 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-1">Total Revenue</p>
          <p className="text-2xl font-serif text-charcoal">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-sand-200 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-1">Total Revenue Uncollected / Reviewed</p>
          <p className="text-2xl font-serif text-charcoal">${unpaidRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-sand-200 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-1">Total Sessions</p>
          <p className="text-2xl font-serif text-charcoal">{totalSessions.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-sand-200 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-1">Avg Weekly Sessions</p>
          <p className="text-2xl font-serif text-charcoal">{avgWeeklySessions.toFixed(1)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-sand-200 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-1">Avg per Session</p>
          <p className="text-2xl font-serif text-charcoal">${avgRevenuePerSession.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-sand-200 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-1">Payment Rate</p>
          <p className="text-2xl font-serif text-charcoal">{paymentRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Revenue Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border border-sand-200 shadow-sm">
          <h3 className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-6">Revenue by Location</h3>
          <RevenueChart data={locationData} />
          {locationData.length === 0 && <p className="text-center text-xs text-gray-300 mt-4">No data available</p>}
        </div>

        <div className="bg-white p-6 rounded-xl border border-sand-200 shadow-sm">
          <h3 className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-6">Revenue by Type</h3>
          <RevenueChart data={typeData} />
          {typeData.length === 0 && <p className="text-center text-xs text-gray-300 mt-4">No data available</p>}
        </div>
      </div>

      {/* Monthly Revenue Trend */}
      {monthlyData.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-sand-200 shadow-sm">
          <h3 className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-6">Monthly Revenue Trend</h3>
          <LineChart 
            data={monthlyData} 
            dataKey="value" 
            name="Revenue"
            color="#333333"
            formatAsCurrency={true}
          />
        </div>
      )}

      {/* Additional Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Day of Week Revenue */}
        {dayData.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-sand-200 shadow-sm">
            <h3 className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-6">Revenue by Day of Week</h3>
            <RevenueChart data={dayData} />
          </div>
        )}

        {/* Session Count by Type */}
        {sessionTypeData.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-sand-200 shadow-sm">
            <h3 className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-6">Sessions by Type</h3>
            <RevenueChart data={sessionTypeData} formatAsCurrency={false} />
          </div>
        )}
      </div>

      {/* Payment Status & Revenue Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Payment Status */}
        {paymentStatusData.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-sand-200 shadow-sm">
            <h3 className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-6">Payment Status</h3>
            <PieChart data={paymentStatusData} />
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Paid Sessions:</span>
                <span className="font-medium">{paidCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Unpaid Sessions:</span>
                <span className="font-medium">{unpaidCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Revenue Breakdown: Packages vs Sessions */}
        {revenueBreakdownData.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-sand-200 shadow-sm">
            <h3 className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-6">Revenue Breakdown</h3>
            <PieChart data={revenueBreakdownData} />
          </div>
        )}
      </div>

      {/* Top Clients */}
      {topClientsData.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-sand-200 shadow-sm">
          <h3 className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-6">Top Clients by Revenue</h3>
          <div className="space-y-3">
            {topClientsData.map((client, index) => (
              <div key={client.name} className="flex items-center justify-between py-2 border-b border-sand-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 font-serif text-sm w-6">{index + 1}.</span>
                  <span className="font-medium text-charcoal">{client.name}</span>
                </div>
                <span className="font-serif text-sage">${client.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
