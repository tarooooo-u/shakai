// e-Stat API の小さなクライアント。アプリIDは .env.local の ESTAT_APP_ID から読む。
// 使い方（調査用）:
//   node scripts/estat.mjs search 水揚量            … 統計表を検索
//   node scripts/estat.mjs meta 0003xxxxxxx         … 統計表の項目（分類）を表示
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://api.e-stat.go.jp/rest/3.0/app/json";

function appId() {
  if (process.env.ESTAT_APP_ID) return process.env.ESTAT_APP_ID;
  try {
    const m = readFileSync(join(ROOT, ".env.local"), "utf8").match(/^ESTAT_APP_ID=(\S+)/m);
    if (m) return m[1];
  } catch {}
  throw new Error("ESTAT_APP_ID がありません（.env.local に書いてください）");
}

/** e-Stat API を呼ぶ。エラーメッセージにアプリIDが混ざらないようにする */
export async function call(endpoint, params) {
  const id = appId();
  const url = `${BASE}/${endpoint}?${new URLSearchParams({ appId: id, lang: "J", ...params })}`;
  const res = await fetch(url);
  const text = (await res.text()).replaceAll(id, "***");
  if (!res.ok) throw new Error(`e-Stat ${endpoint}: HTTP ${res.status} ${text.slice(0, 300)}`);
  const json = JSON.parse(text);
  const root = Object.values(json)[0];
  const status = root?.RESULT?.STATUS;
  if (status !== undefined && status !== 0 && status !== 1 && status !== 2) {
    throw new Error(`e-Stat ${endpoint}: ${root.RESULT.ERROR_MSG}`);
  }
  return root;
}

const arr = (x) => (x === undefined ? [] : Array.isArray(x) ? x : [x]);
const text = (x) => (typeof x === "object" && x !== null ? x.$ : x);

export async function searchTables(searchWord, extra = {}) {
  const r = await call("getStatsList", { searchWord, limit: "100", ...extra });
  return arr(r.DATALIST_INF?.TABLE_INF).map((t) => ({
    id: t["@id"],
    stat: text(t.STAT_NAME),
    title: text(t.TITLE),
    survey: t.SURVEY_DATE,
    updated: t.UPDATED_DATE,
  }));
}

export async function meta(statsDataId) {
  const r = await call("getMetaInfo", { statsDataId });
  const objs = arr(r.METADATA_INF?.CLASS_INF?.CLASS_OBJ);
  return {
    title: text(r.METADATA_INF?.TABLE_INF?.TITLE),
    stat: text(r.METADATA_INF?.TABLE_INF?.STAT_NAME),
    classes: objs.map((o) => ({
      id: o["@id"],
      name: o["@name"],
      items: arr(o.CLASS).map((c) => ({ code: c["@code"], name: c["@name"], unit: c["@unit"] })),
    })),
  };
}

/** 統計データを取得し、分類コードを名前に置き換えた行の配列で返す */
export async function data(statsDataId, filters = {}) {
  const r = await call("getStatsData", { statsDataId, metaGetFlg: "Y", cntGetFlg: "N", ...filters });
  const objs = arr(r.STATISTICAL_DATA?.CLASS_INF?.CLASS_OBJ);
  const names = Object.fromEntries(
    objs.map((o) => [o["@id"], Object.fromEntries(arr(o.CLASS).map((c) => [c["@code"], c["@name"]]))]),
  );
  const values = arr(r.STATISTICAL_DATA?.DATA_INF?.VALUE);
  return {
    title: text(r.STATISTICAL_DATA?.TABLE_INF?.TITLE),
    stat: text(r.STATISTICAL_DATA?.TABLE_INF?.STAT_NAME),
    rows: values.map((v) => {
      const row = { value: v.$, unit: v["@unit"] };
      for (const [k, code] of Object.entries(v)) {
        if (!k.startsWith("@") || k === "@unit") continue;
        const id = k.slice(1);
        row[id] = names[id]?.[code] ?? code;
      }
      return row;
    }),
  };
}

// ───── コマンドライン（調査用）─────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === "search") {
    for (const t of await searchTables(args.join(" "))) {
      console.log(`${t.id}  [${t.stat}] ${t.title}  (${t.survey})`);
    }
  } else if (cmd === "meta") {
    const m = await meta(args[0]);
    console.log(`[${m.stat}] ${m.title}`);
    for (const c of m.classes) {
      const items = c.items.map((i) => `${i.code}:${i.name}`);
      console.log(`- ${c.id} ${c.name} (${items.length}) ${items.slice(0, 40).join(" ")}${items.length > 40 ? " …" : ""}`);
    }
  } else {
    console.log("usage: node scripts/estat.mjs search <語> | meta <statsDataId>");
  }
}
