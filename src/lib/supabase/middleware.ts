import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If there's no user and the requested path is not /login or public assets, redirect to /login
  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  const isApiAuthRoute = request.nextUrl.pathname.startsWith("/api/auth");
  const isPublicAsset = request.nextUrl.pathname.match(/\.(.*)$/);
  
  if (!user && !isAuthRoute && !isApiAuthRoute && !isPublicAsset) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If user is logged in, grab their profile to check role for routing
  if (user) {
    // If they are on /login, redirect them appropriately based on role
    if (isAuthRoute) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
        
      const role = profile?.role ?? "user";
      const url = request.nextUrl.clone();
      
      if (role === "superadmin") {
        url.pathname = "/superadmin";
      } else {
        // Fetch first active tenant for normal user
        const { data: tenantUser } = await supabase
          .from("tenant_users")
          .select("tenants(slug)")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1)
          .single();
          
        if (tenantUser?.tenants && typeof tenantUser.tenants === 'object' && 'slug' in tenantUser.tenants) {
          url.pathname = `/${tenantUser.tenants.slug}/dashboard`;
        } else {
          // If no tenant found, redirect to a waiting page or back to login with error
          url.pathname = "/login";
          url.searchParams.set("error", "No tienes empresas asignadas");
        }
      }
      return NextResponse.redirect(url);
    }
    
    // Auth guard: logic to prevent users from accessing /superadmin, and superadmins from falling into user flow... 
    // Left simple for implementation phase
    if (request.nextUrl.pathname.startsWith("/superadmin")) {
        const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
        
        if (profile?.role !== "superadmin") {
            const url = request.nextUrl.clone();
            url.pathname = "/login";
            return NextResponse.redirect(url);
        }
    }
  }

  return supabaseResponse;
}
