// お問い合わせ内容を、キーワードで4種類に自動分類する。
//   見積依頼 / 予約・相談 / クレーム / その他
//
// 仕組みはシンプルなキーワード判定です。
// 文章の中に、各カテゴリの「目印になる言葉」が含まれているかで振り分けます。
// クレームは見落とすと困るので、最優先で判定します。

// 分類の種類（この順で画面の集計などにも使えます）
export const CATEGORIES = ["見積依頼", "予約・相談", "クレーム", "その他"] as const;
export type Category = (typeof CATEGORIES)[number];

// とくに注意して扱いたいカテゴリ（画面で目立たせる用）
export const IMPORTANT_CATEGORY: Category = "クレーム";

// 各カテゴリの目印キーワード。上にあるものほど優先して判定します。
const KEYWORDS: { category: Category; words: string[] }[] = [
  {
    // クレーム（最優先）
    category: "クレーム",
    words: [
      "クレーム", "苦情", "不満", "文句", "ひどい", "最悪", "遅い", "雑",
      "やり直し", "直して", "なおして", "怒", "不良", "欠陥", "手抜き",
      "約束", "違う", "おかしい", "困る", "返金",
    ],
  },
  {
    // 見積依頼
    category: "見積依頼",
    words: [
      "見積", "見積もり", "お見積", "金額", "費用", "いくら", "料金",
      "価格", "予算", "相場", "概算", "値段", "コスト",
    ],
  },
  {
    // 予約・相談
    category: "予約・相談",
    words: [
      "予約", "相談", "訪問", "来て", "日程", "打ち合わせ", "打合せ",
      "現地", "下見", "アポ", "予定", "検討", "問い合わせ", "質問",
      "教えて", "知りたい",
    ],
  },
];

// 本文を受け取り、分類結果（カテゴリ名）を返す
export function classify(text: string): Category {
  const target = text.toLowerCase();

  // 優先順位（クレーム → 見積依頼 → 予約・相談）の順に、最初に一致したものを採用
  for (const { category, words } of KEYWORDS) {
    if (words.some((word) => target.includes(word.toLowerCase()))) {
      return category;
    }
  }

  // どれにも当てはまらなければ「その他」
  return "その他";
}
