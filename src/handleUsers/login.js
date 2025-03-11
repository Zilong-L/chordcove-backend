
import { compare, hash } from "bcryptjs";
import { SignJWT } from "jose";

const USER_TABLE = "users";

export async function login(request, env) {
    const { email, password } = await request.json();

    if (!email || !password) {
        return new Response(
            JSON.stringify({ error: "Email and password are required" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    // 查询数据库检查用户是否存在
    const { results } = await env.DB.prepare(
        `SELECT id, password FROM ${USER_TABLE} WHERE email = ?`
    ).bind(email).all();
    console.log(results)
    if (!results || results.length === 0) {
        return new Response(
            JSON.stringify({ error: "Invalid email or password" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
        );
    }

    const user = results[0];
    console.log(user)
    // 验证密码
    const correct = await compare(password, user.password);

    if (!correct) {
        return new Response(
            JSON.stringify({ error: "Invalid email or password" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
        );
    }

    // 生成 Access Token
    const accessToken = await generateAccessToken(user, env);

    // 生成 Refresh Token
    const rawRefreshToken = crypto.randomUUID(); // 真实的 Refresh Token（返回给客户端）
    const refreshTokenId = crypto.randomUUID();
    const hashedRefreshToken = await hash(rawRefreshToken, 10); // 存数据库的哈希版本
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // 存储 Refresh Token 哈希到数据库
    await env.DB.prepare(
        `INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`
    ).bind(refreshTokenId, user.id, hashedRefreshToken, expiresAt).run();

    // 只返回原始 Refresh Token 给客户端
    return new Response(
        JSON.stringify({ accessToken, refreshToken: rawRefreshToken }),
        { status: 200, headers: { "Content-Type": "application/json" } }
    );
}

// 生成 Access Token（15 分钟有效）
async function generateAccessToken(user, env) {
    return await new SignJWT({ userId: user.id })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("15m")
        .sign(new TextEncoder().encode(env.JWT_SECRET));
}
