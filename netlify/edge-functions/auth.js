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
:root{--accent:#005395;--ink:#1A2026;--muted:#5B6470;--faint:#98A0AB;--line:#E5E8EC;--soft:#E5EFF7}
*{box-sizing:border-box}html,body{height:100%}
body{margin:0;background:#fff;color:var(--ink);font-family:"Inter",system-ui,sans-serif;display:grid;place-items:center;padding:24px}
.card{width:100%;max-width:380px;border:1px solid var(--line);border-radius:18px;
  box-shadow:0 1px 2px rgba(16,24,40,.04),0 14px 34px -20px rgba(16,24,40,.3);padding:34px 30px}
.logo{margin-bottom:6px}
.logo-svg{height:30px;width:auto;display:block}
.sub{color:var(--muted);font-size:13px;margin:0 0 24px}
label{font-size:13px;color:var(--muted);font-weight:500}
.field{position:relative;margin-top:7px}
.field input{width:100%;font:inherit;font-size:16px;padding:12px 46px 12px 14px;border:1px solid var(--line);
  border-radius:11px;outline:none;transition:border-color .15s,box-shadow .15s}
.field input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--soft)}
.eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);border:none;background:transparent;cursor:pointer;
  color:var(--faint);width:34px;height:34px;display:grid;place-items:center;border-radius:8px;padding:0}
.eye:hover{color:var(--accent);background:var(--soft)}
.eye svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.submit{width:100%;margin-top:16px;font:inherit;font-weight:600;font-size:15px;color:#fff;background:var(--accent);
  border:none;border-radius:11px;padding:13px;cursor:pointer;transition:background .15s}
