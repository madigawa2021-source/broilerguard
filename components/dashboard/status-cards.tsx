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
  SunMoon,
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
    ambientLight: "day" | "night"
    fan: boolean
    waterMister: boolean
    light: boolean
    heater: boolean
    vibration: boolean
    servoAngle: number
  }
}

export function StatusCards({ data }: StatusCardsProps) {
  const getTemperatureStatus = (temp: number) => {
    if (temp >= 30 && temp <= 33) return "normal"
    if ((temp >= 28 && temp < 30) || (temp > 33 && temp <= 35)) return "warning"
    return "critical"
  }

  const getHumidityStatus = (humidity: number) => {
    if (humidity >= 50 && humidity <= 70) return "normal"
    if ((humidity >= 40 && humidity < 50) || (humidity > 70 && humidity <= 80)) return "warning"
    return "critical"
  }

  const getWaterStatus = (level: number) => {
    if (level >= 60) return "normal"
    if (level >= 30) return "warning"
    return "critical"
  }

  const lightStatusLabels: Record<string, { label: string; status: "normal" | "warning" | "critical" }> = {
    day:   { label: "Daylight",   status: "normal" },
    night: { label: "Night Time", status: "warning" },
  }

  const ps = lightStatusLabels[data.ambientLight] ?? lightStatusLabels["day"]

  return (
    <div className="space-y-4">
      {/* Sensor Readings Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          title="Temperature"
          value={data.temperature.toFixed(1)}
          unit="°C"
          icon={<Thermometer className="h-5 w-5" />}
          status={getTemperatureStatus(data.temperature)}
          trend={{ direction: "up", value: "+0.5°C" }}
          subtitle="Optimal: 28–33°C"
        />
        <StatusCard
          title="Humidity"
          value={data.humidity.toFixed(0)}
          unit="%"
          icon={<Droplets className="h-5 w-5" />}
          status={getHumidityStatus(data.humidity)}
          trend={{ direction: "down", value: "-2%" }}
          subtitle="Optimal: 50–70%"
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
          title="Ambient Light"
          value={ps.label}
          unit=""
          icon={<SunMoon className="h-5 w-5" />}
          status={ps.status}
          subtitle="Pen lighting status"
        />
      </div>

      {/* Relay & Alert Status Row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {[
          { label: "Fan",          active: data.fan,          color: "blue"   },
          { label: "Water Mister", active: data.waterMister,  color: "cyan"   },
          { label: "Light",        active: data.light,        color: "yellow" },
          { label: "Heater",       active: data.heater,       color: "orange" },
          { label: "Intrusion",    active: data.vibration,    color: "red", alert: true },
        ].map(({ label, active, alert }) => (
          <div
            key={label}
            className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-all ${
              active
                ? alert
                  ? "border-destructive/50 bg-destructive/10"
                  : "border-primary/40 bg-primary/10"
                : "border-border bg-card"
            }`}
          >
            <span className="text-sm font-medium text-foreground">{label}</span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                active
                  ? alert
                    ? "bg-destructive text-white"
                    : "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {active ? (alert ? "⚠ ALERT" : "ON") : "OFF"}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

