async function handleUpload(request, env) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  try {
    const body = await request.json();
    const songId = crypto.randomUUID();
    const sheetMetadata = body.sheetMetadata;
    const scoreData = body.scoreData;

    
    // 🎵 存到 D1
    await env.DB.prepare(
      "INSERT INTO 'sheets-metadata' (id, title, composer, singer, uploader, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
    ).bind(songId, sheetMetadata.title, sheetMetadata.composer, sheetMetadata.singer, sheetMetadata.uploader).run();

    // 🎵 存到 R2
    await env.R2.put(`sheets/${songId}.json`, JSON.stringify(scoreData), {
      httpMetadata: { contentType: "application/json" },
    });


    return new Response(JSON.stringify({ id: songId }), { status: 200 });
  } catch (error) {
    console.error("Upload Error:", error);

    return new Response(JSON.stringify({ error: "上传失败" }), {
      status: 500});
  }
}



export { handleUpload};
