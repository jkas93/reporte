import { NextResponse } from "next/server";
import { exchangeCodeForToken, getAdAccounts, parseAndVerifyState } from "@/lib/meta-api/oauth";
import { encrypt } from "@/lib/meta-api/encryption";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");
  const stateStr = url.searchParams.get("state");

  if (errorParam || !code) {
    console.error("Meta OAuth Error:", url.searchParams.get("error_description"));
    return NextResponse.redirect(new URL("/login?error=meta_auth_failed", request.url));
  }

  // Fix C-3: Validar state con firma HMAC
  const state = parseAndVerifyState(stateStr);
  if (!state) {
    console.error("Invalid or expired OAuth state received");
    return NextResponse.redirect(new URL("/login?error=invalid_state", request.url));
  }

  const { tenantId } = state;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Exchange code for token
    const tokenResponse = await exchangeCodeForToken(code);
    const accessToken = tokenResponse.access_token;
    const expiresAt = tokenResponse.expires_in 
       ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
       : null;

    // Encrypt token
    const encryptedToken = encrypt(accessToken);

    // Fetch ad accounts
    const adAccounts = await getAdAccounts(accessToken);
    const activeAccounts = adAccounts.data || [];
    
    if (activeAccounts.length === 0) {
        throw new Error("No hay cuentas publicitarias asociadas a este usuario de Facebook.");
    }

    const primaryAccount = activeAccounts[0];

    // Check if connection exists for tenant
    const { data: existingConnection } = await supabase
        .from("meta_connections")
        .select("id")
        .eq("tenant_id", tenantId)
        .single();

    // Fix Q-3: Manejo de errores de Supabase
    if (existingConnection) {
        const { error: updErr } = await supabase.from("meta_connections").update({
            user_id: user?.id,
            access_token_encrypted: encryptedToken,
            token_expires_at: expiresAt,
            ad_account_id: primaryAccount.account_id,
            ad_account_name: primaryAccount.name,
            status: 'connected',
            updated_at: new Date().toISOString()
        }).eq("id", existingConnection.id);
        
        if (updErr) throw new Error(`Error actualizando conexión: ${updErr.message}`);
    } else {
        const { error: insErr } = await supabase.from("meta_connections").insert({
            tenant_id: tenantId,
            user_id: user?.id,
            access_token_encrypted: encryptedToken,
            token_expires_at: expiresAt,
            ad_account_id: primaryAccount.account_id,
            ad_account_name: primaryAccount.name,
            status: 'connected'
        });

        if (insErr) throw new Error(`Error creando conexión: ${insErr.message}`);
    }

    // Redirect to the account selection page
    const { data: tenant } = await supabase.from("tenants").select("slug").eq("id", tenantId).single();
    if (tenant) {
       return NextResponse.redirect(new URL(`/${tenant.slug}/connect-meta/select-account`, request.url));
    }
    
    return NextResponse.redirect(new URL("/", request.url));
    
  } catch (error: any) {
    console.error("Meta Connection Error:", error);
    let redirectUrl = "/login";
    if (tenantId) {
      const supabase = await createClient();
      const { data: tenantInfo } = await supabase.from("tenants").select("slug").eq("id", tenantId).single();
      if (tenantInfo) {
        redirectUrl = `/${tenantInfo.slug}/connect-meta`;
      }
    }
    return NextResponse.redirect(new URL(`${redirectUrl}?error=${encodeURIComponent(error.message)}`, request.url));
  }
}
