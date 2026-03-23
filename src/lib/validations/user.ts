import { z } from "zod";

export const UserSchema = z.object({
  email: z.string().email({ message: "El email ingresado no es válido" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }).optional().or(z.literal('')),
  full_name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres" }),
  role: z.enum(["superadmin", "user"]).default("user"),
  tenantIds: z.array(z.string()).optional(), // Para asignar múltiples empresas a la vez
});

export type UserActionState = {
  errors?: {
    email?: string[];
    password?: string[];
    full_name?: string[];
    role?: string[];
    tenantIds?: string[];
    server?: string;
  };
  success?: boolean;
};
