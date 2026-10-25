// 理科の問題用の写真を Wikimedia Commons から取得して public/images/rika/ に WebP で保存し、
// 出典（作者・ライセンス）を content/rika/images.csv に書き出す。社会（scripts/fetch-images.mjs）とは別。
//   npm run rika:images              … SUBJECTS のうち、まだ取っていないものを取る
//   npm run rika:images -- --find ナスの花 Solanum melongena flower
//                                    … コモンズで写真の候補をさがす（file: に書くファイル名を決める用）
// 基本は日本語版ウィキペディアの記事のメイン画像。合わない（葉・実・別の種類が写っている）ときは
// file にコモンズのファイル名を直接書く。取ったあとは必ず1枚ずつ目で確かめる。
// ライセンスがパブリックドメイン / CC0 / CC BY / CC BY-SA のものだけを使う。
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT_DIR = join(ROOT, "public", "images", "rika");
const CSV = join(ROOT, "content", "rika", "images.csv");
const WIDTH = 640; // 取得する元の幅。保存時に 480px 以内・WebP に縮める
const MAX = 480;
const UA = "shakai-drill/0.1 (educational quiz app; contact via project repository)";

// name = 問題で使う名前（答えと同じ文字列）。slug = 保存するファイル名
export const SUBJECTS = [
  // ---- 鳥（春にさえずる鳥）
  { name: "ウグイス", slug: "uguisu", wiki: "ウグイス", kind: "鳥" },
  { name: "メジロ", slug: "mejiro", wiki: "メジロ", kind: "鳥" },
  { name: "ヒバリ", slug: "hibari", wiki: "ヒバリ", kind: "鳥" },
  { name: "ヒヨドリ", slug: "hiyodori", wiki: "ヒヨドリ", kind: "鳥" },
  // ---- 鳥（夏鳥）
  { name: "ツバメ", slug: "tsubame", wiki: "ツバメ", kind: "鳥" },
  { name: "オオルリ", slug: "ooruri", wiki: "オオルリ", kind: "鳥" },
  { name: "カッコウ", slug: "kakko", wiki: "カッコウ", kind: "鳥" },
  { name: "ホトトギス", slug: "hototogisu", wiki: "ホトトギス", kind: "鳥" },
  // ---- 鳥（冬鳥）
  { name: "マガン", slug: "magan", wiki: "マガン", kind: "鳥" },
  { name: "マガモ", slug: "magamo", wiki: "マガモ", kind: "鳥" },
  { name: "ハクチョウ", slug: "hakucho", wiki: "オオハクチョウ", kind: "鳥" },
  { name: "ツグミ", slug: "tsugumi", wiki: "ツグミ", kind: "鳥" },
  { name: "マナヅル", slug: "manazuru", wiki: "マナヅル", kind: "鳥" },
  // ---- 春の花
  { name: "サクラ", slug: "sakura", wiki: "ソメイヨシノ", kind: "花" },
  { name: "モモ", slug: "momo", file: "Prunus persica (200804).jpg", kind: "花" },
  { name: "ツツジ", slug: "tsutsuji", wiki: "ツツジ", kind: "花" },
  { name: "アブラナ", slug: "abura-na", wiki: "アブラナ", kind: "花" },
  { name: "オオイヌノフグリ", slug: "ooinunofuguri", file: "Veronica persica flower.jpg", kind: "花" },
  { name: "ハルジオン", slug: "harujion", wiki: "ハルジオン", kind: "花" },
  { name: "レンゲソウ", slug: "rengeso", wiki: "ゲンゲ", kind: "花" },
  { name: "シロツメクサ", slug: "shirotsumekusa", wiki: "シロツメクサ", kind: "花" },
  { name: "スミレ", slug: "sumire", wiki: "スミレ", kind: "花" },
  { name: "タンポポ", slug: "tanpopo", file: "Paardenbloem (Taraxacum officinale) 06.JPG", kind: "花" },
  { name: "フジ", slug: "fuji", wiki: "フジ (植物)", kind: "花" },
  { name: "ナズナ", slug: "nazuna", wiki: "ナズナ", kind: "花" },
  { name: "ハハコグサ", slug: "hahakogusa", wiki: "ハハコグサ", kind: "花" },
  // ---- 夏の花
  { name: "ツユクサ", slug: "tsuyukusa", wiki: "ツユクサ", kind: "花" },
  { name: "ドクダミ", slug: "dokudami", wiki: "ドクダミ", kind: "花" },
  { name: "アジサイ", slug: "ajisai", wiki: "アジサイ", kind: "花" },
  { name: "ホウセンカ", slug: "hosenka", wiki: "ホウセンカ", kind: "花" },
  { name: "オシロイバナ", slug: "oshiroibana", wiki: "オシロイバナ", kind: "花" },
  { name: "アサガオ", slug: "asagao", wiki: "アサガオ", kind: "花" },
  { name: "ヒメジョオン", slug: "himejoon", wiki: "ヒメジョオン", kind: "花" },
  { name: "ヒマワリ", slug: "himawari", wiki: "ヒマワリ", kind: "花" },
  { name: "カタバミ", slug: "katabami", file: "Oxalis corniculata flower P5191528.jpg", kind: "花" },
  // ---- 秋の花・秋の七草
  { name: "コスモス", slug: "cosmos", wiki: "コスモス (植物)", kind: "花" },
  { name: "ヒガンバナ", slug: "higanbana", wiki: "ヒガンバナ", kind: "花" },
  { name: "キク", slug: "kiku", wiki: "キク", kind: "花" },
  { name: "キンモクセイ", slug: "kinmokusei", wiki: "キンモクセイ", kind: "花" },
  { name: "セイタカアワダチソウ", slug: "seitakaawadachiso", wiki: "セイタカアワダチソウ", kind: "花" },
  { name: "ハギ", slug: "hagi", wiki: "ヤマハギ", kind: "花" },
  { name: "ススキ", slug: "susuki", wiki: "ススキ", kind: "花" },
  { name: "クズ", slug: "kuzu", wiki: "クズ", kind: "花" },
  { name: "ナデシコ", slug: "nadeshiko", wiki: "カワラナデシコ", kind: "花" },
  { name: "オミナエシ", slug: "ominaeshi", wiki: "オミナエシ", kind: "花" },
  { name: "フジバカマ", slug: "fujibakama", wiki: "フジバカマ", kind: "花" },
  { name: "キキョウ", slug: "kikyo", wiki: "キキョウ", kind: "花" },
  // ---- 冬の花
  { name: "ツバキ", slug: "tsubaki", wiki: "ヤブツバキ", kind: "花" },
  { name: "サザンカ", slug: "sazanka", file: "Flowers of Camellia sasanqua 20171106.jpg", kind: "花" },
  { name: "ウメ", slug: "ume", wiki: "ウメ", kind: "花" },
  { name: "ヤツデ", slug: "yatsude", wiki: "ヤツデ", kind: "花" },
];

