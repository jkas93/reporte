"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { deleteTenantAction } from "../actions";
import { toast } from "sonner";

export function DeleteTenantButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm(`¿Estás seguro de que deseas eliminar la empresa ${name}? Esto borrará todos sus usuarios, conexiones y datos.`)) {
      startTransition(async () => {
        try {
          await deleteTenantAction(id);
          toast.success("Empresa eliminada");
        } catch (error: any) {
          toast.error("Error al eliminar la empresa: " + error.message);
        }
      });
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleDelete} 
      disabled={isPending}
      className="text-muted-foreground hover:text-destructive transition-colors"
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}
