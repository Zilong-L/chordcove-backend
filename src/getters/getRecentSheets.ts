import { SheetMetadata } from "../types/models";
import { createSuccessResponse, createErrorResponse } from "../utils/response";

/**
 * Retrieves the most recent sheets from the database
 * @param request - The incoming request
 * @param env - Environment variables
 * @returns Response with the most recent sheets
 */
export async function getRecentSheets(request: Request, env: Env): Promise<Response> {
  try {
    const result = await env.DB.prepare(`
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
      GROUP BY sm.id
      ORDER BY sm.createdAt DESC 
      LIMIT 10
    `).all<SheetMetadata>();

    // Parse the JSON strings from GROUP_CONCAT into arrays
    const sheets = result.results?.map(sheet => ({
      ...sheet,
      singers: sheet.singers ? JSON.parse(`[${sheet.singers}]`.replace(/\]\[/g, ',')) : [],
      composers: sheet.composers ? JSON.parse(`[${sheet.composers}]`.replace(/\]\[/g, ',')) : []
    })) || [];

    return createSuccessResponse(sheets);
  } catch (error) {
    console.error("Error fetching recent sheets:", error);
    return createErrorResponse("Failed to fetch recent sheets", 500);
  }
} 