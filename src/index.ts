import { handleUpload } from "./sheetEditing/upload";
import { sendCode } from "./handleUsers/sendCode";
import { registerUser } from './handleUsers/registerDirect';
import { login } from "./handleUsers/login";
import { getRecentSheets } from "./getters/getRecentSheets";
import { getSheetMetadata } from "./getters/getSheetMetadata";
import { handleEdit } from "./sheetEditing/edit";
import { withCORS } from './middleWare/cors';
import { handleImageUpload } from "./sheetEditing/uploadImage";
import { withAuth } from "./middleWare/auth";

/**
 * Handle CORS preflight requests
 */
async function handleOptions(request: Request, allowedOrigins: string[]): Promise<Response> {
  const requestOrigin = request.headers.get("Origin");
  console.log(requestOrigin);
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigins.includes(requestOrigin || "") ? requestOrigin || "" : "null",
    "Access-Control-Allow-Methods": "POST,OPTIONS,GET,PUT",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  };
  return new Response(null, { status: 204, headers });
}

/**
 * Route requests to the appropriate handler
 */
function handleRoutes(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return handleOptions(request, env.ALLOWED_ORIGINS);
  }

  // Authentication routes
  if (url.pathname === '/api/send-verification-code' && request.method === "POST") {
    return sendCode(request, env);
  }
  if (url.pathname === '/api/register' && request.method === "POST") {
    return registerUser(request, env);
  }
  if (url.pathname === '/api/login' && request.method === "POST") {
    return login(request, env);
  }

  // Sheet management routes
  if (url.pathname === "/api/upload-image" && request.method === "POST") {
    return withAuth(request, env, handleImageUpload);
  }
  if (url.pathname === "/api/upload" && request.method === "POST") {
    return withAuth(request, env, handleUpload);
  }
  if (url.pathname === "/api/edit" && request.method === "PUT") {
    return withAuth(request, env, handleEdit);
  }

  // Public sheet retrieval routes
  if (url.pathname === "/api/recent-sheets") {
    return getRecentSheets(request, env);
  }
  
  if (url.pathname.startsWith("/api/get-sheet-metadata/") && request.method === "GET") {
    return getSheetMetadata(request, env);
  }

  return Promise.resolve(new Response("Not Found", { status: 404 }));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await handleRoutes(request, env);
    return withCORS(response, request, env.ALLOWED_ORIGINS);
  }
}; 