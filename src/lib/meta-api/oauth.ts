import { signHmac, verifyHmac } from "./encryption";

export const META_API_VERSION = "v19.0";

/** Cabecera Authorization para todas las llamadas a Meta Graph API */
export function metaAuthHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

const getEnvVars = () => ({
  META_APP_ID: process.env.NEXT_PUBLIC_META_APP_ID,
  META_APP_SECRET: process.env.META_APP_SECRET,
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

/** Genera la URL de autorización OAuth, con state firmado con HMAC */
export const getMetaAuthUrl = (tenantId: string) => {
  const { APP_URL, META_APP_ID } = getEnvVars();
  const redirectUri = `${APP_URL}/api/meta/callback`;
  const scopes = [
    "ads_read",
    "business_management",
    "pages_read_engagement",
  ].join(",");

  // Firmar el state con HMAC para prevenir CSRF (Fix C-3)
  const rawState = JSON.stringify({ tenantId, ts: Date.now() });
  const signature = signHmac(rawState);
  const state = encodeURIComponent(JSON.stringify({ data: rawState, sig: signature }));

  return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${redirectUri}&state=${state}&scope=${scopes}&response_type=code`;
};

/** Verifica y parsea el state recibido del callback de Meta */
export function parseAndVerifyState(stateStr: string | null): { tenantId: string } | null {
  if (!stateStr) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(stateStr));
    if (!parsed.data || !parsed.sig) return null;

    if (!verifyHmac(parsed.data, parsed.sig)) {
      console.error("[OAuth] State HMAC inválido — posible ataque CSRF");
      return null;
    }

    const inner = JSON.parse(parsed.data);
    // Verificar que el state no tenga más de 10 minutos (ventana del OAuth)
    if (Date.now() - inner.ts > 10 * 60 * 1000) {
      console.error("[OAuth] State expirado");
      return null;
    }

    return { tenantId: inner.tenantId };
  } catch {
    return null;
  }
}

export async function exchangeCodeForToken(code: string) {
  const { APP_URL, META_APP_ID, META_APP_SECRET } = getEnvVars();
  const redirectUri = `${APP_URL}/api/meta/callback`;

  // Token corto: usando query params (requerido por el endpoint de token de Meta)
  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${redirectUri}&client_secret=${META_APP_SECRET}&code=${code}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Error al obtener el token de Meta");
  }

  const data = await response.json();

  // Intercambiar por token de larga duración (60 días)
  const longLivedResponse = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${data.access_token}`
  );

  if (!longLivedResponse.ok) {
    console.warn("Fallo el intercambio de token de larga duración, usando el original");
    return data;
  }

  return await longLivedResponse.json();
}

export async function getAdAccounts(accessToken: string, businessId?: string) {
  // Siempre pedimos el campo 'business' para poder agrupar/filtrar
  let results: any[] = [];
  
  try {
    if (businessId && businessId !== "personal") {
      // Intentamos obtener cuentas de propiedad y de clientes (socios) del negocio específico
      // Helper for pagination
      async function fetchAll(url: string) {
        let items: any[] = [];
        let nextUrl: string | null = url;
        while (nextUrl) {
          const response: Response = await fetch(nextUrl, { headers: metaAuthHeaders(accessToken) });
          if (!response.ok) break;
          const jsonData: any = await response.json();
          items = [...items, ...(jsonData.data || [])];
          nextUrl = jsonData.paging?.next || null;
        }
        return items;
      };

      const [ownedResults, clientResults] = await Promise.all([
        fetchAll(`https://graph.facebook.com/${META_API_VERSION}/${businessId}/owned_ad_accounts?fields=name,account_id,account_status,business&limit=50`),
        fetchAll(`https://graph.facebook.com/${META_API_VERSION}/${businessId}/client_ad_accounts?fields=name,account_id,account_status,business&limit=50`)
      ]);

      results = [...ownedResults, ...clientResults];

      // Si obtuvimos algo, lo devolvemos
      if (results.length > 0) return { data: results };
      
      // Si no obtuvimos nada pero las respuestas fueron OK, puede que el negocio no tenga cuentas.
      // Pero para estar seguros, si ambos fallaron o no devolvieron nada, probamos el fallback.
    }
  } catch (error) {
    console.error("[Meta API] Error al consultar negocio, usando fallback me/adaccounts:", error);
  }

  // Fallback: Obtener todas las cuentas a las que el usuario tiene acceso
  let nextUrl = `https://graph.facebook.com/${META_API_VERSION}/me/adaccounts?fields=name,account_id,account_status,business&limit=50`;

  while (nextUrl) {
    const response = await fetch(nextUrl, { headers: metaAuthHeaders(accessToken) });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Error al obtener cuentas publicitarias");
    }
    const data = await response.json();
    results = [...results, ...(data.data || [])];
    nextUrl = data.paging?.next || null;
  }

  return { data: results };
}

/** Obtiene la lista de negocios (portafolios) asociados al usuario con su foto de perfil */
export async function getBusinesses(accessToken: string) {
  let results: any[] = [];
  // Pedimos profile_picture_uri para mostrar la imagen del portafolio
  let nextUrl = `https://graph.facebook.com/${META_API_VERSION}/me/businesses?fields=name,id,profile_picture_uri&limit=50`;

  while (nextUrl) {
    const response = await fetch(nextUrl, { headers: metaAuthHeaders(accessToken) });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Error al obtener portafolios comerciales");
    }
    const data = await response.json();
    results = [...results, ...(data.data || [])];
    nextUrl = data.paging?.next || null;
  }

  return { data: results };
}

/** Obtiene el perfil básico del usuario actual para mostrar su foto en la opción "Personal" */
export async function getUserProfile(accessToken: string) {
  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/me?fields=name,picture.type(large){url}`,
    { headers: metaAuthHeaders(accessToken) }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Error al obtener perfil de usuario");
  }

  return response.json();
}
