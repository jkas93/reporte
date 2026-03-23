import { createClient } from "@/lib/supabase/server";
import {
  getMetricsSummaryFromDB,
  getTopCampaignsFromDB,
  getSpendTimelineFromDB,
  type DatePreset,
} from "@/lib/meta-api/db-reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign, MousePointerClick, Users, Target,
  Link2, TrendingUp, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CampaignsEvolutionChart } from "@/components/ui/charts";
import { DateRangeSelector } from "@/components/ui/date-range-selector";
import { SyncButton } from "@/components/ui/sync-button";

const VALID_PRESETS = ["today","yesterday","last_7d","last_30d","this_month","last_month","last_90d"];

export default async function TenantDashboard(props: {
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
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!tenant) return <div>Empresa no encontrada.</div>;

  // ── Conexión con Meta ──
  const { data: connection } = await supabase
    .from("meta_connections")
    .select("ad_account_id, status, last_synced_at")
    .eq("tenant_id", tenant.id)
    .single();

  const isConnected = connection?.status === "connected";

  // ── Datos desde la BD (NO desde Meta API) ──
  const [metrics, topCampaigns, timeline] = await Promise.all([
    getMetricsSummaryFromDB(supabase, tenant.id, preset),
    getTopCampaignsFromDB(supabase, tenant.id, preset),
    getSpendTimelineFromDB(supabase, tenant.id, preset),
  ]);

  const hasSyncedData = metrics.hasSyncedData;

  const currencyFormatter = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  });
  const numberFormatter = new Intl.NumberFormat("es-PE");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">
            Dashboard de {tenant.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            Métricas sincronizadas desde tu cuenta de Meta Ads.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <DateRangeSelector defaultPreset={preset} />
          {isConnected && (
            <SyncButton
              tenantId={tenant.id}
              slug={slug}
              lastSyncedAt={connection?.last_synced_at}
            />
          )}
        </div>
      </div>

      {/* Alertas */}
      {!isConnected && (
        <div className="bg-muted border p-4 rounded-xl flex items-center gap-3">
          <Info size={18} className="shrink-0 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">
              Conecta tu cuenta de Meta para ver datos reales.
            </p>
          </div>
          <Link href={`/${slug}/connect-meta`}>
            <Button size="sm" variant="default" className="shrink-0">
              <Link2 size={14} className="mr-2" /> Conectar
            </Button>
          </Link>
        </div>
      )}

      {isConnected && !hasSyncedData && (
        <div className="bg-muted border p-4 rounded-xl flex items-start gap-3">
          <Info size={18} className="shrink-0 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-sm font-bold text-foreground">Sin datos locales todavía</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Tu cuenta está conectada pero aún no se han descargado métricas. Haz clic en <span className="font-bold underline">Sincronizar datos</span> para traer tu historial ahora mismo.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Inversión (Spend)"
          value={hasSyncedData ? currencyFormatter.format(metrics.spend) : "—"}
          icon={<DollarSign className="h-4 w-4" />}
          variant="primary"
          demo={!hasSyncedData}
        />
        <KpiCard
          label="Alcance (Reach)"
          value={hasSyncedData ? numberFormatter.format(metrics.reach) : "—"}
          icon={<Users className="h-4 w-4" />}
          variant="primary"
          demo={!hasSyncedData}
        />
        <KpiCard
          label="Clics Totales"
          value={hasSyncedData ? numberFormatter.format(metrics.clicks) : "—"}
          icon={<MousePointerClick className="h-4 w-4" />}
          variant="primary"
          sub={hasSyncedData ? `CTR: ${metrics.ctr.toFixed(2)}%` : "CTR: —"}
          demo={!hasSyncedData}
        />
        <KpiCard
          label="Conversiones"
          value={hasSyncedData ? String(metrics.conversions) : "—"}
          icon={<Target className="h-4 w-4" />}
          variant="primary"
          sub={hasSyncedData ? `CPC: ${currencyFormatter.format(metrics.cpc)}` : "CPC: —"}
          demo={!hasSyncedData}
        />
      </div>

      {/* Área inferior: Gráfica + Top Campañas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Gráfica de línea de Inversión */}
        <div className="lg:col-span-2">
           <CampaignsEvolutionChart data={timeline} />
        </div>

        {/* Top Campañas */}
        <Card className="col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Top Campañas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCampaigns.length > 0 ? (
              topCampaigns.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 border border-primary/20">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">{c.campaign_name}</span>
                  </div>
                  <div className="flex flex-col items-end shrink-0 pl-2">
                    <span className="text-sm font-bold">
                      {currencyFormatter.format(c.spend)}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase">{numberFormatter.format(c.clicks)} clics</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground text-sm py-12 italic">
                {hasSyncedData
                  ? "Sin campañas en este período"
                  : "Sincroniza datos para ver tus campañas"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label, value, icon, variant, sub, demo,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  variant: "primary" | "success" | "warning";
  sub?: string;
  demo?: boolean;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${demo ? "opacity-30" : ""}`}>
          {value}
        </div>
        {sub && <p className="text-[10px] font-medium text-muted-foreground mt-1 uppercase">{sub}</p>}
      </CardContent>
    </Card>
  );
}
