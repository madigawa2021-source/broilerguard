"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Thermometer,
  Droplets,
  GlassWater,
  Zap,
  TrendingUp,
  TrendingDown,
} from "lucide-react"

interface StatusCardProps {
  title: string
  value: string
  unit: string
  icon: React.ReactNode
  status: "normal" | "warning" | "critical"
  trend?: {
    direction: "up" | "down"
    value: string
  }
  subtitle?: string
}

function StatusCard({
  title,
  value,
  unit,
  icon,
  status,
  trend,
  subtitle,
}: StatusCardProps) {
  const statusColors = {
    normal: "bg-primary/20 text-primary border-primary/30",
    warning: "bg-accent/20 text-accent border-accent/30",
    critical: "bg-destructive/20 text-destructive border-destructive/30",
  }

  const statusLabels = {
    normal: "Normal",
    warning: "Warning",
    critical: "Critical",
  }

  return (
    <Card className="relative overflow-hidden">
      <div
        className={`absolute top-0 left-0 h-1 w-full ${
          status === "normal"
            ? "bg-primary"
            : status === "warning"
              ? "bg-accent"
              : "bg-destructive"
        }`}
      />
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={`rounded-lg p-2 ${
            status === "normal"
              ? "bg-primary/10 text-primary"
              : status === "warning"
                ? "bg-accent/10 text-accent"
                : "bg-destructive/10 text-destructive"
          }`}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground">{value}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <Badge
            variant="outline"
            className={statusColors[status]}
          >
            {statusLabels[status]}
          </Badge>
          {trend && (
            <div
              className={`flex items-center gap-1 text-xs ${
                trend.direction === "up" ? "text-primary" : "text-destructive"
              }`}
            >
              {trend.direction === "up" ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        {subtitle && (
          <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}

interface StatusCardsProps {
  data: {
    temperature: number
    humidity: number
    waterLevel: number
    powerStatus: "grid" | "solar" | "generator" | "battery" | "outage"
  }
}

export function StatusCards({ data }: StatusCardsProps) {
  const getTemperatureStatus = (temp: number) => {
    if (temp >= 30 && temp <= 33) return "normal"
    if (temp >= 28 && temp < 30 || temp > 33 && temp <= 35) return "warning"
    return "critical"
  }

  const getHumidityStatus = (humidity: number) => {
    if (humidity >= 50 && humidity <= 70) return "normal"
    if (humidity >= 40 && humidity < 50 || humidity > 70 && humidity <= 80) return "warning"
    return "critical"
  }

  const getWaterStatus = (level: number) => {
    if (level >= 60) return "normal"
    if (level >= 30) return "warning"
    return "critical"
  }

  const powerStatusLabels = {
  grid:    { label: "Grid Power",     status: "normal"   as const },
  solar:   { label: "Solar Power",    status: "normal"   as const },
  generator: { label: "Generator",   status: "warning"  as const },
  battery: { label: "Battery Backup", status: "critical" as const },
  outage:  { label: "Power Outage",   status: "critical" as const },
}

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatusCard
        title="Temperature"
        value={data.temperature.toFixed(1)}
        unit="°C"
        icon={<Thermometer className="h-5 w-5" />}
        status={getTemperatureStatus(data.temperature)}
        trend={{ direction: "up", value: "+0.5°C" }}
        subtitle="Optimal: 30-33°C"
      />
      <StatusCard
        title="Humidity"
        value={data.humidity.toFixed(0)}
        unit="%"
        icon={<Droplets className="h-5 w-5" />}
        status={getHumidityStatus(data.humidity)}
        trend={{ direction: "down", value: "-2%" }}
        subtitle="Optimal: 50-70%"
      />
      <StatusCard
        title="Water Level"
        value={data.waterLevel.toFixed(0)}
        unit="%"
        icon={<GlassWater className="h-5 w-5" />}
        status={getWaterStatus(data.waterLevel)}
        subtitle="Tank capacity"
      />
      <StatusCard
        title="Power Status"
        value={powerStatusLabels[data.powerStatus].label}
        unit=""
        icon={<Zap className="h-5 w-5" />}
        status={powerStatusLabels[data.powerStatus].status}
        subtitle="Active source"
      />
    </div>
  )
}
