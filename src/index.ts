import { getRecentSheets } from './getters/getRecentSheets';
import { getSheetMetadata } from './getters/getSheetMetadata';
import { getAllArtists, getArtistSheets } from './getters/getArtists';

import { validateRegistration } from './handleUsers/validateRegistration';
import { registerUser } from './handleUsers/register';
import { login } from './handleUsers/login';
import { handleRefreshToken } from './handleUsers/refreshToken';

import { handleEdit } from './sheetEditing/edit';
import { handleUpload } from './sheetEditing/upload';
import { handleImageUpload } from './sheetEditing/uploadImage';
import { handleLike, handleUnlike, checkLikeStatus, handleGetLikedSheets } from './sheetEditing/likes';

import { withCORS } from './middleWare/cors';
import { withAuth } from './middleWare/auth';
/**
 * Handle CORS preflight requests
 */
async function handleOptions(request: Request, allowedOrigins: string[]): Promise<Response> {
	const requestOrigin = request.headers.get('Origin');
	console.log(requestOrigin);
	const headers = {
		'Access-Control-Allow-Origin': allowedOrigins.includes(requestOrigin || '') ? requestOrigin || '' : 'null',
		'Access-Control-Allow-Methods': 'POST,OPTIONS,GET,PUT,DELETE',
		'Access-Control-Allow-Headers': 'Content-Type,Authorization',
	};
	return new Response(null, { status: 204, headers });
}

/**
 * Route requests to the appropriate handler
 */
function handleRoutes(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);

	if (request.method === 'OPTIONS') {
		return handleOptions(request, env.ALLOWED_ORIGINS);
	}

	if (url.pathname === '/api/register' && request.method === 'POST') {
		return registerUser(request, env);
	}
	if (url.pathname === '/api/validate-registration' && request.method === 'POST') {
		return validateRegistration(request, env);
	}
	if (url.pathname === '/api/login' && request.method === 'POST') {
		return login(request, env);
	}
	if (url.pathname === '/api/refresh' && request.method === 'POST') {
		return handleRefreshToken(request, env);
	}

	// Sheet management routes
	if (url.pathname === '/api/upload-image' && request.method === 'POST') {
		return withAuth(request, env, handleImageUpload);
	}
	if (url.pathname === '/api/upload' && request.method === 'POST') {
		return withAuth(request, env, handleUpload);
	}
	if (url.pathname === '/api/edit' && request.method === 'PUT') {
		return withAuth(request, env, handleEdit);
	}

	// Public sheet retrieval routes
	if (url.pathname === '/api/recent-sheets') {
		return getRecentSheets(request, env);
	}

	if (url.pathname.startsWith('/api/get-sheet-metadata/') && request.method === 'GET') {
		return getSheetMetadata(request, env);
	}

	// Artist routes
	if (url.pathname === '/api/artists' && request.method === 'GET') {
		return getAllArtists(request, env);
	}

	if (url.pathname.startsWith('/api/artist-sheets/') && request.method === 'GET') {
		return getArtistSheets(request, env);
	}

	// Sheet like routes
	if (url.pathname.match(/^\/api\/sheets\/[^/]+\/like$/) && request.method === 'POST') {
		console.log('here');
		return withAuth(request, env, handleLike);
	}

	if (url.pathname.match(/^\/api\/sheets\/[^/]+\/like$/) && request.method === 'DELETE') {
		return withAuth(request, env, handleUnlike);
	}

	if (url.pathname.match(/^\/api\/sheets\/[^/]+\/like-status$/) && request.method === 'GET') {
		return withAuth(request, env, checkLikeStatus);
	}

	// Get all liked sheets for the user
	if (url.pathname === '/api/likes/sheets' && request.method === 'GET') {
		return withAuth(request, env, handleGetLikedSheets);
	}

	return Promise.resolve(new Response('Not Found', { status: 404 }));
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Hong_Kong' });
		console.log(`Timestamp before API call (Hong Kong Time): ${timestamp}`);

		const response = await handleRoutes(request, env);
		return withCORS(response, request, env.ALLOWED_ORIGINS);
	},
};
