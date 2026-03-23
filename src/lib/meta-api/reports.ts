import { META_API_VERSION, metaAuthHeaders } from "./oauth";

export interface AdInsight {
  campaign_id: string;
  campaign_name: string;
  spend: string;
  reach: string;
  clicks: string;
  cpc: string;
  ctr: string;
  actions?: any[];
}

export async function getCampaignInsights(adAccountId: string, accessToken: string, datePreset: string = 'last_30d') {
  const url = `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/insights?level=campaign&fields=campaign_id,campaign_name,spend,reach,clicks,cpc,ctr,actions,conversions&date_preset=${datePreset}`;
  
  const response = await fetch(url, { headers: metaAuthHeaders(accessToken) });
  
  if (!response.ok) {
    const error = await response.json();
    console.error("Meta API Insights Error:", error);
    throw new Error(error.error?.message || "Error al obtener insights de campañas");
  }

  const data = await response.json();
  return data.data as AdInsight[];
}

export async function getDashboardSummary(adAccountId: string, accessToken: string, datePreset: string = 'last_30d') {
  const url = `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/insights?level=account&fields=spend,reach,clicks,cpc,ctr,actions&date_preset=${datePreset}`;
  
  const response = await fetch(url, { headers: metaAuthHeaders(accessToken) });
  
  if (!response.ok) {
     return null;
  }

  const data = await response.json();
  if (data.data && data.data.length > 0) {
     const report = data.data[0];
     // Calculate purchases/conversions from actions
     let conversions = 0;
     let purchaseValue = 0;
     if (report.actions) {
         const purchaseAction = report.actions.find((a: any) => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase');
         if (purchaseAction) conversions = parseInt(purchaseAction.value || "0");
     }

     return {
        spend: parseFloat(report.spend || "0"),
        reach: parseInt(report.reach || "0"),
        clicks: parseInt(report.clicks || "0"),
        cpc: parseFloat(report.cpc || "0"),
        ctr: parseFloat(report.ctr || "0"),
        conversions,
        roas: purchaseValue > 0 && parseFloat(report.spend) > 0 ? (purchaseValue / parseFloat(report.spend)) : 0
     };
  }
  
  return {
    spend: 0, reach: 0, clicks: 0, cpc: 0, ctr: 0, conversions: 0, roas: 0
  };
}
