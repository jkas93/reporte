import { createClient } from "@/lib/supabase/server";
import { getMetaAuthUrl } from "@/lib/meta-api/oauth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Facebook, Link2, CheckCircle2, AlertCircle, RefreshCw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { revokeMetaConnection } from "./actions";
import Link from "next/link";

export default async function ConnectMetaPage(props: { 
  params: Promise<{ tenant: string }>;
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const { tenant: slug } = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : {};
  const supabase = await createClient();

  // Get Tenant ID
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!tenant) return <div>Empresa no encontrada</div>;

  // Get current connection
  const { data: connection } = await supabase
    .from("meta_connections")
    .select("*")
    .eq("tenant_id", tenant.id)
    .single();

  const isConnected = connection?.status === "connected";
  const authUrl = getMetaAuthUrl(tenant.id);

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Integración con Meta Ads
        </h1>
        <p className="text-muted-foreground text-sm">
          Conecta la cuenta publicitaria de {tenant.name} para obtener reportes automáticos.
        </p>
      </div>

      {searchParams?.error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <div>
            <h3 className="font-bold">Error en la conexión con Meta</h3>
            <p className="text-sm mt-1">{decodeURIComponent(searchParams.error)}</p>
          </div>
        </div>
      )}

      {searchParams?.success && (
        <div className="bg-primary/10 border border-primary/20 text-primary p-4 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="shrink-0" size={18} />
          <p className="text-sm font-bold">¡Cuenta enlazada exitosamente!</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-4">
        <Card className="col-span-2 shadow-sm relative overflow-hidden group">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2 text-foreground">
                  <Facebook className="text-primary" />
                  Facebook & Instagram Ads
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Sincroniza campañas, presupuesto e interacciones en tiempo real.
                </CardDescription>
              </div>
              {isConnected ? (
                <Badge variant="default" className="px-3 flex items-center gap-1.5 h-7">
                  <CheckCircle2 size={14} /> Conectado
                </Badge>
              ) : (
                <Badge variant="secondary" className="px-3 flex items-center gap-1.5 h-7">
                  <AlertCircle size={14} /> Sin conectar
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-muted/30 border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-4">
                 <div className="h-12 w-12 shrink-0 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
                    <Link2 className="text-primary" size={24} />
                 </div>
                 <div className="min-w-0 flex-1">
                    {isConnected ? (
                      <>
                        <p className="text-sm font-bold text-foreground">Cuenta Activa</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 truncate mt-1">
                          ID: {connection.ad_account_id}
                          <span className="w-1 h-1 rounded-full bg-border" />
                          {connection.ad_account_name || 'Business Manager'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-foreground">No hay cuenta conectada</p>
                        <p className="text-xs text-muted-foreground mt-1 text-balance">
                          Haz clic en conectar para autorizar los permisos de lectura de Facebook.
                        </p>
                      </>
                    )}
                 </div>
              </div>

              {isConnected && connection.last_synced_at && (
                <div className="text-xs text-muted-foreground flex items-center gap-2 bg-background/50 p-2.5 rounded-lg border">
                  <RefreshCw size={12} className="text-primary animate-spin" />
                  Última sincronización: {new Date(connection.last_synced_at).toLocaleString()}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {isConnected ? (
                <>
                  <form action={revokeMetaConnection.bind(null, connection.id)} className="w-full sm:w-auto">
                    <Button variant="destructive" type="submit" className="w-full sm:px-6">
                      <XCircle size={18} className="mr-2" /> Desconectar
                    </Button>
                  </form>
                  <Link href={`/${slug}/connect-meta/select-account`} className="w-full sm:w-auto">
                    <Button variant="secondary" className="w-full sm:px-6">
                      <Facebook size={18} className="mr-2" /> Cambiar Cuenta
                    </Button>
                  </Link>
                  <a href={authUrl} className="w-full sm:w-auto">
                    <Button variant="outline" className="w-full sm:px-6">
                      <RefreshCw size={18} className="mr-2" /> Reconectar
                    </Button>
                  </a>
                </>
              ) : (
                <a href={authUrl} className="w-full sm:w-max">
                  <Button className="w-full px-8 h-11 text-base shadow-lg shadow-primary/10 transition-transform active:scale-95">
                    <Facebook className="mr-2" /> Conectar con Meta
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="hidden lg:block bg-card border overflow-hidden shadow-sm">
          <CardHeader>
             <CardTitle className="text-lg flex items-center gap-2">
               Permisos
             </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
             <p className="text-muted-foreground leading-relaxed">Nuestra plataforma solicitará acceso de <strong>solo lectura</strong> para generar reportes gráficos detallados.</p>
             <ul className="space-y-3">
                <li className="flex gap-3 items-start">
                   <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                   </div>
                   <div>
                      <strong className="text-foreground block">ads_read</strong>
                      <span className="text-[11px] text-muted-foreground">Ver campañas, conjuntos y anuncios.</span>
                   </div>
                </li>
                <li className="flex gap-3 items-start">
                   <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                   </div>
                   <div>
                      <strong className="text-foreground block">business_management</strong>
                      <span className="text-[11px] text-muted-foreground">Acceder a cuentas en tu BM.</span>
                   </div>
                </li>
             </ul>
             <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl text-primary text-[11px] mt-6 leading-relaxed font-medium">
               Tus credenciales están cifradas usando el estándar AES-256-GCM.
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
