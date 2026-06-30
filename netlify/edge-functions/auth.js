// netlify/edge-functions/auth.js
// Cancela de password partilhada, validada no servidor (edge).
// A password vive na variável de ambiente PROTECTED_PAGE_PASSWORD do Netlify,
// nunca no código nem no HTML. Sessão por cookie HttpOnly.

const COOKIE = "cp_auth";
const SESSION_HOURS = 12;

function getEnv(name) {
  try { if (globalThis.Netlify?.env?.get) return globalThis.Netlify.env.get(name); } catch (_) {}
  try { return Deno.env.get(name); } catch (_) { return undefined; }
}

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function page(body) {
  return `<!doctype html><html lang="pt"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contactos · Casa da Portela</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--accent:#005395;--ink:#1A2026;--muted:#5B6470;--line:#E5E8EC;--soft:#E5EFF7}
*{box-sizing:border-box}html,body{height:100%}
body{margin:0;background:#fff;color:var(--ink);font-family:"Inter",system-ui,sans-serif;
  display:grid;place-items:center;padding:24px}
.card{width:100%;max-width:380px;border:1px solid var(--line);border-radius:18px;
  box-shadow:0 1px 2px rgba(16,24,40,.04),0 14px 34px -20px rgba(16,24,40,.3);padding:34px 30px}
.logo{font-family:"Space Grotesk",sans-serif;font-weight:700;font-size:20px;color:var(--accent);letter-spacing:-.01em}
.sub{color:var(--muted);font-size:13px;margin:4px 0 24px}
label{font-size:13px;color:var(--muted);font-weight:500}
input{width:100%;margin-top:7px;font:inherit;font-size:16px;padding:12px 14px;border:1px solid var(--line);
  border-radius:11px;outline:none;transition:border-color .15s,box-shadow .15s}
input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--soft)}
button{width:100%;margin-top:16px;font:inherit;font-weight:600;font-size:15px;color:#fff;background:var(--accent);
  border:none;border-radius:11px;padding:13px;cursor:pointer;transition:background .15s}
button:hover{background:#013E70}
.err{margin-top:14px;color:#9A3B4F;font-size:13px;text-align:center}
</style></head><body><div class="card">
<div class="logo">Casa da Portela</div>
<div class="sub">Diretório de contactos · acesso interno</div>
${body}
</div></body></html>`;
}

function loginForm(error) {
  return page(`<form method="POST" action="/">
    <label for="p">Palavra-passe</label>
    <input id="p" name="password" type="password" autofocus autocomplete="current-password" required>
    <button type="submit">Entrar</button>
    ${error ? '<div class="err">Palavra-passe incorreta.</div>' : ""}
  </form>`);
}

export default async (request, context) => {
  const password = getEnv("PROTECTED_PAGE_PASSWORD");
  const url = new URL(request.url);
  const htmlHeaders = { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" };

  // Nunca falha "aberto": se não houver password configurada, bloqueia.
  if (!password) {
    return new Response(
      page('<div class="sub">Esta página ainda não está configurada. Falta definir a variável <b>PROTECTED_PAGE_PASSWORD</b> no Netlify.</div>'),
      { status: 503, headers: htmlHeaders }
    );
  }

  const token = await sha256(password + "::casadaportela");
  const cookieFlags = `Path=/; Max-Age=${SESSION_HOURS * 3600}; HttpOnly; Secure; SameSite=Strict`;

  // Logout
  if (url.pathname === "/logout") {
    return new Response(null, { status: 302, headers: {
      "location": "/", "set-cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,
    }});
  }

  // Submissão da password
  if (request.method === "POST") {
    const form = await request.formData();
    const tentativa = (form.get("password") || "").toString();
    const ok = (await sha256(tentativa)) === (await sha256(password));
    if (ok) {
      return new Response(null, { status: 302, headers: {
        "location": "/", "set-cookie": `${COOKIE}=${token}; ${cookieFlags}`,
      }});
    }
    return new Response(loginForm(true), { status: 401, headers: htmlHeaders });
  }

  // Já autenticado? -> serve a página real
  const cookies = (request.headers.get("cookie") || "").split(/;\s*/);
  if (cookies.includes(`${COOKIE}=${token}`)) {
    return context.next();
  }

  // Caso contrário, mostra o formulário
  return new Response(loginForm(false), { status: 401, headers: htmlHeaders });
};
