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
import { TenantDialog } from "./components/tenant-dialog";
import { DeleteTenantButton } from "./components/delete-tenant-button";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import Image from "next/image";

export default async function TenantsPage() {
  const supabase = createAdminClient();
  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return <div className="text-red-500">Error cargando empresas: {error.message}</div>;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="shadow-none">Activo</Badge>;
      case "inactive":
        return <Badge variant="secondary" className="shadow-none">Inactivo</Badge>;
      case "suspended":
        return <Badge variant="destructive" className="shadow-none">Suspendido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">
            Empresas
          </h1>
          <p className="text-muted-foreground text-sm">
            Gestiona los workspaces de tus clientes (Tenants).
          </p>
        </div>
        <TenantDialog />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50 border-b">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground">Compañía</TableHead>
              <TableHead className="text-muted-foreground hidden sm:table-cell">Slug</TableHead>
              <TableHead className="text-muted-foreground">Estado</TableHead>
              <TableHead className="text-muted-foreground hidden md:table-cell">Creación</TableHead>
              <TableHead className="text-right text-muted-foreground">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants && tenants.length > 0 ? (
              tenants.map((tenant) => (
                <TableRow key={tenant.id} className="border-b hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-3">
                      {tenant.logo_url ? (
                        <div className="relative h-8 w-8 rounded-lg overflow-hidden border bg-muted">
                          <Image 
                            src={tenant.logo_url} 
                            alt={tenant.name} 
                            fill
                            className="object-cover" 
                          />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground border">
                          {tenant.name.charAt(0)}
                        </div>
                      )}
                      <span>{tenant.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell font-mono text-xs">
                    {tenant.slug}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(tenant.status)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                    {new Date(tenant.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                       <TenantDialog 
                          tenant={tenant} 
                          trigger={
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                               <Edit className="h-4 w-4" />
                            </Button>
                          } 
                       />
                       <DeleteTenantButton id={tenant.id} name={tenant.name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-zinc-500">
                  No hay empresas registradas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
