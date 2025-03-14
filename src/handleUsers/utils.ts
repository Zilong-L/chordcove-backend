/**
 * Creates a stable hash of the provided text using SHA-256
 * @param text - The text to hash
 * @returns A hexadecimal string representation of the hash
 */
async function stableHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export { stableHash } 