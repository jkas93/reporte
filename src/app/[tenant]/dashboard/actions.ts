"use server";

import { createClient } from "@/lib/supabase/server";
import { syncTenantData } from "@/lib/meta-api/sync";
import { decrypt } from "@/lib/meta-api/encryption";
import { revalidatePath } from "next/cache";

export async function forceSyncTenant(tenantId: string, slug: string) {
  try {
    const supabase = await createClient();
    
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Acceso denegado");

    // Get Connection
    const { data: connection } = await supabase
      .from("meta_connections")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "connected")
      .single();

    if (!connection) {
       throw new Error("No hay conexión activa con Meta.");
    }

    // Rate Limit Simple: 15 minutos de espera entre sincronizaciones manuales
    if (connection.last_synced_at) {
       const lastSync = new Date(connection.last_synced_at).getTime();
       const now = Date.now();
       const diffMinutes = (now - lastSync) / 1000 / 60;
       
       if (diffMinutes < 15) {
          throw new Error("Por favor, espera 15 minutos antes de volver a sincronizar manualmente.");
       }
    }

    const token = decrypt(connection.access_token_encrypted);
    
    // Traer datos de este mes y el mes pasado como buffer de seguridad
    await syncTenantData(tenantId, connection.id, connection.ad_account_id, token, 'last_30d');

    // Refrescar toda la ruta
    revalidatePath(`/${slug}/dashboard`);
    revalidatePath(`/${slug}/campanas`);
    
    return { success: true };

  } catch (error: any) {
    console.error("Manual Sync Error:", error);
    return { error: error.message || "Fallo la sincronización" };
  }
}
