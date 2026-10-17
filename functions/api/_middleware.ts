// /api/* の入口。Cloudflare Access でログインした人だけを通し、そのメールを data.email に入れる。
// サイト全体は Access で守っているが、設定をまちがえても API が開かないように、ここでも Access の証明（JWT）を確かめる。

export type Env = {
  DB: D1Database;
  /** Access のチーム名のドメイン（例 shakai.cloudflareaccess.com） */
  ACCESS_TEAM_DOMAIN: string;
  /** Access のアプリの Application Audience (AUD) Tag */
  ACCESS_AUD: string;
  /** ローカルで試すときだけ（.dev.vars）。localhost 以外では使わない */
  DEV_USER_EMAIL?: string;
};

export type Data = { email: string };

type Jwk = JsonWebKey & { kid: string };
let certs: { keys: Jwk[]; at: number } | null = null;

async function accessKeys(teamDomain: string, refresh: boolean) {
  if (!certs || refresh || Date.now() - certs.at > 60 * 60 * 1000) {
    const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
    if (!res.ok) throw new Error(`certs ${res.status}`);
    certs = { keys: ((await res.json()) as { keys: Jwk[] }).keys, at: Date.now() };
  }
  return certs.keys;
}

const b64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const decodePart = (s: string) => JSON.parse(new TextDecoder().decode(b64url(s)));

/** Access の JWT を確かめて、メールを返す。だめなら null */
async function verifyAccessJwt(token: string, env: Env): Promise<string | null> {
  const [h, p, sig] = token.split(".");
  if (!h || !p || !sig) return null;
  const header = decodePart(h) as { alg: string; kid: string };
  if (header.alg !== "RS256") return null;

  let jwk = (await accessKeys(env.ACCESS_TEAM_DOMAIN, false)).find((k) => k.kid === header.kid);
  // 鍵は入れかわるので、見つからなければ取り直す
  if (!jwk) jwk = (await accessKeys(env.ACCESS_TEAM_DOMAIN, true)).find((k) => k.kid === header.kid);
  if (!jwk) return null;

  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64url(sig), new TextEncoder().encode(`${h}.${p}`));
  if (!ok) return null;

  const payload = decodePart(p) as { aud: string | string[]; exp: number; iss: string; email?: string };
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.ACCESS_AUD)) return null;
  if (payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) return null;
  if (payload.exp * 1000 < Date.now()) return null;
  return payload.email?.toLowerCase() ?? null;
}

function cookie(request: Request, name: string) {
  const m = request.headers.get("Cookie")?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m?.[1] ?? null;
}

export const onRequest: PagesFunction<Env, string, Data> = async ({ request, env, data, next }) => {
  const host = new URL(request.url).hostname;
  if (env.DEV_USER_EMAIL && (host === "localhost" || host === "127.0.0.1")) {
    data.email = env.DEV_USER_EMAIL;
    return next();
  }

  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    return Response.json({ error: "server not configured" }, { status: 500 });
  }
  const token = request.headers.get("Cf-Access-Jwt-Assertion") ?? cookie(request, "CF_Authorization");
  const email = token ? await verifyAccessJwt(token, env).catch(() => null) : null;
  if (!email) return Response.json({ error: "unauthorized" }, { status: 401 });

  data.email = email;
  return next();
};
