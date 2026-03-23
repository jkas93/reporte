"use client"

import * as React from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"

/**
 * Improved selector that preserves all other search params
 */
export function DateRangeSelector({ defaultPreset }: { defaultPreset: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleValueChange = (val: string | null) => {
    if (!val) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("preset", val)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Select 
      value={defaultPreset} 
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-[180px] bg-background border-muted shadow-sm hover:bg-muted/10 transition-colors">
        <SelectValue placeholder="Periodo" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="today">Hoy</SelectItem>
        <SelectItem value="yesterday">Ayer</SelectItem>
        <SelectItem value="last_7d">Últimos 7 días</SelectItem>
        <SelectItem value="last_30d">Últimos 30 días</SelectItem>
        <SelectItem value="this_month">Este mes</SelectItem>
        <SelectItem value="last_month">Mes pasado</SelectItem>
        <SelectItem value="last_90d">Últimos 90 días</SelectItem>
      </SelectContent>
    </Select>
  )
}
