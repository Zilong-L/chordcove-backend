
import {hash} from 'bcryptjs'
import { stableHash } from './utils';

const USER_TABLE = 'users'

  // 注册用户函数
  async function registerUser(request, env) {
    const { email, password } = await request.json();

    if (!email || !password ) {
      return new Response(
        JSON.stringify({ error: "Email, password and verification code are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    

    
    // 检查邮箱是否已注册
    let { results } = await env['.DB'].prepare(
      `SELECT id FROM ${USER_TABLE}`
    ).all()
    console.log(results)
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