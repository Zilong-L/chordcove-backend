
export function withCORS(response, request,allowedOrigins) {
    const requestOrigin = request.headers.get("Origin");
    const headers = new Headers(response.headers); // 复制原有 headers
  
    headers.set("Access-Control-Allow-Origin", allowedOrigins.includes(requestOrigin) ? requestOrigin : "null");
  
    return new Response(response.body, {
      status: response.status,
      headers: headers,
    });
  }
  