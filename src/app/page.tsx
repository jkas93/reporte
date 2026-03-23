import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "superadmin") {
    redirect("/superadmin");
  }

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("tenants(slug)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (tenantUser?.tenants && typeof tenantUser.tenants === 'object' && 'slug' in tenantUser.tenants) {
    redirect(`/${tenantUser.tenants.slug}/dashboard`);
  }

  redirect("/login?error=no_tenants");
}
