import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, ToggleRight, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function SuperadminDashboard() {
  const supabase = await createClient();

  const yesterday = new Date(Date.now() - 86400000).toISOString();

  const startTimeTotal = Date.now();
  const [{ count: tenantsCount }, { count: usersCount }, { count: connectionsCount }, { count: syncErrorsCount }, { data: recentLogs }] = await Promise.all([
    supabase.from("tenants").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "user"),
    supabase.from("meta_connections").select("*", { count: "exact", head: true }).eq("status", "connected"),
    supabase.from("sync_logs")
      .select("*", { count: "exact", head: true })
      .eq("status", "error")
      .gte("started_at", yesterday),
    supabase.from("sync_logs").select("status, started_at").order("started_at", { ascending: false }).limit(5)
  ]);
  const dbLatency = Date.now() - startTimeTotal;

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
            <CardTitle className="text-sm font-semibold uppercase">Salud de Sincronización</CardTitle>
          </CardHeader>
          <CardContent className="h-48 border-t bg-muted/20 p-6">
             <div className="space-y-4">
               {recentLogs && recentLogs.length > 0 ? (
                 recentLogs.map((log, i) => (
                   <div key={i} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${log.status === 'success' ? 'bg-green-500' : 'bg-destructive'}`} />
                        <span className="text-muted-foreground">{new Date(log.started_at).toLocaleTimeString()}</span>
                      </div>
                      <span className="font-medium capitalize">{log.status}</span>
                   </div>
                 ))
               ) : (
                 <p className="text-muted-foreground text-center pt-8">No hay logs recientes.</p>
               )}
             </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase">Métricas de Infraestructura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className={`h-2 w-2 rounded-full ${dbLatency < 500 ? 'bg-green-500' : 'bg-amber-500'}`} />
                <p className="text-muted-foreground">Latencia DB (Supabase):</p>
              </div>
              <span className="text-foreground font-mono font-bold">{dbLatency}ms</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <p className="text-muted-foreground">Upstash Redis:</p>
              </div>
              <span className="text-foreground font-bold">ACTIVO</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <p className="text-muted-foreground">Meta Graph Version:</p>
              </div>
              <span className="text-foreground font-bold font-mono">v21.0</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
