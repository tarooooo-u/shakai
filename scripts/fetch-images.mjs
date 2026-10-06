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
  // ---- 2026-10 追加：美術・遺物（絵画）
  { name: "源氏物語絵巻", slug: "genji-emaki", wiki: "源氏物語絵巻", kind: "美術・遺物" },
  { name: "鳥獣戯画", slug: "chojugiga", wiki: "鳥獣人物戯画", kind: "美術・遺物" },
  { name: "伴大納言絵詞", slug: "bandainagon", wiki: "伴大納言絵詞", kind: "美術・遺物" },
  { name: "信貴山縁起絵巻", slug: "shigisan", wiki: "信貴山縁起", kind: "美術・遺物" },
  { name: "平治物語絵巻", slug: "heiji-emaki", wiki: "平治物語絵巻", kind: "美術・遺物" },
  { name: "蒙古襲来絵詞", slug: "moko-shurai", wiki: "蒙古襲来絵詞", kind: "美術・遺物" },
  { name: "一遍上人絵伝", slug: "ippen-eden", wiki: "一遍聖絵", kind: "美術・遺物" },
  { name: "高松塚古墳", slug: "takamatsuzuka", wiki: "高松塚古墳", kind: "美術・遺物" },
  { name: "玉虫厨子", slug: "tamamushi", wiki: "玉虫厨子", kind: "美術・遺物" },
  { name: "天橋立図", slug: "amanohashidate-zu", file: "Sesshu - View of Ama-no-Hashidate.jpg", kind: "美術・遺物" },
  { name: "唐獅子図屏風", slug: "karajishi", file: "Kano Eitoku 002.jpg", kind: "美術・遺物" },
  { name: "洛中洛外図屏風", slug: "rakuchu", file: "Kanō Eitoku - Rakuchū rakugai zu (Uesugi) - right screen.jpg", kind: "美術・遺物" },
  { name: "松林図屏風", slug: "shorinzu", file: "Hasegawa Tohaku, Pine Trees - low resolution.jpg", kind: "美術・遺物" },
  { name: "風神雷神図屏風", slug: "fujin-raijin", file: "Wind God and Thunder God Screens by Tawaraya Sotatsu low-res.png", kind: "美術・遺物" },
  { name: "燕子花図屏風", slug: "kakitsubata", wiki: "燕子花図", kind: "美術・遺物" },
  { name: "紅白梅図屏風", slug: "kohakubai", file: "Ogata Kōrin - Red and White Plum Blossoms.jpg", kind: "美術・遺物" },
  { name: "南蛮屏風", slug: "nanban-byobu", file: "Namban byobu R.jpg", kind: "美術・遺物" },
  { name: "喜多川歌麿", slug: "utamaro-e", wiki: "ポッピンを吹く娘", kind: "美術・遺物" },
  { name: "東洲斎写楽", slug: "sharaku-e", wiki: "三代目大谷鬼次の奴江戸兵衛", kind: "美術・遺物" },
  { name: "鈴木春信", slug: "harunobu-e", file: "Suzuki Harunobu - Evening Snow on the Heater.jpg", kind: "美術・遺物" },
  { name: "名所江戸百景", slug: "meisho-edo", file: "Hiroshige Atake sous une averse soudaine.jpg", kind: "美術・遺物" },
  { name: "解体新書", slug: "kaitai-shinsho", wiki: "解体新書", kind: "美術・遺物" },
  { name: "大日本沿海輿地全図", slug: "ino-zu", file: "Map of Kyushu, Large scale, No. 7, by Ino Tadataka, Edo period, 1800s AD, color on paper - Tokyo National Museum - Ueno Park, Tokyo, Japan - DSC09023.jpg", kind: "美術・遺物" },
  { name: "高橋由一", slug: "yuichi-sake", file: "TAKAHASHI Salmon.jpg", kind: "美術・遺物" },
  { name: "黒田清輝", slug: "seiki-kohan", file: "Kuroda-seiki-kohan00-6-1b.jpeg", kind: "美術・遺物" },
  { name: "ノルマントン号事件", slug: "normanton", file: "Normanton Incident(1886).jpg", kind: "美術・遺物" },
  { name: "ビゴーの風刺画（魚釣り遊び）", slug: "bigot-fishing", file: "Coree.jpg", kind: "美術・遺物" },
  { name: "黒船", slug: "kurofune", file: "Kurofune 3.jpg", kind: "美術・遺物" },
  // ---- 2026-10 追加：美術・遺物
  { name: "金印", slug: "kinin", wiki: "漢委奴国王印", kind: "美術・遺物" },
  { name: "三角縁神獣鏡", slug: "sankakubuchi", wiki: "三角縁神獣鏡", kind: "美術・遺物" },
  { name: "稲荷山古墳出土鉄剣", slug: "inariyama", file: "Inariyama sword 001.jpg", kind: "美術・遺物" },
  { name: "和同開珎", slug: "wadokaichin", wiki: "和同開珎", kind: "美術・遺物" },
  { name: "富本銭", slug: "fuhonsen", wiki: "富本銭", kind: "美術・遺物" },
  { name: "寛永通宝", slug: "kanei-tsuho", wiki: "寛永通寳", kind: "美術・遺物" },
  { name: "小判", slug: "koban", wiki: "慶長小判", kind: "美術・遺物" },
  { name: "木簡", slug: "mokkan", wiki: "木簡", kind: "美術・遺物" },
  { name: "石包丁", slug: "ishibocho", wiki: "石包丁", kind: "美術・遺物" },
  { name: "踏絵", slug: "fumie", wiki: "踏み絵", kind: "美術・遺物" },
  { name: "弥生土器", slug: "yayoi-doki", wiki: "弥生土器", kind: "美術・遺物" },
  { name: "釈迦三尊像", slug: "shaka-sanzon", file: "Horyuji Shaka Triad.jpg", kind: "美術・遺物" },
  { name: "弥勒菩薩像", slug: "miroku", file: "Koryuji Miroku Bosatsu.jpg", kind: "美術・遺物" },
  { name: "阿修羅像", slug: "ashura", file: "Kofukuji Ashura 1.jpg", kind: "美術・遺物" },
  { name: "東大寺の大仏", slug: "daibutsu", wiki: "東大寺盧舎那仏像", kind: "美術・遺物" },
  { name: "金剛力士像", slug: "kongo-rikishi", file: "Nio Ungyo at Todaiji Nandaimon.jpg", kind: "美術・遺物" },
  { name: "空也上人像", slug: "kuya", wiki: "空也", kind: "美術・遺物" },
  { name: "鎌倉大仏", slug: "kamakura-daibutsu", wiki: "鎌倉大仏", kind: "美術・遺物" },
  { name: "螺鈿紫檀五絃琵琶", slug: "biwa", wiki: "螺鈿紫檀五絃琵琶", kind: "美術・遺物" },
  { name: "正倉院", slug: "shosoin", wiki: "正倉院", kind: "美術・遺物" },
  // ---- 2026-10 追加：文書・出版物
  { name: "学問のすゝめ", slug: "gakumon", file: "Gakumon-no-susume.jpg", kind: "文書" },
  { name: "青鞜", slug: "seito", wiki: "青鞜", kind: "文書" },
  { name: "地券", slug: "chiken", file: "Chiken akita face.jpg", kind: "文書" },
  { name: "五箇条の御誓文", slug: "gokajo", file: "Oath in Five Articles by Inui Nanyo.jpg", kind: "文書" },
  { name: "大日本帝国憲法の発布", slug: "kenpo-happu", wiki: "大日本帝国憲法", kind: "文書" },
  { name: "日本国憲法", slug: "nihonkoku-kenpo", wiki: "日本国憲法", kind: "文書" },
  // ---- 2026-10 追加：建築
  { name: "三内丸山遺跡", slug: "sannai", wiki: "三内丸山遺跡", kind: "建築" },
  { name: "登呂遺跡", slug: "toro", wiki: "登呂遺跡", kind: "建築" },
  { name: "石舞台古墳", slug: "ishibutai", wiki: "石舞台古墳", kind: "建築" },
  { name: "平城宮", slug: "heijokyu", wiki: "平城宮", kind: "建築" },
  { name: "薬師寺", slug: "yakushiji", wiki: "薬師寺", kind: "建築" },
  { name: "興福寺", slug: "kofukuji", wiki: "興福寺", kind: "建築" },
  { name: "三十三間堂", slug: "sanjusangendo", wiki: "三十三間堂", kind: "建築" },
  { name: "清水寺", slug: "kiyomizu", wiki: "清水寺", kind: "建築" },
  { name: "東求堂", slug: "togudo", file: "Ginkakuji Togudo.jpg", kind: "建築" },
  { name: "龍安寺", slug: "ryoanji", wiki: "龍安寺", kind: "建築" },
  { name: "出雲大社", slug: "izumo", wiki: "出雲大社", kind: "建築" },
  { name: "伊勢神宮", slug: "ise", wiki: "伊勢神宮", kind: "建築" },
  { name: "大阪城", slug: "osakajo", wiki: "大坂城", kind: "建築" },
  { name: "松本城", slug: "matsumoto", wiki: "松本城", kind: "建築" },
  { name: "彦根城", slug: "hikone", wiki: "彦根城", kind: "建築" },
  { name: "熊本城", slug: "kumamoto", wiki: "熊本城", kind: "建築" },
  { name: "出島", slug: "dejima", wiki: "出島", kind: "建築" },
  { name: "大浦天主堂", slug: "oura", wiki: "大浦天主堂", kind: "建築" },
  { name: "旧開智学校", slug: "kaichi", wiki: "旧開智学校", kind: "建築" },
  { name: "八幡製鉄所", slug: "yawata", wiki: "官営八幡製鐵所", kind: "建築" },
  { name: "端島（軍艦島）", slug: "gunkanjima", file: "Gunkanjima Battleship Island (109866421).jpeg", kind: "建築" },
  { name: "東京駅", slug: "tokyo-st", file: "Tokyo Station (Marunouchi Building).jpg", kind: "建築" },
  { name: "迎賓館赤坂離宮", slug: "geihinkan", wiki: "迎賓館赤坂離宮", kind: "建築" },
  { name: "韮山反射炉", slug: "nirayama", wiki: "韮山反射炉", kind: "建築" },
  { name: "松下村塾", slug: "shokasonjuku", wiki: "松下村塾", kind: "建築" },
  { name: "石見銀山", slug: "iwami", wiki: "石見銀山", kind: "建築" },
  { name: "箱根関所", slug: "hakone-sekisho", wiki: "箱根関", kind: "建築" },
  { name: "妻籠宿", slug: "tsumago", file: "Tsumago-juku - Tsumago687.jpg", kind: "建築" },
  // ---- 2026-10 追加：人物
  { name: "聖武天皇", slug: "shomu", wiki: "聖武天皇", kind: "人物" },
  { name: "鑑真", slug: "ganjin", wiki: "鑑真", kind: "人物" },
  { name: "最澄", slug: "saicho", wiki: "最澄", kind: "人物" },
  { name: "空海", slug: "kukai", wiki: "空海", kind: "人物" },
  { name: "藤原道長", slug: "michinaga", wiki: "藤原道長", kind: "人物" },
  { name: "平清盛", slug: "kiyomori", wiki: "平清盛", kind: "人物" },
  { name: "源義経", slug: "yoshitsune", wiki: "源義経", kind: "人物" },
  { name: "北条時宗", slug: "tokimune", file: "Hojotokimune.jpg", kind: "人物" },
  { name: "後醍醐天皇", slug: "godaigo", wiki: "後醍醐天皇", kind: "人物" },
  { name: "足利尊氏", slug: "takauji", wiki: "足利尊氏", kind: "人物" },
  { name: "足利義政", slug: "yoshimasa", wiki: "足利義政", kind: "人物" },
  { name: "親鸞", slug: "shinran", wiki: "親鸞", kind: "人物" },
  { name: "日蓮", slug: "nichiren", wiki: "日蓮", kind: "人物" },
  { name: "雪舟", slug: "sesshu", wiki: "雪舟", kind: "人物" },
  { name: "武田信玄", slug: "shingen", wiki: "武田信玄", kind: "人物" },
  { name: "上杉謙信", slug: "kenshin", wiki: "上杉謙信", kind: "人物" },
  { name: "千利休", slug: "rikyu", wiki: "千利休", kind: "人物" },
  { name: "フランシスコ・ザビエル", slug: "xavier", wiki: "フランシスコ・ザビエル", kind: "人物" },
  { name: "徳川家光", slug: "iemitsu", wiki: "徳川家光", kind: "人物" },
  { name: "徳川綱吉", slug: "tsunayoshi", wiki: "徳川綱吉", kind: "人物" },
  { name: "徳川吉宗", slug: "yoshimune", wiki: "徳川吉宗", kind: "人物" },
  { name: "田沼意次", slug: "tanuma", wiki: "田沼意次", kind: "人物" },
  { name: "松平定信", slug: "sadanobu", wiki: "松平定信", kind: "人物" },
  { name: "井伊直弼", slug: "naosuke", wiki: "井伊直弼", kind: "人物" },
  { name: "ペリー", slug: "perry", wiki: "マシュー・ペリー", kind: "人物" },
  { name: "杉田玄白", slug: "genpaku", wiki: "杉田玄白", kind: "人物" },
  { name: "本居宣長", slug: "norinaga", wiki: "本居宣長", kind: "人物" },
  { name: "伊能忠敬", slug: "tadataka", wiki: "伊能忠敬", kind: "人物" },
  { name: "松尾芭蕉", slug: "basho", wiki: "松尾芭蕉", kind: "人物" },
  { name: "吉田松陰", slug: "shoin", wiki: "吉田松陰", kind: "人物" },
  { name: "勝海舟", slug: "kaishu", wiki: "勝海舟", kind: "人物" },
  { name: "高杉晋作", slug: "takasugi", wiki: "高杉晋作", kind: "人物" },
  { name: "木戸孝允", slug: "kido", wiki: "木戸孝允", kind: "人物" },
  { name: "大久保利通", slug: "okubo", wiki: "大久保利通", kind: "人物" },
  { name: "岩倉具視", slug: "iwakura", wiki: "岩倉具視", kind: "人物" },
  { name: "徳川慶喜", slug: "yoshinobu", wiki: "徳川慶喜", kind: "人物" },
  { name: "明治天皇", slug: "meiji", wiki: "明治天皇", kind: "人物" },
  { name: "板垣退助", slug: "itagaki", wiki: "板垣退助", kind: "人物" },
  { name: "大隈重信", slug: "okuma", wiki: "大隈重信", kind: "人物" },
  { name: "陸奥宗光", slug: "mutsu", wiki: "陸奥宗光", kind: "人物" },
  { name: "小村寿太郎", slug: "komura", wiki: "小村寿太郎", kind: "人物" },
  { name: "東郷平八郎", slug: "togo", wiki: "東郷平八郎", kind: "人物" },
  { name: "田中正造", slug: "shozo", wiki: "田中正造", kind: "人物" },
  { name: "渋沢栄一", slug: "shibusawa", wiki: "渋沢栄一", kind: "人物" },
  { name: "津田梅子", slug: "tsuda", wiki: "津田梅子", kind: "人物" },
  { name: "北里柴三郎", slug: "kitasato", wiki: "北里柴三郎", kind: "人物" },
  { name: "野口英世", slug: "noguchi", wiki: "野口英世", kind: "人物" },
  { name: "夏目漱石", slug: "soseki", wiki: "夏目漱石", kind: "人物" },
  { name: "樋口一葉", slug: "ichiyo", wiki: "樋口一葉", kind: "人物" },
  { name: "与謝野晶子", slug: "akiko", wiki: "与謝野晶子", kind: "人物" },
  { name: "平塚らいてう", slug: "raicho", wiki: "平塚らいてう", kind: "人物" },
  { name: "森鷗外", slug: "ogai", wiki: "森鷗外", kind: "人物" },
  { name: "原敬", slug: "hara", wiki: "原敬", kind: "人物" },
  { name: "犬養毅", slug: "inukai", wiki: "犬養毅", kind: "人物" },
  { name: "吉野作造", slug: "yoshino", wiki: "吉野作造", kind: "人物" },
  { name: "吉田茂", slug: "yoshida", wiki: "吉田茂", kind: "人物" },
  { name: "マッカーサー", slug: "macarthur", wiki: "ダグラス・マッカーサー", kind: "人物" },
  { name: "湯川秀樹", slug: "yukawa", wiki: "湯川秀樹", kind: "人物" },
  { name: "市川房枝", slug: "ichikawa", wiki: "市川房枝", kind: "人物" },
  { name: "佐藤栄作", slug: "sato", wiki: "佐藤栄作", kind: "人物" },
  { name: "田中角栄", slug: "tanaka", wiki: "田中角栄", kind: "人物" },
  { name: "池田勇人", slug: "ikeda", wiki: "池田勇人", kind: "人物" },
  { name: "東条英機", slug: "tojo", wiki: "東條英機", kind: "人物" },
  { name: "新渡戸稲造", slug: "nitobe", wiki: "新渡戸稲造", kind: "人物" },
  { name: "岡倉天心", slug: "tenshin", wiki: "岡倉天心", kind: "人物" },
  { name: "中江兆民", slug: "chomin", wiki: "中江兆民", kind: "人物" },
  // ---- 2026-10 追加：できごと
  { name: "関東大震災", slug: "kanto-daishinsai", wiki: "関東大震災", kind: "できごと" },
  { name: "日比谷焼き打ち事件", slug: "hibiya", wiki: "日比谷焼打事件", kind: "できごと" },
  { name: "学徒出陣", slug: "gakuto", file: "国士舘専門学校の学徒出陣（1943年12月1日）.jpg", kind: "できごと" },
  { name: "昭和天皇とマッカーサーの会見", slug: "showa-macarthur", wiki: "昭和天皇・マッカーサー会見", kind: "できごと" },
  { name: "サンフランシスコ平和条約", slug: "sf-treaty", wiki: "日本国との平和条約", kind: "できごと" },
  { name: "岩倉使節団", slug: "iwakura-shisetsu", wiki: "岩倉使節団", kind: "できごと" },
  { name: "ポーツマス条約", slug: "portsmouth", wiki: "ポーツマス条約", kind: "できごと" },
  { name: "新幹線（0系）", slug: "shinkansen-0", wiki: "新幹線0系電車", kind: "できごと" },
  { name: "東京大空襲", slug: "tokyo-kushu", wiki: "東京大空襲", kind: "できごと" },
  // ---- 2026-10 追加：地理
  { name: "扇状地", slug: "senjochi", wiki: "扇状地", kind: "地理" },
  { name: "三角州", slug: "sankakusu", wiki: "三角州", kind: "地理" },
  { name: "河岸段丘", slug: "kagandankyu", wiki: "河岸段丘", kind: "地理" },
  { name: "リアス海岸", slug: "rias", file: "Ago Bay from Mount Yokoyama.jpg", kind: "地理" },
  { name: "天橋立", slug: "amanohashidate", wiki: "天橋立", kind: "地理" },
  { name: "秋吉台", slug: "akiyoshidai", file: "View of Karst landscape at Akiyoshidai 1.jpg", kind: "地理" },
  { name: "鳥取砂丘", slug: "tottori-sakyu", wiki: "鳥取砂丘", kind: "地理" },
  { name: "桜島", slug: "sakurajima", file: "Kagoshima cityscape against the background of Sakurajima volcano. Japan, East Asia.jpg", kind: "地理" },
  { name: "阿蘇山", slug: "aso", wiki: "阿蘇山", kind: "地理" },
  { name: "富士山", slug: "fujisan", wiki: "富士山", kind: "地理" },
  { name: "釧路湿原", slug: "kushiro", wiki: "釧路湿原", kind: "地理" },
  { name: "白神山地", slug: "shirakami", wiki: "白神山地", kind: "地理" },
  { name: "屋久島", slug: "yakushima", file: "Jomon Sugi 02.jpg", kind: "地理" },
  { name: "流氷", slug: "ryuhyo", file: "Abashiri Drift ice02.JPG", kind: "地理" },
  { name: "輪中", slug: "wajuu", wiki: "輪中", kind: "地理" },
  { name: "天井川", slug: "tenjogawa", file: "JR West Biwako Line Kusatsugawa Tunnel.jpg", kind: "地理" },
  { name: "サンゴ礁", slug: "sango", wiki: "サンゴ礁", kind: "地理" },
  { name: "知床", slug: "shiretoko", file: "140828 Otoko-no-namida Shiretoko Peninsula Hokkaido Japan01s5.jpg", kind: "地理" },
  { name: "小笠原諸島", slug: "ogasawara", file: "Chichijima , Ogasawara - panoramio.jpg", kind: "地理" },
  { name: "琵琶湖", slug: "biwako", wiki: "琵琶湖", kind: "地理" },
  { name: "渡良瀬遊水地", slug: "watarase", wiki: "渡良瀬遊水地", kind: "地理" },
  { name: "棚田", slug: "tanada", wiki: "白米千枚田", kind: "地理" },
  { name: "茶畑", slug: "makinohara", file: "Tea Plantation.jpg", kind: "地理" },
  { name: "サトウキビ", slug: "satokibi", file: "Saccharum officinarum - Köhler–s Medizinal-Pflanzen-125.jpg", kind: "地理" },
  { name: "てんさい", slug: "tensai", wiki: "テンサイ", kind: "地理" },
  { name: "ビニールハウス", slug: "vinyl-house", wiki: "ビニールハウス", kind: "地理" },
  { name: "石油化学コンビナート", slug: "kombinat", wiki: "石油化学コンビナート", kind: "地理" },
  { name: "黒部ダム", slug: "kurobe", wiki: "黒部ダム", kind: "地理" },
  { name: "風力発電", slug: "furyoku", wiki: "風力発電", kind: "地理" },
  { name: "地熱発電", slug: "chinetsu", wiki: "八丁原発電所", kind: "地理" },
  { name: "太陽光発電", slug: "taiyoko", wiki: "メガソーラー", kind: "地理" },
  { name: "瀬戸大橋", slug: "setoohashi", wiki: "瀬戸大橋", kind: "地理" },
  { name: "明石海峡大橋", slug: "akashi", wiki: "明石海峡大橋", kind: "地理" },
  { name: "関西国際空港", slug: "kix", wiki: "関西国際空港", kind: "地理" },
  { name: "東京湾アクアライン", slug: "aqualine", file: "Tokyo Wan Aqua-Line.jpg", kind: "地理" },
  { name: "コンテナ船", slug: "container", wiki: "コンテナ船", kind: "地理" },
  { name: "白川郷", slug: "shirakawago", wiki: "白川郷", kind: "地理" },
  { name: "かまくら", slug: "kamakura-snow", file: "Kamakura at Yokote Castle 202402.jpg", kind: "地理" },
  { name: "シーサー", slug: "shisa", wiki: "シーサー", kind: "地理" },
  { name: "南部鉄器", slug: "nanbu", wiki: "南部鉄器", kind: "地理" },
  { name: "輪島塗", slug: "wajima", wiki: "輪島塗", kind: "地理" },
  { name: "西陣織", slug: "nishijin", wiki: "西陣織", kind: "地理" },
  { name: "有田焼", slug: "arita", wiki: "有田焼", kind: "地理" },
  { name: "九谷焼", slug: "kutani", wiki: "九谷焼", kind: "地理" },
  { name: "備前焼", slug: "bizen", wiki: "備前焼", kind: "地理" },
  { name: "大島紬", slug: "oshima", wiki: "大島紬", kind: "地理" },
  { name: "紅型", slug: "bingata", wiki: "紅型", kind: "地理" },
  { name: "津軽塗", slug: "tsugaru", wiki: "津軽塗", kind: "地理" },
  { name: "熊野筆", slug: "kumano", wiki: "熊野筆", kind: "地理" },
  { name: "将棋の駒（天童）", slug: "tendo", file: "Giant Shogi Piece in Tendo.jpg", kind: "地理" },
  { name: "越前和紙", slug: "echizen", wiki: "越前和紙", kind: "地理" },
  { name: "こけし", slug: "kokeshi", wiki: "こけし", kind: "地理" },
  { name: "赤べこ", slug: "akabeko", wiki: "赤べこ", kind: "地理" },
  // ---- 2026-10 追加：公民
  { name: "国会議事堂", slug: "kokkai", wiki: "国会議事堂", kind: "公民" },
  { name: "最高裁判所", slug: "saikosai", wiki: "最高裁判所 (日本)", kind: "公民" },
  { name: "首相官邸", slug: "kantei", wiki: "総理大臣官邸", kind: "公民" },
  { name: "国際連合本部", slug: "un-hq", wiki: "国際連合本部ビル", kind: "公民" },
  { name: "安全保障理事会", slug: "unsc", wiki: "国際連合安全保障理事会", kind: "公民" },
  { name: "国際司法裁判所", slug: "icj", file: "Peace Palace The Hague west and rear façade.jpg", kind: "公民" },
  { name: "国際連合の旗", slug: "un-flag", wiki: "国際連合旗", kind: "公民" },
  { name: "EUの旗", slug: "eu-flag", wiki: "欧州旗", kind: "公民" },
  { name: "ドナルド・トランプ", slug: "trump", wiki: "ドナルド・トランプ", kind: "公民" },
  { name: "習近平", slug: "xi", wiki: "習近平", kind: "公民" },
  { name: "ウラジーミル・プーチン", slug: "putin", wiki: "ウラジーミル・プーチン", kind: "公民" },
  { name: "エマニュエル・マクロン", slug: "macron", wiki: "エマニュエル・マクロン", kind: "公民" },
  { name: "アンディ・バーナム", slug: "burnham", file: "Andy Burnham on 13 August 2024 (cropped 2).jpg", kind: "公民" },
  { name: "フリードリヒ・メルツ", slug: "merz", wiki: "フリードリヒ・メルツ", kind: "公民" },
  { name: "李在明", slug: "lee-jaemyung", wiki: "李在明", kind: "公民" },
  { name: "ナレンドラ・モディ", slug: "modi", file: "Narendra Modi 2025 (cropped).jpg", kind: "公民" },
  { name: "ジョルジャ・メローニ", slug: "meloni", file: "Giorgia Meloni Official 2024 (cropped).jpg", kind: "公民" },
  { name: "マーク・カーニー", slug: "carney", wiki: "マーク・カーニー", kind: "公民" },
  { name: "ウォロディミル・ゼレンスキー", slug: "zelensky", wiki: "ウォロディミル・ゼレンスキー", kind: "公民" },
  { name: "アントニオ・グテーレス", slug: "guterres", wiki: "アントニオ・グテーレス", kind: "公民" },
  { name: "高市早苗", slug: "takaichi", wiki: "高市早苗", kind: "公民" },
  { name: "ルーラ", slug: "lula", wiki: "ルイス・イナシオ・ルーラ・ダ・シルヴァ", kind: "公民" },
  { name: "アンソニー・アルバニージー", slug: "albanese", wiki: "アンソニー・アルバニージー", kind: "公民" },
  // ---- 2026-10 追加：都道府県章
  { name: "北海道章", slug: "kensho-hokkaido", file: "Emblem of Hokkaido Prefecture.svg", kind: "地理" },
  { name: "青森県章", slug: "kensho-aomori", file: "Emblem of Aomori Prefecture.svg", kind: "地理" },
  { name: "岩手県章", slug: "kensho-iwate", file: "Emblem of Iwate Prefecture.svg", kind: "地理" },
  { name: "宮城県章", slug: "kensho-miyagi", file: "Emblem of Miyagi Prefecture.svg", kind: "地理" },
  { name: "秋田県章", slug: "kensho-akita", file: "Emblem of Akita Prefecture.svg", kind: "地理" },
  { name: "山形県章", slug: "kensho-yamagata", file: "Emblem of Yamagata Prefecture.svg", kind: "地理" },
  { name: "福島県章", slug: "kensho-fukushima", file: "Emblem of Fukushima Prefecture.svg", kind: "地理" },
  { name: "茨城県章", slug: "kensho-ibaraki", file: "Emblem of Ibaraki Prefecture.svg", kind: "地理" },
  { name: "栃木県章", slug: "kensho-tochigi", file: "Emblem of Tochigi Prefecture.svg", kind: "地理" },
  { name: "群馬県章", slug: "kensho-gunma", file: "Emblem of Gunma Prefecture.svg", kind: "地理" },
  { name: "埼玉県章", slug: "kensho-saitama", file: "Emblem of Saitama Prefecture.svg", kind: "地理" },
  { name: "千葉県章", slug: "kensho-chiba", file: "Emblem of Chiba prefecture.svg", kind: "地理" },
  { name: "東京都章", slug: "kensho-tokyo", file: "Emblem of Tokyo Metropolis.svg", kind: "地理" },
  { name: "神奈川県章", slug: "kensho-kanagawa", file: "Emblem of Kanagawa Prefecture.svg", kind: "地理" },
  { name: "新潟県章", slug: "kensho-niigata", file: "Emblem of Niigata Prefecture.svg", kind: "地理" },
  { name: "富山県章", slug: "kensho-toyama", file: "Emblem of Toyama Prefecture.svg", kind: "地理" },
  { name: "石川県の県旗標章", slug: "kensho-ishikawa", file: "Emblem of Ishikawa Prefecture.svg", kind: "地理" },
  { name: "福井県章", slug: "kensho-fukui", file: "Emblem of Fukui Prefecture.svg", kind: "地理" },
  { name: "山梨県章", slug: "kensho-yamanashi", file: "Emblem of Yamanashi prefecture.svg", kind: "地理" },
  { name: "長野県章", slug: "kensho-nagano", file: "Emblem of Nagano Prefecture.svg", kind: "地理" },
  { name: "岐阜県章", slug: "kensho-gifu", file: "Emblem of Gifu Prefecture.svg", kind: "地理" },
  { name: "静岡県章", slug: "kensho-shizuoka", file: "Emblem of Shizuoka Prefecture.svg", kind: "地理" },
  { name: "愛知県章", slug: "kensho-aichi", file: "Emblem of Aichi Prefecture.svg", kind: "地理" },
  { name: "三重県章", slug: "kensho-mie", file: "Emblem of Mie Prefecture.svg", kind: "地理" },
  { name: "滋賀県章", slug: "kensho-shiga", file: "Emblem of Shiga Prefecture.svg", kind: "地理" },
  { name: "京都府章", slug: "kensho-kyoto", file: "Emblem of Kyoto Prefecture.svg", kind: "地理" },
  { name: "大阪府章", slug: "kensho-osaka", file: "Emblem of Osaka Prefecture.svg", kind: "地理" },
  { name: "奈良県章", slug: "kensho-nara", file: "Emblem of Nara Prefecture.svg", kind: "地理" },
  { name: "和歌山県章", slug: "kensho-wakayama", file: "Emblem of Wakayama Prefecture.svg", kind: "地理" },
  { name: "鳥取県章", slug: "kensho-tottori", file: "Emblem of Tottori Prefecture.svg", kind: "地理" },
  { name: "島根県章", slug: "kensho-shimane", file: "Emblem of Shimane Prefecture.svg", kind: "地理" },
  { name: "岡山県章", slug: "kensho-okayama", file: "Emblem of Okayama Prefecture.svg", kind: "地理" },
  { name: "広島県章", slug: "kensho-hiroshima", file: "Emblem of Hiroshima Prefecture.svg", kind: "地理" },
  { name: "山口県章", slug: "kensho-yamaguchi", file: "Emblem of Yamaguchi Prefecture.svg", kind: "地理" },
  { name: "徳島県章", slug: "kensho-tokushima", file: "Emblem of Tokushima Prefecture.svg", kind: "地理" },
  { name: "香川県章", slug: "kensho-kagawa", file: "Emblem of Kagawa Prefecture.svg", kind: "地理" },
  { name: "高知県章", slug: "kensho-kochi", file: "Emblem of Kochi Prefecture.svg", kind: "地理" },
  { name: "福岡県章", slug: "kensho-fukuoka", file: "Emblem of Fukuoka Prefecture.svg", kind: "地理" },
  { name: "長崎県章", slug: "kensho-nagasaki", file: "Emblem of Nagasaki Prefecture.svg", kind: "地理" },
  { name: "熊本県章", slug: "kensho-kumamoto", file: "Emblem of Kumamoto Prefecture.svg", kind: "地理" },
  { name: "大分県章", slug: "kensho-oita", file: "Emblem of Oita Prefecture.svg", kind: "地理" },
  { name: "鹿児島県章", slug: "kensho-kagoshima", file: "Emblem of Kagoshima Prefecture.svg", kind: "地理" },
  { name: "沖縄県章", slug: "kensho-okinawa", file: "Emblem of Okinawa Prefecture.svg", kind: "地理" },
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
  const out = new Map();
  for (const p of pages) {
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
    if (!/jpe?g|png|svg|webp/.test(info.mime)) throw new Error(`画像形式が対象外（${info.mime}）`);
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
