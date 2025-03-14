import { stableHash } from '../utils/stableHash';
import { createErrorResponse, createSuccessResponse, parseRequestBody } from '../utils/response';
import { sendCode } from '../utils/sendCode';
import { validateRegistrationData } from './validation';

const USER_TABLE = 'users';
const REGISTRATION_EXPIRY = 60 * 10; // 10 minutes in seconds

/**
 * Initiates user registration by sending verification code
 */
export async function registerUser(request: Request, env: Env): Promise<Response> {
	const data = await parseRequestBody(request);

	// Validate email only
	const validationResult = validateRegistrationData(data);
	if (!validationResult.success) {
		return createErrorResponse(validationResult.error.errors[0].message, 400);
	}

	const { email } = validationResult.data;

	// Rate Limiting: limit to one request per 30 seconds
	const { success } = await env.RATE_LIMITER.limit({ key: email });
	if (!success) {
		return createErrorResponse('Rate limit exceeded. Please wait 60s.', 429);
	}

	// Check if email is already registered
	const { results } = await env.DB.prepare(
		`SELECT id FROM ${USER_TABLE} WHERE email = ?`
	).bind(email).all();

	if (results && results.length > 0) {
		return createErrorResponse('Email already registered', 409);
	}

	const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
	const hashedEmail = await stableHash(email);

	// Store verification code and email in KV
	await env.KV.put(
		hashedEmail,
		JSON.stringify({
			email,
			code: verificationCode
		}),
		{ expirationTtl: REGISTRATION_EXPIRY }
	);

	await sendCode(email, verificationCode, env);

	return createSuccessResponse({ message: 'Verification code sent to email' });
}
