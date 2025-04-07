import { createSuccessResponse, createErrorResponse, parseRequestBody } from '../utils/response';

interface EditRequest {
	sheetMetadata: {
		id: string;
		title?: string;
		coverImage?: string;
		singers?: Array<{ name: string }>;
		composers?: Array<{ name: string }>;
		bvid?: string;
	};
	scoreData: {
		[key: string]: unknown;
	};
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
			return createErrorResponse('Invalid request body', 400);
		}

		const { sheetMetadata, scoreData } = body;
		const songId = sheetMetadata.id;

		if (!songId) {
			return createErrorResponse('ID cannot be empty', 400);
		}

		// Check if sheet exists
		const sheet = await env.DB.prepare('SELECT * FROM sheets_metadata WHERE id = ?').bind(songId).first();

		if (!sheet) {
			return createErrorResponse('Sheet not found', 404);
		}

		// Ensure user is the uploader
		if (sheet.uploaderId !== request.userId) {
			return createErrorResponse('Permission denied', 403);
		}

		// Update sheet data in R2
		await env.R2.put(`sheets/${songId}.json`, JSON.stringify(scoreData), {
			httpMetadata: { contentType: 'application/json' },
		});

		let uploadImageError = false;

		// Handle cover image update if provided
		if (sheetMetadata.coverImage && sheetMetadata.coverImage !== sheet.coverImage) {
			try {
				const url = sheetMetadata.coverImage;
				const index = url.indexOf('tmp/images/');

				if (index === -1) {
					throw new Error('Invalid image URL');
				}

				const key = url.slice(index);
				const object = await env.R2.get(key);

				if (!object) {
					throw new Error('Image not found in R2');
				}

				await env.R2.put(key, object.body);

				const newURL = `${env.R2_ENDPOINT}/${key}`;
				await env.DB.prepare('UPDATE sheets_metadata SET coverImage = ? WHERE id = ?').bind(newURL, songId).run();
			} catch (e) {
				uploadImageError = true;
				console.error('Error updating cover image:', e);
			}
		}

		// Update sheet metadata in database
		if (sheetMetadata.title) {
			await env.DB.prepare('UPDATE sheets_metadata SET title = ?, bvid = ? WHERE id = ?')
				.bind(sheetMetadata.title, sheetMetadata.bvid, songId)
				.run();
		}
		console.log(sheetMetadata.bvid);

		// Handle artists update
		if (sheetMetadata.singers || sheetMetadata.composers) {
			// Remove all existing relationships
			await env.DB.prepare('DELETE FROM sheet_artists WHERE sheet_id = ?').bind(songId).run();

			// Add new relationships
			const artists = [
				...(sheetMetadata.singers || []).map((singer) => ({ name: singer.name, role: 'SINGER' })),
				...(sheetMetadata.composers || []).map((composer) => ({ name: composer.name, role: 'COMPOSER' })),
			];

			for (const artist of artists) {
				// Try to find existing artist by name
				const existingArtist = await env.DB.prepare('SELECT id FROM artists WHERE name = ?').bind(artist.name).first<{ id: number }>();

				let artistId: number;

				if (existingArtist) {
					// Use existing artist
					artistId = existingArtist.id;
				} else {
					// Create new artist
					const result = await env.DB.prepare('INSERT INTO artists (name) VALUES (?) RETURNING id')
						.bind(artist.name)
						.first<{ id: number }>();

					if (!result) {
						continue;
					}
					artistId = result.id;
				}

				// Create the relationship in sheet_artists
				await env.DB.prepare('INSERT INTO sheet_artists (sheet_id, artist_id, role) VALUES (?, ?, ?)')
					.bind(songId, artistId, artist.role)
					.run();
			}
		}

		return createSuccessResponse({
			id: songId,
			imageUpdateStatus: uploadImageError ? 'failed' : 'success',
		});
	} catch (error) {
		console.error('Edit Error:', error);
		return createErrorResponse('Failed to update sheet', 500);
	}
}
