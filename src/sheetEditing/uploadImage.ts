import { Env } from '../types/worker-configuration';
import { createErrorResponse, createSuccessResponse } from '../utils/response';
export async function handleImageUpload(request: Request, env: Env) {
	if (request.method !== 'POST') {
		return new Response(JSON.stringify({ success: false, error: 'Method Not Allowed' }), { status: 405 });
	}
	try {
		// Rate limiting check (assuming it exists and works)
		// const success = env.RATE_LIMITER.limit({ key: 'some_key' }); // Use appropriate key
		// if (!success) {
		// 	return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded' }), { status: 429 });
		// }

		const requestFormData = await request.formData();
		const file = requestFormData.get('file') as File | null;
		const sha256 = requestFormData.get('sha256') as string | null;

		if (!file) {
			return new Response(JSON.stringify({ success: false, error: 'No image found' }), { status: 400 });
		}

		if (!sha256 || !/^[a-f0-9]{64}$/.test(sha256)) {
			return new Response(JSON.stringify({ success: false, error: 'Invalid SHA-256 hash' }), { status: 400 });
		}

		const extension = file.name.split('.').pop()?.toLowerCase();
		if (!extension || !['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) {
			return new Response(JSON.stringify({ success: false, error: 'Invalid image format' }), { status: 400 });
		}

		// 1. Read file buffer
		const fileBuffer = await file.arrayBuffer();

		// 2. Prepare data for external service
		const imageFormData = new FormData();
		imageFormData.append('image', new Blob([fileBuffer], { type: file.type }), file.name);
		// Add quality if you want to control it from here, otherwise uses default
		// imageFormData.append('quality', '80');
		console.log(env.IMAGE_API_TOKEN);
		// 3. Call external WebP conversion service
		const webpResponse = await fetch(`${env.IMAGE_ENDPOINT}/webp`, {
			method: 'POST',
			headers: {
				// Assuming the token is sent directly in the Authorization header
				// Adjust if the external service expects a different scheme (e.g., Bearer)
				Authorization: `Bearer ${env.IMAGE_API_TOKEN}`,
			},
			body: imageFormData,
		});

		if (!webpResponse.ok) {
			const errorText = await webpResponse.text();
			console.error('WebP Conversion Error:', webpResponse.status, errorText);
			return new Response(JSON.stringify({ success: false, error: `Image conversion failed: ${errorText}` }), {
				status: webpResponse.status,
			});
		}

		// 4. Get WebP image buffer
		const webpBuffer = await webpResponse.arrayBuffer();

		// 5. Use SHA-256 for the filename
		const imageID = `tmp/images/${sha256}.webp`;

		// 6. Upload minified image to R2
		await env.R2.put(imageID, webpBuffer, {
			httpMetadata: { contentType: 'image/webp' }, // Set content type to webp
		});

		// 7. Return R2 URL
		return createSuccessResponse({
			data: { coverImage: `${env.R2_ENDPOINT}/${imageID}` },
		});
	} catch (error) {
		console.error('Image Upload Error:', error);
		// Provide more specific error if possible
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return createErrorResponse(`Image upload failed: ${errorMessage}`, 500);
	}
}
