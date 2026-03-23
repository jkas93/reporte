"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, UserX } from "lucide-react";
import { deleteUserAction } from "../actions";
import { toast } from "sonner";

export function DeleteUserButton({ id, email }: { id: string; email: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm(`¿Eliminar definitivamente al usuario ${email}? \n\nEsta acción revocará su acceso a todos los tenants.`)) {
      startTransition(async () => {
        try {
          await deleteUserAction(id);
          toast.success("Usuario eliminado correctamente");
        } catch (error: any) {
          toast.error("Error eliminando cuenta: " + error.message);
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
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
    </Button>
  );
}
