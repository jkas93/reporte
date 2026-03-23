"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperadmin } from "@/lib/auth-guard";
import { TenantSchema, type TenantActionState } from "@/lib/validations/tenant";
import { revalidatePath } from "next/cache";

export async function createTenantAction(
  prevState: TenantActionState | undefined,
  formData: FormData
): Promise<TenantActionState> {
  await requireSuperadmin();

  const validatedFields = TenantSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { name, slug, logo_url, status } = validatedFields.data;
  const adminAuthClient = createAdminClient();

  // Validate Slug doesn't exist
  const { data: existing } = await adminAuthClient
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .single();

  if (existing) {
    return { errors: { slug: ["Este slug ya está en uso"] } };
  }

  const { error } = await adminAuthClient.from("tenants").insert({
    name,
    slug,
    logo_url,
    status,
  });

  if (error) {
    return { errors: { server: error.message } };
  }

  revalidatePath("/superadmin/tenants");
  return { success: true };
}

export async function updateTenantAction(
  id: string,
  prevState: TenantActionState | undefined,
  formData: FormData
): Promise<TenantActionState> {
  await requireSuperadmin();

  const validatedFields = TenantSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { name, slug, logo_url, status } = validatedFields.data;
  const adminAuthClient = createAdminClient();

  // Check slug conflict on other tenants
  const { data: existing } = await adminAuthClient
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .neq("id", id)
    .single();

  if (existing) {
    return { errors: { slug: ["Este slug ya está en uso por otra empresa"] } };
  }

  const { error } = await adminAuthClient
    .from("tenants")
    .update({ name, slug, logo_url, status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { errors: { server: error.message } };
  }

  revalidatePath("/superadmin/tenants");
  return { success: true };
}

export async function deleteTenantAction(id: string) {
  await requireSuperadmin();

  const adminAuthClient = createAdminClient();
  const { error } = await adminAuthClient.from("tenants").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/superadmin/tenants");
  return { success: true };
}
