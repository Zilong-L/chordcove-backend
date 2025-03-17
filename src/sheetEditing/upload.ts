import { SheetUploadRequest } from '../types/models';
import { createSuccessResponse, createErrorResponse, parseRequestBody } from '../utils/response';

interface ScoreData {
	[key: string]: unknown;
}

interface UploadRequest {
	sheetMetadata: SheetUploadRequest & {
		id?: string;
		singers?: Array<{ name: string }>;
		composers?: Array<{ name: string }>;
	};
	scoreData: ScoreData;
}

/**
 * Handles the upload of a new sheet
 * @param request - The incoming request
 * @param env - Environment variables
 * @returns Response with the created sheet ID
 */
export async function handleUpload(request: Request, env: Env): Promise<Response> {
	if (request.method !== 'POST') {
		return createErrorResponse('Method Not Allowed', 405);
	}

	try {
		const body = await parseRequestBody<UploadRequest>(request);

		if (!body || !body.sheetMetadata || !body.scoreData) {
			return createErrorResponse('Invalid request body', 400);
		}

		const songId = crypto.randomUUID();
		const { sheetMetadata, scoreData } = body;

		// Check if sheet already exists
		const sheet = await env.DB.prepare('SELECT * FROM sheets_metadata WHERE id = ?')
			.bind(sheetMetadata.id || '')
			.first();

		if (sheet) {
			return createErrorResponse('Sheet already exists', 400);
		}

		let imageUrl = '';

		// Handle cover image if provided
		if (sheetMetadata.coverImage) {
			const idx = sheetMetadata.coverImage.indexOf('tmp/images/');
			if (idx === -1) {
				return createErrorResponse('Invalid image URL', 400);
			}

			const key = sheetMetadata.coverImage.slice(idx);
			const object = await env.R2.get(key);

			if (!object) {
				return createErrorResponse('Image not found', 404);
			}

			await env.R2.put(`images/${songId}.png`, object.body);
			imageUrl = `${env.R2_ENDPOINT}/images/${songId}.png`;
		}

		// Insert metadata into database
		await env.DB.prepare(
			'INSERT INTO sheets_metadata (id, title, uploaderId, createdAt, coverImage) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)',
		)
			.bind(songId, sheetMetadata.title, request.userId, imageUrl)
			.run();

		// Store sheet data in R2
		await env.R2.put(`sheets/${songId}.json`, JSON.stringify(scoreData), {
			httpMetadata: { contentType: 'application/json' },
		});

		// Handle artists (singers and composers)
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
				const result = await env.DB.prepare('INSERT INTO artists (name) VALUES (?) RETURNING id').bind(artist.name).first<{ id: number }>();

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

		return createSuccessResponse({ id: songId });
	} catch (error) {
		console.error('Upload Error:', error);
		return createErrorResponse('Upload failed', 500);
	}
}
