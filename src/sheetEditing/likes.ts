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

/**
 * Fetches all sheets liked by the current user
 */
export async function handleGetLikedSheets(request: Request, env: Env): Promise<Response> {
	try {
		// Get liked sheet IDs for the user
		console.log(request.userId);
		const likedSheetIdsResult = await env.DB.prepare('SELECT sheet_id FROM likes WHERE user_id = ?').bind(request.userId).all();

		if (!likedSheetIdsResult.results || likedSheetIdsResult.results.length === 0) {
			return createSuccessResponse([]); // Return empty array if no liked sheets
		}

		const likedSheetIds = likedSheetIdsResult.results.map((row) => row.sheet_id);
		console.log(likedSheetIds);
		// Construct the placeholders for the IN clause
		const placeholders = likedSheetIds.map(() => '?').join(',');

		// Fetch sheet metadata for the liked sheets using JSON aggregation for artists
		const query = `
            SELECT 
                sm.id, sm.title, sm.createdAt, sm.coverImage, sm.uploaderId, -- Select necessary sheet metadata fields
                GROUP_CONCAT(
                    CASE 
                        WHEN sa.role = 'SINGER' THEN json_object('id', a.id, 'name', a.name, 'role', sa.role)
                        ELSE NULL 
                    END
                ) as singers, -- Aggregate singers into a JSON array string
                GROUP_CONCAT(
                    CASE 
                        WHEN sa.role = 'COMPOSER' THEN json_object('id', a.id, 'name', a.name, 'role', sa.role)
                        ELSE NULL 
                    END
                ) as composers -- Aggregate composers into a JSON array string
            FROM sheets_metadata sm
            LEFT JOIN sheet_artists sa ON sm.id = sa.sheet_id
            LEFT JOIN artists a ON sa.artist_id = a.id
            WHERE sm.id IN (${placeholders}) -- Filter by liked sheet IDs
            GROUP BY sm.id 
        `;

		const sheetsMetadataResult = await env.DB.prepare(query)
			.bind(...likedSheetIds)
			.all();

		// Parse the JSON strings for singers and composers
		const processedResults = (sheetsMetadataResult.results || [])
			.map((sheet) => {
				// Ensure sheet is not null/undefined and has the necessary properties
				if (!sheet || typeof sheet !== 'object') return null;

				return {
					...sheet,
					singers: sheet.singers ? JSON.parse(`[${sheet.singers}]`) : [],
					composers: sheet.composers ? JSON.parse(`[${sheet.composers}]`) : [],
				};
			})
			.filter(Boolean); // Filter out any null results from the map

		return createSuccessResponse(processedResults);
	} catch (error) {
		console.error('Get Liked Sheets Error:', error);
		return createErrorResponse('Failed to fetch liked sheets', 500);
	}
}
