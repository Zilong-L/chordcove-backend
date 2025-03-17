/**
 * Adds CORS headers to the response
 * @param response - The original response
 * @param request - The incoming request
 * @param allowedOrigins - Array of allowed origins
 * @returns A new response with CORS headers
 */
export function withCORS(response: Response, request: Request, allowedOrigins: string[]): Response {
	const requestOrigin = request.headers.get('Origin');
	const headers = new Headers(response.headers);

	headers.set('Access-Control-Allow-Origin', allowedOrigins.includes(requestOrigin || '') ? requestOrigin || '' : 'null');

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: headers,
	});
}
