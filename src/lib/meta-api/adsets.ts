import { metaFetch } from "./client";

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
  const filtering = JSON.stringify([{ field: "campaign.id", operator: "EQUAL", value: campaignId }]);
  const endpoint = `act_${adAccountId}/insights?level=adset&fields=adset_id,adset_name,spend,reach,clicks,cpc,ctr,impressions&filtering=${filtering}&date_preset=${datePreset}`;

  const data = await metaFetch<{ data: AdsetInsight[] }>(endpoint, { 
    accessToken,
    next: { revalidate: 900 }
  });

  return data.data || [];
}

/** Trae los anuncios individuales (ads) de una campaña específica */
export async function getAdsInsights(
  adAccountId: string,
  campaignId: string,
  accessToken: string,
  datePreset: string = "last_30d"
): Promise<AdCreative[]> {
  const filtering = JSON.stringify([{ field: "campaign.id", operator: "EQUAL", value: campaignId }]);
  const endpoint = `act_${adAccountId}/insights?level=ad&fields=ad_id,ad_name,spend,reach,clicks,cpc,ctr,impressions&filtering=${filtering}&date_preset=${datePreset}`;

  try {
    const data = await metaFetch<{ data: any[] }>(endpoint, { 
      accessToken,
      next: { revalidate: 900 }
    });

    return (data.data || []).map((item: any) => ({
      id: item.ad_id,
      name: item.ad_name,
      spend: item.spend,
      reach: item.reach,
      clicks: item.clicks,
      cpc: item.cpc,
      ctr: item.ctr,
      impressions: item.impressions,
    }));
  } catch (error) {
    console.warn("[MetaAdsets] Error fetching ad insights:", error);
    return [];
  }
}

/** Metadata básica de la campaña */
export async function getCampaignMeta(
  campaignId: string,
  accessToken: string
) {
  const endpoint = `${campaignId}?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time`;
  
  try {
    return await metaFetch<any>(endpoint, { 
      accessToken,
      next: { revalidate: 900 } 
    });
  } catch (error) {
    console.error(`[MetaAdsets] Error fetching campaign meta for ${campaignId}:`, error);
    return null;
  }
}
