import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/meta-api/encryption";
import {
  getAdsetInsights,
  getAdsInsights,
  getCampaignMeta,
} from "@/lib/meta-api/adsets";
import { presetToDateRange, type DatePreset } from "@/lib/meta-api/db-reports";
import { DateRangeSelector } from "@/components/ui/date-range-selector";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ArrowLeft, DollarSign, MousePointerClick, Users, Target, BarChart2,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatNumber } from "@/lib/utils/formatters";

const VALID_PRESETS = ["today","yesterday","last_7d","last_30d","this_month","last_month","last_90d"];

export default async function CampaignDetailPage(props: {
  params: Promise<{ tenant: string; campaignId: string }>;
  searchParams?: Promise<{ preset?: string }>;
}) {
  const { tenant: slug, campaignId } = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : {};
  const rawPreset = searchParams?.preset || "last_30d";
  const preset = (VALID_PRESETS.includes(rawPreset) ? rawPreset : "last_30d") as DatePreset;

  const supabase = await createClient();

  // 1. Obtener tenant
  const { data: rawTenant } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("slug", slug)
    .single();

  const tenant = rawTenant ? { ...rawTenant, currency: (rawTenant as any).currency || "PEN" } : null;
  if (!tenant) return <div className="p-8 text-center text-muted-foreground">Empresa no encontrada</div>;

  // 2. Conexión activa con Meta
  const { data: connection } = await supabase
    .from("meta_connections")
    .select("ad_account_id, access_token_encrypted, status")
    .eq("tenant_id", tenant.id)
    .single();

  if (!connection || connection.status !== "connected") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="p-4 bg-muted rounded-full">
           <Target size={40} className="text-muted-foreground" />
        </div>
        <div className="space-y-2">
            <h3 className="text-lg font-semibold">No hay conexión activa con Meta</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
                Vuelve a la configuración de Meta para conectar tu cuenta publicitaria.
            </p>
        </div>
        <Link href={`/${slug}/connect-meta`}>
            <Button variant="outline">Configurar Conexión</Button>
        </Link>
      </div>
    );
  }

  const token = decrypt(connection.access_token_encrypted);
  const { from, to } = presetToDateRange(preset);

  // 3. Información de la campaña + adsets + ads (paralelo)
  const [campaignMeta, adsets, ads] = await Promise.all([
    getCampaignMeta(campaignId, token),
    getAdsetInsights(connection.ad_account_id, campaignId, token, rawPreset),
    getAdsInsights(connection.ad_account_id, campaignId, token, rawPreset),
  ]);

  const totalSpend = adsets.reduce((a, r) => a + parseFloat(r.spend || "0"), 0);
  const totalClicks = adsets.reduce((a, r) => a + parseInt(r.clicks || "0"), 0);
  const totalReach = adsets.reduce((a, r) => a + parseInt(r.reach || "0"), 0);

  return (
    <div className="space-y-8 pb-10">
      {/* Header Improvement */}
      <div className="flex flex-col gap-6">
        <Link
          href={`/${slug}/campanas?preset=${rawPreset}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit group"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" /> 
          Volver a Campañas
        </Link>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {campaignMeta?.name || "Campaña"}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant={campaignMeta?.status === "ACTIVE" ? "default" : "secondary"} className="uppercase font-bold tracking-wider">
                {campaignMeta?.status || "—"}
              </Badge>
              {campaignMeta?.objective && (
                <Badge variant="outline" className="text-muted-foreground font-medium">
                    {campaignMeta.objective}
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                Periodo: <span className="text-foreground font-medium">{from} al {to}</span>
              </span>
            </div>
          </div>
          <div className="shrink-0">
            <DateRangeSelector defaultPreset={preset} />
          </div>
        </div>
      </div>

      {/* KPI Section - Clean & Modern Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Inversión Total",
            value: formatCurrency(totalSpend, tenant.currency),
            icon: <DollarSign size={20} />,
            color: "text-primary",
            bg: "bg-primary/10"
          },
          {
            label: "Alcance",
            value: formatNumber(totalReach),
            icon: <Users size={20} />,
            color: "text-blue-500",
            bg: "bg-blue-500/10"
          },
          {
            label: "Clics",
            value: formatNumber(totalClicks),
            icon: <MousePointerClick size={20} />,
            color: "text-purple-500",
            bg: "bg-purple-500/10"
          },
          {
            label: "Conjuntos",
            value: String(adsets.length),
            icon: <BarChart2 size={20} />,
            color: "text-amber-500",
            bg: "bg-amber-500/10"
          },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-muted/50 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">{kpi.label}</CardTitle>
              <div className={`${kpi.bg} ${kpi.color} p-2 rounded-lg`}>
                {kpi.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tables Section - Wrapped in Cards for better structure */}
      <div className="grid gap-8">
        {/* Conjuntos de Anuncios */}
        <Card className="border-muted/50 shadow-sm">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart2 size={20} className="text-primary" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-lg">Conjuntos de Anuncios</CardTitle>
                <CardDescription>
                  {adsets.length} conjuntos activos en esta campaña
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/10">
                  <TableHead className="pl-6 w-[40%]">Nombre del Conjunto</TableHead>
                  <TableHead className="text-right">Inversión</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Clics</TableHead>
                  <TableHead className="text-right hidden md:table-cell">CTR</TableHead>
                  <TableHead className="text-right hidden lg:table-cell pr-6">CPC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adsets.length > 0 ? (
                  adsets
                    .sort((a, b) => parseFloat(b.spend || "0") - parseFloat(a.spend || "0"))
                    .map((adset) => (
                      <TableRow key={adset.adset_id}>
                        <TableCell className="font-medium pl-6 truncate max-w-[200px] sm:max-w-none">
                          {adset.adset_name}
                        </TableCell>
                        <TableCell className="text-right font-bold tabular-nums">
                          {formatCurrency(parseFloat(adset.spend || "0"), tenant.currency)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground hidden sm:table-cell tabular-nums">
                          {formatNumber(parseInt(adset.clicks || "0"))}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground hidden md:table-cell tabular-nums">
                          {adset.ctr ? `${parseFloat(adset.ctr).toFixed(2)}%` : "—"}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground hidden lg:table-cell tabular-nums pr-6">
                          {adset.cpc ? formatCurrency(parseFloat(adset.cpc), tenant.currency) : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                      No hay datos disponibles para este periodo.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Anuncios Individuales */}
        {ads.length > 0 && (
          <Card className="border-muted/50 shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 rounded-lg">
                  <Target size={20} className="text-rose-500" />
                </div>
                <div className="space-y-0.5">
                  <CardTitle className="text-lg">Anuncios Individuales</CardTitle>
                  <CardDescription>
                    {ads.length} creatividades detectadas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/10">
                    <TableHead className="pl-6 w-[40%]">Nombre del Anuncio</TableHead>
                    <TableHead className="text-right">Inversión</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Clics</TableHead>
                    <TableHead className="text-right hidden md:table-cell">CTR</TableHead>
                    <TableHead className="text-right hidden lg:table-cell pr-6">Alcance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ads
                    .sort((a, b) => parseFloat(b.spend || "0") - parseFloat(a.spend || "0"))
                    .map((ad) => (
                      <TableRow key={ad.id}>
                        <TableCell className="font-medium pl-6 truncate max-w-[200px] sm:max-w-none">
                          {ad.name}
                        </TableCell>
                        <TableCell className="text-right font-bold tabular-nums">
                          {formatCurrency(parseFloat(ad.spend || "0"), tenant.currency)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground hidden sm:table-cell tabular-nums">
                          {formatNumber(parseInt(ad.clicks || "0"))}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground hidden md:table-cell tabular-nums">
                          {ad.ctr ? `${parseFloat(ad.ctr).toFixed(2)}%` : "—"}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground hidden lg:table-cell tabular-nums pr-6">
                            {ad.reach ? formatNumber(parseInt(ad.reach)) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
