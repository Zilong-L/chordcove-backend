
export async function getSheetMetadata(request,env) {
    const id = request.url.split("/").pop();
    const { results } = await env.DB.prepare("SELECT * FROM 'sheets-metadata' WHERE id = ?")
      .bind(id)
      .all();
  
    return new Response(JSON.stringify(results[0]));
}
