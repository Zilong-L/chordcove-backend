import { hash } from 'bcryptjs';
import { stableHash } from './utils';
import { RegistrationRequest } from '../types/models';
import { createErrorResponse, createSuccessResponse, parseRequestBody } from '../utils/response';

const USER_TABLE = 'users';

/**
 * Registers a new user with email verification
 * @param request - The incoming request
 * @param env - Environment variables
 * @returns Response indicating success or error
 */
export async function registerUser(request: Request, env: Env): Promise<Response> {
  const data = await parseRequestBody<RegistrationRequest>(request);

  if (!data || !data.email || !data.password || !data.verificationCode) {
    return createErrorResponse("Email, password and verification code are required", 400);
  }
  
  const hashedEmail = await stableHash(data.email);
  
  // Get stored verification code from KV
  const storedCode = await env.KV.get(hashedEmail);
  if (!storedCode) {
    return createErrorResponse("Verification code expired or not found", 400);
  }
  
  if (storedCode !== data.verificationCode) {
    return createErrorResponse("Verification code does not match", 401);
  }
  
  // Code is correct, delete from KV to prevent reuse
  await env.KV.delete(hashedEmail);
  
  // Check if email is already registered
  const { results } = await env.DB.prepare(
    `SELECT id FROM ${USER_TABLE} WHERE email = ?`
  ).bind(data.email).all();
  
  if (results && results.length > 0) {
    return createErrorResponse("Email already registered", 409);
  }
  
  const hashedPassword = await hash(data.password, 10);
  
  // Insert new user into D1 database
  await env.DB.prepare(
    `INSERT INTO ${USER_TABLE} (email, password) VALUES (?, ?)`
  ).bind(data.email, hashedPassword).run();
  
  return createSuccessResponse({ message: "User registered successfully" });
} 