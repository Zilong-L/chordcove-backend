async function handleEdit(request, env) {

  try {
    const body = await request.json();
    const sheetMetadata = body.sheetMetadata;
    const scoreData = body.scoreData;
    console.log('newScoreData', scoreData);
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
    const sheet = await env.DB.prepare("SELECT * FROM 'sheets-metadata' WHERE id = ?")
      .bind(songId)
      .first();

    if (!sheet) {
      return new Response(JSON.stringify({ error: "Sheet not found" }), { status: 404 });
    }
    // 2. 确保用户是 uploader，否则拒绝修改

    if (sheet.uploader !== sheetMetadata.uploader) {
      return new Response(JSON.stringify({ error: "Permission denied" }), { status: 403 });
    }

    await env.R2.put(`sheets/${songId}.json`, JSON.stringify(scoreData), {
      httpMetadata: { contentType: "application/json" }
    });



    return new Response(JSON.stringify({ id: songId.id }), { status: 200 });
  } catch (error) {
    console.error("Upload Error:", error);

    return new Response(JSON.stringify({ error: "上传失败" }), {
      status: 500,
    });
  }
}



export { handleEdit };
