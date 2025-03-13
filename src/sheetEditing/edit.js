async function handleEdit(request, env) {

  try {
    const body = await request.json();
    const sheetMetadata = body.sheetMetadata;
    const scoreData = body.scoreData;

    const songId = sheetMetadata.id;
    if (!songId) {
      return new Response(JSON.stringify({ error: "id can't be empty" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "null",
        },
      });
    }
    // 🎵 存到 D1
    const sheet = await env.DB.prepare("SELECT * FROM sheets_metadata WHERE id = ?")
      .bind(songId)
      .first();

    if (!sheet) {
      return new Response(JSON.stringify({ error: "Sheet not found" }), { status: 404 });
    }
    // 2. 确保用户是 uploader，否则拒绝修改
    console.log(typeof sheet.uploader, typeof request.userId)
    console.log(sheet.uploader, request.userId, sheet.uploader !== request.userId)
    if (sheet.uploaderId !== request.userId) {
      return new Response(JSON.stringify({ error: "Permission denied" }), { status: 403 });
    }
    console.log(sheet.uploaderId, request.userId)



    await env.R2.put(`sheets/${songId}.json`, JSON.stringify(scoreData), {
      httpMetadata: { contentType: "application/json" }
    });
    let uploadImageError = false;
    if (sheetMetadata.coverImage && sheetMetadata.coverImage !== sheet.coverImage) {
      try{
      const url = sheetMetadata.coverImage;
      const index = url.indexOf("tmp/images/");
      if (index === -1) {
        throw new Error("Invalid image URL");
      }
      const key = sheetMetadata.coverImage.slice(index);
      const object = await env.R2.get(key);
      if (!object) {
        throw new Error("Image not found in R2");
      }

      await env.R2.put(key, object.body);
      
      const newURL = env.R2_ENDPOINT+ '/'+key
      await env.DB.prepare("UPDATE sheets_metadata SET coverImage = ? WHERE id = ?")
        .bind(newURL, songId)
        .run();
      }catch(e){
        uploadImageError = true;
      }
    } 

    await env.DB.prepare(
      "UPDATE sheets_metadata SET title = ?, composer = ?, singer = ? WHERE id = ?"
    ).bind(sheetMetadata.title, sheetMetadata.composer, sheetMetadata.singer, songId).run();

    return new Response(JSON.stringify({ id: songId }), { status: 200 });
  } catch (error) {
    console.error("Upload Error:", error);

    return new Response(JSON.stringify({ error: "上传失败" }), {
      status: 500,
    });
  }
}


export { handleEdit };
