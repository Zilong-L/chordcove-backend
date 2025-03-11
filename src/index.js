import { handleUpload } from "./sheetEditing/upload.js";
import { sendCode } from "./handleUsers/sendCode.js";
import {registerUser} from './handleUsers/registerDirect.js'
import { login } from "./handleUsers/login.js";
import { getRecentSheets } from "./getters/getRecentSheets.js";
import { getSheetMetadata } from "./getters/getSheetMetadata.js";
import { handleEdit } from "./sheetEditing/edit.js";
import {withCORS} from './middleWare/cors.js'

// 🎵 处理 CORS 预检请求
async function handleOptions(request,allowedOrigins) {
  const requestOrigin = request.headers.get("Origin");

  const headers = {
    "Access-Control-Allow-Origin": allowedOrigins.includes(requestOrigin) ? requestOrigin : "null",
    "Access-Control-Allow-Methods": "POST,OPTIONS,GET,PUT",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  return new Response(null, { status: 204, headers });
}
function handleRoutes(request, env) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return handleOptions(request,env.ALLOWED_ORIGINS);
  }


  // 登录相关
  if (url.pathname === '/api/send-verification-code'&& request.method === "POST"){
    return sendCode(request,env);
  }
  if (url.pathname === '/api/register'&& request.method === "POST"){
    return registerUser(request,env);
  }
  if (url.pathname === '/api/login'&& request.method === "POST"){
    return login(request,env);
  }

  // 📌 2. 处理谱子上传（D1 + R2）
  if (url.pathname === "/api/upload" && request.method === "POST") {
    return handleUpload(request,env)
  }
  if (url.pathname === "/api/edit" && request.method === "PUT") {
    return handleEdit(request,env)
  }

  // // 📌 3. 获取最近上传的谱子（D1 查询
  if (url.pathname === "/api/recent-sheets") {
    return getRecentSheets(request,env)
  }
  
  if (url.pathname.startsWith("/api/get-sheet-metadata/") && request.method === "GET") {
    return getSheetMetadata(request,env)
  }

 

  return new Response("Not Found", { status: 404 });
}

export default {
  async fetch(request, env) {

    const response = await handleRoutes(request, env);
    return withCORS(response,request,env.ALLOWED_ORIGINS);
  }
};


  