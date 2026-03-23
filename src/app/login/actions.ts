"use server";

import { createClient } from "@/lib/supabase/server";
import { LoginSchema, type LoginActionState } from "@/lib/validations/auth";
import { redirect } from "next/navigation";

export async function loginAction(
  prevState: LoginActionState | undefined,
  formData: FormData
): Promise<LoginActionState> {
  const validatedFields = LoginSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validatedFields.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      errors: {
        server: "Credenciales inválidas. Por favor intenta de nuevo.",
      },
    };
  }

  // Next.js middleware will handle the redirection automatically based on the profile role
  redirect("/login"); 
}
