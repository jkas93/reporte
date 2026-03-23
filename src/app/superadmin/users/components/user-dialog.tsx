"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { createUserAction, updateUserAction } from "../actions";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

export function UserDialog({ user, tenants, userTenants = [], trigger }: { user?: any; tenants: any[]; userTenants?: string[]; trigger?: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const actionWrapper = async (prevState: any, formData: FormData) => {
    if (user) {
      return updateUserAction(user.id, prevState, formData);
    }
    return createUserAction(prevState, formData);
  };

  const [state, formAction, pending] = useActionState(actionWrapper, undefined);

  useEffect(() => {
    if (state?.success) {
      toast.success(user ? "Usuario actualizado" : "Usuario creado exitosamente");
      setOpen(false);
    }
    if (state?.errors?.server) {
      toast.error(state.errors.server);
    }
  }, [state, user]);

  const dialogTriggerBtn = trigger || (
    <Button>
      <Plus className="mr-2 h-4 w-4" /> 
      Nuevo Usuario
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={dialogTriggerBtn} />
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user ? "Editar Usuario" : "Añadir Usuario"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={user?.full_name}
              placeholder="Kevin Avalos"
            />
            {state?.errors?.full_name && <p className="text-sm text-destructive">{state.errors.full_name[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              disabled={!!user} 
              defaultValue={user?.email}
              placeholder="usuario@dominio.com"
            />
            {state?.errors?.email && <p className="text-sm text-destructive">{state.errors.email[0]}</p>}
            {user && <Input type="hidden" name="email" value={user.email} />}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{user ? "Nueva Contraseña" : "Contraseña"}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder={user ? "Dejar en blanco para mantener" : "Mínimo 6 caracteres"}
            />
            {state?.errors?.password && <p className="text-sm text-destructive">{state.errors.password[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rol Global</Label>
            <select
              id="role"
              name="role"
              defaultValue={user?.role || "user"}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="user">Usuario de Tenant</option>
              <option value="superadmin">Admin General</option>
            </select>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <Label className="block mb-2">Asignación de Empresas</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 rounded-md bg-muted/30 p-2 border">
              {tenants.map(tenant => (
                <div key={tenant.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`tenant-${tenant.id}`}
                    name="tenantIds"
                    value={tenant.id}
                    defaultChecked={userTenants.includes(tenant.id)}
                    className="rounded border-input bg-background"
                  />
                  <Label htmlFor={`tenant-${tenant.id}`} className="font-normal text-sm cursor-pointer select-none truncate flex-1">
                    {tenant.name}
                  </Label>
                </div>
              ))}
              {tenants.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-center p-2">Sin empresas creadas aún</p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar Usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
