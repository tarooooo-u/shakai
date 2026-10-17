// e-Stat の作物統計・畜産統計から、農産物・家畜の都道府県順位（上位5位と全国に占める割合）を作り、
// データシート content/sheets/agri-*.json に保存する。
//   npm run agri
// 新しい年のデータが出たら、ITEMS の表IDを差し替えて再実行する
// （表IDは `node scripts/estat.mjs search <品目>` で探す。作物統計調査は「令和〇年産」、畜産統計は「〇年２月１日現在」）。
// 文章（note など）は SHEETS に書く。年を変えたら note・source の年も直す。
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { data } from "./estat.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOP = 5;

// [カードの名前, 表ID, 値の項目名（cat02）, 単位の書き方]
// 果樹・野菜・工芸農作物などは収穫量（t）。きくは出荷量、家畜は飼養頭数・羽数。
const ITEMS = {
  // 果樹（令和6年産）
  みかん: ["0004046674", "収穫量", "t"],
  りんご: ["0004046679", "収穫量", "t"],
  "日本なし": ["0004046680", "収穫量", "t"],
  もも: ["0004046684", "収穫量", "t"],
  ぶどう: ["0004046688", "収穫量", "t"],
  "さくらんぼ（おうとう）": ["0004046686", "収穫量", "t"],
  うめ: ["0004046687", "収穫量", "t"],
  びわ: ["0004046683", "収穫量", "t"],
  かき: ["0004046682", "収穫量", "t"],
  // 野菜（令和6年産）
  いちご: ["0004045985", "収穫量", "t"],
  すいか: ["0004045987", "収穫量", "t"],
  メロン: ["0004045986", "計_収穫量", "t"],
  なす: ["0004045975", "計_収穫量", "t"],
  トマト: ["0004045976", "計_収穫量", "t"],
  ピーマン: ["0004045977", "計_収穫量", "t"],
  きゅうり: ["0004045973", "計_収穫量", "t"],
  キャベツ: ["0004045957", "計_収穫量", "t"],
  はくさい: ["0004045955", "計_収穫量", "t"],
  レタス: ["0004045968", "計_収穫量", "t"],
  ねぎ: ["0004045969", "計_収穫量", "t"],
  ほうれんそう: ["0004045959", "収穫量", "t"],
  ブロッコリー: ["0004045967", "収穫量", "t"],
  だいこん: ["0004045947", "計_収穫量", "t"],
  にんじん: ["0004045949", "計_収穫量", "t"],
  たまねぎ: ["0004045971", "収穫量", "t"],
  "じゃがいも（ばれいしょ）": ["0004045952", "計_収穫量", "t"],
  れんこん: ["0004045951", "収穫量", "t"],
  "さつまいも（かんしょ）": ["0004046424", "収穫量", "t"],
  // 工芸農作物・花・麦・豆など（令和6年産）
  "茶（荒茶）": ["0004046428", /（主産県別）_年間計_荒茶生産量$/, "t"],
  こんにゃくいも: ["0004046432", "収穫量", "t"],
  "てんさい（さとうだいこん）": ["0004046430", "収穫量", "t"],
  さとうきび: ["0004046431", "収穫量_計", "t"],
  "い（い草）": ["0004046433", "収穫量", "t"],
  きく: ["0004046992", "出荷量", "千本"],
  小麦: ["0004046418", "小麦_収穫量", "t"],
  大豆: ["0004046420", "収穫量", "t"],
  そば: ["0004046422", "収穫量", "t"],
  "落花生（らっかせい）": ["0004046421", "らっかせい_収穫量", "t"],
  // 家畜（乳用牛・肉用牛は2025年2月1日、ほかは2024年2月1日）
  乳用牛: ["0004047181", "飼養戸数・頭数_飼養頭数(めす)_合計", "頭"],
  肉用牛: ["0004047183", "飼養戸数・頭数_飼養頭数_合計", "頭"],
  豚: ["0004041860", "飼養頭数_計", "頭"],
  "肉用若鶏（ブロイラー）": ["0004041880", "飼養羽数", "千羽"],
  "採卵鶏（たまごをとる鶏）": ["0004041877", "飼養羽数_採卵鶏(種鶏を除く。)_成鶏めす(６か月以上)", "千羽"],
};

// 表の中に1つの県しかないもの（全国＝その県）
const ONLY = { "てんさい（さとうだいこん）": "北海道", "い（い草）": "熊本" };

const modes = (what) => [
  { id: "label", label: "県名をかくす", hide: ["label"] },
  { id: "value", label: "割合をかくす", hide: ["value"] },
  { id: "title", label: `${what}をかくす`, hide: ["title"] },
];
const CROP = "作物統計調査（作物統計）";

