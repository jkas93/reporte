"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Verifica que el usuario autenticado sea superadmin.
 * Lanza error si no está autenticado o no es superadmin.
 */
export async function requireSuperadmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  
  if (profile?.role !== "superadmin") throw new Error("No autorizado");
  return user;
}

/**
 * Verifica que el usuario autenticado tenga acceso al tenant especificado.
 * Lanza error si no pertenece al tenant.
 */
export async function requireTenantAccess(tenantId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  
  // Superadmins tienen acceso a todos los tenants
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  
  if (profile?.role === "superadmin") return user;
  
  const { data } = await supabase
    .from("tenant_users")
    .select("id")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .single();
  
  if (!data) throw new Error("Sin acceso a este workspace");
  return user;
}
