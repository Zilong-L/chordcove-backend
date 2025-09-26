import { Env } from '../types/worker-configuration';
import { createSuccessResponse, createErrorResponse } from '../utils/response';

/**
 * Fetches all sheets uploaded by the current user
 */
export async function handleGetUserSheets(request: Request, env: Env): Promise<Response> {
	try {
		// Get user ID from the request (added by withAuth middleware)
		const userId = request.userId;
		if (!userId) {
			// This case should ideally be handled by withAuth, but added as a safeguard
			return createErrorResponse('Authentication required', 401);
		}

		// Fetch sheet metadata for sheets uploaded by the user, including artist details
		const query = `
            SELECT 
                sm.id, sm.title, sm.sheetType, sm.createdAt, sm.coverImage, sm.uploaderId,
                GROUP_CONCAT(
                    CASE 
                        WHEN sa.role = 'SINGER' THEN json_object('id', a.id, 'name', a.name, 'role', sa.role)
                        ELSE NULL 
                    END
                ) as singers, 
                GROUP_CONCAT(
                    CASE 
                        WHEN sa.role = 'COMPOSER' THEN json_object('id', a.id, 'name', a.name, 'role', sa.role)
                        ELSE NULL 
                    END
                ) as composers 
            FROM sheets_metadata sm
            LEFT JOIN sheet_artists sa ON sm.id = sa.sheet_id
            LEFT JOIN artists a ON sa.artist_id = a.id
            WHERE sm.uploaderId = ? 
            GROUP BY sm.id 
            ORDER BY sm.createdAt DESC
        `;

		const sheetsMetadataResult = await env.DB.prepare(query).bind(userId).all();

		if (!sheetsMetadataResult.results || sheetsMetadataResult.results.length === 0) {
			return createSuccessResponse([]); // Return empty array if user has no sheets
		}

		// Parse the JSON strings for singers and composers
		const processedResults = (sheetsMetadataResult.results || [])
			.map((sheet) => {
				if (!sheet || typeof sheet !== 'object') return null;

				// Helper function to safely parse JSON potentially containing multiple concatenated JSON objects
				const parseGroupConcatJson = (jsonString: string | null): any[] => {
					if (!jsonString) return [];
					// Correct regex: remove unnecessary escapes
					const validJsonString = `[${jsonString.replace(/\}\{/g, '},{')}]`;
					try {
						return JSON.parse(validJsonString);
					} catch (e) {
						console.error('Failed to parse group_concat JSON:', e, 'String:', jsonString);
						return []; // Return empty array on parsing error
					}
				};

				return {
					...sheet,
					singers: parseGroupConcatJson(sheet.singers as string | null),
					composers: parseGroupConcatJson(sheet.composers as string | null),
				};
			})
			.filter(Boolean); // Filter out any null results from the map

		return createSuccessResponse(processedResults);
	} catch (error) {
		console.error('Get User Sheets Error:', error);
		return createErrorResponse('Failed to fetch user sheets', 500);
	}
}
