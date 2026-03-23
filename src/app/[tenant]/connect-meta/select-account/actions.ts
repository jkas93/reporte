"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function selectMetaAccount(formData: FormData) {
  const tenantId = formData.get("tenant_id") as string;
  const slug = formData.get("slug") as string;
  const adAccountId = formData.get("account_id") as string;
  const adAccountName = formData.get("account_name") as string;

  if (!tenantId || !adAccountId) {
    return { error: "Faltan parámetros de selección" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("meta_connections")
    .update({
      ad_account_id: adAccountId,
      ad_account_name: adAccountName,
      status: 'connected',
      updated_at: new Date().toISOString()
    })
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("Error updating ad account:", error);
    return { error: `Error al actualizar la cuenta: ${error.message}` };
  }

  revalidatePath(`/${slug}/connect-meta`);
  revalidatePath(`/${slug}/dashboard`);

  // Redirect back to connection page with success
  redirect(`/${slug}/connect-meta?success=true`);
}
