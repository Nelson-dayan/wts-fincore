"use client";

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

type TimeSeries = {
  month?: string;
  label?: string;
  revenue: number;
  expenses: number;
};

interface RevenueAreaChartProps {
  data: TimeSeries[];
  height?: number;
  formatCurrency: (n: number) => string;
  xAxisKey?: "label" | "month";
}

export default function RevenueAreaChart({ data, height = 300, formatCurrency, xAxisKey = "label" }: RevenueAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height} minHeight={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis 
          dataKey={xAxisKey} 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 600 }} 
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} 
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 600 }} 
        />
        <Tooltip 
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-background border border-border/60 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2">
                    {payload[0].payload[xAxisKey]}
                  </p>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-primary flex justify-between gap-4">
                      <span>Revenue:</span> <span>{formatCurrency(payload[0].value as number)}</span>
                    </p>
                    <p className="text-xs font-bold text-red-500 flex justify-between gap-4">
                      <span>Expenses:</span> <span>{formatCurrency(payload[1].value as number)}</span>
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
        <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
