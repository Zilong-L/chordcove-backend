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
    const result = await env.DB.prepare(
      `SELECT * FROM sheets_metadata ORDER BY createdAt DESC LIMIT 10`
    ).all<SheetMetadata>();
    console.log(JSON.stringify(result.results))
    return createSuccessResponse(result.results || []);
  } catch (error) {
    console.error("Error fetching recent sheets:", error);
    return createErrorResponse("Failed to fetch recent sheets", 500);
  }
} 