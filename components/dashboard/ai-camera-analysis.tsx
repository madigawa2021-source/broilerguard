"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Camera,
  Eye,
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from "lucide-react"

import { useState } from "react"
import type { CameraAnalysisData } from "@/lib/useSensorData"

interface AICameraAnalysisProps {
  cameraData: Record<string, CameraAnalysisData>
  onRefresh: () => void
  isRefreshing?: boolean
}

export function AICameraAnalysis({
  cameraData,
  onRefresh,
  isRefreshing = false,
}: AICameraAnalysisProps) {
  const [selectedAngle, setSelectedAngle] = useState("90")

  const currentData = cameraData[selectedAngle] || {
    analysis: null,
    image: null,
    lastUpdated: 0,
  }
  
  const analysis = currentData.analysis || {
    totalCount: 0,
    activePercentage: 0,
    feedingPercentage: 0,
    restingPercentage: 0,
    healthScore: 0,
    alerts: [],
  }

  const lastUpdatedFormatted = currentData.lastUpdated
    ? new Date(currentData.lastUpdated).toLocaleTimeString()
    : "Waiting for AI..."

  const angles = [
    { id: "0", label: "Left (0°)" },
    { id: "90", label: "Center (90°)" },
    { id: "180", label: "Right (180°)" },
  ]

  const getHealthColor = (score: number) => {
    if (score >= 90) return "text-primary"
    if (score >= 70) return "text-accent"
    return "text-destructive"
  }

  const getHealthLabel = (score: number) => {
    if (score >= 90) return "Excellent"
    if (score >= 70) return "Good"
    if (score >= 50) return "Fair"
    return "Poor"
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              AI Camera Analysis
            </CardTitle>
            <CardDescription>
              Real-time bird behavior monitoring
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Angle Selection Tabs */}
        <div className="flex gap-2 p-1 bg-secondary/30 rounded-lg w-fit">
          {angles.map((angle) => (
            <button
              key={angle.id}
              onClick={() => setSelectedAngle(angle.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                selectedAngle === angle.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/50"
              }`}
            >
              {angle.label}
              {cameraData[angle.id] && (
                <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* Camera Feed */}
        <div className="relative aspect-video overflow-hidden rounded-lg bg-secondary">
          <div className="absolute inset-0 flex items-center justify-center">
            {currentData.image ? (
              <img 
                src={currentData.image} 
                alt={`Live Pen View - ${selectedAngle}°`} 
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-center">
                <Eye className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Waiting for angle {selectedAngle}° feed...
                </p>
              </div>
            )}
          </div>
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge variant="default" className="gap-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              LIVE
            </Badge>
            <Badge variant="secondary" className="bg-background/60 backdrop-blur-sm">
              Angle {selectedAngle}°
            </Badge>
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-lg bg-background/80 px-3 py-2 backdrop-blur-sm">
            <span className="text-sm font-medium">Pen A - Panoramic Scan</span>
            <span className="text-xs text-muted-foreground">
              {lastUpdatedFormatted}
            </span>
          </div>
        </div>

        {/* Analysis Stats */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-border bg-secondary/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Bird Count</span>
              <span className="text-2xl font-bold">{analysis.totalCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Health Score</span>
              <span className={`text-2xl font-bold ${getHealthColor(analysis.healthScore)}`}>
                {analysis.healthScore}%
              </span>
            </div>
            <Badge
              variant="outline"
              className={`w-full justify-center ${
                analysis.healthScore >= 90
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : analysis.healthScore >= 70
                    ? "border-accent/30 bg-accent/10 text-accent"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {getHealthLabel(analysis.healthScore)} Health Status
            </Badge>
          </div>

          <div className="space-y-4 rounded-lg border border-border bg-secondary/50 p-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Behavior Distribution
            </h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Activity className="h-3 w-3 text-primary" />
                    Active
                  </span>
                  <span className="font-medium">{analysis.activePercentage}%</span>
                </div>
                <Progress value={analysis.activePercentage} className="h-2" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-accent" />
                    Feeding
                  </span>
                  <span className="font-medium">{analysis.feedingPercentage}%</span>
                </div>
                <Progress value={analysis.feedingPercentage} className="h-2 [&>div]:bg-accent" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-muted-foreground" />
                    Resting
                  </span>
                  <span className="font-medium">{analysis.restingPercentage}%</span>
                </div>
                <Progress
                  value={analysis.restingPercentage}
                  className="h-2 [&>div]:bg-muted-foreground"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {analysis.alerts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">AI Detected Alerts</h4>
            <div className="space-y-2">
              {analysis.alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    alert.type === "critical"
                      ? "border-destructive/30 bg-destructive/10"
                      : alert.type === "warning"
                        ? "border-accent/30 bg-accent/10"
                        : "border-primary/30 bg-primary/10"
                  }`}
                >
                  {alert.type === "critical" ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                  ) : alert.type === "warning" ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-accent" />
                  ) : (
                    <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                  )}
                  <span className="text-sm">{alert.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
