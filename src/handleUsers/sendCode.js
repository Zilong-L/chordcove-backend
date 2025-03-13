const VERIFICATION_TTL = 600; // 验证码 10 分钟有效
import {stableHash} from './utils.js';
async function sendCode(request, env) {
    const { email } = await request.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400 });
    }

    // **Rate Limiting：限制 30 秒内只能请求一次**
    const { success } = await env.RATE_LIMITER.limit({ key: email });
    if (!success) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait 60s." }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedEmail = await stableHash(email);


    await env.KV.put(hashedEmail, verificationCode, { expirationTtl: VERIFICATION_TTL });
    
    
    // **发送邮件**
    const response = await fetch(env.MAIL_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.MAIL_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        subject: "您的 Barnman 验证码",
        body: `<h2>您的验证码</h2><p><strong>${verificationCode}</strong></p><p>10 分钟内有效。</p>`,
      }),
    });
    
    return new Response(await response.text(), {
      headers: { "Content-Type": "application/json" },
    });
  }

export {sendCode};

