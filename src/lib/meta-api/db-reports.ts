import { SupabaseClient } from "@supabase/supabase-js";

export type DatePreset =
  | "today"
  | "yesterday"
  | "last_7d"
  | "last_30d"
  | "this_month"
  | "last_month"
  | "last_90d";

/** Convierte un preset a rango YYYY-MM-DD { from, to } */
export function presetToDateRange(preset: DatePreset): { from: string; to: string } {
  const today = new Date();
  
  // Bug Fix: No usar toISOString() porque salta a UTC y puede cambiar el día dependiendo de la hora local.
  // Usamos extracción manual de componentes locales.
  const fmt = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  switch (preset) {
    case "today":
      return { from: fmt(today), to: fmt(today) };
    case "yesterday": {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      return { from: fmt(y), to: fmt(y) };
    }
    case "last_7d": {
      const d = new Date(today); d.setDate(d.getDate() - 7);
      return { from: fmt(d), to: fmt(today) };
    }
    case "last_30d": {
      const d = new Date(today); d.setDate(d.getDate() - 30);
      return { from: fmt(d), to: fmt(today) };
    }
    case "this_month": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: fmt(from), to: fmt(today) };
    }
    case "last_month": {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: fmt(from), to: fmt(to) };
    }
    case "last_90d": {
      const d = new Date(today); d.setDate(d.getDate() - 90);
      return { from: fmt(d), to: fmt(today) };
    }
    default: {
      const d = new Date(today); d.setDate(d.getDate() - 30);
      return { from: fmt(d), to: fmt(today) };
    }
  }
}

/** Agrega métricas por tenant en un rango de fechas desde la BD */
export async function getMetricsSummaryFromDB(
  supabase: SupabaseClient,
  tenantId: string,
  preset: DatePreset = "last_30d"
) {
  const { from, to } = presetToDateRange(preset);

  const { data, error } = await supabase
    .from("ad_insights")
    .select("spend, reach, clicks, cpc, ctr, conversions, roas, date")
    .eq("tenant_id", tenantId)
    .gte("date", from)
    .lte("date", to);

  if (error || !data || data.length === 0) {
    return { spend: 0, reach: 0, clicks: 0, cpc: 0, ctr: 0, conversions: 0, roas: 0, hasSyncedData: false };
  }

  const totals = data.reduce(
    (acc, row) => ({
      spend: acc.spend + Number(row.spend),
      reach: acc.reach + Number(row.reach),
      clicks: acc.clicks + Number(row.clicks),
      conversions: acc.conversions + Number(row.conversions),
    }),
    { spend: 0, reach: 0, clicks: 0, conversions: 0 }
  );

  const avgCpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const avgCtr = totals.reach > 0 ? (totals.clicks / totals.reach) * 100 : 0;

  return {
    ...totals,
    cpc: avgCpc,
    ctr: avgCtr,
    roas: 0,
    hasSyncedData: true,
  };
}

/** Top campañas por inversión desde la BD */
export async function getTopCampaignsFromDB(
  supabase: SupabaseClient,
  tenantId: string,
  preset: DatePreset = "last_30d",
  limit = 5
) {
  const { from, to } = presetToDateRange(preset);

  // Traer insights agrupados por campaign_id con JOIN a campaigns
  const { data, error } = await supabase
    .from("ad_insights")
    .select(`
      campaign_id,
      spend, clicks, ctr,
      campaigns!inner(campaign_id, campaign_name)
    `)
    .eq("tenant_id", tenantId)
    .gte("date", from)
    .lte("date", to);

  if (error || !data || data.length === 0) return [];

  // Agrupar por campaign_id
  const grouped = new Map<
    string,
    { campaign_name: string; spend: number; clicks: number }
  >();

  for (const row of data) {
    const campaignRef = row.campaigns as any;
    const cId = campaignRef.campaign_id;
    const cName = campaignRef.campaign_name;
    const existing = grouped.get(cId) || { campaign_name: cName, spend: 0, clicks: 0 };
    grouped.set(cId, {
      campaign_name: existing.campaign_name,
      spend: existing.spend + Number(row.spend),
      clicks: existing.clicks + Number(row.clicks),
    });
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.spend - a.spend)
    .slice(0, limit);
}

/** Serie temporal de Inversión por día para la gráfica */
export async function getSpendTimelineFromDB(
  supabase: SupabaseClient,
  tenantId: string,
  preset: DatePreset = "last_30d"
) {
  const { from, to } = presetToDateRange(preset);

  const { data } = await supabase
    .from("ad_insights")
    .select("date, spend, clicks")
    .eq("tenant_id", tenantId)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  if (!data || data.length === 0) return [];

  // Agrupar por fecha sumando campañas del mismo día
  const byDate = new Map<string, { inversion: number; clics: number }>();
  for (const row of data) {
    const existing = byDate.get(row.date) || { inversion: 0, clics: 0 };
    byDate.set(row.date, {
      inversion: existing.inversion + Number(row.spend),
      clics: existing.clics + Number(row.clicks),
    });
  }

  return Array.from(byDate.entries()).map(([date, vals]) => ({
    name: new Date(date + "T12:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short" }),
    inversion: parseFloat(vals.inversion.toFixed(2)),
    clics: vals.clics,
  }));
}
