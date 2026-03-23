import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 32) {
    throw new Error("ENCRYPTION_KEY debe ser de exactamente 32 caracteres.");
  }
  return Buffer.from(key, "utf-8");
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(hash: string): string {
  const parts = hash.split(":");
  if (parts.length !== 3) throw new Error("Hash inválido para descifrar");

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encryptedText = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/** Firma un payload con HMAC-SHA256 usando la ENCRYPTION_KEY */
export function signHmac(payload: string): string {
  return crypto
    .createHmac("sha256", getKey())
    .update(payload)
    .digest("hex");
}

/** Verifica que un payload coincida con su firma HMAC */
export function verifyHmac(payload: string, signature: string): boolean {
  const expected = signHmac(payload);
  // Comparación en tiempo constante para prevenir timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}
