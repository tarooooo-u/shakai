// 学習記録の同期。
// GET  /api/sync … その人の記録をすべて返す
// POST /api/sync … 端末で変わった記録を書く。同じキーは last（端末で更新した時刻）が新しいほうを残す。
//                  replace のときは、その doc をいったん消してから書く（「学習記録をリセット」）

import type { Data, Env } from "./_middleware";

type Entry = { k: string; v: unknown; last: number };
type Op = { doc: string; replace?: boolean; entries: Entry[] };

// lib/profiles.ts の localStorage キーと同じ形だけを受け付ける（理科の記録は rika-progress:v1 のように教科名がつく）
const DOC = /^(profiles:v1|p:[0-9a-f-]{36}:[a-z0-9-]+:v\d+)$/;
const MAX_OPS = 100;
const MAX_ENTRIES = 20000;
const MAX_KEY = 200;
const MAX_VALUE = 100_000;
const BATCH = 200;

export const onRequestGet: PagesFunction<Env, string, Data> = async ({ env, data }) => {
  const { results } = await env.DB.prepare("SELECT doc, k, v, last FROM entries WHERE owner = ?")
    .bind(data.email)
    .all<{ doc: string; k: string; v: string; last: number }>();
  // v はもう JSON の文字列なので、パースせずにつなげる（Workers の無料枠は CPU 時間が短い）
  const rows = results.map((r) => `{"doc":${JSON.stringify(r.doc)},"k":${JSON.stringify(r.k)},"v":${r.v},"last":${r.last}}`);
  return new Response(`{"email":${JSON.stringify(data.email)},"entries":[${rows.join(",")}]}`, {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
};

export const onRequestPost: PagesFunction<Env, string, Data> = async ({ request, env, data }) => {
  let ops: Op[];
  try {
    ops = ((await request.json()) as { ops: Op[] }).ops;
  } catch {
    return bad("JSON が読めません");
  }
  if (!Array.isArray(ops) || ops.length > MAX_OPS) return bad("ops");
  let count = 0;
  for (const op of ops) {
    if (typeof op?.doc !== "string" || !DOC.test(op.doc) || !Array.isArray(op.entries)) return bad("doc");
    count += op.entries.length;
    for (const e of op.entries) {
      if (typeof e?.k !== "string" || !e.k || e.k.length > MAX_KEY) return bad("k");
      if (!Number.isFinite(e.last)) return bad("last");
    }
  }
  if (count > MAX_ENTRIES) return bad("entries");

  const now = Date.now();
  const upsert = env.DB.prepare(
    `INSERT INTO entries (owner, doc, k, v, last, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (owner, doc, k) DO UPDATE SET v = excluded.v, last = excluded.last, updated_at = excluded.updated_at
     WHERE excluded.last >= entries.last`,
  );
  const remove = env.DB.prepare("DELETE FROM entries WHERE owner = ? AND doc = ?");

  const stmts: D1PreparedStatement[] = [];
  for (const op of ops) {
    if (op.replace) stmts.push(remove.bind(data.email, op.doc));
    for (const e of op.entries) {
      const v = JSON.stringify(e.v ?? null);
      if (v.length > MAX_VALUE) return bad("v");
      stmts.push(upsert.bind(data.email, op.doc, e.k, v, Math.round(e.last), now));
    }
  }
  // batch はまとめて1つのトランザクションになる。大きすぎないように分ける
  for (let i = 0; i < stmts.length; i += BATCH) await env.DB.batch(stmts.slice(i, i + BATCH));
  return Response.json({ ok: true, written: count });
};

const bad = (message: string) => Response.json({ error: message }, { status: 400 });