const SHEETS = [
  {
    id: "agri-fruits",
    title: "果物の生産量の多い県",
    items: ["みかん", "りんご", "日本なし", "もも", "ぶどう", "さくらんぼ（おうとう）", "うめ", "びわ", "かき"],
    note:
      "2024年の収穫量の上位5県と、全国に占める割合。みかんはあたたかい地方の海に面した斜面、りんごは夏でもすずしい地方でつくられる。もも・ぶどうは雨が少なく、昼と夜の気温の差が大きい山梨県や長野県の盆地に多い。果物は年によって順位が入れかわることがある。",
    source: `農林水産省「${CROP}」令和6年産 果樹（都道府県別の結果樹面積・収穫量・出荷量）`,
  },
  {
    id: "agri-fruit-vegetables",
    title: "実を食べる野菜の生産量の多い県",
    items: ["いちご", "すいか", "メロン", "トマト", "なす", "きゅうり", "ピーマン"],
    note:
      "2024年の収穫量の上位5県と、全国に占める割合。いちご・すいか・メロンは、農林水産省の統計では野菜に入る。高知県・宮崎県はビニールハウスで冬から春に出す促成栽培、群馬県などは夏から秋に出す抑制栽培がさかん。",
    source: `農林水産省「${CROP}」令和6年産 野菜（都道府県別の作付面積・収穫量・出荷量）`,
  },
  {
    id: "agri-leaf-vegetables",
    title: "葉や茎を食べる野菜の生産量の多い県",
    items: ["キャベツ", "はくさい", "レタス", "ねぎ", "ほうれんそう", "ブロッコリー"],
    note:
      "2024年の収穫量の上位5県と、全国に占める割合。長野県や群馬県の高原では、夏のすずしい気候を生かした高原野菜（レタス・キャベツ・はくさい）がつくられる。茨城県・千葉県・埼玉県などでは、大都市に近いことを生かした近郊農業がさかん。",
    source: `農林水産省「${CROP}」令和6年産 野菜（都道府県別の作付面積・収穫量・出荷量）`,
  },
  {
    id: "agri-root-vegetables",
    title: "根やいもを食べる野菜の生産量の多い県",
    items: ["だいこん", "にんじん", "たまねぎ", "じゃがいも（ばれいしょ）", "さつまいも（かんしょ）", "れんこん"],
    note:
      "2024年の収穫量の上位5県と、全国に占める割合。じゃがいも・たまねぎは北海道が多い。さつまいもは、火山灰でできた水はけのよいシラス台地が広がる鹿児島県や、茨城県で多い。れんこんは霞ヶ浦のまわりの低い土地が広がる茨城県が多い。",
    source: `農林水産省「${CROP}」令和6年産 野菜・かんしょ`,
  },
  {
    id: "agri-industrial-crops",
    title: "工芸作物・花・麦・豆の生産量の多い県",
    items: [
      "茶（荒茶）",
      "こんにゃくいも",
      "てんさい（さとうだいこん）",
      "さとうきび",
      "い（い草）",
      "きく",
      "小麦",
      "大豆",
      "そば",
      "落花生（らっかせい）",
    ],
    note:
      "2024年の上位の県と、全国に占める割合（きくは出荷量、ほかは収穫量）。茶は荒茶（つみとった葉を蒸して乾かしたもの）の生産量で、2024年は鹿児島県が静岡県をこえて1位。てんさいとい草は、統計で調べているのが北海道・熊本県だけ（い草は福岡県などでも少しつくられている）。さとうきびは鹿児島県（南西諸島）と沖縄県だけで調べている。きくは、夜に電灯をあてて花のさく時期をおくらせる電照ぎくが愛知県（渥美半島）でさかん。",
    source: `農林水産省「${CROP}」令和6年産 工芸農作物・麦類・豆類・そば、「作物統計調査（花き）」令和6年産`,
  },
  {
    id: "agri-livestock",
    title: "家畜の数の多い県",
    items: ["乳用牛", "肉用牛", "豚", "肉用若鶏（ブロイラー）", "採卵鶏（たまごをとる鶏）"],
    note:
      "飼われている数（2月1日の時点）の上位5県と、全国に占める割合。乳用牛・肉用牛は2025年、豚・ブロイラー・採卵鶏は2024年（2025年は調べていない）。採卵鶏は、たまごを産む6か月以上のめすの数。乳用牛は北海道が全国の半分以上。九州南部（鹿児島県・宮崎県）は肉用牛・豚・ブロイラーのどれも多い。",
    source: "農林水産省「畜産統計」令和7年2月1日現在（乳用牛・肉用牛）、令和6年2月1日現在（豚・採卵鶏・ブロイラー）",
  },
];

const PREF_SUFFIX = (p) => (p === "北海道" ? p : p === "東京" ? "東京都" : p === "大阪" || p === "京都" ? `${p}府` : `${p}県`);

