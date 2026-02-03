"use client";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface PieChartProps {
  data: any[];
  colors?: string[];
}

const DEFAULT_COLORS = ['#333333', '#A89F91', '#8B7355', '#D4C4B0', '#C9B99B'];

export function PieChart({ data, colors = DEFAULT_COLORS }: PieChartProps) {
  return (
    <div className="h-72 w-full px-4">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart margin={{ top: 10, right: 20, left: 80, bottom: 20 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={65}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #E5E0D8',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'var(--font-serif)'
            }}
            formatter={(value: any) => `$${Number(value).toLocaleString()}`}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
