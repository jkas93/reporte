"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { toast } from "sonner"

export function ExportButton({ 
  data, 
  filename, 
  columns 
}: { 
  data: any[]; 
  filename: string; 
  columns: { key: string; label: string }[] 
}) {
  const handleExport = () => {
    try {
      const csvContent = [
        columns.map(c => c.label).join(","),
        ...data.map(row => columns.map(c => row[c.key]).join(","))
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `${filename}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success("CSV exportado correctamente.")
    } catch (e) {
      toast.error("Error al exportar CSV.")
    }
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleExport}
      className="gap-2"
    >
      <Download className="size-4" />
      <span>Exportar CSV</span>
    </Button>
  )
}
