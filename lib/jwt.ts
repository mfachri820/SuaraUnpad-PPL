const MIN_SECRET_LENGTH = 32;

export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET belum di-set atau kurang dari ${MIN_SECRET_LENGTH} karakter. Generate dengan: openssl rand -base64 48`
    );
  }
  return new TextEncoder().encode(secret);
}
