import { metaAuthHeaders } from "./oauth";

const META_API_VERSION = "v21.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export interface MetaRequestOptions extends RequestInit {
  accessToken?: string;
}

export interface MetaErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

export class MetaApiError extends Error {
  public fbtrace_id: string;

  constructor(
    public response: MetaErrorResponse,
    public status: number
  ) {
    const traceId = response.error.fbtrace_id || "no-trace";
    super(`${response.error.message || "Error en la API de Meta"} (Trace: ${traceId})`);
    this.name = "MetaApiError";
    this.fbtrace_id = traceId;
  }

  get isRateLimit() {
    return this.response.error.code === 17 || this.response.error.code === 80004;
  }

  get isTokenExpired() {
    return (
      this.response.error.code === 190 || 
      this.response.error.error_subcode === 463 || 
      this.response.error.error_subcode === 467
    );
  }
}

/**
 * Cliente unificado para Meta Ads (Audit U.1)
 */
export async function metaFetch<T>(
  endpoint: string,
  options: MetaRequestOptions = {}
): Promise<T> {
  const { accessToken, headers, ...rest } = options;
  
  const url = endpoint.startsWith("http") 
    ? endpoint 
    : `${META_BASE_URL}/${endpoint.startsWith("/") ? endpoint.slice(1) : endpoint}`;

  const requestHeaders = new Headers(headers);
  if (accessToken) {
    const auth = metaAuthHeaders(accessToken);
    Object.entries(auth).forEach(([k, v]) => requestHeaders.set(k, v));
  }

  const response = await fetch(url, {
    ...rest,
    headers: requestHeaders,
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("[MetaAPI] Error:", {
      status: response.status,
      data,
      url: url.split("?")[0], // Log url sin tokens
    });
    throw new MetaApiError(data as MetaErrorResponse, response.status);
  }

  return data as T;
}
