import { createClient } from "@/lib/supabase/server";
import {
  getTopCampaignsFromDB,
  presetToDateRange,
  type DatePreset,
} from "@/lib/meta-api/db-reports";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DateRangeSelector } from "@/components/ui/date-range-selector";
import { SyncButton } from "@/components/ui/sync-button";
import { ExportButton } from "@/components/ui/export-button";
import { Megaphone, ChevronRight } from "lucide-react";
import { getCache, setCache } from "@/lib/utils/cache";
import { formatCurrency, formatNumber } from "@/lib/utils/formatters";

const VALID_PRESETS = ["today","yesterday","last_7d","last_30d","this_month","last_month","last_90d"];

export default async function CampaignsPage(props: {
  params: Promise<{ tenant: string }>;
  searchParams?: Promise<{ preset?: string }>;
}) {
  const { tenant: slug } = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : {};
  const rawPreset = searchParams?.preset || "last_30d";
  const preset = (VALID_PRESETS.includes(rawPreset) ? rawPreset : "last_30d") as DatePreset;

  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, currency")
    .eq("slug", slug)
    .single();

  if (!tenant) return <div>Empresa no encontrada</div>;

  const { data: connection } = await supabase
    .from("meta_connections")
    .select("status, last_synced_at")
    .eq("tenant_id", tenant.id)
    .single();

  const isConnected = connection?.status === "connected";

  // Traemos campañas desde BD pero también necesitamos el campaign_id de Meta
  // para poder navegar al drill-down → traemos directamente de la tabla campaigns
  const { from, to } = presetToDateRange(preset);

  const { data: rawInsights } = await supabase
    .from("ad_insights")
    .select(`
      spend, clicks, ctr,
      campaigns!inner(id, campaign_id, campaign_name)
    `)
    .eq("tenant_id", tenant.id)
    .gte("date", from)
    .lte("date", to);

  // --- Cache Logic (Phase S.1) ---
  const cacheKey = `campaigns:${tenant.id}:${preset}`;
  let campaignsData = await getCache<any[]>(cacheKey);

  if (!campaignsData) {
    // Agrupar por Meta campaign_id
    const grouped = new Map<string, {
      campaign_name: string;
      meta_campaign_id: string;
      spend: number;
      clicks: number;
    }>();

    for (const row of rawInsights || []) {
      const c = row.campaigns as any;
      const existing = grouped.get(c.campaign_id) || {
        campaign_name: c.campaign_name,
        meta_campaign_id: c.campaign_id,
        spend: 0,
        clicks: 0,
      };
      grouped.set(c.campaign_id, {
        ...existing,
        spend: existing.spend + Number(row.spend),
        clicks: existing.clicks + Number(row.clicks),
      });
    }

    campaignsData = Array.from(grouped.values()).sort((a, b) => b.spend - a.spend);
    await setCache(cacheKey, campaignsData, 300); // 5 min
  }

  // Datos para exportar CSV
  const exportData = campaignsData.map((c) => ({
    Campaña: c.campaign_name,
    "Inversión (S/)": c.spend.toFixed(2),
    Clics: c.clicks,
    "% del Total": campaignsData.reduce((a, x) => a + x.spend, 0) > 0
      ? Math.round((c.spend / campaignsData.reduce((a, x) => a + x.spend, 0)) * 100) + "%"
      : "0%",
  }));

  const exportColumns = [
    { key: "Campaña", label: "Campaña" },
    { key: "Inversión (S/)", label: "Inversión (S/)" },
    { key: "Clics", label: "Clics" },
    { key: "% del Total", label: "% del Total" },
  ];

  return (
    <div className="space-y-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1 flex items-center gap-2">
            <Megaphone size={22} className="text-muted-foreground" />
            Campañas Publicitarias
          </h1>
          <p className="text-muted-foreground text-sm">
            {tenant.name} — {from} al {to}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-end gap-2 flex-wrap">
          <DateRangeSelector defaultPreset={preset} />
          {campaignsData.length > 0 && (
            <ExportButton
              data={exportData}
              filename={`campanas-${tenant.name}`}
              columns={exportColumns}
            />
          )}
          {isConnected && (
            <SyncButton
              tenantId={tenant.id}
              slug={slug}
              lastSyncedAt={connection?.last_synced_at}
            />
          )}
        </div>
      </div>

      {!isConnected ? (
        <div className="bg-muted/50 border border-dashed p-12 rounded-xl text-center space-y-4">
          <h3 className="text-xl text-foreground font-medium">No hay conexión activa a Meta</h3>
          <p className="text-muted-foreground max-w-sm mx-auto text-sm">
            Para ver el detalle de tus campañas necesitas vincular tu cuenta publicitaria.
          </p>
          <Link href={`/${slug}/connect-meta`}>
            <Button>Conectar ahora</Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border shadow-sm">
          <div className="overflow-auto bg-card">
            <Table>
              <TableHeader className="bg-muted/30 border-b">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold pl-5 w-8">#</TableHead>
                  <TableHead className="font-semibold">Campaña</TableHead>
                  <TableHead className="text-right font-semibold">Inversión (S/)</TableHead>
                  <TableHead className="text-right font-semibold hidden sm:table-cell">Clics</TableHead>
                  <TableHead className="text-right font-semibold hidden lg:table-cell pr-5">% del Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignsData.length > 0 ? (
                  (() => {
                    const totalSpend = campaignsData.reduce((a, c) => a + c.spend, 0);
                    return campaignsData.map((campaign, i) => (
                      <TableRow
                        key={campaign.meta_campaign_id}
                        className="border-b transition-colors"
                      >
                        <TableCell className="pl-5 text-muted-foreground text-sm">{i + 1}</TableCell>
                        <TableCell className="font-medium text-foreground">
                          <Link
                            href={`/${slug}/campanas/${campaign.meta_campaign_id}?preset=${rawPreset}`}
                            className="flex items-center gap-2 hover:text-primary transition-colors max-w-[280px] truncate"
                          >
                            {campaign.campaign_name}
                            <ChevronRight
                              size={14}
                              className="text-muted-foreground shrink-0"
                            />
                          </Link>
                        </TableCell>
                        <TableCell className="text-right font-bold tabular-nums">
                          {formatCurrency(campaign.spend, tenant.currency)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground hidden sm:table-cell tabular-nums">
                          {formatNumber(campaign.clicks)}
                        </TableCell>
                        <TableCell className="text-right hidden lg:table-cell pr-5">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden border">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{
                                  width: `${totalSpend > 0 ? Math.round((campaign.spend / totalSpend) * 100) : 0}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">
                              {totalSpend > 0 ? Math.round((campaign.spend / totalSpend) * 100) : 0}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ));
                  })()
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center text-muted-foreground text-sm italic">
                      Sin datos sincronizados para este período.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {campaignsData.length > 0 && (
            <div className="px-5 py-3 border-t bg-muted/5 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {campaignsData.length} campaña{campaignsData.length > 1 ? "s" : ""}
              </span>
              <span>
                Total: {formatCurrency(campaignsData.reduce((a, c) => a + c.spend, 0), tenant.currency)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
