"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface RevenueChartProps {
  data: any[];
  formatAsCurrency?: boolean;
}

export function RevenueChart({ data, formatAsCurrency = true }: RevenueChartProps) {
  const yAxisFormatter = formatAsCurrency 
    ? (val: any) => `$${val.toLocaleString()}`
    : (val: any) => val.toLocaleString();

  const tooltipFormatter = formatAsCurrency
    ? (value: any) => `$${Number(value).toLocaleString()}`
    : (value: any) => Number(value).toLocaleString();

  return (
    <div className="h-72 w-full">
       <ResponsiveContainer width="100%" height="100%">
         <BarChart data={data} margin={{ top: 10, right: 10, left: 50, bottom: 50 }}>
           <XAxis 
             dataKey="name" 
             fontSize={11} 
             tickLine={false} 
             axisLine={false} 
             stroke="#888888"
             interval={0}
           />
           <YAxis 
             fontSize={11} 
             tickLine={false} 
             axisLine={false} 
             tickFormatter={yAxisFormatter}
             stroke="#888888"
           />
           <Tooltip 
             cursor={{fill: '#F2F0EB'}}
             contentStyle={{ 
               backgroundColor: '#fff', 
               border: '1px solid #E5E0D8',
               borderRadius: '8px',
               fontSize: '12px',
               fontFamily: 'var(--font-serif)'
             }}
             formatter={tooltipFormatter}
           />
           <Bar dataKey="value" radius={[4, 4, 0, 0]}>
             {data.map((entry, index) => (
               <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#333333' : '#A89F91'} />
             ))}
           </Bar>
         </BarChart>
       </ResponsiveContainer>
    </div>
  )
}
