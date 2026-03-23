import { Redis } from "@upstash/redis";

/** 
 * Motor de Caché Inteligente (Fix E-1)
 * Si las variables UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN
 * no están en el .env.local, el sistema simplemente retorna 'null'
 * de forma elegante sin romper la aplicación.
 */

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    return await redis.get<T>(key);
  } catch (error) {
    console.warn("[Cache] Error al leer de Redis:", error);
    return null;
  }
}

export async function setCache(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.warn("[Cache] Error al escribir en Redis:", error);
  }
}

export async function deleteCache(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (error) {
    console.warn("[Cache] Error al eliminar de Redis:", error);
  }
}
