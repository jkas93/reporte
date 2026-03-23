import { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"

export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Validate the user has access to this specific tenant slug
  const { data: access } = await supabase
    .from("tenant_users")
    .select("tenants!inner(id, name, logo_url, slug)")
    .eq("user_id", user.id)
    .eq("tenants.slug", slug)
    .eq("is_active", true)
    .single();

  if (!access) {
    // Determine where to redirect them if they don't have access
    const { data: firstTenant } = await supabase
      .from("tenant_users")
      .select("tenants(slug)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (firstTenant?.tenants && typeof firstTenant.tenants === 'object' && 'slug' in firstTenant.tenants) {
      redirect(`/${firstTenant.tenants.slug}/dashboard`);
    } else {
      redirect("/login?error=unauthorized_tenant");
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const tenantData = access.tenants as any;
  const tenantName = tenantData?.name || "Workspace";

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" user={profile} tenantName={tenantName} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 shrink-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
