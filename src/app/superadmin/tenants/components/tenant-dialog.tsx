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
import { createTenantAction, updateTenantAction } from "../actions";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

export function TenantDialog({ tenant, trigger }: { tenant?: any; trigger?: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  
  const actionWrapper = async (prevState: any, formData: FormData) => {
    if (tenant) {
      return updateTenantAction(tenant.id, prevState, formData);
    }
    return createTenantAction(prevState, formData);
  };

  const [state, formAction, pending] = useActionState(actionWrapper, undefined);

  useEffect(() => {
    if (state?.success) {
      toast.success(tenant ? "Empresa actualizada" : "Empresa creada exitosamente");
      setOpen(false);
    }
    if (state?.errors?.server) {
      toast.error(state.errors.server);
    }
  }, [state, tenant]);

  const dialogTriggerBtn = trigger || (
    <Button>
      <Plus size={16} className="mr-2" /> 
      Nueva Empresa
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={dialogTriggerBtn} />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{tenant ? "Editar Empresa" : "Crear Empresa"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={tenant?.name}
              placeholder="Mi Cliente Inc."
            />
            {state?.errors?.name && <p className="text-sm text-destructive">{state.errors.name[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={tenant?.slug}
              placeholder="mi-cliente-inc"
            />
            {state?.errors?.slug && <p className="text-sm text-destructive">{state.errors.slug[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_url">URL del Logo (opcional)</Label>
            <Input
              id="logo_url"
              name="logo_url"
              defaultValue={tenant?.logo_url}
              placeholder="https://dominio.com/logo.png"
            />
            {state?.errors?.logo_url && <p className="text-sm text-destructive">{state.errors.logo_url[0]}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <select
                id="currency"
                name="currency"
                defaultValue={tenant?.currency || "PEN"}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="PEN">PEN (S/)</option>
                <option value="USD">USD ($)</option>
                <option value="MXN">MXN ($)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Zona Horaria</Label>
              <select
                id="timezone"
                name="timezone"
                defaultValue={tenant?.timezone || "America/Lima"}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="America/Lima">Lima (PET)</option>
                <option value="America/Mexico_City">México (CST)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <select
              id="status"
              name="status"
              defaultValue={tenant?.status || "active"}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="suspended">Suspendido</option>
            </select>
            {state?.errors?.status && <p className="text-sm text-destructive">{state.errors.status[0]}</p>}
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
