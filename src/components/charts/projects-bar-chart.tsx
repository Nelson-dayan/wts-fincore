"use client";

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";

type ProfitabilityItem = {
  id: string;
  name: string;
  profit: number;
};

interface ProjectsBarChartProps {
  data: ProfitabilityItem[];
  height?: number;
  formatCurrency: (n: number) => string;
}

export default function ProjectsBarChart({ data, height = 300, formatCurrency }: ProjectsBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height} minHeight={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis 
          dataKey="name" 
          type="category" 
          axisLine={false} 
          tickLine={false}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 600 }}
          width={80}
        />
        <Tooltip 
          cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-background border border-border/60 p-2 rounded-lg shadow-xl text-xs font-bold">
                  {formatCurrency(payload[0].value as number)}
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={index === 0 ? "hsl(var(--primary))" : "hsl(var(--primary)/0.6)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
