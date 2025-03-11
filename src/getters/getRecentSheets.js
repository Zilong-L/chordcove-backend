
export async function getRecentSheets(request,env) {
    const result = await env.DB.prepare(
        `SELECT * FROM "sheets-metadata" ORDER BY created_at DESC LIMIT 10`
    ).all();
  
    return new Response(JSON.stringify(result.results));
}
