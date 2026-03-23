import { createAdminClient } from "@/lib/supabase/admin";
import { metaFetch, MetaApiError } from "./client";

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
  // Verificación de expiración proactiva (U.1)
  if (tokenExpiresAt && new Date(tokenExpiresAt) < new Date()) {
    throw new Error("TOKEN_EXPIRED: El token de Meta ha expirado. Reconecta tu cuenta.");
  }

  const supabase = createAdminClient();

  // Paginación completa con MetaClient (Audit U.1)
  const allInsights: any[] = [];
  let afterCursor: string | null = null;

  try {
    do {
      const endpoint: string = `act_${adAccountId}/insights?level=campaign&fields=campaign_id,campaign_name,spend,reach,clicks,cpc,ctr,actions&time_increment=1&date_preset=${datePreset}${afterCursor ? `&after=${afterCursor}` : ""}`;

      const body: any = await metaFetch<any>(endpoint, { accessToken: token });
      const rows = body.data || [];
      allInsights.push(...rows);

      // Avanzar al siguiente cursor si existe
      afterCursor = body.paging?.cursors?.after && body.paging?.next
        ? (body.paging.cursors.after as string)
        : null;

    } while (afterCursor);
  } catch (err) {
    if (err instanceof MetaApiError) {
      if (err.isRateLimit) {
        throw new Error("RATE_LIMIT: Límite de peticiones de Meta API alcanzado. Intenta de nuevo más tarde.");
      }
      if (err.isTokenExpired) {
        throw new Error("TOKEN_EXPIRED: Tu sesión de Meta expiró. Por favor, vuelve a iniciar sesión.");
      }
      throw new Error(`API_ERROR: ${err.message}`);
    }
    throw err;
  }

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

  const { data: insertedCampaigns, error: campErr } = await supabase
    .from("campaigns")
    .upsert(campaignsToUpsert, { onConflict: "meta_connection_id, campaign_id" })
    .select("id, campaign_id");

  if (campErr) throw new Error(`Error guardando campañas: ${campErr.message}`);

  const campaignIdMap = new Map<string, string>();
  insertedCampaigns?.forEach((c: any) => campaignIdMap.set(c.campaign_id, c.id));

  // 2. Preparar registros diarios de insights
  const datesToClear = new Set<string>();
  const adInsightsToInsert = allInsights
    .filter((row: any) => campaignIdMap.has(row.campaign_id))
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

  await supabase
    .from("meta_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connectionId);

  return {
    campaignsProcessed: insertedCampaigns?.length || 0,
    insightsProcessed: adInsightsToInsert.length,
  };
}
