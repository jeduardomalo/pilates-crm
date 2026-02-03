import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12; // recommended for GCM

function getKey(): Buffer {
  const secret =
    process.env.GOOGLE_TOKEN_SECRET ||
    process.env.TOKEN_ENCRYPTION_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error(
      "Missing token encryption secret. Set GOOGLE_TOKEN_SECRET (recommended)."
    );
  }

  // Derive a 32-byte key from provided secret.
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptString(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Format: base64(iv).base64(tag).base64(ciphertext)
  return `${iv.toString("base64")}.${tag.toString("base64")}.${ciphertext.toString(
    "base64"
  )}`;
}

export function decryptString(payload: string): string {
  const key = getKey();
  const [ivB64, tagB64, ctB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !ctB64) {
    throw new Error("Invalid encrypted payload format.");
  }

  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(ctB64, "base64");

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

