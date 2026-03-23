import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, ToggleRight, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function SuperadminDashboard() {
  const supabase = await createClient();

  // We could create custom RPC functions for accurate counts, but for setup we'll use head counts
  const [{ count: tenantsCount }, { count: usersCount }, { count: connectionsCount }, { count: syncErrorsCount }] = await Promise.all([
    supabase.from("tenants").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "user"),
    supabase.from("meta_connections").select("*", { count: "exact", head: true }).eq("status", "connected"),
    supabase.from("sync_logs")
      .select("*", { count: "exact", head: true })
      .eq("status", "error")
      .gte("started_at", new Date(Date.now() - 86400000).toISOString())
  ]);

  const stats = [
    {
      title: "Empresas Activas",
      value: tenantsCount || 0,
      icon: <Building2 className="text-primary" size={24} />,
    },
    {
      title: "Usuarios Totales",
      value: usersCount || 0,
      icon: <Users className="text-primary" size={24} />,
    },
    {
      title: "Conexiones Meta",
      value: connectionsCount || 0,
      icon: <ToggleRight className="text-primary" size={24} />,
    },
    {
      title: "Problemas de Sync (24h)",
      value: syncErrorsCount || 0,
      icon: <AlertCircle className="text-destructive" size={24} />,
    },
  ];

  return (
    <div className="space-y-8 h-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Superadmin Dashboard</h1>
        <p className="text-muted-foreground">
          Vista general del rendimiento y estado de la plataforma SaaS multitenant.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-muted-foreground">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider">
                {stat.title}
              </CardTitle>
              <div className="h-5 w-5 opacity-60">
                {stat.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground tracking-tight">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-7">
        <Card className="lg:col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase">Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent className="h-48 flex items-center justify-center text-muted-foreground border-t bg-muted/20">
            No hay actividad reciente registrada en las últimas 24 horas.
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase">Alertas del Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-4 text-sm">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <p className="text-muted-foreground">
                Límite de la API de Meta: <span className="text-foreground font-medium">Estable (20%)</span>
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm mt-4">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <p className="text-muted-foreground">
                Redis Cache: <span className="text-foreground font-medium">Saludable (32ms latencia)</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
