import { Env } from '../types/worker-configuration';
import { createSuccessResponse, createErrorResponse } from '../utils/response';

/**
 * Handles liking a sheet
 */
export async function handleLike(request: Request, env: Env): Promise<Response> {
	try {
		const splitedUrl = new URL(request.url).pathname.split('/');
		splitedUrl.pop();
		const sheetId = splitedUrl.pop();

		if (!sheetId) {
			return createErrorResponse('Sheet ID is required', 400);
		}

		// Check if sheet exists
		const sheet = await env.DB.prepare('SELECT * FROM sheets_metadata WHERE id = ?').bind(sheetId).first();

		if (!sheet) {
			return createErrorResponse('Sheet not found', 404);
		}

		// Check if already liked
		const existingLike = await env.DB.prepare('SELECT * FROM likes WHERE user_id = ? AND sheet_id = ?')
			.bind(request.userId, sheetId)
			.first();

		if (existingLike) {
			return createSuccessResponse({ liked: true });
		}

		// Add like
		await env.DB.prepare('INSERT INTO likes (user_id, sheet_id) VALUES (?, ?)').bind(request.userId, sheetId).run();

		return createSuccessResponse({ liked: true });
	} catch (error) {
		console.error('Like Error:', error);
		return createErrorResponse('Failed to like sheet', 500);
	}
}

/**
 * Handles unliking a sheet
 */
export async function handleUnlike(request: Request, env: Env): Promise<Response> {
	try {
		const splitedUrl = new URL(request.url).pathname.split('/');
		splitedUrl.pop();
		const sheetId = splitedUrl.pop();
		if (!sheetId) {
			return createErrorResponse('Sheet ID is required', 400);
		}

		// Delete like if exists
		await env.DB.prepare('DELETE FROM likes WHERE user_id = ? AND sheet_id = ?').bind(request.userId, sheetId).run();

		return createSuccessResponse({ liked: false });
	} catch (error) {
		console.error('Unlike Error:', error);
		return createErrorResponse('Failed to unlike sheet', 500);
	}
}

/**
 * Checks if a user has liked a sheet
 */
export async function checkLikeStatus(request: Request, env: Env): Promise<Response> {
	try {
		const splitedUrl = new URL(request.url).pathname.split('/');
		splitedUrl.pop();
		const sheetId = splitedUrl.pop();
		if (!sheetId) {
			return createErrorResponse('Sheet ID is required', 400);
		}

		// Check if sheet exists
		const sheet = await env.DB.prepare('SELECT * FROM sheets_metadata WHERE id = ?').bind(sheetId).first();

		if (!sheet) {
			return createErrorResponse('Sheet not found', 404);
		}

		// Check if liked
		const like = await env.DB.prepare('SELECT * FROM likes WHERE user_id = ? AND sheet_id = ?').bind(request.userId, sheetId).first();

		return createSuccessResponse({ liked: !!like });
	} catch (error) {
		console.error('Like Status Check Error:', error);
		return createErrorResponse('Failed to check like status', 500);
	}
}
