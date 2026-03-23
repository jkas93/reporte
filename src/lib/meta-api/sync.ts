import { createAdminClient } from "@/lib/supabase/admin";
import { META_API_VERSION, metaAuthHeaders } from "./oauth";

interface SyncResult {
  campaignsProcessed: number;
  insightsProcessed: number;
}

export async function syncTenantData(
  tenantId: string,
  connectionId: string,
  adAccountId: string,
  token: string,
  datePreset: string = "last_30d",
  tokenExpiresAt?: string | null
): Promise<SyncResult> {
  if (tokenExpiresAt && new Date(tokenExpiresAt) < new Date()) {
    throw new Error("TOKEN_EXPIRED: El token de Meta ha expirado. Reconecta tu cuenta.");
  }

  const supabase = createAdminClient();

  // Fix P-3: Paginación completa — recorre todos los cursores de Meta API
  const allInsights: any[] = [];
  let cursor: string | null = null;

  do {
    const paginationUrl = `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/insights?level=campaign&fields=campaign_id,campaign_name,spend,reach,clicks,cpc,ctr,actions&time_increment=1&date_preset=${datePreset}${cursor ? `&after=${cursor}` : ""}`;

    // Fix C-1: Token en Authorization header
    const response = await fetch(paginationUrl, {
      headers: metaAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      
      if (response.status === 429 || error.error?.code === 17 || error.error?.code === 80004) {
        throw new Error("RATE_LIMIT: Límite de peticiones de Meta API alcanzado. Intenta de nuevo más tarde.");
      }

      throw new Error(error.error?.message || "Error al sincronizar campañas desde Meta API");
    }

    const body: any = await response.json();
    const rows = body.data || [];
    allInsights.push(...rows);

    // Avanzar al siguiente cursor si existe
    cursor = body.paging?.cursors?.after && body.paging?.next
      ? (body.paging.cursors.after as string)
      : null;

  } while (cursor);

  if (allInsights.length === 0) {
    return { campaignsProcessed: 0, insightsProcessed: 0 };
  }

  // 1. Extraer campañas únicas del payload
  const uniqueCampaignsMap = new Map<string, string>();
  allInsights.forEach((row: any) => {
    uniqueCampaignsMap.set(row.campaign_id, row.campaign_name);
  });

  const campaignsToUpsert = Array.from(uniqueCampaignsMap.entries()).map(([cId, cName]) => ({
    tenant_id: tenantId,
    meta_connection_id: connectionId,
    campaign_id: cId,
    campaign_name: cName,
  }));

  // Fix Q-3: Verificar errores de Supabase
  const { data: insertedCampaigns, error: campErr } = await supabase
    .from("campaigns")
    .upsert(campaignsToUpsert, { onConflict: "meta_connection_id, campaign_id" })
    .select("id, campaign_id");

  if (campErr) throw new Error(`Error guardando campañas: ${campErr.message}`);

  // Mapa reverso: FB campaign_id → Supabase UUID
  const campaignIdMap = new Map<string, string>();
  insertedCampaigns?.forEach((c: any) => campaignIdMap.set(c.campaign_id, c.id));

  // 2. Preparar registros diarios de insights
  const datesToClear = new Set<string>();
  const adInsightsToInsert = allInsights
    .filter((row: any) => campaignIdMap.has(row.campaign_id)) // Descartar rows sin UUID válido
    .map((row: any) => {
      datesToClear.add(row.date_start);

      let conversions = 0;
      if (row.actions) {
        const purchase = row.actions.find(
          (a: any) =>
            a.action_type === "purchase" ||
            a.action_type === "offsite_conversion.fb_pixel_purchase"
        );
        if (purchase) conversions = parseInt(purchase.value || "0");
      }

      return {
        campaign_id: campaignIdMap.get(row.campaign_id),
        tenant_id: tenantId,
        date: row.date_start,
        spend: parseFloat(row.spend || "0"),
        reach: parseInt(row.reach || "0"),
        clicks: parseInt(row.clicks || "0"),
        cpc: parseFloat(row.cpc || "0"),
        ctr: parseFloat(row.ctr || "0"),
        conversions,
        roas: 0,
      };
    });

  // Limpiar días específicos antes de re-insertar
  const datesArray = Array.from(datesToClear);
  await supabase
    .from("ad_insights")
    .delete()
    .eq("tenant_id", tenantId)
    .in("date", datesArray);

  const { error: insErr } = await supabase
    .from("ad_insights")
    .insert(adInsightsToInsert);

  if (insErr) throw new Error(`Error guardando insights: ${insErr.message}`);

  // Actualizar last_synced_at
  await supabase
    .from("meta_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connectionId);

  return {
    campaignsProcessed: insertedCampaigns?.length || 0,
    insightsProcessed: adInsightsToInsert.length,
  };
}
