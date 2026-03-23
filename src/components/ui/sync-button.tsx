"use client"

import * as React from "react"
import { syncCampaignsAction } from "@/app/[tenant]/campanas/actions"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"

export function SyncButton({ 
  tenantId, 
  slug, 
  lastSyncedAt 
}: { 
  tenantId: string; 
  slug: string; 
  lastSyncedAt?: string 
}) {
  const [loading, setLoading] = React.useState(false)

  const handleSync = async () => {
    setLoading(true)
    const toastId = toast.loading("Actualizando métricas desde Meta Ads...")
    
    try {
      const result = await syncCampaignsAction(tenantId, slug)
      
      if (result && 'success' in result && result.success) {
        toast.success(`Sincronización manual exitosa.`, { id: toastId })
      } else if (result && 'error' in result) {
        toast.error(result.error || "Fallo inesperado al sincronizar.", { id: toastId })
      } else {
        toast.error("Fallo inesperado al sincronizar.", { id: toastId })
      }
    } catch (e: any) {
      toast.error(e.message || "Error al sincronizar con Meta.", { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleSync} 
      disabled={loading}
      className="gap-2 bg-background shadow-sm hover:bg-muted/50"
    >
      <RefreshCw className={`size-4 ${loading ? "animate-spin text-primary" : ""}`} />
      <span>{loading ? "Sincronizando..." : "Sincronizar"}</span>
    </Button>
  )
}
