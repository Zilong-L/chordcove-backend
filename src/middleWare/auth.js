import { verifyJWT } from "../auth/verifyJWT.js";

export async function withAuth(request, env, handler) {
  const userId = await verifyJWT(request, env);
  console.log(userId)
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Add userId to the request for use in the handler
  request.userId = userId;
  return handler(request, env);
} 