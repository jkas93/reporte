import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email({ message: "El email ingresado no es válido" }),
  password: z
    .string()
    .min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
});

export type LoginActionState = {
  errors?: {
    email?: string[];
    password?: string[];
    server?: string;
  };
};
