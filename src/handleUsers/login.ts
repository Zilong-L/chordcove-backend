import { compare, hash } from 'bcryptjs';
import { SignJWT } from 'jose';
import { LoginRequest, LoginResponse } from '../types/models';
import { createErrorResponse, createSuccessResponse, parseRequestBody } from '../utils/response';

const USER_TABLE = 'users';

interface UserRecord {
	id: number;
	password: string;
}

/**
 * Handles user login
 * @param request - The incoming request
 * @param env - Environment variables
 * @returns Response with access token and refresh token or error
 */
export async function login(request: Request, env: Env): Promise<Response> {
	const data = await parseRequestBody<LoginRequest>(request);

	if (!data || !data.email || !data.password) {
		return createErrorResponse('Email and password are required', 400);
	}

	// Query database to check if user exists
	const { results } = await env.DB.prepare(`SELECT id, password FROM ${USER_TABLE} WHERE email = ?`).bind(data.email).all<UserRecord>();

	if (!results || results.length === 0) {
		return createErrorResponse('Invalid email or password', 401);
	}

	const user = results[0];
	// Verify password
	const correct = await compare(data.password, user.password);

	if (!correct) {
		return createErrorResponse('Invalid email or password', 401);
	}

	// Generate Access Token
	const accessToken = await generateAccessToken(user, env);

	// Generate Refresh Token
	const rawRefreshToken = crypto.randomUUID(); // Actual refresh token (returned to client)
	const refreshTokenId = crypto.randomUUID();
	const hashedRefreshToken = await hash(rawRefreshToken, 10); // Hashed version for database
	const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

	// Store hashed Refresh Token in database
	await env.DB.prepare(`INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`)
		.bind(refreshTokenId, user.id, hashedRefreshToken, expiresAt)
		.run();

	const responseData: LoginResponse = {
		userId: user.id,
		accessToken,
		refreshToken: rawRefreshToken,
	};

	// Return only the raw Refresh Token to the client
	return createSuccessResponse(responseData);
}

/**
 * Generate Access Token (valid for 15 minutes)
 * @param user - User object with id
 * @param env - Environment variables
 * @returns JWT token string
 */
async function generateAccessToken(user: UserRecord, env: Env): Promise<string> {
	return await new SignJWT({ userId: user.id })
		.setProtectedHeader({ alg: 'HS256' })
		.setExpirationTime('15m')
		.sign(new TextEncoder().encode(env.JWT_SECRET));
}
