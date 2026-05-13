// lib/useSensorData.ts
"use client"

import { useEffect, useState } from "react"
import { database } from "@/lib/firebase"
import { ref, onValue, query, orderByKey, limitToLast } from "firebase/database"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SensorData {
  temperature: number
  humidity: number
  waterLevel: number
  powerStatus: "grid" | "solar" | "generator" | "battery" | "outage"
  fan: boolean
  waterMister: boolean
  light: boolean
  heater: boolean
  vibration: boolean
  servoAngle: number
}

export interface ChartPoint {
  time: string
  temperature: number
  humidity: number
}

export interface AlertItem {
  id: string
  type: "critical" | "warning" | "info" | "resolved"
  category: "temperature" | "humidity" | "power" | "camera" | "water" | "system"
  title: string
  message: string
  timestamp: string
  penId?: string
}

// ─── Live sensor hook (reads /sensors node) ───────────────────────────────────
// ESP32 should write to Firebase like this:
//   /sensors/temperature  → 31.5
//   /sensors/humidity     → 62
//   /sensors/water_level  → 75
//   /sensors/power_status → "grid"

export function useLiveSensorData() {
  const [data, setData] = useState<SensorData>({
    temperature: 31.5,
    humidity: 62,
    waterLevel: 75,
    powerStatus: "grid",
    fan: false,
    waterMister: false,
    light: false,
    heater: false,
    vibration: false,
    servoAngle: 90,
  })
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const sensorsRef = ref(database, "sensors")

    const unsubscribe = onValue(
      sensorsRef,
      (snapshot) => {
        const raw = snapshot.val()
        if (raw) {
          setData({
            temperature: Number(raw.temperature ?? 31.5),
            humidity: Number(raw.humidity ?? 62),
            waterLevel: Number(raw.water_level ?? 75),
            powerStatus: (raw.power_status ?? "grid") as SensorData["powerStatus"],
            fan: Boolean(raw.fan),
            waterMister: Boolean(raw.water_mister),
            light: Boolean(raw.light),
            heater: Boolean(raw.heater),
            vibration: Boolean(raw.vibration),
            servoAngle: Number(raw.servo_angle ?? 90),
          })
          setConnected(true)
        }
      },
      (error) => {
        console.error("Firebase sensor read error:", error)
        setConnected(false)
      }
    )

    return () => unsubscribe()
  }, [])

  return { data, connected }
}

// ─── Chart history hook (reads /history node) ─────────────────────────────────
// ESP32 should push history entries to:
//   /history → push({ temperature, humidity, timestamp })
// Each entry: { temperature: 31.2, humidity: 60, timestamp: 1714000000000 }

export function useChartHistory() {
  const [chartData, setChartData] = useState<ChartPoint[]>([])

  useEffect(() => {
    // Get last 24 entries (one per hour ideally)
    const historyRef = query(
      ref(database, "history"),
      orderByKey(),
      limitToLast(24)
    )

    const unsubscribe = onValue(historyRef, (snapshot) => {
      const raw = snapshot.val()
      if (raw) {
        const points: ChartPoint[] = Object.entries(raw).map(([, value]) => {
          const v = value as { temperature: number; humidity: number; timestamp: number }
          const date = new Date(v.timestamp)
          return {
            time: date.toLocaleTimeString("en-US", { hour: "2-digit", hour12: true }),
            temperature: Number(v.temperature),
            humidity: Number(v.humidity),
          }
        })
        setChartData(points)
      }
    })

    return () => unsubscribe()
  }, [])

  return chartData
}

// ─── Alerts hook (reads /alerts node) ────────────────────────────────────────
// Alerts can be written by ESP32 or a cloud function
// Each entry: { type, category, title, message, timestamp, penId? }

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([])

  useEffect(() => {
    const alertsRef = query(
      ref(database, "alerts"),
      orderByKey(),
      limitToLast(20)
    )

    const unsubscribe = onValue(alertsRef, (snapshot) => {
      const raw = snapshot.val()
      if (raw) {
        const items: AlertItem[] = Object.entries(raw)
          .map(([id, value]) => ({ id, ...(value as Omit<AlertItem, "id">) }))
          .reverse() // newest first
        setAlerts(items)
      }
    })

    return () => unsubscribe()
  }, [])

  return alerts
}
