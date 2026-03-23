import { createAdminClient } from "@/lib/supabase/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function SyncLogsPage() {
  const supabase = createAdminClient();
  const { data: logs, error } = await supabase
    .from("sync_logs")
    .select(`
      *,
      tenants (
        name
      )
    `)
    .order("started_at", { ascending: false })
    .limit(100);

  if (error) {
    return <div className="text-destructive p-4">Error cargando logs: {error.message}</div>;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="default">Éxito</Badge>;
      case "error":
        return <Badge variant="destructive">Fallo</Badge>;
      case "partial":
        return <Badge variant="secondary">Parcial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">
            Logs de Sincronización
          </h1>
          <p className="text-muted-foreground text-sm">
            Monitorea el estado de las conexiones y sincronización diaria de Meta Ads API.
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50 border-b">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground w-[100px]">Estado</TableHead>
              <TableHead className="text-muted-foreground">Empresa</TableHead>
              <TableHead className="text-muted-foreground">Mensaje</TableHead>
              <TableHead className="text-muted-foreground">Registros</TableHead>
              <TableHead className="text-muted-foreground text-right hidden xl:table-cell">Fecha/Hora</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs && logs.length > 0 ? (
              logs.map((log) => (
                <TableRow key={log.id} className="border-b transition-colors whitespace-nowrap">
                  <TableCell>
                    {getStatusBadge(log.status)}
                  </TableCell>
                  <TableCell className="font-medium text-foreground italic text-xs tabular-nums">
                    {(log.tenants as unknown as { name: string })?.name || "Global / Desconocida"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate" title={log.message}>
                    {log.message}
                  </TableCell>
                  <TableCell className="text-foreground font-medium text-sm tabular-nums">
                    {log.records_synced} regs
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs text-right hidden xl:table-cell tabular-nums">
                    {new Date(log.started_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center text-muted-foreground italic">
                  No hay procesos de sincronización recientes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
