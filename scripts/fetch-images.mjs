// 問題用の画像を Wikimedia Commons から取得して public/images/q/ に WebP で保存し、
// 出典（作者・ライセンス）を content/images.csv に書き出す。
//   npm run images
// 対象は下の SUBJECTS。基本は日本語版ウィキペディアの記事のメイン画像を使い、
// うまく合わないときは file にコモンズのファイル名を直接書く。
// ライセンスがパブリックドメイン / CC0 / CC BY / CC BY-SA のものだけを使う。
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "images", "q");
const CSV = join(ROOT, "content", "images.csv");
const WIDTH = 640; // 取得する元の幅。保存時に 480px 以内・WebP に縮める
const MAX = 480;
const UA = "shakai-drill/0.1 (educational quiz app; contact via project repository)";

// name = 問題の答え（用語）と同じ文字列。slug = 保存するファイル名
export const SUBJECTS = [
  // 建築・遺跡
  { name: "法隆寺", slug: "horyuji", wiki: "法隆寺", kind: "建築" },
  { name: "東大寺", slug: "todaiji", wiki: "東大寺大仏殿", kind: "建築" },
  { name: "唐招提寺", slug: "toshodaiji", wiki: "唐招提寺", kind: "建築" },
  { name: "平等院鳳凰堂", slug: "byodoin", wiki: "平等院鳳凰堂", kind: "建築" },
  { name: "中尊寺金色堂", slug: "konjikido", wiki: "中尊寺金色堂", kind: "建築" },
  { name: "金閣", slug: "kinkaku", wiki: "鹿苑寺", kind: "建築" },
  { name: "銀閣", slug: "ginkaku", wiki: "慈照寺", kind: "建築" },
  { name: "厳島神社", slug: "itsukushima", wiki: "厳島神社", kind: "建築" },
  { name: "日光東照宮", slug: "toshogu", wiki: "日光東照宮", kind: "建築" },
  { name: "姫路城", slug: "himeji", wiki: "姫路城", kind: "建築" },
  { name: "富岡製糸場", slug: "tomioka", wiki: "富岡製糸場", kind: "建築" },
  { name: "原爆ドーム", slug: "genbaku-dome", wiki: "原爆ドーム", kind: "建築" },
  { name: "首里城", slug: "shurijo", wiki: "首里城", kind: "建築" },
  { name: "五稜郭", slug: "goryokaku", wiki: "五稜郭", kind: "建築" },
  { name: "鹿鳴館", slug: "rokumeikan", wiki: "鹿鳴館", kind: "建築" },
  { name: "吉野ヶ里遺跡", slug: "yoshinogari", wiki: "吉野ヶ里遺跡", kind: "建築" },
  // 美術・遺物
  { name: "土偶", slug: "dogu", wiki: "遮光器土偶", kind: "美術・遺物" },
  { name: "縄文土器", slug: "jomon-doki", wiki: "火焔型土器", kind: "美術・遺物" },
  { name: "銅鐸", slug: "dotaku", file: "Dotaku (bell-shaped bronze) from Tsuri-Kojinyama, Hamamatsu-shi, Shizuoka, Yayoi period, 1st-3rd century - Tokyo National Museum - DSC05629.JPG", kind: "美術・遺物" },
  { name: "埴輪", slug: "haniwa", file: "Haniwa - Warrior in Keiko Armor cropped.jpg", kind: "美術・遺物" },
  { name: "見返り美人図", slug: "mikaeri-bijin", wiki: "見返り美人図", kind: "美術・遺物" },
  { name: "富嶽三十六景", slug: "fugaku", wiki: "神奈川沖浪裏", kind: "美術・遺物" },
  { name: "東海道五十三次", slug: "tokaido53", file: "Hiroshige-53-Stations-Hoeido-01-Nihonbashi-BM-03.jpg", kind: "美術・遺物" },
  { name: "秋冬山水図", slug: "shuto-sansui", wiki: "秋冬山水図", kind: "美術・遺物" },
  // 人物（肖像）
  { name: "厩戸王（聖徳太子）", slug: "shotoku", wiki: "聖徳太子", kind: "人物" },
  { name: "源頼朝", slug: "yoritomo", file: "Minamoto no Yoritomo (cropped).jpg", kind: "人物" },
  { name: "足利義満", slug: "yoshimitsu", wiki: "足利義満", kind: "人物" },
  { name: "織田信長", slug: "nobunaga", file: "Odanobunaga (cropped).jpg", kind: "人物" },
  { name: "豊臣秀吉", slug: "hideyoshi", file: "Toyotomi Hideyoshi (Kodaiji).jpg", kind: "人物" },
  { name: "徳川家康", slug: "ieyasu", wiki: "徳川家康", kind: "人物" },
  { name: "坂本龍馬", slug: "ryoma", wiki: "坂本龍馬", kind: "人物" },
  { name: "西郷隆盛", slug: "saigo", wiki: "西郷隆盛", kind: "人物" },
  { name: "伊藤博文", slug: "ito-hirobumi", wiki: "伊藤博文", kind: "人物" },
  { name: "福沢諭吉", slug: "fukuzawa", wiki: "福澤諭吉", kind: "人物" },
];

