import { Env } from '../types/worker-configuration';
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
		if (!file) {
			return new Response(JSON.stringify({ success: false, error: 'No image found' }), { status: 400 });
		}
		const extension = file.name.split('.').pop()?.toLowerCase(); // No longer needed as we convert to webp
		// Keep original validation if needed, but the target is now webp
		if (!extension || !['png', 'jpg', 'jpeg', 'gif'].includes(extension)) {
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
		// 3. Call external WebP conversion serviWce
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

		// 5. Generate UUID and R2 key with .webp extension
		const imageUUID = crypto.randomUUID();
		const imageID = `tmp/images/${imageUUID}.webp`; // Use .webp extension

		// 6. Upload minified image to R2
		await env.R2.put(imageID, webpBuffer, {
			httpMetadata: { contentType: 'image/webp' }, // Set content type to webp
		});

		// 7. Return R2 URL
		return new Response(
			JSON.stringify({
				success: true,
				// Construct URL using the R2 endpoint and the new image ID
				data: { coverImage: `${env.R2_ENDPOINT}/${imageID}` },
			}),
			{ status: 200 },
		);
	} catch (error) {
		console.error('Image Upload Error:', error);
		// Provide more specific error if possible
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return new Response(JSON.stringify({ success: false, error: `Image upload failed: ${errorMessage}` }), { status: 500 });
	}
}