const OK_LICENSE = /^(public domain|pd|cc0|cc by(-sa)? \d(\.\d)?|cc by(-sa)?)/i;

/** API は1回に50件まで */
const chunks = (a, n = 50) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, (i + 1) * n));

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
  const alias = new Map();
  const byTitle = new Map();
  for (const part of chunks(titles)) {
    const j = await api("ja.wikipedia.org", { action: "query", prop: "pageimages", piprop: "name", titles: part.join("|"), redirects: "1" });
    for (const r of [...(j.query?.normalized ?? []), ...(j.query?.redirects ?? [])]) alias.set(r.from, r.to);
    for (const p of j.query?.pages ?? []) byTitle.set(p.title, p.pageimage);
  }
  return (t) => {
    let k = t;
    while (alias.has(k)) k = alias.get(k);
    return byTitle.get(k);
  };
}

const infoOfPage = (p) => {
  const ii = p.imageinfo?.[0];
  if (!ii) return undefined;
  const m = ii.extmetadata ?? {};
  return {
    thumb: ii.thumburl,
    page: ii.descriptionurl,
    license: strip(m.LicenseShortName?.value) || strip(m.License?.value),
    artist: strip(m.Artist?.value) || "作者不明",
    mime: ii.mime,
  };
};

/** ファイル名 → サムネイルURL・ライセンス・作者（まとめて1回で問い合わせる） */
async function fileInfos(files) {
  const alias = new Map();
  const pages = [];
  for (const part of chunks(files)) {
    const j = await api("commons.wikimedia.org", {
      action: "query",
      prop: "imageinfo",
      titles: part.map((f) => `File:${f}`).join("|"),
      iiprop: "url|extmetadata|mime",
      iiurlwidth: String(WIDTH),
    });
    for (const r of j.query?.normalized ?? []) alias.set(r.from, r.to);
    pages.push(...(j.query?.pages ?? []));
  }
  const out = new Map(pages.map((p) => [p.title, infoOfPage(p)]));
  return (f) => out.get(alias.get(`File:${f}`) ?? `File:${f}`);
}

