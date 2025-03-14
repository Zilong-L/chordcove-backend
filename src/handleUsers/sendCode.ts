import { stableHash } from './utils';
import { createErrorResponse, createSuccessResponse, parseRequestBody } from '../utils/response';

const VERIFICATION_TTL = 600; // Verification code valid for 10 minutes

interface SendCodeRequest {
  email: string;
}

interface EmailRequest {
  email: string;
  subject: string;
  body: string;
}

/**
 * Sends a verification code to the user's email
 * @param request - The incoming request
 * @param env - Environment variables
 * @returns Response indicating success or error
 */
export async function sendCode(request: Request, env: Env): Promise<Response> {
  const data = await parseRequestBody<SendCodeRequest>(request);
  
  if (!data || !data.email) {
    return createErrorResponse("Invalid email", 400);
  }

  // Rate Limiting: limit to one request per 30 seconds
  const { success } = await env.RATE_LIMITER.limit({ key: data.email });
  if (!success) {
    return createErrorResponse("Rate limit exceeded. Please wait 60s.", 429);
  }

  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedEmail = await stableHash(data.email);

  await env.KV.put(hashedEmail, verificationCode, { expirationTtl: VERIFICATION_TTL });
  
  // Send email
  const emailRequest: EmailRequest = {
    email: data.email,
    subject: "Your ChordCove Verification Code",
    body: `<h2>Your Verification Code</h2><p><strong>${verificationCode}</strong></p><p>Valid for 10 minutes.</p>`,
  };
  
  const response = await fetch(env.MAIL_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.MAIL_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailRequest),
  });
  
  if (!response.ok) {
    return createErrorResponse("Failed to send verification code", 500);
  }
  
  return createSuccessResponse({ message: "Verification code sent" });
} 