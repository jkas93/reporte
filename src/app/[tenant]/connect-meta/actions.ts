"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function revokeMetaConnection(connectionId: string) {
  const supabase = await createClient();
  
  // Since we rely on RLS, the user must have access to this meta_connection anyway.
  // The policy allows tenants to manage their own connections.
  const { error } = await supabase
    .from("meta_connections")
    .delete()
    .eq("id", connectionId);

  if (error) {
    return { error: error.message };
  }

  // We should also delete derived data potentially: campaigns, ad_insights.
  // Our schema has 'ON DELETE CASCADE' for meta_connections inside 'campaigns', 
  // so this handles cleanup automatically!
  
  revalidatePath("/[tenant]/connect-meta", "page");
  return { success: true };
}
