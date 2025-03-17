import { SheetMetadata } from '../types/models';
import { createSuccessResponse, createErrorResponse } from '../utils/response';

/**
 * Retrieves metadata for a specific sheet
 * @param request - The incoming request
 * @param env - Environment variables
 * @returns Response with the sheet metadata
 */
export async function getSheetMetadata(request: Request, env: Env): Promise<Response> {
	try {
		const id = request.url.split('/').pop();

		if (!id) {
			return createErrorResponse('Sheet ID is required', 400);
		}

		const { results } = await env.DB.prepare(
			`
      SELECT 
        sm.*,
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
      WHERE sm.id = ?
      GROUP BY sm.id
    `,
		)
			.bind(id)
			.all<SheetMetadata>();

		if (!results || results.length === 0) {
			return createErrorResponse('Sheet not found', 404);
		}

		// Parse the JSON strings from GROUP_CONCAT into arrays
		const sheet = {
			...results[0],
			singers: results[0].singers ? JSON.parse(`[${results[0].singers}]`.replace(/\]\[/g, ',')) : [],
			composers: results[0].composers ? JSON.parse(`[${results[0].composers}]`.replace(/\]\[/g, ',')) : [],
		};

		return createSuccessResponse(sheet);
	} catch (error) {
		console.error('Error fetching sheet metadata:', error);
		return createErrorResponse('Failed to fetch sheet metadata', 500);
	}
}
