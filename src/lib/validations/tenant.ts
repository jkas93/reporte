import { z } from "zod";

export const TenantSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres" }),
  slug: z.string().min(2, { message: "El slug debe tener al menos 2 caracteres" })
    .regex(/^[a-z0-9-]+$/, { message: "El slug solo puede contener minúsculas, números y guiones" }),
  logo_url: z.string().url({ message: "Debe ser una URL válida" }).optional().or(z.literal('')),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
});

export type TenantActionState = {
  errors?: {
    name?: string[];
    slug?: string[];
    logo_url?: string[];
    status?: string[];
    server?: string;
  };
  success?: boolean;
};