const PREFS =
  "北海道 青森 岩手 宮城 秋田 山形 福島 茨城 栃木 群馬 埼玉 千葉 東京 神奈川 新潟 富山 石川 福井 山梨 長野 岐阜 静岡 愛知 三重 滋賀 京都 大阪 兵庫 奈良 和歌山 鳥取 島根 岡山 広島 山口 徳島 香川 愛媛 高知 福岡 佐賀 長崎 熊本 大分 宮崎 鹿児島 沖縄".split(" ");

/** 表の地域名から都道府県名を取り出す。全国は "全国"、地方・農政局などは null */
function prefName(raw) {
  if (raw === "全国") return "全国";
  const name = raw.replace(/^(?:[（(]都道府県[)）]_|都道府県_|全国_)/, "");
  return PREFS.includes(name) ? name : null;
}

const num = (v) => (/^-?[\d.]+$/.test(v) ? Number(v) : null);

function fmtTotal(n, unit) {
  if (unit === "t") return n >= 10000 ? `${(n / 10000).toFixed(n >= 1000000 ? 0 : 1)}万t` : `${n.toLocaleString()}t`;
  if (unit === "千本") return `${(n / 100000).toFixed(1)}億本`;
  if (unit === "千羽") return `${(n / 100000).toFixed(1)}億羽`;
  return n >= 10000 ? `${Math.round(n / 10000).toLocaleString()}万${unit}` : `${n.toLocaleString()}${unit}`;
}

async function card(title) {
  const [table, valueName, unit] = ITEMS[title];
  const d = await data(table);
  const matches = (n) => (valueName instanceof RegExp ? valueName.test(n) : n === valueName);
  const rows = d.rows.filter((r) => matches(r.cat02));
  if (!rows.length) throw new Error(`${title}: 値「${valueName}」が表 ${table} にありません`);
  const prefs = [];
  let total = null;
  const hidden = [];
  for (const r of rows) {
    const p = prefName(r.cat01);
    if (!p) continue;
    const v = num(r.value);
    if (p === "全国") total = v;
    else if (v === null) {
      if (r.value !== "-" && r.value !== "…") hidden.push(`${p}:${r.value}`);
    } else prefs.push([p, v]);
  }
  if (ONLY[title]) total = prefs.find(([p]) => p === ONLY[title])?.[1] ?? null;
  if (total === null) throw new Error(`${title}: 全国の値がありません`);
  const top = [...prefs].sort((a, b) => b[1] - a[1]).slice(0, TOP);
  if (hidden.length) console.warn(`  注意 ${title}: 数字がかくされた県 ${hidden.join(" ")}（上位に入っていないか確認）`);
  const sum = top.reduce((s, [, v]) => s + v, 0);
  if (sum > total * 1.001) console.warn(`  注意 ${title}: 上位の合計が全国をこえています`);
  return {
    title,
    sub: `${ONLY[title] ? PREF_SUFFIX(ONLY[title]) : "全国"} ${fmtTotal(total, unit)}`,
    rows: top.map(([p, v], i) => {
      // 同じ数字の県は同じ順位にする
      const rank = top.findIndex(([, w]) => w === v) + 1;
      return {
        label: PREF_SUFFIX(p),
        value: title === "い（い草）" ? "ほぼすべて" : `${((v / total) * 100).toFixed(1)}%`,
        ...(rank !== i + 1 && { head: `${rank}位` }),
      };
    }),
    _raw: top.map(([p, v]) => `${p} ${v}`).join(", ") + ` / 全国 ${total}`,
  };
}

for (const s of SHEETS) {
  // 手で決めた hideTop（「大事なところだけ」でかくす行の数）は、作り直しても残す
  const file = join(ROOT, "content", "sheets", `${s.id}.json`);
  const hideTop = new Map(
    existsSync(file) ? JSON.parse(readFileSync(file, "utf8")).cards.filter((c) => c.hideTop).map((c) => [c.title, c.hideTop]) : [],
  );
  const cards = [];
  for (const t of s.items) {
    const c = await card(t);
    console.log(`${t}: ${c._raw}`);
    delete c._raw;
    if (hideTop.has(t)) {
      const { rows, ...rest } = c;
      cards.push({ ...rest, hideTop: Math.min(hideTop.get(t), rows.length), rows });
    } else cards.push(c);
  }
  const sheet = {
    id: s.id,
    title: s.title,
    category: "geography",
    unit: "農業",
    kind: "cards",
    modes: modes(s.id === "agri-livestock" ? "家畜の名前" : "作物の名前"),
    columns: ["順位", "都道府県", "割合"],
    cards,
    note: s.note,
    source: s.source,
    sourceNote: `npm run agri（scripts/update-agri.mjs）で e-Stat から作成。割合は「県の値 ÷ 全国の値」。表ID：${s.items.map((t) => ITEMS[t][0]).join("・")}`,
  };
  writeFileSync(file, JSON.stringify(sheet, null, 2) + "\n");
  console.log(`→ content/sheets/${s.id}.json\n`);
}
