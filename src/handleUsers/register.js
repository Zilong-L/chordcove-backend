
import {hash} from 'bcryptjs'
import { stableHash } from './utils';

const USER_TABLE = 'users'

  // 注册用户函数
  async function registerUser(request, env) {
    const { email, password, code } = await request.json();

    if (!email || !password || !code) {
      return new Response(
        JSON.stringify({ error: "Email, password and verification code are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const hashedEmail = await stableHash(email);
    // 从 KV 中获取存储的验证码
    const storedCode = await env.KV.get(hashedEmail);
    if (!storedCode) {
      return new Response(
        JSON.stringify({ error: "Verification code expired or not found" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    if (storedCode !== code) {
      return new Response(
        JSON.stringify({ error: "Verification code does not match" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // 验证码正确，删除 KV 中的验证码以防重用
    await env.KV.delete(hashedEmail);
    
    // 检查邮箱是否已注册
    const { results } = await env['.DB'].prepare(
      `SELECT id FROM ${USER_TABLE} WHERE email = ?`
    ).bind(email).all();
    
    if (results && results.length > 0) {
      return new Response(
        JSON.stringify({ error: "Email already registered" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }
    

    const hashedPassword = await hash(password,10);
    
    // 插入新用户到 D1 数据库中
    await env['.DB'].prepare(
      `INSERT INTO ${USER_TABLE} (email, password) VALUES (?, ?)`
    ).bind(email, hashedPassword).run();
    
    return new Response(
      JSON.stringify({ message: "User registered successfully" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
  
  // 密码哈希函数（使用 SHA-256）

  
export {registerUser}