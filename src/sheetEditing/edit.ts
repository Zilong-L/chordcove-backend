import { SheetEditRequest } from "../types/models";
import { createSuccessResponse, createErrorResponse, parseRequestBody } from "../utils/response";

interface ScoreData {
  [key: string]: unknown;
}

interface EditRequest {
  sheetMetadata: SheetEditRequest;
  scoreData: ScoreData;
}

/**
 * Handles the editing of an existing sheet
 * @param request - The incoming request
 * @param env - Environment variables
 * @returns Response with the updated sheet ID
 */
export async function handleEdit(request: Request, env: Env): Promise<Response> {
  try {
    const body = await parseRequestBody<EditRequest>(request);
    
    if (!body || !body.sheetMetadata || !body.scoreData) {
      return createErrorResponse("Invalid request body", 400);
    }
    
    const { sheetMetadata, scoreData } = body;
    const songId = sheetMetadata.id;
    
    if (!songId) {
      return createErrorResponse("ID cannot be empty", 400);
    }
    
    // Check if sheet exists
    const sheet = await env.DB.prepare("SELECT * FROM sheets_metadata WHERE id = ?")
      .bind(songId)
      .first();
      
    if (!sheet) {
      return createErrorResponse("Sheet not found", 404);
    }
    
    // Ensure user is the uploader
    if (sheet.uploaderId !== request.userId) {
      return createErrorResponse("Permission denied", 403);
    }
    
    // Update sheet data in R2
    await env.R2.put(`sheets/${songId}.json`, JSON.stringify(scoreData), {
      httpMetadata: { contentType: "application/json" }
    });
    
    let uploadImageError = false;
    
    // Handle cover image update if provided
    if (sheetMetadata.coverImage && sheetMetadata.coverImage !== sheet.coverImage) {
      try {
        const url = sheetMetadata.coverImage;
        const index = url.indexOf("tmp/images/");
        
        if (index === -1) {
          throw new Error("Invalid image URL");
        }
        
        const key = url.slice(index);
        const object = await env.R2.get(key);
        
        if (!object) {
          throw new Error("Image not found in R2");
        }
        
        await env.R2.put(key, object.body);
        
        const newURL = `${env.R2_ENDPOINT}/${key}`;
        await env.DB.prepare("UPDATE sheets_metadata SET coverImage = ? WHERE id = ?")
          .bind(newURL, songId)
          .run();
      } catch (e) {
        uploadImageError = true;
        console.error("Error updating cover image:", e);
      }
    }
    
    // Update sheet metadata in database
    await env.DB.prepare(
      "UPDATE sheets_metadata SET title = ?, composer = ?, singer = ? WHERE id = ?"
    ).bind(
      sheetMetadata.title || sheet.title,
      sheetMetadata.composer || sheet.composer,
      sheetMetadata.singer || sheet.singer,
      songId
    ).run();
    
    return createSuccessResponse({ 
      id: songId,
      imageUpdateStatus: uploadImageError ? "failed" : "success"
    });
  } catch (error) {
    console.error("Edit Error:", error);
    return createErrorResponse("Failed to update sheet", 500);
  }
} 