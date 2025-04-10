import { createErrorResponse, parseRequestBody } from '../utils/response';
import { handleUpload } from './upload';
import { handleEdit } from './edit';

// Define our request structure
interface SaveSheetRequest {
	id?: string;
	title: string;
	singers?: Array<{ name: string }>;
	composers?: Array<{ name: string }>;
	coverImage?: string;
	bvid?: string;
	key: string;
	tempo: number;
	timeSignature: string;
	content: string;
}

export async function handleSave(request: Request, env: Env): Promise<Response> {
	if (request.method !== 'PUT') {
		return createErrorResponse('Method Not Allowed', 405);
	}

	if (!request.userId) {
		return createErrorResponse('Unauthorized', 401);
	}

	try {
		const body = await parseRequestBody<SaveSheetRequest>(request);

		if (!body || !body.title || body.content === undefined) {
			return createErrorResponse('Invalid request body', 400);
		}

		// Transform the request to match the expected format for upload/edit
		const transformedRequest = {
			sheetMetadata: {
				id: body.id,
				title: body.title,
				coverImage: body.coverImage,
				singers: body.singers,
				composers: body.composers,
				bvid: body.bvid,
			},
			scoreData: {
				key: body.key,
				tempo: body.tempo,
				timeSignature: body.timeSignature,
				content: body.content,
			},
		};

		// Create a new request object with the transformed body
		const newRequest = new Request(request.url, {
			method: body.id ? 'PUT' : 'POST',
			headers: request.headers,
			body: JSON.stringify(transformedRequest),
		});

		// Copy over the userId
		Object.defineProperty(newRequest, 'userId', {
			value: request.userId,
			writable: false,
		});

		// Delegate to the appropriate handler
		return body.id ? handleEdit(newRequest, env) : handleUpload(newRequest, env);
	} catch (error: any) {
		console.error('Save Sheet Error:', error);
		return createErrorResponse(`Save failed: ${error.message || 'Internal Error'}`, 500);
	}
}
