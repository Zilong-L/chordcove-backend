import { verifyJWT } from '../utils/auth/verifyJWT';
// Extend the Request interface to include userId
declare global {
	interface Request {
		userId?: string;
	}
}

type RequestHandler = (request: Request, env: Env) => Promise<Response>;

/**
 * Authentication middleware that verifies JWT token
 * @param request - The incoming request
 * @param env - Environment variables
 * @param handler - The handler function to call if authentication succeeds
 * @returns Response from the handler or 401 if authentication fails
 */
export async function withAuth(request: Request, env: Env, handler: RequestHandler): Promise<Response> {
	const userId = await verifyJWT(request, env);

	if (!userId) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// Add userId to the request for use in the handler
	request.userId = userId;
	return handler(request, env);
}