.submit:hover{background:#013E70}
.err{margin-top:14px;color:#9A3B4F;font-size:13px;text-align:center}
</style></head><body><div class="card">
<div class="logo"><svg class="logo-svg" id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 231.62 85.89">
  <defs>
    <style>
      .cls-1 {
        fill: #98989a;
      }

      .cls-2 {
        fill: #212721;
      }

      .cls-3 {
        fill: #005395;
      }
    </style>
  </defs>
  <g>
    <path class="cls-2" d="M113.44,22.75c-1.04-.66-2.99-1.29-5.04-1.29-4.07,0-7.89,2.68-7.89,7.54s3.75,7.57,8.03,7.57c2.19,0,3.89-.42,5.14-1.11l-.38,3.86c-1.29.66-2.88.94-5.39.94-5.63,0-11.81-3.86-11.81-11.33s6.25-11.36,11.81-11.36c2.85,0,5,.63,6.32,1.39l-.8,3.79Z"/>
    <path class="cls-2" d="M132.76,40.02l-2.12-5.35h-7.85l-2.12,5.35h-4.17l9.07-22.41h2.47l9.1,22.41h-4.38ZM127.55,26.47c-.28-.66-.59-1.56-.8-2.4h-.07c-.21.83-.52,1.74-.8,2.4l-1.84,4.76h5.35l-1.84-4.76Z"/>
    <path class="cls-2" d="M146.03,40.27c-2.43,0-4.69-.7-5.94-1.49l-.45-4.27c1.7,1.25,4.03,2.08,6.29,2.08s3.58-1.08,3.58-2.74-.97-2.57-3.3-3.27c-4.14-1.22-6.15-3.41-6.15-6.71s2.5-6.29,7.23-6.29c2.33,0,4.31.7,5.14,1.25l-.8,3.58c-.87-.52-2.57-1.22-4.24-1.22-2.02,0-3.13,1.11-3.13,2.43s1.04,2.12,3.06,2.74c4,1.25,6.57,3.23,6.57,7.16s-2.71,6.74-7.85,6.74Z"/>
    <path class="cls-2" d="M171.99,40.02l-2.12-5.35h-7.85l-2.12,5.35h-4.17l9.07-22.41h2.47l9.1,22.41h-4.38ZM166.78,26.47c-.28-.66-.59-1.56-.8-2.4h-.07c-.21.83-.52,1.74-.8,2.4l-1.84,4.76h5.35l-1.84-4.76Z"/>
    <path class="cls-2" d="M191.35,40.02h-6.44v-19.95h6.44c5.63,0,10.72,3.66,10.72,9.97s-5.07,9.97-10.72,9.97ZM190.85,23.36h-2.06v13.44h2.06c3.97,0,7.25-2.19,7.25-6.72s-3.28-6.72-7.25-6.72Z"/>
    <path class="cls-2" d="M217.3,40.02l-1.91-4.82h-7.07l-1.91,4.82h-3.75l8.16-20.17h2.22l8.19,20.17h-3.94ZM212.61,27.83c-.25-.59-.53-1.41-.72-2.16h-.06c-.19.75-.47,1.56-.72,2.16l-1.66,4.28h4.82l-1.66-4.28Z"/>
    <path class="cls-2" d="M104.39,58.16h-3.39v9h-4.18v-21.66h7.57c3.36,0,6.76,2.24,6.76,6.31s-3.36,6.35-6.76,6.35ZM103.71,49.06h-2.72v5.7h2.72c1.66,0,3.22-.88,3.22-2.85s-1.56-2.85-3.22-2.85Z"/>
    <path class="cls-2" d="M125.64,67.63c-5.87,0-11.58-4.31-11.58-11.34s5.67-11.27,11.58-11.27,11.54,4.31,11.54,11.27-5.67,11.34-11.54,11.34ZM125.64,48.82c-3.63,0-7.23,2.85-7.23,7.54s3.6,7.57,7.23,7.57,7.23-2.85,7.23-7.57-3.67-7.54-7.23-7.54Z"/>
    <path class="cls-2" d="M153.88,67.15l-6.31-9h-1.93v9h-4.18v-21.66h7.23c3.36,0,6.76,2.24,6.76,6.31,0,2.72-1.6,4.65-3.56,5.5l7.13,9.84h-5.13ZM148.01,49.06h-2.38v5.7h2.38c1.63,0,3.22-.88,3.22-2.85s-1.6-2.85-3.22-2.85Z"/>
    <path class="cls-2" d="M169.45,49.06v18.09h-4.28v-18.09h-6.59v-3.56h17.45v3.56h-6.59Z"/>
    <path class="cls-2" d="M179.11,67.15v-21.66h12.05v3.56h-7.81v5.43h6.48v3.6h-6.48v5.5h8.93v3.56h-13.17Z"/>
    <path class="cls-2" d="M195.94,67.15v-21.66h4.28v18.09h8.86v3.56h-13.14Z"/>
    <path class="cls-2" d="M227.34,67.15l-2.07-5.23h-7.67l-2.07,5.23h-4.07l8.86-21.89h2.41l8.89,21.89h-4.28ZM222.25,53.92c-.27-.64-.58-1.53-.78-2.34h-.07c-.2.81-.51,1.7-.78,2.34l-1.8,4.65h5.23l-1.8-4.65Z"/>
    <path class="cls-1" d="M96.14,83.88v-10.67h1.37v10.67h-1.37Z"/>
    <path class="cls-1" d="M112.92,83.88l-.43-5.17c-.07-.82-.15-1.76-.18-2.61h-.03c-.35.82-.87,1.89-1.25,2.66l-2.58,5.2h-.52l-2.59-5.2c-.38-.75-.87-1.77-1.25-2.63h-.03c-.03.85-.1,1.86-.17,2.58l-.42,5.17h-1.24l.89-10.67h.87l2.89,5.72c.44.87.97,1.97,1.35,2.88h.03c.37-.9.87-1.92,1.34-2.88l2.86-5.72h.87l.92,10.67h-1.32Z"/>
    <path class="cls-1" d="M123.95,84.08c-2.89,0-5.62-2.16-5.62-5.55s2.73-5.52,5.62-5.52,5.62,2.16,5.62,5.52-2.73,5.55-5.62,5.55ZM123.95,74.23c-2.16,0-4.23,1.64-4.23,4.33s2.07,4.33,4.23,4.33,4.23-1.64,4.23-4.33-2.11-4.33-4.23-4.33Z"/>
    <path class="cls-1" d="M137.35,83.88h-3.35v-10.67h2.81c1.46,0,2.93.95,2.93,2.73,0,.82-.42,1.64-1.09,1.92,1.1.27,2.12,1.4,2.12,2.81,0,2.11-1.74,3.21-3.43,3.21ZM136.59,74.34h-1.29v3.13h1.3c.95,0,1.76-.5,1.76-1.54s-.8-1.59-1.77-1.59ZM137.05,78.59h-1.74v4.15h1.77c1.22,0,2.32-.7,2.32-2.07s-1.12-2.07-2.36-2.07Z"/>
    <path class="cls-1" d="M145.37,83.88v-10.67h1.37v10.67h-1.37Z"/>
    <path class="cls-1" d="M151.78,83.88v-10.67h1.37v9.48h4.83v1.19h-6.21Z"/>
    <path class="cls-1" d="M162,83.88v-10.67h1.37v10.67h-1.37Z"/>
    <path class="cls-1" d="M170.37,80.33l-1.17,3.55h-1.51l3.85-11.27h1.74l3.85,11.27h-1.56l-1.2-3.55h-4ZM174.09,79.19l-1.12-3.24c-.25-.74-.42-1.4-.59-2.06h-.03c-.17.65-.33,1.35-.57,2.04l-1.1,3.26h3.41ZM174.87,70.04l-2.14,1.96h-1.19l1.56-1.96h1.77Z"/>
    <path class="cls-1" d="M181.41,72.75c.74-.13,1.81-.23,2.79-.23,1.56,0,2.58.3,3.26.92.55.5.89,1.27.89,2.16,0,1.47-.94,2.46-2.11,2.86v.05c.85.3,1.37,1.1,1.64,2.27.37,1.57.64,2.66.87,3.09h-1.51c-.18-.33-.44-1.29-.74-2.69-.33-1.56-.95-2.14-2.27-2.19h-1.37v4.88h-1.46v-11.12ZM182.87,77.89h1.49c1.56,0,2.54-.85,2.54-2.14,0-1.45-1.05-2.09-2.59-2.09-.7,0-1.19.05-1.44.12v4.11Z"/>
    <path class="cls-1" d="M194.49,72.6v11.27h-1.47v-11.27h1.47Z"/>
    <path class="cls-1" d="M201.48,80.33l-1.17,3.55h-1.51l3.85-11.27h1.74l3.85,11.27h-1.56l-1.2-3.55h-4ZM205.19,79.19l-1.12-3.24c-.25-.74-.42-1.4-.59-2.06h-.03c-.17.65-.33,1.35-.57,2.04l-1.1,3.26h3.41Z"/>
  </g>
  <g>
    <path class="cls-3" d="M82.43,45.88h-14.59s0,0,0,0h-3.17c-1.06,2.03-3.18,3.41-5.62,3.41-5.56,0-10.08,4.52-10.08,10.08,0,3.5-2.85,6.35-6.35,6.35s-6.32-2.83-6.34-6.31c0-5.5-4.43-10.02-9.89-10.13-3.43-.07-6.22-2.91-6.22-6.34h0c0-3.43,2.79-6.27,6.22-6.34,5.45-.11,9.89-4.63,9.89-10.13.02-3.48,2.87-6.31,6.34-6.31s6.35,2.85,6.35,6.35c0,5.56,4.52,10.08,10.08,10.08,2.44,0,4.56,1.39,5.62,3.41h3.17s0,0,0,0h14.59s2.95,0,2.95,0c-1.11-10.15-7.9-18.76-17.69-22.14C63.99,7.15,54.01,0,42.61,0s-21.51,7.38-25.12,18.03C7,21.87,0,31.78,0,42.94h0c0,11.16,7,21.08,17.49,24.91,3.61,10.65,13.83,18.03,25.12,18.03s21.38-7.15,25.07-17.87c9.79-3.37,16.58-11.99,17.69-22.14h-2.95ZM66.09,65.46l-.73.23-.23.73c-3.1,9.89-12.15,16.54-22.51,16.54s-19.54-6.86-22.55-16.67l-.22-.72-.71-.24c-9.69-3.24-16.2-12.23-16.2-22.38h0c0-10.15,6.51-19.14,16.2-22.38l.71-.24.22-.72c3.01-9.82,12.29-16.67,22.55-16.67s19.41,6.65,22.51,16.54l.23.73.73.23c7.97,2.5,13.8,8.86,15.78,16.65h-15.66c-1.7-2.08-4.28-3.41-7.17-3.41-3.94,0-7.15-3.21-7.15-7.15,0-5.11-4.16-9.28-9.28-9.28s-9.25,4.14-9.27,9.28c0,3.87-3.15,7.08-7.01,7.15-5.01.1-9.09,4.26-9.09,9.27h0c0,5.01,4.08,9.17,9.09,9.27,3.87.08,7.01,3.28,7.01,7.15.03,5.15,4.19,9.28,9.27,9.28s9.28-4.16,9.28-9.28c0-3.95,3.21-7.15,7.15-7.15,2.89,0,5.47-1.33,7.17-3.41h15.66c-1.98,7.79-7.82,14.15-15.78,16.65Z"/>
    <path class="cls-3" d="M57.61,57.91s-.03.01-.03.03v1.43c0,8.43-7.01,15.26-15.51,14.95-8.11-.29-14.42-7.23-14.42-15.35v-1.01s-.01-.03-.03-.03l-1.41-.04c-8.09-.16-14.66-6.87-14.66-14.96h0c0-8.09,6.58-14.8,14.66-14.96l1.41-.04s.03-.01.03-.03v-1.01c0-8.12,6.3-15.06,14.42-15.35,8.5-.31,15.51,6.52,15.51,14.96v1.43s.01.03.03.03h1.04c5.01,0,9.58,2.4,12.4,6.17h3.54c-2.85-5.03-8.05-8.56-14.12-9.04-.01,0-.03-.01-.03-.03-.73-9.2-8.45-16.46-17.84-16.46s-17.12,7.28-17.84,16.5c0,.01-.01.03-.03.03-9.01.9-16.13,8.6-16.13,17.8h0c0,9.2,7.12,16.91,16.13,17.8.01,0,.03.01.03.03.72,9.22,8.45,16.5,17.84,16.5s17.1-7.26,17.84-16.46c0-.01.01-.03.03-.03,6.06-.48,11.27-4.01,14.12-9.04h-3.54c-2.82,3.76-7.39,6.17-12.4,6.17h-1.04Z"/>
  </g>
</svg></div>
<div class="sub">Diretório de contactos · acesso interno</div>
${body}
</div></body></html>`;
}

function loginForm(error) {
  return page(`<form method="POST" action="/">
    <label for="p">Palavra-passe</label>
    <div class="field">
      <input id="p" name="password" type="password" autofocus autocomplete="current-password" required>
      <button type="button" id="eye" class="eye" aria-label="Mostrar palavra-passe">
        <svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
    </div>
    <button type="submit" class="submit">Entrar</button>
    ${error ? '<div class="err">Palavra-passe incorreta.</div>' : ""}
  </form>
  <script>
  (function(){
    var i=document.getElementById('p'),e=document.getElementById('eye');
    if(!i||!e)return;
    var OPEN='<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
    var OFF='<svg viewBox="0 0 24 24"><path d="M9.9 5.1A9.6 9.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.8M6.1 6.1A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 3.9-.8"/><path d="M3 3l18 18"/><path d="M9.5 9.5a3 3 0 0 0 4.2 4.2"/></svg>';
    e.addEventListener('click',function(){
      var show=i.getAttribute('type')==='password';
      i.setAttribute('type',show?'text':'password');
      e.innerHTML=show?OFF:OPEN;
      e.setAttribute('aria-label',show?'Ocultar palavra-passe':'Mostrar palavra-passe');
      i.focus();
    });
  })();
  </script>`);
}

export default async (request, context) => {
  const password = getEnv("PROTECTED_PAGE_PASSWORD");
  const url = new URL(request.url);
  const htmlHeaders = { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" };

  if (!password) {
    return new Response(
      page('<div class="sub">Esta página ainda não está configurada. Falta definir a variável <b>PROTECTED_PAGE_PASSWORD</b> no Netlify.</div>'),
      { status: 503, headers: htmlHeaders }
    );
  }

  const token = await sha256(password + "::casadaportela");
  const cookieFlags = `Path=/; Max-Age=${SESSION_HOURS * 3600}; HttpOnly; Secure; SameSite=Strict`;

  if (url.pathname === "/logout") {
    return new Response(null, { status: 302, headers: {
      "location": "/", "set-cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,
    }});
  }

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

  const cookies = (request.headers.get("cookie") || "").split(/;\s*/);
  if (cookies.includes(`${COOKIE}=${token}`)) {
    return context.next();
  }

  return new Response(loginForm(false), { status: 401, headers: htmlHeaders });
};
