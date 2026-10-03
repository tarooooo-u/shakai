import type { Question } from "@/lib/types";

// 問題データ。id は一度付けたら変えない（学習記録のキーになる）。
// 市販教材・塾テキストの文章はそのまま写さず、自前の文章で書くこと。
export const QUESTIONS: Question[] = [
  // ───────── 歴史 ─────────
  {
    id: "h001",
    category: "history",
    subCategory: "縄文・弥生",
    difficulty: "basic",
    question: "縄文時代の人々が、貝殻や食べ物の残りかすを捨てた場所の遺跡を何というか。",
    answer: "貝塚",
    explanation:
      "明治時代にアメリカ人のモースが発見した東京都の大森貝塚が有名。貝塚の分布から、当時の海岸線が現在より内陸にあったこと（縄文海進）がわかる。",
  },
  {
    id: "h002",
    category: "history",
    subCategory: "縄文・弥生",
    difficulty: "standard",
    question: "佐賀県にある、周りを濠（ほり）や柵で囲んだ弥生時代の大規模な集落の遺跡を何というか。",
    answer: "吉野ヶ里遺跡",
    explanation:
      "濠や物見やぐらの跡は、ムラどうしの争いがあったことを示す。稲作が広まり、土地や水・たくわえをめぐる争いが起こるようになった。",
    kanjiNote: "「吉野ヶ里」の「ヶ」を忘れない。",
  },
  {
    id: "h003",
    category: "history",
    subCategory: "古墳・飛鳥",
    difficulty: "basic",
    question: "中国の歴史書『魏志』倭人伝に記された、30ほどの国を従えた邪馬台国の女王はだれか。",
    answer: "卑弥呼",
    explanation:
      "239年に魏に使いを送り、「親魏倭王」の称号と金印、銅鏡100枚などを授けられたと記されている。邪馬台国の位置は九州説と近畿説がある。",
    kanjiNote: "「卑」の字形に注意。「弥」は「弓へん」。",
  },
  {
    id: "h004",
    category: "history",
    subCategory: "古墳・飛鳥",
    difficulty: "basic",
    question: "604年、聖徳太子（厩戸王）が役人の心構えを示すために定めたものは何か。",
    answer: "十七条の憲法",
    explanation:
      "「和を以て貴しと為し」で始まり、仏教や儒教の考え方を取り入れている。603年の冠位十二階（家柄にとらわれず能力で役人を取り立てる）とセットで覚える。",
  },
  {
    id: "h005",
    category: "history",
    subCategory: "古墳・飛鳥",
    difficulty: "standard",
    question: "645年、中大兄皇子と中臣鎌足が蘇我氏をたおして始めた政治改革を何というか。",
    answer: "大化の改新",
    explanation:
      "蘇我入鹿をたおした事件そのものは乙巳の変という。土地と人民を国のものとする公地公民の方針が示された。中臣鎌足は後に「藤原」の姓を与えられ、藤原氏の祖となる。",
  },
  {
    id: "h006",
    category: "history",
    subCategory: "奈良",
    difficulty: "standard",
    question: "701年に完成した、唐の法律にならった律令を何というか。",
    answer: "大宝律令",
    explanation:
      "刑部親王や藤原不比等らがまとめた。律は刑罰のきまり、令は政治のしくみのきまり。これにより天皇を中心とする律令国家のしくみが整った。",
  },
  {
    id: "h007",
    category: "history",
    subCategory: "奈良",
    difficulty: "standard",
    question: "743年に出された、新しく開墾した土地の永久的な私有を認めた法令を何というか。",
    answer: "墾田永年私財法",
    explanation:
      "人口増加で口分田が不足したため、723年の三世一身法に続いて出された。貴族や寺社が私有地を広げ、のちの荘園のもとになった。公地公民の原則がくずれていくきっかけ。",
    kanjiNote: "「墾」は「土」が下。「懇」（心）と混同しない。",
  },
  {
    id: "h008",
    category: "history",
    subCategory: "平安",
    difficulty: "basic",
    question: "794年に都を平安京に移した天皇はだれか。",
    answer: "桓武天皇",
    explanation:
      "奈良の仏教勢力が政治に口を出すのを避ける目的もあった。坂上田村麻呂を征夷大将軍に任命し、東北地方の蝦夷を平定させた。",
    kanjiNote: "「桓」は「木へん」。「恒」（りっしんべん）と書かない。",
  },
  {
    id: "h009",
    category: "history",
    subCategory: "平安",
    difficulty: "standard",
    question: "藤原氏が、天皇が幼いときは摂政、成人後は関白として実権をにぎった政治を何というか。",
    answer: "摂関政治",
    explanation:
      "娘を天皇のきさきにし、生まれた子を天皇に立てて外戚として力をふるった。11世紀前半の藤原道長・頼通の父子のころが全盛期。頼通は平等院鳳凰堂を建てた。",
  },
  {
    id: "h010",
    category: "history",
    subCategory: "平安",
    difficulty: "standard",
    question: "1086年、白河天皇が位をゆずった後も上皇として行った政治を何というか。",
    answer: "院政",
    explanation:
      "摂政・関白の力をおさえ、天皇の父や祖父である上皇が実権をにぎった。上皇の住まいを「院」と呼んだことが名前の由来。",
  },
  {
    id: "h011",
    category: "history",
    subCategory: "平安",
    difficulty: "basic",
    question: "1185年、源義経らの活躍で平氏がほろんだ、現在の山口県下関市付近での戦いを何というか。",
    answer: "壇ノ浦の戦い",
    explanation:
      "一ノ谷の戦い（1184年・兵庫県）→屋島の戦い（1185年・香川県）→壇ノ浦の戦い（1185年・山口県）の順。平氏が東から西へ追いつめられていく流れを地図とセットで覚える。",
  },
  {
    id: "h012",
    category: "history",
    subCategory: "鎌倉",
    difficulty: "basic",
    question: "1232年、執権北条泰時が定めた、武士のための最初の法律を何というか。",
    answer: "御成敗式目（貞永式目）",
    explanation:
      "源頼朝以来の先例や武士社会の慣習をもとに、裁判の基準を示した。のちの武家法の手本となった。",
    kanjiNote: "「御成敗」の「敗」、「式目」の「目」を正確に。",
  },
  {
    id: "h013",
    category: "history",
    subCategory: "鎌倉",
    difficulty: "advanced",
    question: "元寇の後、生活に苦しむ御家人を救うために鎌倉幕府が1297年に出した法令を何というか。",
    answer: "（永仁の）徳政令",
    explanation:
      "御家人が手放した土地をただで取り戻させる内容。元寇は防衛戦で新たな領地が得られず、恩賞が不十分だったことが御家人の不満の原因。徳政令は一時しのぎで、かえって経済が混乱し幕府への信頼が低下した。",
  },
  {
    id: "h014",
    category: "history",
    subCategory: "室町",
    difficulty: "basic",
    question: "1338年に征夷大将軍となり、京都に幕府を開いたのはだれか。",
    answer: "足利尊氏",
    explanation:
      "後醍醐天皇の建武の新政に不満をもつ武士を率いて対立し、京都に北朝を立てた。後醍醐天皇は吉野に移り（南朝）、南北朝の動乱は1392年の足利義満による南北朝の統一まで続いた。",
  },
  {
    id: "h015",
    category: "history",
    subCategory: "室町",
    difficulty: "standard",
    question: "足利義満が始めた明との貿易で、正式な貿易船と倭寇を区別するために用いた証明書を何というか。",
    answer: "勘合",
    explanation:
      "この貿易を勘合貿易（日明貿易）という。日本は刀・銅・硫黄などを輸出し、銅銭（明銭）・生糸・絹織物などを輸入した。",
    kanjiNote: "「勘合」の「勘」は「甚＋力」。",
  },
  {
    id: "h016",
    category: "history",
    subCategory: "室町",
    difficulty: "basic",
    question: "1467年に始まり、京都を主な戦場として11年間続いた戦乱を何というか。",
    answer: "応仁の乱",
    explanation:
      "8代将軍足利義政のあとつぎ問題に、有力守護大名の細川氏と山名氏の対立がからんで起こった。幕府の力は弱まり、下剋上の風潮が広がって戦国時代へ移っていく。",
  },
  {
    id: "h017",
    category: "history",
    subCategory: "戦国・安土桃山",
    difficulty: "basic",
    question: "1543年、種子島に流れ着いたポルトガル人によって日本に伝えられたものは何か。",
    answer: "鉄砲",
    explanation:
      "まもなく堺（大阪府）や国友（滋賀県）などで大量に生産されるようになった。1575年の長篠の戦いでは、織田・徳川の連合軍が鉄砲を有効に使い武田軍を破った。",
  },
  {
    id: "h018",
    category: "history",
    subCategory: "戦国・安土桃山",
    difficulty: "standard",
    question: "織田信長が安土城下などで行った、市場の税を免除し座の特権を廃止した政策を何というか。",
    answer: "楽市・楽座",
    explanation:
      "だれでも自由に商売ができるようにして商工業をさかんにし、城下町を発展させるねらいがあった。関所の廃止もあわせて行った。",
  },
  {
    id: "h019",
    category: "history",
    subCategory: "戦国・安土桃山",
    difficulty: "basic",
    question: "1588年、豊臣秀吉が一揆を防ぐため、農民から刀や鉄砲などの武器を取り上げた命令を何というか。",
    answer: "刀狩令",
    explanation:
      "太閤検地（田畑の面積・収穫量を調べ、耕作者を検地帳に登録）とあわせて、武士と農民の身分の区別がはっきりした。これを兵農分離という。",
  },
  {
    id: "h020",
    category: "history",
    subCategory: "江戸",
    difficulty: "basic",
    question: "江戸幕府が大名を取りしまるために定めた法令を何というか。",
    answer: "武家諸法度",
    explanation:
      "1615年に2代将軍秀忠の名で出された。1635年、3代将軍家光が参勤交代を制度として加えた。参勤交代は大名に多くの出費をさせ、力をおさえる効果があった。",
  },
  {
    id: "h021",
    category: "history",
    subCategory: "江戸",
    difficulty: "standard",
    question: "8代将軍徳川吉宗が行った幕府政治の改革を何というか。",
    answer: "享保の改革",
    explanation:
      "目安箱の設置、公事方御定書（裁判の基準）の制定、上米の制、新田開発などを行った。米の値段の安定に努めたことから「米将軍」と呼ばれた。",
    kanjiNote: "「享保」の「享」は「亨」と書かない。",
  },
  {
    id: "h022",
    category: "history",
    subCategory: "江戸",
    difficulty: "standard",
    question: "老中松平定信が行った幕府政治の改革を何というか。",
    answer: "寛政の改革",
    explanation:
      "田沼意次の商業重視の政治を改め、ききんに備えて米をたくわえさせる（囲米）、旗本・御家人の借金を帳消しにする（棄捐令）などを行った。厳しすぎて人々の反発を招いた。",
    kanjiNote: "「寛」は最後の右上の点を忘れない。",
  },
  {
    id: "h023",
    category: "history",
    subCategory: "江戸",
    difficulty: "advanced",
    question: "1837年、天保のききんで苦しむ人々を救おうと大阪で反乱を起こした、元大阪町奉行所の役人はだれか。",
    answer: "大塩平八郎",
    explanation:
      "陽明学者でもあった。反乱は1日でしずめられたが、幕府の元役人が幕府の直轄地で反乱を起こしたことは幕府に大きな衝撃を与え、のちの天保の改革（水野忠邦）につながった。",
  },
  {
    id: "h024",
    category: "history",
    subCategory: "幕末",
    difficulty: "basic",
    question: "1854年、ペリーとの間で結ばれ、下田と函館の2港を開いた条約を何というか。",
    answer: "日米和親条約",
    explanation:
      "アメリカ船に燃料・食料・水を補給することなどを認めた。この時点ではまだ貿易は認めていない。貿易が始まるのは1858年の日米修好通商条約から。",
  },
  {
    id: "h025",
    category: "history",
    subCategory: "幕末",
    difficulty: "standard",
    question: "1858年の日米修好通商条約が日本にとって不平等だった点を2つ答えよ。",
    answer: "領事裁判権（治外法権）を認めたこと／関税自主権がなかったこと",
    explanation:
      "大老井伊直弼が朝廷の許可を得ずに調印した。函館・神奈川（横浜）・長崎・新潟・兵庫（神戸）の5港を開いた。不平等の解消は明治時代の大きな課題となった。",
  },
  {
    id: "h026",
    category: "history",
    subCategory: "幕末",
    difficulty: "basic",
    question: "1867年、15代将軍徳川慶喜が政権を朝廷に返したことを何というか。",
    answer: "大政奉還",
    explanation:
      "これに対し朝廷側は王政復古の大号令を出し、天皇中心の新政府の樹立を宣言した。翌年から戊辰戦争が始まる。",
    kanjiNote: "「奉還」の「奉」を「奏」と書かない。",
  },
  {
    id: "h027",
    category: "history",
    subCategory: "明治",
    difficulty: "standard",
    question: "1873年に始まった、土地の所有者に地価の3％を現金で納めさせた税制の改革を何というか。",
    answer: "地租改正",
    explanation:
      "それまでの米で納める年貢と違い、豊作・不作に関係なく一定の税収が見込めるようになり、政府の財政が安定した。負担は重く各地で反対一揆が起こり、1877年に2.5％に引き下げられた。",
  },
  {
    id: "h028",
    category: "history",
    subCategory: "明治",
    difficulty: "basic",
    question: "1889年2月11日に発布された、天皇が国民にあたえるという形で定められた憲法を何というか。",
    answer: "大日本帝国憲法",
    explanation:
      "伊藤博文らが君主の権力が強いドイツ（プロイセン）の憲法を参考に草案をつくった。主権は天皇にあり、国民の権利は「法律の範囲内」で認められた。このような君主が定める憲法を欽定憲法という。",
  },
  {
    id: "h029",
    category: "history",
    subCategory: "明治",
    difficulty: "advanced",
    question: "1894年、外務大臣陸奥宗光がイギリスとの間で撤廃に成功したものは何か。",
    answer: "領事裁判権（治外法権）",
    explanation:
      "日清戦争の直前のこと。関税自主権の完全な回復は1911年、外務大臣小村寿太郎のとき。「陸奥＝領事裁判権の撤廃」「小村＝関税自主権の回復」の組み合わせは頻出。",
  },
  {
    id: "h030",
    category: "history",
    subCategory: "明治",
    difficulty: "standard",
    question: "日清戦争の講和条約を何というか。",
    answer: "下関条約",
    explanation:
      "1895年に結ばれ、清は朝鮮の独立を認め、遼東半島・台湾・澎湖諸島を日本にゆずり、賠償金2億両を支払った。直後にロシア・ドイツ・フランスの三国干渉により遼東半島を返還した。",
  },
  {
    id: "h031",
    category: "history",
    subCategory: "明治",
    difficulty: "standard",
    question: "日露戦争の講和条約を何というか。",
    answer: "ポーツマス条約",
    explanation:
      "1905年、アメリカ大統領セオドア・ローズベルトの仲介で結ばれた。日本は樺太の南半分などを得たが賠償金は得られず、国民の不満が日比谷焼き打ち事件となって爆発した。",
  },
  {
    id: "h032",
    category: "history",
    subCategory: "大正",
    difficulty: "standard",
    question: "1925年に成立し、満25歳以上のすべての男子に選挙権を与えた法律を何というか。",
    answer: "普通選挙法",
    explanation:
      "納税額による制限がなくなった。同じ年に、社会主義などの運動を取りしまる治安維持法も制定された。女性の選挙権は第二次世界大戦後の1945年に認められた。",
  },
  {
    id: "h033",
    category: "history",
    subCategory: "昭和（戦前）",
    difficulty: "standard",
    question: "1931年、柳条湖での南満州鉄道の線路爆破事件をきっかけに始まった、日本軍による軍事行動を何というか。",
    answer: "満州事変",
    explanation:
      "翌1932年に満州国が建国された。国際連盟はリットン調査団を派遣し、満州国を認めなかったため、日本は1933年に国際連盟を脱退した。",
  },
  {
    id: "h034",
    category: "history",
    subCategory: "昭和（戦後）",
    difficulty: "basic",
    question: "1951年、吉田茂首相が48か国と結んだ、第二次世界大戦の講和条約を何というか。",
    answer: "サンフランシスコ平和条約",
    explanation:
      "1952年に発効し、日本は独立を回復した。同じ日に日米安全保障条約も結ばれ、アメリカ軍が日本にとどまることになった。ソ連などは調印しなかった。",
  },
  {
    id: "h035",
    category: "history",
    subCategory: "昭和（戦後）",
    difficulty: "advanced",
    question: "1956年、日本が国際連合に加盟できるきっかけとなった、ソ連との間の文書を何というか。",
    answer: "日ソ共同宣言",
    explanation:
      "ソ連との国交が回復し、安全保障理事会で拒否権をもつソ連が日本の加盟に反対しなくなったため、同年12月に国際連合への加盟が実現した。平和条約は現在も結ばれていない。",
  },
  {
    id: "h036",
    category: "history",
    subCategory: "昭和（戦後）",
    difficulty: "basic",
    question: "1972年、佐藤栄作内閣のときに日本に返還された地域はどこか。",
    answer: "沖縄",
    explanation:
      "同じ1972年には田中角栄首相が日中共同声明に調印し、中国との国交が正常化した。「1972年＝沖縄返還・日中国交正常化」はセットで覚える。",
  },

  // ───────── 地理 ─────────
  {
    id: "g001",
    category: "geography",
    subCategory: "日本の位置・領域",
    difficulty: "basic",
    question: "日本の最北端にある島はどこか。",
    answer: "択捉島",
    explanation:
      "北海道に属する北方領土の一つ。最南端は沖ノ鳥島（東京都）、最東端は南鳥島（東京都）、最西端は与那国島（沖縄県）。",
    kanjiNote: "「択捉」は「えとろふ」と読む。",
  },
  {
    id: "g002",
    category: "geography",
    subCategory: "日本の位置・領域",
    difficulty: "standard",
    question: "日本の最南端にあり、水没を防ぐために護岸工事が行われている島はどこか。",
    answer: "沖ノ鳥島",
    explanation:
      "東京都に属する。島が水没すると、周囲の広大な排他的経済水域を失うため、多額の費用をかけて護岸工事を行った。",
  },
  {
    id: "g003",
    category: "geography",
    subCategory: "日本の位置・領域",
    difficulty: "standard",
    question: "沿岸から200海里（約370km）までの範囲で、沿岸国が水産資源や鉱産資源を利用する権利をもつ水域を何というか。",
    answer: "排他的経済水域",
    explanation:
      "領海（12海里）の外側に設定される。日本は島国で離島が多いため、国土面積に比べて排他的経済水域がとても広い。",
  },
  {
    id: "g004",
    category: "geography",
    subCategory: "日本の位置・領域",
    difficulty: "basic",
    question: "日本の標準時子午線は東経何度か。また、その経線が通る兵庫県の市はどこか。",
    answer: "東経135度／明石市",
    explanation:
      "経度15度で1時間の時差が生じる。イギリスのロンドンを通る本初子午線（0度）との差は135度なので、日本はロンドンより9時間進んでいる。",
  },
  {
    id: "g005",
    category: "geography",
    subCategory: "地形",
    difficulty: "basic",
    question: "日本で最も長い川は何か。",
    answer: "信濃川",
    explanation:
      "長野県（千曲川）から新潟県を流れ日本海に注ぐ。流域面積が最も広いのは利根川で、「長さ＝信濃川、流域面積＝利根川」を区別する。",
  },
  {
    id: "g006",
    category: "geography",
    subCategory: "地形",
    difficulty: "basic",
    question: "日本で最も面積の大きい湖は何か。",
    answer: "琵琶湖",
    explanation:
      "滋賀県の面積の約6分の1をしめる。京阪神地方の水がめとして重要。2番目に大きいのは茨城県の霞ヶ浦。",
    kanjiNote: "「琵琶」は「王（たまへん）」が2つずつ。",
  },
  {
    id: "g007",
    category: "geography",
    subCategory: "地形",
    difficulty: "standard",
    question: "三陸海岸の南部や志摩半島などに見られる、のこぎりの歯のように入り組んだ海岸を何というか。",
    answer: "リアス海岸",
    explanation:
      "山地が海にしずみこんでできた。湾内は波がおだやかで水深があるため養殖業や港に適しているが、津波の被害が大きくなりやすい。",
  },
  {
    id: "g008",
    category: "geography",
    subCategory: "地形",
    difficulty: "standard",
    question: "川が山地から平地に出るところに、運ばれた土砂が積もってできた扇形の地形を何というか。",
    answer: "扇状地",
    explanation:
      "水はけがよいため果樹園に利用されることが多い。山梨県の甲府盆地ではぶどう・ももの栽培がさかん。川が海に出るところにできるのは三角州。",
  },
  {
    id: "g009",
    category: "geography",
    subCategory: "地形",
    difficulty: "standard",
    question: "濃尾平野の南西部に見られる、洪水から集落や耕地を守るために周りを堤防で囲んだ地域を何というか。",
    answer: "輪中",
    explanation:
      "木曽三川（木曽川・長良川・揖斐川）が集まる低い土地。家を石垣の上に建てたり、水屋（避難用の建物）を設けたりする工夫が見られる。",
  },
  {
    id: "g010",
    category: "geography",
    subCategory: "地形",
    difficulty: "top",
    question: "日本列島を東北日本と西南日本に分ける大地溝帯（フォッサマグナ）の西の端にあたる断層線を何というか。",
    answer: "糸魚川静岡構造線",
    explanation:
      "新潟県糸魚川市から長野県・山梨県を通り静岡県静岡市付近に至る。この線の西側に飛驒・木曽・赤石の各山脈（日本アルプス）が連なる。",
    kanjiNote: "「糸魚川」は「いといがわ」と読む。",
  },
  {
    id: "g011",
    category: "geography",
    subCategory: "気候",
    difficulty: "basic",
    question: "冬に北西の季節風の影響で雪や雨が多くなるのは、どの気候区分か。",
    answer: "日本海側の気候",
    explanation:
      "大陸からの冷たく乾いた季節風が、日本海の上で水蒸気をふくみ、山地にぶつかって雪を降らせる。太平洋側では冬は乾燥して晴れの日が多い。",
  },
  {
    id: "g012",
    category: "geography",
    subCategory: "気候",
    difficulty: "standard",
    question: "一年を通じて降水量が少なく比較的温暖な、香川県高松市などに代表される気候区分は何か。",
    answer: "瀬戸内の気候",
    explanation:
      "夏の南東の季節風は四国山地に、冬の北西の季節風は中国山地にさえぎられるため雨が少ない。讃岐平野では水不足に備えてため池が多くつくられ、香川用水も引かれている。",
  },
  {
    id: "g013",
    category: "geography",
    subCategory: "気候",
    difficulty: "standard",
    question: "夏に東北地方の太平洋側に吹く、冷たくしめった北東の風を何というか。",
    answer: "やませ",
    explanation:
      "この風が長く続くと、日照不足と低温で稲が十分に育たない冷害が起こりやすい。寒流の千島海流（親潮）の上を吹いてくるため冷たい。",
  },
  {
    id: "g014",
    category: "geography",
    subCategory: "気候",
    difficulty: "standard",
    question: "日本列島の太平洋側を南から北へ流れる暖流を何というか。",
    answer: "日本海流（黒潮）",
    explanation:
      "太平洋側の寒流は千島海流（親潮）。日本海側の暖流は対馬海流、寒流はリマン海流。暖流と寒流がぶつかる潮目（潮境）はプランクトンが多く好漁場になる。",
  },
  {
    id: "g015",
    category: "geography",
    subCategory: "農業",
    difficulty: "basic",
    question: "宮崎平野や高知平野で、ビニールハウスなどを利用して野菜の出荷時期を早める栽培方法を何というか。",
    answer: "促成栽培",
    explanation:
      "温暖な気候を利用し、ほかの産地の出荷が少ない冬から春に出荷して高い値段で売る。ピーマン・きゅうり・なすなどが代表。反対に出荷を遅らせるのが抑制栽培。",
  },
  {
    id: "g016",
    category: "geography",
    subCategory: "農業",
    difficulty: "standard",
    question: "群馬県嬬恋村などで、夏でもすずしい高原の気候を利用してキャベツなどの出荷時期を遅らせる栽培方法を何というか。",
    answer: "抑制栽培（高冷地農業）",
    explanation:
      "ほかの産地の出荷が少ない夏に出荷できる。長野県の野辺山原などのレタスも同じ。「促成＝早める（暖かい地域）」「抑制＝遅らせる（すずしい地域）」。",
  },
  {
    id: "g017",
    category: "geography",
    subCategory: "農業",
    difficulty: "basic",
    question: "りんごの生産量が全国1位の都道府県はどこか。",
    answer: "青森県",
    explanation:
      "全国の生産量の半分以上をしめる。2位は長野県。りんごはすずしい気候に適した果物。みかんなど温暖な気候に適した果物の産地と対比して覚える。",
  },
  {
    id: "g018",
    category: "geography",
    subCategory: "農業",
    difficulty: "basic",
    question: "みかんの生産量が全国1位の都道府県はどこか。",
    answer: "和歌山県",
    explanation:
      "温暖で日当たりのよい山の斜面で栽培される。愛媛県・静岡県も主な産地。いずれも太平洋や瀬戸内海に面した温暖な地域。",
  },
  {
    id: "g019",
    category: "geography",
    subCategory: "工業",
    difficulty: "basic",
    question: "製造品出荷額が日本で最も多い工業地帯はどこか。",
    answer: "中京工業地帯",
    explanation:
      "愛知県・三重県を中心とする。豊田市を中心とした自動車工業がさかんで、機械工業の割合が非常に高いのが特徴。",
  },
  {
    id: "g020",
    category: "geography",
    subCategory: "工業",
    difficulty: "standard",
    question: "製造品出荷額にしめる化学工業の割合が最も高い、千葉県の東京湾沿岸に広がる工業地域はどこか。",
    answer: "京葉工業地域",
    explanation:
      "埋め立て地に石油化学コンビナートや製鉄所が立ち並ぶ。工業地帯・地域の出荷額の割合のグラフで「化学が最大」なら京葉と判断できる。",
  },
  {
    id: "g021",
    category: "geography",
    subCategory: "工業",
    difficulty: "standard",
    question: "1901年に操業を開始し、北九州工業地帯（地域）が発展するきっかけとなった官営工場は何か。",
    answer: "八幡製鉄所",
    explanation:
      "近くの筑豊炭田の石炭と、中国から輸入しやすい鉄鉱石を利用できることから現在の福岡県北九州市に建設された。日清戦争の賠償金の一部が建設に使われた。",
  },
  {
    id: "g022",
    category: "geography",
    subCategory: "都道府県",
    difficulty: "basic",
    question: "日本で人口が最も少ない都道府県はどこか。",
    answer: "鳥取県",
    explanation:
      "人口はおよそ50万人台。鳥取砂丘や、砂丘地でのらっきょう・ながいもの栽培が知られる。人口が最も多いのは東京都。",
  },
  {
    id: "g023",
    category: "geography",
    subCategory: "日本の位置・領域",
    difficulty: "standard",
    question: "北方領土にふくまれる4つの島（島々）をすべて答えよ。",
    answer: "択捉島・国後島・色丹島・歯舞群島",
    explanation:
      "第二次世界大戦後にソ連が占領し、現在もロシアが占拠している。日本は返還を求め続けている。",
    kanjiNote: "読みは「えとろふ・くなしり・しこたん・はぼまい」。",
  },
  {
    id: "g024",
    category: "geography",
    subCategory: "世界遺産",
    difficulty: "standard",
    question: "「白川郷・五箇山の合掌造り集落」がある2つの県はどこか。",
    answer: "岐阜県・富山県",
    explanation:
      "白川郷が岐阜県、五箇山が富山県。雪が多い地域のため、雪が積もりにくい急な傾きの茅ぶき屋根が特徴。1995年に世界文化遺産に登録された。",
  },

  // ───────── 政治 ─────────
  {
    id: "p001",
    category: "politics",
    subCategory: "日本国憲法",
    difficulty: "basic",
    question: "日本国憲法の三つの基本原則をすべて答えよ。",
    answer: "国民主権・基本的人権の尊重・平和主義",
    explanation:
      "平和主義は第9条で戦争の放棄・戦力の不保持・交戦権の否認を定めている。大日本帝国憲法では主権は天皇にあった。",
  },
  {
    id: "p002",
    category: "politics",
    subCategory: "日本国憲法",
    difficulty: "basic",
    question: "日本国憲法が公布された年月日と、施行された年月日を答えよ。",
    answer: "公布：1946年11月3日／施行：1947年5月3日",
    explanation:
      "11月3日は文化の日、5月3日は憲法記念日として国民の祝日になっている。公布から施行まで半年あけて準備期間とした。",
  },
  {
    id: "p003",
    category: "politics",
    subCategory: "日本国憲法",
    difficulty: "advanced",
    question: "憲法改正の手続きについて、国会の発議に必要な条件と、その後に国民が行うことを答えよ。",
    answer: "各議院の総議員の3分の2以上の賛成で国会が発議し、国民投票で過半数の賛成を得る",
    explanation:
      "承認されると天皇が国民の名で公布する。「出席議員」ではなく「総議員」の3分の2である点がひっかけで問われやすい。国民投票の投票権は満18歳以上。",
  },
  {
    id: "p004",
    category: "politics",
    subCategory: "日本国憲法",
    difficulty: "standard",
    question: "天皇が行う国事行為には、何の助言と承認が必要か。",
    answer: "内閣",
    explanation:
      "天皇は日本国と日本国民統合の象徴であり、政治的な権限はもたない。国事行為には内閣総理大臣や最高裁判所長官の任命、国会の召集、衆議院の解散などがある。",
  },
  {
    id: "p005",
    category: "politics",
    subCategory: "国会",
    difficulty: "basic",
    question: "衆議院議員と参議院議員の任期はそれぞれ何年か。",
    answer: "衆議院：4年／参議院：6年",
    explanation:
      "衆議院には解散があるため任期の途中で選挙になることがある。参議院に解散はなく、3年ごとに半数ずつ改選される。",
  },
  {
    id: "p006",
    category: "politics",
    subCategory: "国会",
    difficulty: "standard",
    question: "衆議院の解散による総選挙の日から30日以内に召集され、内閣総理大臣の指名を行う国会を何というか。",
    answer: "特別国会（特別会）",
    explanation:
      "毎年1月に召集され予算を主に審議するのが通常国会（常会、会期150日）。内閣や議員の要求で召集されるのが臨時国会（臨時会）。衆議院解散中に緊急の必要があるときは参議院の緊急集会が開かれる。",
  },
  {
    id: "p007",
    category: "politics",
    subCategory: "国会",
    difficulty: "advanced",
    question: "衆議院の優越が認められているものを、議決に関するものから4つ答えよ。",
    answer: "法律案の議決・予算の議決・条約の承認・内閣総理大臣の指名",
    explanation:
      "このほか、予算を先に審議する予算先議権と、内閣不信任決議は衆議院だけに認められている。衆議院は任期が短く解散もあるため、国民の意思をより反映しやすいと考えられている。",
  },
  {
    id: "p008",
    category: "politics",
    subCategory: "内閣",
    difficulty: "standard",
    question: "内閣総理大臣はどのようにして選ばれるか。",
    answer: "国会が国会議員の中から指名し、天皇が任命する",
    explanation:
      "国務大臣は内閣総理大臣が任命し、その過半数は国会議員でなければならない。内閣が国会に対して連帯して責任を負うしくみを議院内閣制という。",
  },
  {
    id: "p009",
    category: "politics",
    subCategory: "裁判所",
    difficulty: "standard",
    question: "裁判所がもつ、法律や命令などが憲法に違反していないかを判断する権限を何というか。",
    answer: "違憲審査権（違憲立法審査権）",
    explanation:
      "すべての裁判所がもつが、最終的な判断を下す最高裁判所は「憲法の番人」と呼ばれる。",
  },
  {
    id: "p010",
    category: "politics",
    subCategory: "裁判所",
    difficulty: "basic",
    question: "一つの事件について、原則として3回まで裁判を受けられるしくみを何というか。",
    answer: "三審制",
    explanation:
      "第一審の判決に不服で第二審の裁判所にうったえることを控訴、第二審から第三審にうったえることを上告という。裁判の誤りを防ぎ、人権を守るためのしくみ。",
  },
  {
    id: "p011",
    category: "politics",
    subCategory: "裁判所",
    difficulty: "standard",
    question: "2009年に始まった、国民がくじで選ばれて重大な刑事裁判に参加する制度を何というか。",
    answer: "裁判員制度",
    explanation:
      "地方裁判所で行われる第一審が対象。原則として裁判員6人と裁判官3人で、有罪か無罪か、有罪ならどのような刑にするかを決める。",
  },
  {
    id: "p012",
    category: "politics",
    subCategory: "選挙",
    difficulty: "basic",
    question: "現在の日本で、選挙権が与えられるのは満何歳以上か。",
    answer: "満18歳以上",
    explanation:
      "2016年から満20歳以上から引き下げられた。被選挙権は、衆議院議員・市町村長・地方議会議員が満25歳以上、参議院議員・都道府県知事が満30歳以上。",
  },
  {
    id: "p013",
    category: "politics",
    subCategory: "選挙",
    difficulty: "standard",
    question: "被選挙権が満30歳以上とされているのは、国会議員と地方の首長のうち、それぞれ何か。",
    answer: "参議院議員と都道府県知事",
    explanation:
      "衆議院議員・市（区）町村長・地方議会議員は満25歳以上。「30歳＝参議院議員・知事」とまとめて覚える。",
  },
  {
    id: "p014",
    category: "politics",
    subCategory: "地方自治",
    difficulty: "advanced",
    question: "地方自治で、住民が一定数の署名を集めて首長の解職や議会の解散などを求めることができる権利を何というか。",
    answer: "直接請求権",
    explanation:
      "条例の制定・改廃や監査の請求は有権者の50分の1以上、首長・議員の解職（リコール）や議会の解散は原則3分の1以上の署名が必要。人に関わる請求ほど厳しい条件になっている。",
  },
  {
    id: "p015",
    category: "politics",
    subCategory: "三権分立",
    difficulty: "standard",
    question: "『法の精神』を著し、権力を立法・行政・司法に分ける三権分立を唱えたフランスの思想家はだれか。",
    answer: "モンテスキュー",
    explanation:
      "権力を分けてたがいに抑制し合うことで、権力の集中と濫用を防ぎ、国民の自由を守るという考え方。『社会契約論』のルソーと区別する。",
  },
  {
    id: "p016",
    category: "politics",
    subCategory: "国際社会",
    difficulty: "standard",
    question: "国際連合の安全保障理事会の常任理事国5か国をすべて答えよ。",
    answer: "アメリカ・イギリス・フランス・ロシア・中国",
    explanation:
      "常任理事国は拒否権をもち、1か国でも反対すると重要な決定ができない。非常任理事国は10か国で任期は2年。",
  },

  // ───────── 経済 ─────────
  {
    id: "e001",
    category: "economy",
    subCategory: "財政",
    difficulty: "basic",
    question: "国の一般会計の歳出で、最も大きな割合をしめる項目は何か。",
    answer: "社会保障関係費",
    explanation:
      "歳出の約3分の1をしめる。次いで国債の返済や利子の支払いにあてる国債費、地方交付税交付金などが続く。少子高齢化で社会保障関係費は増え続けている。",
  },
  {
    id: "e002",
    category: "economy",
    subCategory: "財政",
    difficulty: "basic",
    question: "税収だけでは足りない国の収入を補うために、国が発行する借金の証書を何というか。",
    answer: "国債",
    explanation:
      "地方公共団体が発行するものは地方債。国債の残高は増え続けており、返済や利子の支払いが将来の世代の負担になることが課題。",
  },
  {
    id: "e003",
    category: "economy",
    subCategory: "税金",
    difficulty: "standard",
    question: "所得が多い人ほど、高い税率がかけられるしくみを何というか。",
    answer: "累進課税",
    explanation:
      "所得税や相続税で取り入れられている。所得の格差を小さくする（所得の再分配）はたらきがある。",
  },
  {
    id: "e004",
    category: "economy",
    subCategory: "税金",
    difficulty: "standard",
    question: "消費税のように、税を納める人と実際に負担する人が異なる税を何というか。",
    answer: "間接税",
    explanation:
      "所得税や法人税のように納める人と負担する人が同じ税は直接税。消費税は所得に関係なく同じ税率がかかるため、所得の低い人ほど負担が重くなる（逆進性）という指摘がある。",
  },
  {
    id: "e005",
    category: "economy",
    subCategory: "税金",
    difficulty: "basic",
    question: "現在の消費税の標準税率は何％か。",
    answer: "10％",
    explanation:
      "2019年10月に8％から引き上げられた。酒類・外食を除く飲食料品や定期購読の新聞などには8％の軽減税率が適用されている。",
  },
  {
    id: "e006",
    category: "economy",
    subCategory: "金融",
    difficulty: "basic",
    question: "日本の中央銀行を何というか。",
    answer: "日本銀行",
    explanation:
      "紙幣を発行する「発券銀行」、政府のお金を預かる「政府の銀行」、一般の銀行にお金を貸し出す「銀行の銀行」の3つの役割をもつ。",
  },
  {
    id: "e007",
    category: "economy",
    subCategory: "金融",
    difficulty: "standard",
    question: "物価が継続的に上がり続け、お金の価値が下がる状態を何というか。",
    answer: "インフレーション（インフレ）",
    explanation:
      "反対に物価が下がり続ける状態はデフレーション（デフレ）。物価が下がると企業の売り上げが減って賃金も下がり、さらに物が売れなくなる悪循環をデフレスパイラルという。",
  },
  {
    id: "e008",
    category: "economy",
    subCategory: "為替",
    difficulty: "advanced",
    question: "1ドル＝100円から1ドル＝130円になった。これは円高・円安のどちらか。また、日本の輸出企業にとって有利か不利か。",
    answer: "円安／有利",
    explanation:
      "1ドルを手に入れるのに多くの円が必要になった＝円の価値が下がった＝円安。円安になると日本の製品が海外で安くなるため輸出に有利、輸入品は高くなるため輸入に不利。数字が大きくなるのに「円安」となる点がひっかけ。",
  },
  {
    id: "e009",
    category: "economy",
    subCategory: "市場",
    difficulty: "basic",
    question: "ある商品で、買いたい量（需要）が売りたい量（供給）を上回ると、その商品の価格は一般にどうなるか。",
    answer: "上がる",
    explanation:
      "需要と供給が一致するところで決まる価格を均衡価格という。供給が需要を上回ると価格は下がる。",
  },
  {
    id: "e010",
    category: "economy",
    subCategory: "労働",
    difficulty: "standard",
    question: "日本国憲法が保障する、労働者の「労働三権」をすべて答えよ。",
    answer: "団結権・団体交渉権・団体行動権（争議権）",
    explanation:
      "労働者が労働組合をつくり（団結権）、使用者と話し合い（団体交渉権）、ストライキなどを行う（団体行動権）権利。「労働三法（労働基準法・労働組合法・労働関係調整法）」と混同しない。",
  },
  {
    id: "e011",
    category: "economy",
    subCategory: "労働",
    difficulty: "standard",
    question: "労働時間や休日、賃金などの労働条件の最低基準を定めた法律を何というか。",
    answer: "労働基準法",
    explanation:
      "1日8時間・週40時間以内の労働時間などを定めている。労働組合法・労働関係調整法とあわせて労働三法と呼ばれる。",
  },
  {
    id: "e012",
    category: "economy",
    subCategory: "消費者",
    difficulty: "standard",
    question: "訪問販売などで契約した後、一定の期間内であれば無条件で契約を取り消すことができる制度を何というか。",
    answer: "クーリング・オフ",
    explanation:
      "訪問販売や電話勧誘販売では、契約書を受け取ってから8日以内。自分から店に出向いて買った場合や通信販売には原則として適用されない。",
  },
  {
    id: "e013",
    category: "economy",
    subCategory: "消費者",
    difficulty: "advanced",
    question: "製品の欠陥によって消費者が被害を受けた場合、製造者に過失がなくても損害賠償の責任を負わせる法律を何というか。",
    answer: "製造物責任法（PL法）",
    explanation:
      "1995年に施行された。消費者が製造者の過失を証明しなくても、製品に欠陥があったことを証明すれば賠償を求められるようになった。",
  },
  {
    id: "e014",
    category: "economy",
    subCategory: "社会保障",
    difficulty: "advanced",
    question: "日本の社会保障制度の4つの柱をすべて答えよ。",
    answer: "社会保険・公的扶助・社会福祉・公衆衛生",
    explanation:
      "社会保険は医療保険や年金保険など、公的扶助は生活保護、社会福祉は高齢者や障がいのある人への支援、公衆衛生は感染症予防など。憲法第25条の生存権にもとづく。",
  },
];
