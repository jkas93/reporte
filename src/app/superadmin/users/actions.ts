"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperadmin } from "@/lib/auth-guard";
import { UserSchema, type UserActionState } from "@/lib/validations/user";
import { revalidatePath } from "next/cache";

export async function createUserAction(
  prevState: UserActionState | undefined,
  formData: FormData
): Promise<UserActionState> {
  await requireSuperadmin();

  const validatedFields = UserSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    tenantIds: formData.getAll("tenantIds"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { email, password, full_name, role, tenantIds } = validatedFields.data;

  if (!password || password.length < 6) {
      return { errors: { password: ["Se requiere una contraseña de 6+ caracteres para nuevos usuarios"] } };
  }

  const adminAuthClient = createAdminClient();

  // Create User in Supabase Auth
  const { data: authData, error: authError } = await adminAuthClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name,
    },
  });

  if (authError) {
    return { errors: { server: authError.message } };
  }

  const userId = authData.user.id;

  // The database trigger 'on_auth_user_created' automatically creates the profile row.
  // We just need to update it with the correct role (trigger sets 'user' by default)
  if (role === "superadmin") {
      await adminAuthClient.from("profiles").update({ role }).eq("id", userId);
  }

  // Insert relationships with tenants
  if (tenantIds && tenantIds.length > 0) {
    const tenantUserRows = tenantIds.map((tenantId) => ({
      tenant_id: tenantId,
      user_id: userId,
      is_active: true,
    }));
    await adminAuthClient.from("tenant_users").insert(tenantUserRows);
  }

  revalidatePath("/superadmin/users");
  return { success: true };
}

export async function updateUserAction(
  id: string,
  prevState: UserActionState | undefined,
  formData: FormData
): Promise<UserActionState> {
  await requireSuperadmin();

  const validatedFields = UserSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    tenantIds: formData.getAll("tenantIds"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { full_name, role, tenantIds, password } = validatedFields.data;
  const adminAuthClient = createAdminClient();

  // Update auth credentials if password provided
  if (password && password.length >= 6) {
     const { error: pwdErr } = await adminAuthClient.auth.admin.updateUserById(id, { password });
     if (pwdErr) return { errors: { server: pwdErr.message } };
  }

  // Update profile
  const { error: profileError } = await adminAuthClient
    .from("profiles")
    .update({ full_name, role, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (profileError) {
    return { errors: { server: profileError.message } };
  }

  // Rewrite tenant relationships
  // 1. Delete old
  await adminAuthClient.from("tenant_users").delete().eq("user_id", id);
  // 2. Insert new
  if (tenantIds && tenantIds.length > 0) {
    const tenantUserRows = tenantIds.map((tenantId) => ({
      tenant_id: tenantId,
      user_id: id,
      is_active: true,
    }));
    await adminAuthClient.from("tenant_users").insert(tenantUserRows);
  }

  revalidatePath("/superadmin/users");
  return { success: true };
}

export async function deleteUserAction(id: string) {
  await requireSuperadmin();

  const adminAuthClient = createAdminClient();
  const { error } = await adminAuthClient.auth.admin.deleteUser(id);
  if (error) return { error: error.message };
  revalidatePath("/superadmin/users");
  return { success: true };
}
