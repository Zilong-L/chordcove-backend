import { hash } from 'bcryptjs';
import { stableHash } from '../utils/stableHash';
import { createErrorResponse, createSuccessResponse, parseRequestBody } from '../utils/response';
import { validateVerificationData } from './validation';

const USER_TABLE = 'users';

/**
 * Validates the verification code and creates the user account with the provided password
 */
export async function validateRegistration(request: Request, env: Env): Promise<Response> {
  const data = await parseRequestBody(request);

  // Validate verification data including password requirements
  const validationResult = validateVerificationData(data);
  if (!validationResult.success) {
    return createErrorResponse(validationResult.error.errors[0].message, 400);
  }

  const { email, code:codeKV, password } = validationResult.data;
  const hashedEmail = await stableHash(email);
  
  // Get stored registration data from KV
  const storedData = await env.KV.get(hashedEmail);

  if (!storedData) {
    return createErrorResponse("Registration expired or not found", 400);
  }

  const { code } = JSON.parse(storedData);

  if (code !== codeKV) {
    return createErrorResponse("Invalid verification code", 401);
  }

  // Hash the password and create user account
  const hashedPassword = await hash(password, 10);

  // Create user in database
  await env.DB.prepare(
    `INSERT INTO ${USER_TABLE} (email, password) VALUES (?, ?)`
  ).bind(email, hashedPassword).run();

  // Clean up KV entry
  await env.KV.delete(hashedEmail);

  return createSuccessResponse({ message: "User registered successfully" });
} 