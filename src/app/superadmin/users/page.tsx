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
import { UserDialog } from "./components/user-dialog";
import { DeleteUserButton } from "./components/delete-user-button";
import { Button } from "@/components/ui/button";
import { Edit, ShieldAlert } from "lucide-react";

export default async function UsersPage() {
  const supabase = createAdminClient();
  
  // Need to get profiles with their assigned companies
  // Querying profiles and their related tenant_users > tenants
  const { data: profiles, error: profileErr } = await supabase
    .from("profiles")
    .select(`
      id,
      email,
      full_name,
      role,
      created_at,
      tenant_users (
        tenant_id,
        tenants (
            id,
            name
        )
      )
    `)
    .order("created_at", { ascending: false });

  // Get tenants for the create/edit form
  const { data: allTenants } = await supabase.from("tenants").select("id, name");

  if (profileErr) {
    return <div className="text-red-500">Error: {profileErr.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground text-sm">
            Administra cuentas de acceso y asígnalas a workspaces específicos.
          </p>
        </div>
        <UserDialog tenants={allTenants || []} />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50 border-b">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground">Usuario</TableHead>
              <TableHead className="text-muted-foreground hidden lg:table-cell">Rol</TableHead>
              <TableHead className="text-muted-foreground">Acceso a Empresas</TableHead>
              <TableHead className="text-muted-foreground hidden xl:table-cell">Creación</TableHead>
              <TableHead className="text-right text-muted-foreground">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles && profiles.length > 0 ? (
              profiles.map((profile) => {
                const assignedTenants = profile.tenant_users
                   ?.filter((tu: any) => tu.tenants)
                   .map((tu: any) => tu.tenants) || [];
                const tenantIds = assignedTenants.map((t: any) => t.id);

                return (
                <TableRow key={profile.id} className="border-b transition-colors">
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground font-bold shrink-0 border">
                        {profile.full_name?.charAt(0) || "U"}
                      </div>
                      <div className="flex flex-col min-w-0">
                         <span className="truncate">{profile.full_name}</span>
                         <span className="text-xs text-muted-foreground font-normal truncate">{profile.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {profile.role === 'superadmin' ? (
                       <Badge variant="default" className="w-max">
                           <ShieldAlert className="w-3 h-3 mr-1" /> General
                       </Badge>
                    ) : (
                       <Badge variant="secondary" className="w-max">Tenant</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {profile.role === 'superadmin' ? (
                        <span className="text-xs text-muted-foreground italic">Acceso Total</span>
                    ) : (
                        <div className="flex flex-wrap gap-1">
                            {assignedTenants.length > 0 ? (
                                assignedTenants.map((t: any) => (
                                    <Badge key={t.id} variant="outline" className="text-muted-foreground text-[10px] px-1.5 py-0 h-5">
                                        {t.name}
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-xs text-destructive font-medium">Sin acceso</span>
                            )}
                        </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs hidden xl:table-cell tabular-nums">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                       <UserDialog 
                          user={profile} 
                          tenants={allTenants || []}
                          userTenants={tenantIds}
                          trigger={
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                               <Edit className="h-4 w-4" />
                            </Button>
                          } 
                       />
                       <DeleteUserButton id={profile.id} email={profile.email} />
                    </div>
                  </TableCell>
                </TableRow>
              )})
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                  No hay usuarios registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