const OK_LICENSE = /^(public domain|pd|cc0|cc by(-sa)? \d(\.\d)?|cc by(-sa)?)/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 429（混雑）のときは待ってやり直す */
async function get(url) {
  for (let i = 0; i < 5; i++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status !== 429) return res;
    await sleep(3000 * (i + 1));
  }
  throw new Error("HTTP 429（混雑）が続いた");
}

async function api(host, params) {
  const url = `https://${host}/w/api.php?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  const res = await get(url);
  if (!res.ok) throw new Error(`${host}: HTTP ${res.status}`);
  return res.json();
}

const strip = (html) =>
  String(html ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** 記事名 → メイン画像のファイル名（まとめて1回で問い合わせる） */
async function mainImages(titles) {
  const j = await api("ja.wikipedia.org", { action: "query", prop: "pageimages", piprop: "name", titles: titles.join("|"), redirects: "1" });
  const alias = new Map();
  for (const r of [...(j.query?.normalized ?? []), ...(j.query?.redirects ?? [])]) alias.set(r.from, r.to);
  const byTitle = new Map((j.query?.pages ?? []).map((p) => [p.title, p.pageimage]));
  return (t) => {
    let k = t;
    while (alias.has(k)) k = alias.get(k);
    return byTitle.get(k);
  };
}

/** ファイル名 → サムネイルURL・ライセンス・作者（まとめて1回で問い合わせる） */
async function fileInfos(files) {
  const j = await api("commons.wikimedia.org", {
    action: "query",
    prop: "imageinfo",
    titles: files.map((f) => `File:${f}`).join("|"),
    iiprop: "url|extmetadata|mime",
    iiurlwidth: String(WIDTH),
  });
  const alias = new Map((j.query?.normalized ?? []).map((r) => [r.from, r.to]));
  const out = new Map();
  for (const p of j.query?.pages ?? []) {
    const ii = p.imageinfo?.[0];
    if (!ii) continue;
    const m = ii.extmetadata ?? {};
    out.set(p.title, {
      thumb: ii.thumburl,
      page: ii.descriptionurl,
      license: strip(m.LicenseShortName?.value) || strip(m.License?.value),
      artist: strip(m.Artist?.value) || "作者不明",
      mime: ii.mime,
    });
  }
  return (f) => out.get(alias.get(`File:${f}`) ?? `File:${f}`);
}

const old = new Map();
if (existsSync(CSV)) {
  for (const line of readFileSync(CSV, "utf8").replace(/^﻿/, "").split(/\r?\n/).slice(1)) {
    const cols = line.match(/"((?:[^"]|"")*)"/g)?.map((c) => c.slice(1, -1).replaceAll('""', '"'));
    if (cols?.length) old.set(cols[0], cols);
  }
}

mkdirSync(OUT_DIR, { recursive: true });
const rows = [];
const skipped = [];
const todo = SUBJECTS.filter((s) => !(existsSync(join(OUT_DIR, `${s.slug}.webp`)) && old.has(s.name)));
const imageOf = todo.length ? await mainImages(todo.filter((s) => !s.file).map((s) => s.wiki)) : () => undefined;
const fileOf = new Map(todo.map((s) => [s.name, s.file ?? imageOf(s.wiki)]));
const files = [...new Set([...fileOf.values()].filter(Boolean))];
const infoOf = files.length ? await fileInfos(files) : () => undefined;

for (const s of SUBJECTS) {
  if (!todo.includes(s)) {
    rows.push(old.get(s.name));
    continue;
  }
  try {
    const file = fileOf.get(s.name);
    if (!file) throw new Error("記事に画像がない");
    const info = infoOf(file);
    if (!info?.thumb) throw new Error(`画像情報が取れない（${file}）`);
    if (!OK_LICENSE.test(info.license)) throw new Error(`使えないライセンス「${info.license}」（${file}）`);
    if (!/jpe?g|png/.test(info.mime)) throw new Error(`画像形式が対象外（${info.mime}）`);
    const res = await get(info.thumb);
    if (!res.ok) throw new Error(`ダウンロード失敗 HTTP ${res.status}`);
    // 長い辺を 480px 以内にして WebP（画質72）で保存。1枚 20〜50KB 程度になる
    const webp = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(MAX, MAX, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .webp({ quality: 72 })
      .toBuffer();
    writeFileSync(join(OUT_DIR, `${s.slug}.webp`), webp);
    rows.push([s.name, `/images/q/${s.slug}.webp`, s.kind, file, info.artist, info.license, info.page]);
    console.log(`OK  ${s.name}  ${info.license}  ${file}`);
  } catch (e) {
    skipped.push(`${s.name}: ${e.message}`);
    console.log(`--  ${s.name}  ${e.message}`);
  }
  await sleep(1000); // 相手のサーバーに負担をかけない
}

const esc = (v) => `"${String(v).replaceAll('"', '""')}"`;
const header = ["名前", "ファイル", "種類", "元ファイル名", "作者", "ライセンス", "出典URL"];
writeFileSync(CSV, "﻿" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n");
console.log(`\n${rows.length}件を content/images.csv に保存。スキップ ${skipped.length}件`);
for (const s of skipped) console.log("  - " + s);
