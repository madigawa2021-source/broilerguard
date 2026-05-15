"use client"

import { useState, useCallback } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatusCards } from "@/components/dashboard/status-cards"
import { TemperatureChart } from "@/components/dashboard/temperature-chart"
import { AICameraAnalysis } from "@/components/dashboard/ai-camera-analysis"
import { AlertHistory } from "@/components/dashboard/alert-history"
import { useLiveSensorData, useChartHistory, useAlerts, useCameraAnalysis } from "@/lib/useSensorData"
import { Wifi, WifiOff } from "lucide-react"

// Fallback chart data while Firebase loads
function generateFallbackChart() {
  const now = new Date()
  return Array.from({ length: 24 }, (_, i) => {
    const time = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000)
    return {
      time: time.toLocaleTimeString("en-US", { hour: "2-digit", hour12: true }),
      temperature: Math.round((31 + Math.sin(i * 0.5) * 2) * 10) / 10,
      humidity: Math.round(60 + Math.cos(i * 0.3) * 10),
    }
  })
}

// generateCameraAnalysis removed

const pens = [
  { id: "all", name: "All Pens" },
  { id: "A", name: "Pen A" },
  { id: "B", name: "Pen B" },
  { id: "C", name: "Pen C" },
]

export default function DashboardPage() {
  const [selectedPen, setSelectedPen] = useState("all")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 🔥 Firebase realtime data
  const { data: sensorData, connected } = useLiveSensorData()
  const firebaseChartData = useChartHistory()
  const firebaseAlerts = useAlerts()
  const cameraData = useCameraAnalysis()

  // Use Firebase chart data if available, otherwise fallback
  const [fallbackChart] = useState(generateFallbackChart())
  const temperatureData = firebaseChartData.length > 0 ? firebaseChartData : fallbackChart

  const handleRefreshCamera = useCallback(() => {
    setIsRefreshing(true)
    setTimeout(() => {
      // In a real app, this would trigger an ESP32 manual capture
      setIsRefreshing(false)
    }, 1500)
  }, [])

  const activeAlertCount = firebaseAlerts.filter(
    (a) => a.type === "critical" || a.type === "warning"
  ).length

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        farmName="BroilerGuard — Pen Monitor"
        selectedPen={selectedPen}
        onPenChange={setSelectedPen}
        pens={pens}
        alertCount={activeAlertCount}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pen Monitoring Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time IoT sensor data and AI-powered insights
            </p>
          </div>

          {/* Firebase connection status indicator */}
          <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border ${connected
              ? "bg-green-500/10 text-green-600 border-green-500/30"
              : "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
            }`}>
            {connected ? (
              <>
                <Wifi className="h-3 w-3" />
                <span>Live Firebase</span>
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                <span>Connecting...</span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Status Cards — live from Firebase */}
          <StatusCards data={sensorData} />

          {/* Chart and Camera Analysis */}
          <div className="grid gap-6 lg:grid-cols-2">
            <TemperatureChart data={temperatureData} />
            <AICameraAnalysis
              cameraData={cameraData}
              onRefresh={handleRefreshCamera}
              isRefreshing={isRefreshing}
            />
          </div>

          {/* Alert History — live from Firebase */}
          <AlertHistory alerts={firebaseAlerts.length > 0 ? firebaseAlerts : [
            {
              id: "default-1",
              type: "info" as const,
              category: "system" as const,
              title: "Waiting for alerts",
              message: "No alerts from Firebase yet. Alerts will appear here in real-time.",
              timestamp: "Just now",
            }
          ]} />
        </div>
      </main>
    </div>
  )
}
