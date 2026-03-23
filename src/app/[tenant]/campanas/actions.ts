"use server"

import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/meta-api/encryption";
import { syncTenantData } from "@/lib/meta-api/sync";
import { revalidatePath } from "next/cache";

/**
 * Server action to trigger a real sync from Meta API for a specific tenant.
 */
export async function syncCampaignsAction(tenantId: string, slug: string) {
  const supabase = await createClient();
  
  // 1. Get connection details from Supabase
  const { data: connection, error: connErr } = await supabase
    .from("meta_connections")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  if (connErr || !connection || !connection.ad_account_id) {
    throw new Error("No hay una cuenta de Meta conectada para este espacio de trabajo.");
  }

  // 2. Decrypt the sensitive access token
  let token;
  try {
    token = decrypt(connection.access_token_encrypted);
  } catch (e) {
    throw new Error("Error de seguridad al descifrar el token de acceso.");
  }

  // 3. Trigger the complex sync operation (fetches insights, upserts campaigns, etc.)
  try {
    const result = await syncTenantData(
        tenantId,
        connection.id,
        connection.ad_account_id,
        token,
        "last_30d"
    );

    // 4. Force Next.js to re-render the page with new data
    revalidatePath(`/${slug}/campanas`);
    revalidatePath(`/${slug}/dashboard`);

    return { 
        success: true, 
        processed: result.campaignsProcessed,
        insights: result.insightsProcessed 
    };
  } catch (error: any) {
    console.error("[SyncAction Error]", error);
    throw new Error(error.message || "Fallo crítico durante la sincronización con Meta.");
  }
}
