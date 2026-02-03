"use client";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface LineChartProps {
  data: any[];
  dataKey: string;
  name: string;
  color?: string;
  formatAsCurrency?: boolean;
}

export function LineChart({ data, dataKey, name, color = "#333333", formatAsCurrency = false }: LineChartProps) {
  const yAxisFormatter = formatAsCurrency 
    ? (val: any) => `$${val.toLocaleString()}`
    : (val: any) => val.toLocaleString();

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 10, right: 10, left: 50, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D8" />
          <XAxis 
            dataKey="name" 
            fontSize={11} 
            tickLine={false} 
            axisLine={false} 
            stroke="#888888"
          />
          <YAxis 
            fontSize={11} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={yAxisFormatter}
            stroke="#888888"
          />
          <Tooltip 
            cursor={{stroke: '#E5E0D8', strokeWidth: 1}}
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #E5E0D8',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'var(--font-serif)'
            }}
            formatter={formatAsCurrency ? (value: any) => `$${Number(value).toLocaleString()}` : undefined}
          />
          <Line 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            strokeWidth={2}
            dot={{ fill: color, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
