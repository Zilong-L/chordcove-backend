import { createSuccessResponse, createErrorResponse } from "../utils/response";

interface Artist {
  id: number;
  name: string;
  description: string;
  image: string;
  created_at: string;
  sheets?: Array<{
    id: string;
    title: string;
    coverImage: string;
    role: string;
  }>;
}

/**
 * Retrieves all artists with their associated sheets
 */
export async function getAllArtists(request: Request, env: Env): Promise<Response> {
  try {
    const { results } = await env.DB.prepare(`
      SELECT 
        a.*,
        GROUP_CONCAT(
          json_object(
            'id', sm.id,
            'title', sm.title,
            'coverImage', sm.coverImage,
            'role', sa.role
          )
        ) as sheets
      FROM artists a
      LEFT JOIN sheet_artists sa ON a.id = sa.artist_id
      LEFT JOIN sheets_metadata sm ON sa.sheet_id = sm.id
      GROUP BY a.id
      ORDER BY a.created_at DESC
      LIMIT 20
    `).all<Artist>();

    // Parse the JSON strings from GROUP_CONCAT into arrays
    const artists = results?.map(artist => ({
      ...artist,
      sheets: artist.sheets ? JSON.parse(`[${artist.sheets}]`.replace(/\]\[/g, ',')) : []
    })) || [];

    return createSuccessResponse(artists);
  } catch (error) {
    console.error("Error fetching artists:", error);
    return createErrorResponse("Failed to fetch artists", 500);
  }
}

/**
 * Retrieves sheets for a specific artist
 */
export async function getArtistSheets(request: Request, env: Env): Promise<Response> {
  try {
    const artistId = request.url.split("/").pop();
    
    if (!artistId) {
      return createErrorResponse("Artist ID is required", 400);
    }

    // First get the artist details
    const { results: artistResults } = await env.DB.prepare(`
      SELECT * FROM artists WHERE id = ?
    `).bind(artistId).all<Artist>();

    if (!artistResults || artistResults.length === 0) {
      return createErrorResponse("Artist not found", 404);
    }

    const artist = artistResults[0];

    // Then get all sheets associated with this artist
    const { results: sheetResults } = await env.DB.prepare(`
      SELECT 
        sm.*,
        sa.role,
        GROUP_CONCAT(
          CASE 
            WHEN sa2.role = 'SINGER' THEN json_object('id', a2.id, 'name', a2.name, 'role', sa2.role)
            ELSE NULL 
          END
        ) as singers,
        GROUP_CONCAT(
          CASE 
            WHEN sa2.role = 'COMPOSER' THEN json_object('id', a2.id, 'name', a2.name, 'role', sa2.role)
            ELSE NULL 
          END
        ) as composers
      FROM sheets_metadata sm
      JOIN sheet_artists sa ON sm.id = sa.sheet_id
      LEFT JOIN sheet_artists sa2 ON sm.id = sa2.sheet_id
      LEFT JOIN artists a2 ON sa2.artist_id = a2.id
      WHERE sa.artist_id = ?
      GROUP BY sm.id
      ORDER BY sm.createdAt DESC
    `).bind(artistId).all();

    // Parse the JSON strings from GROUP_CONCAT into arrays
    const sheets = sheetResults?.map(sheet => ({
      ...sheet,
      singers: sheet.singers ? JSON.parse(`[${sheet.singers}]`.replace(/\]\[/g, ',')) : [],
      composers: sheet.composers ? JSON.parse(`[${sheet.composers}]`.replace(/\]\[/g, ',')) : []
    })) || [];

    return createSuccessResponse({
      ...artist,
      sheets
    });
  } catch (error) {
    console.error("Error fetching artist sheets:", error);
    return createErrorResponse("Failed to fetch artist sheets", 500);
  }
} 