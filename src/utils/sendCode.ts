
import { createErrorResponse, createSuccessResponse } from '../utils/response';

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
export async function sendCode(email:string, code:string,env:Env): Promise<Response> {
  
  if(!email || !code){
    return createErrorResponse("Invalid email or code", 400);
  }


  const emailRequest: EmailRequest = {
    email: email,
    subject: "Your ChordCove Verification Code",
    body: `<h2>Your Verification Code</h2><p><strong>${code}</strong></p><p>Valid for 10 minutes.</p>`,
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