// ───── --find：コモンズで写真の候補をさがす ─────
if (process.argv[2] === "--find") {
  const q = process.argv.slice(3).join(" ");
  const j = await api("commons.wikimedia.org", {
    action: "query",
    generator: "search",
    gsrsearch: `filetype:bitmap ${q}`,
    gsrnamespace: "6",
    gsrlimit: "20",
    prop: "imageinfo",
    iiprop: "url|extmetadata|mime",
    iiurlwidth: String(WIDTH),
  });
  const pages = (j.query?.pages ?? []).sort((a, b) => a.index - b.index);
  for (const p of pages) {
    const info = infoOfPage(p);
    const ok = info && OK_LICENSE.test(info.license) ? "OK" : "--";
    console.log(`${ok}  ${p.title.replace(/^File:/, "")}  （${info?.license ?? "?"}）`);
  }
  process.exit(0);
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
// ファイル名を書きかえたものは取り直す
const todo = SUBJECTS.filter((s) => {
  const o = old.get(s.name);
  return !(existsSync(join(OUT_DIR, `${s.slug}.webp`)) && o && (!s.file || o[3] === s.file.replaceAll(" ", "_") || o[3] === s.file));
});
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
    if (!/jpe?g|png|webp/.test(info.mime)) throw new Error(`画像形式が対象外（${info.mime}）`);
    const res = await get(info.thumb);
    if (!res.ok) throw new Error(`ダウンロード失敗 HTTP ${res.status}`);
    // 長い辺を 480px 以内にして WebP（画質72）で保存。1枚 20〜50KB 程度になる
    const webp = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(MAX, MAX, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .webp({ quality: 72 })
      .toBuffer();
    writeFileSync(join(OUT_DIR, `${s.slug}.webp`), webp);
    rows.push([s.name, `/images/rika/${s.slug}.webp`, s.kind, file, info.artist, info.license, info.page]);
    console.log(`OK  ${s.name}  ${info.license}  ${file}`);
  } catch (e) {
    skipped.push(`${s.name}: ${e.message}`);
    console.log(`--  ${s.name}  ${e.message}`);
  }
  await sleep(1000); // 相手のサーバーに負担をかけない
}

const esc = (v) => `"${String(v).replaceAll('"', '""')}"`;
const header = ["名前", "ファイル", "種類", "元ファイル名", "作者", "ライセンス", "出典URL"];
writeFileSync(CSV, "﻿" + [header, ...rows.filter(Boolean)].map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n");
console.log(`\n${rows.filter(Boolean).length}件を content/rika/images.csv に保存。スキップ ${skipped.length}件`);
for (const s of skipped) console.log("  - " + s);
