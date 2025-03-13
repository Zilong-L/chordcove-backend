async function handleUpload(request, env) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  try {
    const body = await request.json();
    const songId = crypto.randomUUID();
    const sheetMetadata = body.sheetMetadata;
    const scoreData = body.scoreData;

    const sheet = await env.DB.prepare("SELECT * FROM sheets_metadata WHERE id = ?")
      .bind(sheetMetadata.id)
      .first();
    if(sheet){
      return new Response(JSON.stringify({ error: "Sheet already exists" }), { status: 400 });
    }
    
    if(sheetMetadata.coverImage){
      const idx = sheetMetadata.coverImage.indexOf("tmp/images/");
      if(idx === -1){
        return new Response(JSON.stringify({ error: "Invalid image URL" }), { status: 400 });
      }
      const key = sheetMetadata.coverImage.slice(idx);
      const object = await env.R2.get(key);
      
      if(!object){
        return new Response(JSON.stringify({ error: "Image not found" }), { status: 404 });
      }
      await env.R2.put(`images/${songId}.png`, object.body);
    }
    // 🎵 存到 D1
    console.log(request.userId)
    const imageUrl = env.R2_ENDPOINT + `/images/${songId}.png`;
    await env.DB.prepare(
      "INSERT INTO sheets_metadata (id, title, composer, singer, uploaderId,  createdAt,coverImage) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)"
    ).bind(songId, sheetMetadata.title, sheetMetadata.composer, sheetMetadata.singer, request.userId,imageUrl).run();

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
