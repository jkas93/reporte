import { META_API_VERSION, metaAuthHeaders } from "./oauth";

export interface Adset {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

export interface AdsetInsight {
  adset_id: string;
  adset_name: string;
  spend: string;
  reach: string;
  clicks: string;
  cpc?: string;
  ctr?: string;
  impressions?: string;
}

export interface AdCreative {
  id: string;
  name: string;
  spend: string;
  reach: string;
  clicks: string;
  cpc?: string;
  ctr?: string;
  impressions?: string;
  preview_url?: string;
}

/** Trae los conjuntos de anuncios (adsets) de una campaña específica */
export async function getAdsetInsights(
  adAccountId: string,
  campaignId: string,
  accessToken: string,
  datePreset: string = "last_30d"
): Promise<AdsetInsight[]> {
  const filtering = encodeURIComponent(
    JSON.stringify([{ field: "campaign.id", operator: "EQUAL", value: campaignId }])
  );

  // Fix C-1: Token en Authorization header
  const url = `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/insights?level=adset&fields=adset_id,adset_name,spend,reach,clicks,cpc,ctr,impressions&filtering=${filtering}&date_preset=${datePreset}`;

  const response = await fetch(url, { 
    headers: metaAuthHeaders(accessToken),
    next: { revalidate: 900 } 
  }); 

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Error al obtener conjuntos de anuncios");
  }

  const data = await response.json();
  return (data.data || []) as AdsetInsight[];
}

/** Trae los anuncios individuales (ads) de una campaña específica */
export async function getAdsInsights(
  adAccountId: string,
  campaignId: string,
  accessToken: string,
  datePreset: string = "last_30d"
): Promise<AdCreative[]> {
  const filtering = encodeURIComponent(
    JSON.stringify([{ field: "campaign.id", operator: "EQUAL", value: campaignId }])
  );

  // Fix C-1: Token en Authorization header
  const url = `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/insights?level=ad&fields=ad_id,ad_name,spend,reach,clicks,cpc,ctr,impressions&filtering=${filtering}&date_preset=${datePreset}`;

  const response = await fetch(url, { 
    headers: metaAuthHeaders(accessToken),
    next: { revalidate: 900 } 
  });

  if (!response.ok) {
    const error = await response.json();
    console.warn("Error fetching ad-level insights:", error);
    return [];
  }

  const data = await response.json();
  return (data.data || []).map((item: any) => ({
    id: item.ad_id,
    name: item.ad_name,
    spend: item.spend,
    reach: item.reach,
    clicks: item.clicks,
    cpc: item.cpc,
    ctr: item.ctr,
    impressions: item.impressions,
  })) as AdCreative[];
}

/** Metadata básica de la campaña */
export async function getCampaignMeta(
  campaignId: string,
  accessToken: string
) {
  const url = `https://graph.facebook.com/${META_API_VERSION}/${campaignId}?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time`;
  const response = await fetch(url, { 
    headers: metaAuthHeaders(accessToken),
    next: { revalidate: 900 } 
  });
  if (!response.ok) return null;
  return response.json();
}
