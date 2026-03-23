"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, Building2, Users, HardDrive, 
  Megaphone, Link2, Command, Search, Settings2, 
  CircleHelp, Database, FileChartColumn, FileText
} from "lucide-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// DYNAMIC DATA BASED ON CONTEXT
const navMain = {
  superadmin: [
    { title: "Dashboard", url: "/superadmin", icon: <LayoutDashboard /> },
    { title: "Empresas", url: "/superadmin/tenants", icon: <Building2 /> },
    { title: "Usuarios", url: "/superadmin/users", icon: <Users /> },
    { title: "Logs de Sync", url: "/superadmin/logs", icon: <HardDrive /> },
  ],
  tenant: [
    { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboard /> },
    { title: "Campañas", url: "/campanas", icon: <Megaphone /> },
    { title: "Conectar Meta", url: "/connect-meta", icon: <Link2 /> },
  ]
}

const secondaryItems = [
  { title: "Configuración", url: "#", icon: <Settings2 /> },
  { title: "Ayuda", url: "#", icon: <CircleHelp /> },
  { title: "Buscar", url: "#", icon: <Search /> },
]

const documentsItems = [
  { name: "Biblioteca de Datos", url: "#", icon: <Database /> },
  { name: "Reportes", url: "#", icon: <FileChartColumn /> },
  { name: "Asistente", url: "#", icon: <FileText /> },
]

export function AppSidebar({ user, tenantName, ...props }: { user: any, tenantName?: string } & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const isSuperadmin = pathname.startsWith("/superadmin")
  const segments = pathname.split("/")
  const slug = !isSuperadmin ? segments[1] : ""
  
  const menuItems = isSuperadmin 
    ? navMain.superadmin 
    : navMain.tenant.map(m => ({
        ...m,
        url: `/${slug}${m.url}`
      }))

  const userData = {
    name: user?.full_name || "Usuario",
    email: user?.email || "admin@reporte.com",
    avatar: "",
  }

  const workspaceName = isSuperadmin ? "Admin Console" : (tenantName || "Relativo")

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<a href="/" />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Command className="size-5" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">{workspaceName}</span>
                <span className="text-xs text-muted-foreground opacity-70">
                   {isSuperadmin ? "Super Admin" : "Workspace"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={menuItems} />
        <NavDocuments items={documentsItems} />
        <NavSecondary items={secondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
