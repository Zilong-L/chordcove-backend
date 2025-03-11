import { jwtVerify } from "jose"; // 确保你使用 `jose` 解析 JWT

async function verifyJWT(request, env) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
  
    const token = authHeader.split("Bearer ")[1];
  
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(env.JWT_SECRET));
      return payload.userId; // ✅ 获取 `userId`
    } catch (err) {
      console.error("JWT Verification Failed:", err);
      return null;
    }
  }

export {verifyJWT};