import { compare } from "bcryptjs";
import { SignJWT } from "jose";
import { createErrorResponse, createSuccessResponse, parseRequestBody } from "../utils/response";

interface RefreshTokenRequest {
  refreshToken: string;
}

interface RefreshTokenResponse {
  accessToken: string;
}

/**
 * Handles refresh token requests to generate new access tokens
 * @param request - The incoming request
 * @param env - Environment variables
 * @returns Response with new access token or error
 */
export async function handleRefreshToken(request: Request, env: Env): Promise<Response> {
  const data = await parseRequestBody<RefreshTokenRequest>(request);
  console.log('verify refresh token');
  console.log(data);
  if (!data?.refreshToken) {
    return createErrorResponse("Refresh token is required", 400);
  }

  // Find the most recent 3 valid refresh tokens in the database
  const { results } = await env.DB.prepare(
    `SELECT rt.user_id, rt.token, rt.expires_at 
     FROM refresh_tokens rt 
     WHERE rt.expires_at > CURRENT_TIMESTAMP
     ORDER BY rt.created_at DESC
     LIMIT 3`
  ).all();

  if (!results || results.length === 0) {
    return createErrorResponse("Invalid refresh token", 401);
  }

  // Find matching refresh token
  const matchingToken = await Promise.all(
    results.map(async (record: any) => {
      const isMatch = await compare(data.refreshToken, record.token);
      return isMatch ? record : null;
    })
  ).then(matches => matches.find(match => match !== null));
  console.log('matching token');
  if (!matchingToken) {
    return createErrorResponse("Invalid refresh token", 401);
  }

  // Generate new access token
  const accessToken = await new SignJWT({ userId: matchingToken.user_id })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .sign(new TextEncoder().encode(env.JWT_SECRET));

  return createSuccessResponse<RefreshTokenResponse>({ accessToken });
} 