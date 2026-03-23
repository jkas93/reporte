import { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"

export default async function SuperadminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "superadmin") {
    redirect("/"); 
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" user={profile} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 shrink-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
