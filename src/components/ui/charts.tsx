"use client"

import * as React from "react"
import { 
  Area, 
  AreaChart, 
  CartesianGrid, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function CampaignsEvolutionChart({ data }: { data: any[] }) {
  const chartData = data.map(d => ({
    date: d.day,
    spend: parseFloat(d.total_spend) || 0,
    clicks: d.total_clicks || 0
  }))

  return (
    <Card className="col-span-1 lg:col-span-2 border shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold uppercase tracking-wider">Evolución de Inversión</CardTitle>
        <CardDescription>Gasto diario acumulado en el periodo seleccionado</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))", 
                  borderColor: "hsl(var(--border))",
                  fontSize: "12px",
                  borderRadius: "8px"
                }}
              />
              <Area 
                type="monotone" 
                dataKey="spend" 
                stroke="var(--primary)" 
                fillOpacity={1} 
                fill="url(#colorSpend)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
