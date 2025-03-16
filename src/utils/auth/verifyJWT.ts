import { jwtVerify } from "jose";

interface JWTPayload {
  userId: string;
  [key: string]: unknown;
}

/**
 * Verifies a JWT token from the Authorization header
 * @param request - The incoming request
 * @param env - Environment variables
 * @returns The userId from the token payload or null if verification fails
 */
async function verifyJWT(request: Request, env: Env): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const { payload } = await jwtVerify(
      token, 
      new TextEncoder().encode(env.JWT_SECRET)
    );
    return (payload as JWTPayload).userId;
  } catch (err) {
    console.error("JWT Verification Failed:", err);
    return null;
  }
}

export { verifyJWT }; 