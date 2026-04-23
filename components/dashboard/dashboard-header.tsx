"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Bird,
  Settings,
  Bell,
  LayoutDashboard,
} from "lucide-react"
import Link from "next/link"

interface DashboardHeaderProps {
  farmName: string
  selectedPen: string
  onPenChange: (pen: string) => void
  pens: { id: string; name: string }[]
  alertCount: number
}

export function DashboardHeader({
  farmName,
  selectedPen,
  onPenChange,
  pens,
  alertCount,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Bird className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden text-lg font-bold sm:inline-block">
              BroilerGuard
            </span>
          </Link>
          <div className="hidden h-6 w-px bg-border md:block" />
          <div className="hidden md:block">
            <p className="text-sm text-muted-foreground">Farm</p>
            <p className="font-medium">{farmName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedPen} onValueChange={onPenChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select Pen" />
            </SelectTrigger>
            <SelectContent>
              {pens.map((pen) => (
                <SelectItem key={pen.id} value={pen.id}>
                  {pen.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {alertCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-medium text-white">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </Button>

          <Button variant="outline" size="icon" className="hidden sm:flex">
            <Settings className="h-4 w-4" />
          </Button>

          <Badge
            variant="outline"
            className="hidden gap-1.5 border-primary/30 bg-primary/10 text-primary lg:flex"
          >
            <LayoutDashboard className="h-3 w-3" />
            Live Dashboard
          </Badge>
        </div>
      </div>
    </header>
  )
}
