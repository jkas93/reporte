import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/meta-api/encryption";
import { syncTenantData } from "@/lib/meta-api/sync";

// Export standard configuration for Vercel Cron
export const maxDuration = 120; // 2 minutes max execution
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Verify Vercel CRON Secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Fix C-2: Validar siempre el secreto, incluso en development
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error("[Cron] Unauthorized access attempt", { authHeader, env: process.env.NODE_ENV });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const startTime = new Date();
  const dateStr = new Date(Date.now() - 86400000).toISOString().split('T')[0]; // "Yesterday" YYYY-MM-DD

  console.log(`[Cron] Iniciando sincronización de Meta Ads para fecha: ${dateStr}`);

  try {
    // 2. Traer todas las conexiones activas
    const { data: connections, error: connError } = await supabase
      .from("meta_connections")
      .select("id, tenant_id, ad_account_id, access_token_encrypted, status") // Fix P-4: Selección mínima
      .eq("status", "connected");

    if (connError) throw connError;
    if (!connections || connections.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: "No active connections found" });
    }

    // Fix P-2: Procesamiento paralelo con allSettled para evitar cuellos de botella secuenciales
    const syncResults = await Promise.allSettled(
      connections.map(async (conn) => {
        try {
          const token = decrypt(conn.access_token_encrypted);
          const result = await syncTenantData(conn.tenant_id, conn.id, conn.ad_account_id, token, 'yesterday');
          
          return {
            tenant_id: conn.tenant_id,
            meta_connection_id: conn.id,
            status: "success",
            message: `Cargadas ${result.campaignsProcessed} campañas y ${result.insightsProcessed} registros de insights para ayer.`,
            records_synced: result.insightsProcessed,
            started_at: startTime.toISOString(),
            completed_at: new Date().toISOString()
          };
        } catch (err: any) {
          console.error(`Error sincronizando tenant ${conn.tenant_id}:`, err);
          return {
            tenant_id: conn.tenant_id,
            meta_connection_id: conn.id,
            status: "error",
            message: err.message || "Error desconocido en Meta API",
            records_synced: 0,
            started_at: startTime.toISOString(),
            completed_at: new Date().toISOString()
          };
        }
      })
    );

    // 3. Extraer y guardar logs
    const syncLogRecords = syncResults.map(res => 
      res.status === 'fulfilled' ? res.value : ({
        status: "error",
        message: "Error crítico durante la ejecución de la promesa",
        records_synced: 0,
        started_at: startTime.toISOString(),
        completed_at: new Date().toISOString()
      } as any)
    );

    if (syncLogRecords.length > 0) {
        const { error: logErr } = await supabase.from("sync_logs").insert(syncLogRecords);
        if (logErr) console.error("[Cron] Error guardando logs:", logErr);
    }

    return NextResponse.json({ 
        success: true, 
        processed: connections.length,
        results: syncLogRecords.length
    });

  } catch (error: any) {
    console.error("[Cron Fatal Error]", error);
    await supabase.from("sync_logs").insert([{
        status: "error",
        message: `Fallo Crítico del proceso global: ${error.message}`,
        records_synced: 0,
        started_at: startTime.toISOString(),
        completed_at: new Date().toISOString()
    }]);

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
