import { SheetMetadata } from "../types/models";
import { createSuccessResponse, createErrorResponse } from "../utils/response";

/**
 * Retrieves metadata for a specific sheet
 * @param request - The incoming request
 * @param env - Environment variables
 * @returns Response with the sheet metadata
 */
export async function getSheetMetadata(request: Request, env: Env): Promise<Response> {
  try {
    const id = request.url.split("/").pop();
    
    if (!id) {
      return createErrorResponse("Sheet ID is required", 400);
    }
    
    const { results } = await env.DB.prepare(
      "SELECT * FROM sheets_metadata WHERE id = ?"
    ).bind(id).all<SheetMetadata>();

    if (!results || results.length === 0) {
      return createErrorResponse("Sheet not found", 404);
    }

    return createSuccessResponse(results[0]);
  } catch (error) {
    console.error("Error fetching sheet metadata:", error);
    return createErrorResponse("Failed to fetch sheet metadata", 500);
  }
} 