"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"

interface TemperatureChartProps {
  data: {
    time: string
    temperature: number
    humidity: number
  }[]
}

const chartConfig = {
  temperature: {
    label: "Temperature",
    color: "var(--color-chart-1)",
  },
  humidity: {
    label: "Humidity",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig

export function TemperatureChart({ data }: TemperatureChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>24-Hour Temperature & Humidity</CardTitle>
        <CardDescription>
          Environmental conditions over the last 24 hours
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart
            data={data}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <defs>
              <linearGradient id="temperatureGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="humidityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="time"
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="temp"
              orientation="left"
              domain={[20, 40]}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}°C`}
            />
            <YAxis
              yAxisId="humidity"
              orientation="right"
              domain={[0, 100]}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <ReferenceLine
              yAxisId="temp"
              y={30}
              stroke="var(--color-chart-1)"
              strokeDasharray="5 5"
              strokeOpacity={0.5}
              label={{
                value: "Min Optimal",
                fill: "var(--muted-foreground)",
                fontSize: 10,
                position: "insideTopLeft",
              }}
            />
            <ReferenceLine
              yAxisId="temp"
              y={33}
              stroke="var(--color-chart-1)"
              strokeDasharray="5 5"
              strokeOpacity={0.5}
              label={{
                value: "Max Optimal",
                fill: "var(--muted-foreground)",
                fontSize: 10,
                position: "insideBottomLeft",
              }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              yAxisId="temp"
              type="monotone"
              dataKey="temperature"
              stroke="var(--color-chart-1)"
              fill="url(#temperatureGradient)"
              strokeWidth={2}
            />
            <Area
              yAxisId="humidity"
              type="monotone"
              dataKey="humidity"
              stroke="var(--color-chart-2)"
              fill="url(#humidityGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-chart-1" />
            <span className="text-sm text-muted-foreground">Temperature (°C)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-chart-2" />
            <span className="text-sm text-muted-foreground">Humidity (%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
