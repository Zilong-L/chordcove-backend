import { Env } from '../types/worker-configuration';
export async function handleImageUpload(request: Request, env: Env) {
	if (request.method !== 'POST') {
		return new Response(JSON.stringify({ success: false, error: 'Method Not Allowed' }), { status: 405 });
	}
	try {
		const success = env.RATE_LIMITER.limit({ key: '1' });
		if (!success) {
			return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded' }), { status: 429 });
		}
		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		if (!file) {
			return new Response(JSON.stringify({ success: false, error: 'No image found' }), { status: 400 });
		}
		const extension = file.name.split('.').pop();
		if (!extension || !['png', 'jpg', 'jpeg', 'gif'].includes(extension)) {
			return new Response(JSON.stringify({ success: false, error: 'Invalid image format' }), { status: 400 });
		}

		const imageUUID = await crypto.randomUUID();
		const imageID = `tmp/images/${imageUUID}.${extension}`;
		await env.R2.put(imageID, file.stream(), {
			httpMetadata: { contentType: file.type || 'application/octet-stream' },
		});

		return new Response(JSON.stringify({ 
			success: true, 
			data: { coverImage: env.R2_ENDPOINT + '/' + imageID }
		}), { status: 200 });
	} catch (error) {
		console.error('Image Upload Error:', error);
		return new Response(JSON.stringify({ success: false, error: 'Image upload failed' }), { status: 500 });
	}
}
