"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertTriangle,
  CheckCircle,
  Info,
  Thermometer,
  Droplets,
  Zap,
  Camera,
  GlassWater,
} from "lucide-react"

interface Alert {
  id: string
  type: "critical" | "warning" | "info" | "resolved"
  category: "temperature" | "humidity" | "power" | "camera" | "water" | "system"
  title: string
  message: string
  timestamp: string
  penId?: string
}

interface AlertHistoryProps {
  alerts: Alert[]
}

const categoryIcons = {
  temperature: Thermometer,
  humidity: Droplets,
  power: Zap,
  camera: Camera,
  water: GlassWater,
  system: Info,
}

const typeStyles = {
  critical: {
    badge: "bg-destructive/20 text-destructive border-destructive/30",
    icon: AlertTriangle,
    iconColor: "text-destructive",
    bg: "bg-destructive/5 border-destructive/20",
  },
  warning: {
    badge: "bg-accent/20 text-accent border-accent/30",
    icon: AlertTriangle,
    iconColor: "text-accent",
    bg: "bg-accent/5 border-accent/20",
  },
  info: {
    badge: "bg-primary/20 text-primary border-primary/30",
    icon: Info,
    iconColor: "text-primary",
    bg: "bg-primary/5 border-primary/20",
  },
  resolved: {
    badge: "bg-muted text-muted-foreground border-muted",
    icon: CheckCircle,
    iconColor: "text-primary",
    bg: "bg-muted/50 border-muted",
  },
}

export function AlertHistory({ alerts }: AlertHistoryProps) {
  const unresolvedCount = alerts.filter(
    (a) => a.type === "critical" || a.type === "warning"
  ).length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Alert History</CardTitle>
            <CardDescription>Recent system notifications and alerts</CardDescription>
          </div>
          {unresolvedCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {unresolvedCount} Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {alerts.map((alert) => {
              const CategoryIcon = categoryIcons[alert.category]
              const TypeIcon = typeStyles[alert.type].icon
              const styles = typeStyles[alert.type]

              return (
                <div
                  key={alert.id}
                  className={`relative rounded-lg border p-4 transition-colors ${styles.bg}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 rounded-lg p-2 ${
                        alert.type === "critical"
                          ? "bg-destructive/20"
                          : alert.type === "warning"
                            ? "bg-accent/20"
                            : alert.type === "resolved"
                              ? "bg-primary/20"
                              : "bg-secondary"
                      }`}
                    >
                      <CategoryIcon className={`h-4 w-4 ${styles.iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium leading-none">
                              {alert.title}
                            </h4>
                            <Badge variant="outline" className={styles.badge}>
                              <TypeIcon className="mr-1 h-3 w-3" />
                              {alert.type.charAt(0).toUpperCase() +
                                alert.type.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {alert.message}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{alert.timestamp}</span>
                        {alert.penId && (
                          <>
                            <span className="text-border">|</span>
                            <span>Pen {alert.penId}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
